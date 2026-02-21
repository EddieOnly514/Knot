import { getSupabaseClientOrThrow } from "@/lib/supabase/client";
import type { PotentialMatch, MatchItem } from "@/types";

/**
 * Find matches for a ride using the V3 scoring algorithm.
 */
export async function findMatches(
    rideId: string,
    options?: {
        maxResults?: number;
        minScore?: number;
    }
): Promise<PotentialMatch[]> {
    const supabase = getSupabaseClientOrThrow();

    const { data, error } = await supabase.rpc("find_matches_v3", {
        p_ride_id: rideId,
        p_max_results: options?.maxResults ?? 10,
        p_min_score: options?.minScore ?? 30,
    });

    if (error) throw error;
    return (data || []) as PotentialMatch[];
}

/** Extract a user-friendly message from a Supabase/Postgrest error. */
function toMatchRequestErrorMessage(err: { message?: string; code?: string } | null): string {
    if (!err) return "Failed to send request.";
    const msg = (err.message || "").trim();
    const code = err.code || "";
    if (code === "23505" || msg.toLowerCase().includes("unique")) {
        return "You already sent a request for this ride.";
    }
    if (code === "42501" || /policy|permission|row-level security/i.test(msg)) {
        return "You don't have permission to send this request.";
    }
    if (msg.includes("ride_match_cap_exceeded")) {
        return "Reached max ride limit. Group can have at most 4 people.";
    }
    return msg || "Failed to send request.";
}

/**
 * Send a match request to another ride.
 */
export async function sendMatchRequest(
    myRideId: string,
    targetRideId: string
): Promise<string> {
    const supabase = getSupabaseClientOrThrow();

    const { data, error } = await supabase
        .from("ride_requests")
        .insert({
            ride_id: targetRideId,
            requester_ride_id: myRideId,
        })
        .select("id")
        .single();

    if (error) {
        const friendlyMessage = toMatchRequestErrorMessage(error);
        const e = new Error(friendlyMessage) as Error & { original?: unknown };
        e.original = error;
        throw e;
    }
    return data.id;
}

/**
 * For a set of ride IDs (e.g. from potential matches), returns which are already in a group
 * (accepted ride_request with same host). Used to show "Already in a group of 2" instead of
 * two separate match cards.
 * Keys are ride_id; value is { groupHostRideId, size }. Solo rides get size 1.
 */
export async function getGroupInfoForRides(
    rideIds: string[]
): Promise<Map<string, { groupHostRideId: string; size: number }>> {
    const result = new Map<string, { groupHostRideId: string; size: number }>();
    if (rideIds.length === 0) return result;

    const supabase = getSupabaseClientOrThrow();
    const ids = [...new Set(rideIds)];
    const idSet = new Set(ids);

    const [res1, res2] = await Promise.all([
        supabase
            .from("ride_requests")
            .select("ride_id, requester_ride_id")
            .eq("status", "accepted")
            .in("ride_id", ids),
        supabase
            .from("ride_requests")
            .select("ride_id, requester_ride_id")
            .eq("status", "accepted")
            .in("requester_ride_id", ids),
    ]);

    if (res1.error) throw res1.error;
    if (res2.error) throw res2.error;

    const rows = [...(res1.data || []), ...(res2.data || [])].filter(
        (r) => idSet.has(r.ride_id as string) || idSet.has(r.requester_ride_id as string),
    );

    // Build groups: host ride_id -> set of all ride IDs in group (host + requesters)
    const groupByHost = new Map<string, Set<string>>();
    for (const row of rows || []) {
        const host = row.ride_id as string;
        const requester = row.requester_ride_id as string;
        if (!groupByHost.has(host)) groupByHost.set(host, new Set([host]));
        groupByHost.get(host)!.add(requester);
    }

    for (const rideId of ids) {
        let found = false;
        for (const [host, members] of groupByHost) {
            if (members.has(rideId)) {
                result.set(rideId, { groupHostRideId: host, size: members.size });
                found = true;
                break;
            }
        }
        if (!found) {
            result.set(rideId, { groupHostRideId: rideId, size: 1 });
        }
    }
    return result;
}

/**
 * Collapse potential matches into single cards or group cards. When multiple matches
 * belong to the same existing group (same host + accepted requesters), they become
 * one MatchItem of kind "group" showing "Already in a group of N".
 */
