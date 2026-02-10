import { getSupabaseClient } from "@/lib/supabase/client";

export interface CreateTripIntentData {
    // Departure
    departureAddress: string;
    departureCity?: string;
    departureLat?: number;
    departureLng?: number;
    // Destination
    destination: string;
    destinationAddress?: string;
    destinationCity?: string;
    destinationLat?: number;
    destinationLng?: number;
    // Time
    departureTime: Date;
    // Preferences
    partySize: number;
    luggage: string;
    carPreference: "standard" | "premium";
}

/**
 * Insert a new trip intent into Supabase.
 * Sets expires_at to 2 hours before departure.
 */
export async function createTripIntent(data: CreateTripIntentData) {
    const supabase = getSupabaseClient();

    // Get current user's profile ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (!profile) throw new Error("Profile not found");

    // Calculate expiration (2 hours before departure)
    const expiresAt = new Date(data.departureTime.getTime() - 2 * 60 * 60 * 1000);

    const { data: trip, error } = await supabase
        .from("trip_intents")
        .insert({
            user_id: profile.id,
            // Departure
            departure_address: data.departureAddress,
            departure_city: data.departureCity || null,
            departure_lat: data.departureLat || null,
            departure_lng: data.departureLng || null,
            // Also set legacy fields for backward compat
            rough_location: data.departureAddress,
            latitude: data.departureLat || null,
            longitude: data.departureLng || null,
            // Destination
            destination: data.destination,
            destination_address: data.destinationAddress || data.destination,
            destination_city: data.destinationCity || null,
            destination_lat: data.destinationLat || null,
            destination_lng: data.destinationLng || null,
            // Time
            departure_time: data.departureTime.toISOString(),
            expires_at: expiresAt.toISOString(),
            // Preferences
            party_size: data.partySize,
            luggage: data.luggage,
            car_preference: data.carPreference,
        })
        .select()
        .single();

    if (error) throw error;
    return trip;
}

/**
 * Get the current user's active (searching) trip intents.
 */
export async function getMyTripIntents() {
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
        .from("trip_intents")
        .select("*")
        .eq("user_id", profile.id)
        .eq("status", "searching")
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
}

/**
 * Cancel a trip intent.
 */
export async function cancelTripIntent(tripIntentId: string) {
    const supabase = getSupabaseClient();

    const { error } = await supabase
        .from("trip_intents")
        .update({ status: "cancelled" })
        .eq("id", tripIntentId);

    if (error) throw error;
}
