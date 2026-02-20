import { getSupabaseClient } from "@/lib/supabase/client";
import type { PotentialMatch } from "@/types";

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
    const supabase = getSupabaseClient();

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
    const supabase = getSupabaseClient();

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

/** Max number of accepted matches per ride (group = host + 3 = 4 people max). */
export const MAX_MATCHES_PER_RIDE = 3;

/**
 * Returns how many accepted matches this ride already has (0–4).
 * Use to disable Accept / send request when at cap.
 */
export async function getAcceptedMatchCount(rideId: string): Promise<number> {
    const supabase = getSupabaseClient();
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
    const supabase = getSupabaseClient();

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
    const supabase = getSupabaseClient();
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
    const supabase = getSupabaseClient();

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

