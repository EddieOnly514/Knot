export * from "./database";

export type { Profile } from "@/contexts/AuthContext";

// Match result from find_matches_v3 RPC
export interface PotentialMatch {
    ride_id: string;
    user_id: string;
    ride_type: "offering" | "seeking";
    // Location
    origin_name: string;
    dest_name: string;
    // Time window
    departure_earliest: string;
    departure_latest: string;
    departure_preferred: string | null;
    // Capacity
    seats_available: number;
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
    rating: number;
    total_rides: number;
    phone_verified: boolean;
    email_verified: boolean;
    id_verified: boolean;
    // Scores
    total_score: number;
    score_route: number;
    score_time: number;
    score_trust: number;
    score_space: number;
    score_prefs: number;
    // Metadata
    origin_distance_miles: number | null;
    dest_distance_miles: number | null;
    time_overlap_minutes: number;
    match_label: string;
}

/** Single match card (one person) or grouped (already in a group of N). */
export type MatchItem =
    | { kind: "single"; match: PotentialMatch }
    | {
          kind: "group";
          groupSize: number;
          groupHostRideId: string;
          primaryMatch: PotentialMatch;
          allMatches: PotentialMatch[];
      };
