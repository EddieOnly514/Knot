export * from "./database";

// Re-export Profile from AuthContext for convenience
export type { Profile } from "@/contexts/AuthContext";

// Potential match result from find_potential_matches RPC (V2)
export interface PotentialMatch {
    trip_intent_id: string;
    user_id: string;
    // Address info
    departure_address: string | null;
    departure_city: string | null;
    destination: string;
    destination_address: string | null;
    destination_city: string | null;
    departure_time: string;
    party_size: number;
    luggage: string;
    car_preference: string;
    // Computed distances
    origin_distance_meters: number | null;
    dest_distance_meters: number | null;
    time_diff_minutes: number;
    combined_party_size: number;
    // Score
    match_score: number;
    score_origin: number;
    score_destination: number;
    score_time: number;
    score_party: number;
    score_luggage: number;
    score_car_pref: number;
    match_label: string;
    estimated_savings_cents: number | null;
    // Profile
    first_name: string;
    last_name: string;
    photo_url: string | null;
    rating: number;
    total_rides: number;
    is_verified: boolean;
}

// Chat message
export interface Message {
    id: string;
    created_at: string;
    match_id: string;
    sender_id: string;
    content: string;
    read: boolean;
}
