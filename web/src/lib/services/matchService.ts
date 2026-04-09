import { getSupabaseClientOrThrow } from "@/lib/supabase/client";
import type { MatchCandidate, MatchMemberSummary } from "@/types";

/**
 * Find matches for a ride using the V3 scoring algorithm.
 */
export async function findMatches(
    rideId: string,
    options?: {
        maxResults?: number;
        minScore?: number;
    }
): Promise<MatchCandidate[]> {
    const supabase = getSupabaseClientOrThrow();

    const normalize = (
        rows: Array<MatchCandidate & { members: unknown }>
    ): MatchCandidate[] =>
        rows.map((row) => ({
            ...row,
            candidate_type:
                row.candidate_type === "group"
                    ? ("group" as const)
                    : ("solo" as const),
            members: Array.isArray(row.members) ? (row.members as MatchMemberSummary[]) : [],
        }));

    const { data, error } = await supabase.rpc("find_matches_v3", {
        p_ride_id: rideId,
        p_max_results: options?.maxResults ?? 10,
        p_min_score: options?.minScore ?? 0,
    });

    if (!error) {
        return normalize((data || []) as Array<MatchCandidate & { members: unknown }>);
    }

    if (process.env.NODE_ENV !== "development") {
        throw error;
    }

    const res = await fetch(
        `/api/dev-matches?rideId=${encodeURIComponent(rideId)}&maxResults=${options?.maxResults ?? 10}`,
        { cache: "no-store" }
    );

    if (!res.ok) {
        throw error;
    }

    const fallbackData = (await res.json()) as Array<MatchCandidate & { members: unknown }>;
    return normalize(fallbackData);
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
        return "Reached max ride limit. Group can have at most 6 people.";
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

/** Max total seats per group (e.g. 2 rides with seats_needed=3 each = 6). */
export const MAX_GROUP_SEATS = 6;

/**
 * Returns total seats currently filled in this ride's group.
 * A ride with seats_needed=2 counts as 2 toward the 6-seat cap.
 * Use to disable Accept / send request when at cap.
 */
export async function getGroupSeatCount(rideId: string): Promise<number> {
    const supabase = getSupabaseClientOrThrow();
    const { data, error } = await supabase.rpc("count_group_seats_for_ride", {
        p_ride_id: rideId,
    });
    if (error) throw error;
    return typeof data === "number" ? data : 0;
}

/**
 * Accept or reject a match request.
 * Verifies the current user owns the target ride before allowing the response.
 * When accepted, also set ride_status to 'accepted' so the chat shows step 2 (Confirm meetup) instead of Requested.
 * Throws with message containing "ride_match_cap_exceeded" if either ride already has 3 matches (4 people max).
 */
export async function respondToRequest(
    requestId: string,
    response: "accepted" | "rejected"
) {
    const supabase = getSupabaseClientOrThrow();

    // Verify the current user owns the ride this request targets
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const { data: profile } = await supabase
        .from("profiles").select("id").eq("user_id", user.id).single();
    if (!profile) throw new Error("Profile not found");

    const { data: myRides } = await supabase
        .from("rides").select("id").eq("user_id", profile.id);
    const myRideIds = (myRides ?? []).map((r: { id: string }) => r.id);

    const { data: req } = await supabase
        .from("ride_requests").select("ride_id").eq("id", requestId).single();
    if (!req || !myRideIds.includes(req.ride_id)) {
        throw new Error("Request not found or you don't have permission to respond.");
    }

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
 * Verifies the current user is the requester before allowing withdrawal.
 * Updates status to 'rejected' so the request no longer appears as pending.
 */
export async function withdrawRequest(requestId: string): Promise<void> {
    const supabase = getSupabaseClientOrThrow();

    // Verify the current user owns the requester ride
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const { data: profile } = await supabase
        .from("profiles").select("id").eq("user_id", user.id).single();
    if (!profile) throw new Error("Profile not found");

    const { data: myRides } = await supabase
        .from("rides").select("id").eq("user_id", profile.id);
    const myRideIds = (myRides ?? []).map((r: { id: string }) => r.id);

    const { data: req } = await supabase
        .from("ride_requests").select("requester_ride_id").eq("id", requestId).single();
    if (!req || !myRideIds.includes(req.requester_ride_id)) {
        throw new Error("Request not found or you don't have permission to withdraw it.");
    }

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
