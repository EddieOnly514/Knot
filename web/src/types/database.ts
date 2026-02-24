// Auto-generated types for Supabase — Schema V3

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          first_name: string;
          last_name: string;
          email: string | null;
          phone: string | null;
          photo_url: string | null;
          bio: string | null;
          school: string | null;
          conversation_pref: string | null;
          music_pref: string | null;
          smoking_pref: string | null;
          rating: number;
          total_rides: number;
          is_verified: boolean;
          phone_verified: boolean;
          email_verified: boolean;
          id_verified: boolean;
          completed_rides: number;
          gender_preference: string;
          suggested_matches_email_sent_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          first_name: string;
          last_name: string;
          email?: string | null;
          phone?: string | null;
          photo_url?: string | null;
          bio?: string | null;
          school?: string | null;
          conversation_pref?: string | null;
          music_pref?: string | null;
          smoking_pref?: string | null;
          rating?: number;
          total_rides?: number;
          is_verified?: boolean;
          phone_verified?: boolean;
          email_verified?: boolean;
          id_verified?: boolean;
          completed_rides?: number;
          gender_preference?: string;
          suggested_matches_email_sent_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };

      rides: {
        Row: {
          id: string;
          user_id: string;
          ride_type: "offering" | "seeking";
          origin_lat: number | null;
          origin_lng: number | null;
          origin_name: string;
          dest_lat: number | null;
          dest_lng: number | null;
          dest_name: string;
          departure_earliest: string;
          departure_latest: string;
          departure_preferred: string | null;
          seats_available: number;
          seats_needed: number;
          space_capacity: number;
          gender_pref: string;
          quiet_ride: boolean;
          music_ok: boolean;
          pets_ok: boolean;
          smoking_ok: boolean;
          verified_only: boolean;
          status: "active" | "matched" | "completed" | "cancelled";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          ride_type: "offering" | "seeking";
          origin_lat?: number | null;
          origin_lng?: number | null;
          origin_name: string;
          dest_lat?: number | null;
          dest_lng?: number | null;
          dest_name: string;
          departure_earliest: string;
          departure_latest: string;
          departure_preferred?: string | null;
          seats_available?: number;
          seats_needed?: number;
          space_capacity?: number;
          gender_pref?: string;
          quiet_ride?: boolean;
          music_ok?: boolean;
          pets_ok?: boolean;
          smoking_ok?: boolean;
          verified_only?: boolean;
          status?: string;
        };
        Update: Partial<Database["public"]["Tables"]["rides"]["Insert"]>;
      };

      ride_matches: {
        Row: {
          id: string;
          ride_id: string;
          matched_ride_id: string;
          total_score: number;
          score_route: number;
          score_time: number;
          score_trust: number;
          score_space: number;
          score_prefs: number;
          time_overlap_minutes: number;
          detour_ratio: number;
          origin_distance_miles: number | null;
          dest_distance_miles: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          ride_id: string;
          matched_ride_id: string;
          total_score?: number;
          score_route?: number;
          score_time?: number;
          score_trust?: number;
          score_space?: number;
          score_prefs?: number;
          time_overlap_minutes?: number;
          detour_ratio?: number;
          origin_distance_miles?: number | null;
          dest_distance_miles?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["ride_matches"]["Insert"]>;
      };

      ride_requests: {
        Row: {
          id: string;
          ride_id: string;
          requester_ride_id: string;
          status: "pending" | "accepted" | "rejected";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          ride_id: string;
          requester_ride_id: string;
          status?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ride_requests"]["Insert"]>;
      };

      ride_groups: {
        Row: {
          id: string;
          ride_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          ride_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ride_groups"]["Insert"]>;
      };
    };

    Functions: {
      count_accepted_matches_for_ride: {
        Args: { p_ride_id: string };
        Returns: number;
      };
      find_matches_v3: {
        Args: {
          p_ride_id: string;
          p_max_results?: number;
          p_min_score?: number;
        };
        Returns: {
          ride_id: string;
          user_id: string;
          ride_type: string;
          origin_name: string;
          dest_name: string;
          departure_earliest: string;
          departure_latest: string;
          departure_preferred: string | null;
          seats_available: number;
          seats_needed: number;
          space_capacity: number;
          gender_pref: string;
          quiet_ride: boolean;
          music_ok: boolean;
          first_name: string;
          last_name: string;
          photo_url: string | null;
          bio: string | null;
          rating: number;
          total_rides: number;
          phone_verified: boolean;
          email_verified: boolean;
          id_verified: boolean;
          total_score: number;
          score_route: number;
          score_time: number;
          score_trust: number;
          score_space: number;
          score_prefs: number;
          origin_distance_miles: number | null;
          dest_distance_miles: number | null;
          time_overlap_minutes: number;
          match_label: string;
        }[];
      };
    };
  };
}