export * from "./database";

export type { Profile } from "@/contexts/AuthContext";

export type TimeTier =
    | "STRONG"
    | "OKAY"
    | "WEAK"
    | "BORDERLINE"
    | "LAST_RESORT";

export type OriginTier = "CLOSE" | "NEAR" | "OKAY";
export type DestinationTier = "SAME_AREA" | "VERY_CLOSE" | "NEARBY";

export interface MatchMemberSummary {
    ride_id: string;
    user_id: string;
    first_name: string;
    last_name: string;
    photo_url: string | null;
    school: string | null;
    origin_name: string;
    dest_name: string;
    departure_earliest: string;
    departure_latest: string;
    departure_preferred: string | null;
    seats_needed: number;
    space_capacity: number;
    gender_pref: string;
    quiet_ride: boolean;
    music_ok: boolean;
}

// Match result from find_matches_v3 RPC
export interface MatchCandidate {
    candidate_id: string;
    candidate_type: "solo" | "group";
    request_target_ride_id: string;
    ride_group_id: string | null;
    ride_id: string;
    user_id: string;
    ride_type: "seeking";
    // Location
    origin_name: string;
    dest_name: string;
    // Time window
    departure_earliest: string;
    departure_latest: string;
    departure_preferred: string | null;
    // Capacity
    seats_needed: number;
    space_capacity: number;
    // Preferences
    gender_pref: string;
    quiet_ride: boolean;
    music_ok: boolean;
    notes: string | null;
    // Profile
    first_name: string;
    last_name: string;
    photo_url: string | null;
    bio: string | null;
    school: string | null;
    // Metadata
    time_tier: TimeTier;
    overlap_minutes: number;
    gap_minutes: number;
    d_origin_miles: number | null;
    d_origin_tier: OriginTier;
    d_destination_miles: number | null;
    d_destination_tier: DestinationTier;
    needs_xl: boolean;
    xl_flag_message: string | null;
    seats_remaining_after_join: number;
    fill_efficiency: number;
    gender_compatible: boolean;
    pref_overall: number;
    group_size_before_join: number;
    group_size_after_join: number;
    members: MatchMemberSummary[];
    match_label: string;
    match_explanation: string;
}
