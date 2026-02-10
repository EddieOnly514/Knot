import { getSupabaseClient } from "@/lib/supabase/client";
import type { PotentialMatch } from "@/types";

/**
 * Find potential matches for a trip intent using the V2 scoring algorithm.
 * Calls the find_potential_matches RPC in Supabase.
 */
export async function findMatches(
    tripIntentId: string,
    options?: {
        timeWindowMinutes?: number;
        maxOriginMeters?: number;
        maxDestMeters?: number;
    }
): Promise<PotentialMatch[]> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase.rpc("find_potential_matches", {
        p_trip_intent_id: tripIntentId,
        p_time_window_minutes: options?.timeWindowMinutes ?? 45,
        p_max_origin_meters: options?.maxOriginMeters ?? 16000,
        p_max_dest_meters: options?.maxDestMeters ?? 16000,
    });

    if (error) throw error;
    return (data || []) as PotentialMatch[];
}

/**
 * Express interest in matching with another trip intent.
 * Returns the match ID. If both users express interest, status becomes 'mutual'.
 */
export async function expressInterest(
    myTripIntentId: string,
    otherTripIntentId: string
): Promise<string> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase.rpc("express_interest", {
        p_my_trip_intent_id: myTripIntentId,
        p_other_trip_intent_id: otherTripIntentId,
    });

    if (error) throw error;
    return data as string;
}

/**
 * Get all matches the current user is part of, with trip + profile details.
 */
export async function getMyMatches() {
    const supabase = getSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (!profile) return [];

    const { data, error } = await supabase
        .from("matches")
        .select(`
            *,
            trip_1:trip_intents!trip_intent_1(*),
            trip_2:trip_intents!trip_intent_2(*),
            profile_1:profiles!user_1(first_name, last_name, photo_url, rating, total_rides, is_verified),
            profile_2:profiles!user_2(first_name, last_name, photo_url, rating, total_rides, is_verified)
        `)
        .or(`user_1.eq.${profile.id},user_2.eq.${profile.id}`)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
}
