import { getSupabaseClient } from "@/lib/supabase/client";

export interface CreateRideData {
    rideType: "offering" | "seeking";
    // Origin
    originName: string;
    originLat?: number;
    originLng?: number;
    // Destination
    destName: string;
    destLat?: number;
    destLng?: number;
    // Time window
    departureEarliest: Date;
    departureLatest: Date;
    departurePreferred?: Date;
    // Capacity
    seatsAvailable?: number;
    seatsNeeded?: number;
    spaceCapacity?: number;
    // Preferences
    genderPref?: string;
    quietRide?: boolean;
    musicOk?: boolean;
    petsOk?: boolean;
    smokingOk?: boolean;
    verifiedOnly?: boolean;
    notes?: string;
}

/**
 * Insert a new ride into the rides table.
 */
export async function createRide(data: CreateRideData) {
    const supabase = getSupabaseClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (!profile) throw new Error("Profile not found");

    const { data: ride, error } = await supabase
        .from("rides")
        .insert({
            user_id: profile.id,
            ride_type: data.rideType,
            // Origin
            origin_name: data.originName,
            origin_lat: data.originLat || null,
            origin_lng: data.originLng || null,
            // Destination
            dest_name: data.destName,
            dest_lat: data.destLat || null,
            dest_lng: data.destLng || null,
            // Time
            departure_earliest: data.departureEarliest.toISOString(),
            departure_latest: data.departureLatest.toISOString(),
            departure_preferred: data.departurePreferred?.toISOString() || null,
            // Capacity
            seats_available: data.seatsAvailable ?? 1,
            seats_needed: data.seatsNeeded ?? 1,
            space_capacity: data.spaceCapacity ?? 1,
            // Preferences
            gender_pref: data.genderPref ?? "any",
            quiet_ride: data.quietRide ?? false,
            music_ok: data.musicOk ?? true,
            pets_ok: data.petsOk ?? false,
            smoking_ok: data.smokingOk ?? false,
            verified_only: data.verifiedOnly ?? false,
            notes: data.notes || null,
        })
        .select()
        .single();

    if (error) throw error;
    return ride;
}

/**
 * Get the current user's active rides.
 *
 * If a profileId is provided, we skip the auth + profile lookup and query directly
 * by profile id (which is the foreign key for rides.user_id).
 */
export async function getMyRides(profileId?: string) {
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

    const { data, error } = await supabase
        .from("rides")
        .select("*")
        .eq("user_id", effectiveProfileId)
        .eq("status", "active")
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
}

/**
 * Get the current user's completed rides with partner info.
 */
export interface CompletedRide {
    request_id: string;
    ride_status: string;
    completed_at: string;
    // My ride info
    my_origin: string;
    my_dest: string;
    departure_earliest: string;
    departure_latest: string;
    // Partner info
    partner_name: string;
    partner_photo: string | null;
    partner_school: string | null;
    partner_profile_id: string;
    partner_origin: string;
    partner_dest: string;
}

export async function getCompletedRides(profileId?: string): Promise<CompletedRide[]> {
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

    const { data, error } = await supabase.rpc("get_completed_rides_enriched", {
        p_profile_id: effectiveProfileId,
    });

    if (error) throw error;
    if (!data) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data as any[]).map((row) => ({
        request_id: row.request_id,
        ride_status: row.ride_status,
        completed_at: row.completed_at,
        my_origin: row.my_origin || "",
        my_dest: row.my_dest || "",
        departure_earliest: row.departure_earliest || "",
        departure_latest: row.departure_latest || "",
        partner_name: row.partner_name || "Unknown",
        partner_photo: row.partner_photo || null,
        partner_school: row.partner_school || null,
        partner_profile_id: row.partner_profile_id || "",
        partner_origin: row.partner_origin || "",
        partner_dest: row.partner_dest || "",
    })) as CompletedRide[];
}

/**
 * Fetch a single ride by id (for edit form prefill).
 */
export async function getRideById(rideId: string) {
    const supabase = getSupabaseClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();
    if (!profile) throw new Error("Profile not found");

    const { data, error } = await supabase
        .from("rides")
        .select("*")
        .eq("id", rideId)
        .eq("user_id", profile.id)
        .single();

    if (error) throw error;
    return data;
}

/**
 * Update an existing ride.
 */
export async function updateRide(rideId: string, data: Partial<CreateRideData>) {
    const supabase = getSupabaseClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();
    if (!profile) throw new Error("Profile not found");

    const payload: Record<string, unknown> = {};
    if (data.originName != null) payload.origin_name = data.originName;
    if (data.originLat != null) payload.origin_lat = data.originLat;
    if (data.originLng != null) payload.origin_lng = data.originLng;
    if (data.destName != null) payload.dest_name = data.destName;
    if (data.destLat != null) payload.dest_lat = data.destLat;
    if (data.destLng != null) payload.dest_lng = data.destLng;
    if (data.departureEarliest != null)
        payload.departure_earliest = data.departureEarliest.toISOString();
    if (data.departureLatest != null)
        payload.departure_latest = data.departureLatest.toISOString();
    if (data.departurePreferred != null)
        payload.departure_preferred = data.departurePreferred.toISOString();
    if (data.seatsNeeded != null) payload.seats_needed = data.seatsNeeded;
    if (data.seatsAvailable != null) payload.seats_available = data.seatsAvailable;
    if (data.spaceCapacity != null) payload.space_capacity = data.spaceCapacity;
    if (data.genderPref != null) payload.gender_pref = data.genderPref;
    if (data.quietRide != null) payload.quiet_ride = data.quietRide;
    if (data.musicOk != null) payload.music_ok = data.musicOk;
    if (data.notes !== undefined) payload.notes = data.notes;

    const { data: ride, error } = await supabase
        .from("rides")
        .update(payload)
        .eq("id", rideId)
        .eq("user_id", profile.id)
        .select()
        .single();

    if (error) throw error;
    return ride;
}

/**
 * Cancel a ride.
 */
export async function cancelRide(rideId: string) {
    const supabase = getSupabaseClient();

    const { error } = await supabase
        .from("rides")
        .update({ status: "cancelled" })
        .eq("id", rideId);

    if (error) throw error;
}