export async function collapseMatchesIntoItems(
    matches: PotentialMatch[]
): Promise<MatchItem[]> {
    if (matches.length === 0) return [];
    const rideIds = matches.map((m) => m.ride_id);
    const groupInfo = await getGroupInfoForRides(rideIds);

    const byGroupHost = new Map<string, PotentialMatch[]>();
    for (const m of matches) {
        const info = groupInfo.get(m.ride_id);
        const host = info?.groupHostRideId ?? m.ride_id;
        const size = info?.size ?? 1;
        if (size >= 2) {
            const list = byGroupHost.get(host) ?? [];
            list.push(m);
            byGroupHost.set(host, list);
        }
    }

    const items: MatchItem[] = [];
    const usedRideIds = new Set<string>();

    for (const [hostRideId, groupMatches] of byGroupHost) {
        if (groupMatches.length === 0) continue;
        groupMatches.forEach((m) => usedRideIds.add(m.ride_id));
        const size = groupInfo.get(groupMatches[0].ride_id)?.size ?? groupMatches.length;
        const primary =
            groupMatches.find((m) => m.ride_id === hostRideId) ?? groupMatches[0];
        items.push({
            kind: "group",
            groupSize: size,
            groupHostRideId: hostRideId,
            primaryMatch: primary,
            allMatches: groupMatches,
        });
    }

    for (const m of matches) {
        if (usedRideIds.has(m.ride_id)) continue;
        items.push({ kind: "single", match: m });
    }

    return items;
}

/** Max number of accepted matches per ride (group = host + 3 = 4 people max). */
export const MAX_MATCHES_PER_RIDE = 3;

/**
 * Returns how many accepted matches this ride already has (0–4).
 * Use to disable Accept / send request when at cap.
 */
export async function getAcceptedMatchCount(rideId: string): Promise<number> {
    const supabase = getSupabaseClientOrThrow();
    const { data, error } = await supabase.rpc("count_accepted_matches_for_ride", {
        p_ride_id: rideId,
    });
    if (error) throw error;
    return typeof data === "number" ? data : 0;
}

/**
 * Accept or reject a match request.
 * When accepted, also set ride_status to 'accepted' so the chat shows step 2 (Confirm meetup) instead of Requested.
 * Throws with message containing "ride_match_cap_exceeded" if either ride already has 3 matches (4 people max).
 */
export async function respondToRequest(
    requestId: string,
    response: "accepted" | "rejected"
) {
    const supabase = getSupabaseClientOrThrow();

    const updates = response === "accepted"
        ? { status: "accepted", ride_status: "accepted" }
        : { status: response };

    const { error } = await supabase
        .from("ride_requests")
        .update(updates)
        .eq("id", requestId);

    if (error) {
        const msg =
            typeof (error as { message?: string }).message === "string"
                ? (error as { message: string }).message
                : "Request update failed";
        throw new Error(msg);
    }
}

/**
 * Withdraw (remove) a pending request that the current user sent.
 * Updates status to 'rejected' so the request no longer appears as pending.
 */
export async function withdrawRequest(requestId: string): Promise<void> {
    const supabase = getSupabaseClientOrThrow();
    const { error } = await supabase
        .from("ride_requests")
        .update({ status: "rejected" })
        .eq("id", requestId);
    if (error) {
        const msg =
            typeof (error as { message?: string }).message === "string"
                ? (error as { message: string }).message
                : "Failed to withdraw request";
        throw new Error(msg);
    }
}

/**
 * Get pending requests for the current user's rides, enriched with profile + ride details.
 */
export interface RideRequest {
    id: string;
    status: string;
    ride_status?: string;
    created_at: string;
    // The ride the request is targeting (one of my rides)
    ride_id: string;
    my_ride_origin: string;
    my_ride_dest: string;
    // The requester's info
    requester_ride_id: string;
    requester_name: string;
    requester_photo: string | null;
    requester_school: string | null;
    requester_rating: number;
    requester_origin: string;
    requester_dest: string;
    requester_departure: string;
    requester_seats: number;
    requester_profile_id: string;
    // Direction: 'incoming' = someone requested to match with my ride, 'outgoing' = I requested
    direction: "incoming" | "outgoing";
}

export async function getMyRequests(profileId?: string): Promise<RideRequest[]> {
    const supabase = getSupabaseClientOrThrow();

    let effectiveProfileId = profileId;

    if (!effectiveProfileId) {
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) return [];

        const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("user_id", user.id)
            .single();

        if (!profile) return [];
        effectiveProfileId = profile.id;
    }

    const { data, error } = await supabase.rpc("get_ride_requests_enriched", {
        p_profile_id: effectiveProfileId,
    });

    if (error) throw error;
    if (!data) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data as any[]).map((row) => ({
        id: row.request_id,
        status: row.request_status,
        ride_status: row.ride_status,
        created_at: row.created_at,
        ride_id: row.ride_id,
        my_ride_origin: row.my_ride_origin || "",
        my_ride_dest: row.my_ride_dest || "",
        requester_ride_id: row.requester_ride_id,
        requester_name: row.requester_name || "Unknown",
        requester_photo: row.requester_photo || null,
        requester_school: row.requester_school || null,
        requester_rating: row.requester_rating || 0,
        requester_origin: row.requester_origin || "",
        requester_dest: row.requester_dest || "",
        requester_departure: row.requester_departure || "",
        requester_seats: row.requester_seats || 1,
        requester_profile_id: row.requester_profile_id || "",
        direction: row.direction as "incoming" | "outgoing",
    })) as RideRequest[];
}

