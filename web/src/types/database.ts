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
          default_party_size: number | null;
          default_luggage: string | null;
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
          gender_preference: "any" | "same_only";
          gender_identity: "woman" | "man" | "nonbinary" | "prefer_not_to_say" | null;
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
          default_party_size?: number | null;
          default_luggage?: string | null;
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
          gender_preference?: "any" | "same_only";
          gender_identity?: "woman" | "man" | "nonbinary" | "prefer_not_to_say" | null;
          suggested_matches_email_sent_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };

      rides: {
        Row: {
          id: string;
          user_id: string;
          ride_type: "seeking";
          origin_lat: number | null;
          origin_lng: number | null;
          origin_name: string;
          dest_lat: number | null;
          dest_lng: number | null;
          dest_name: string;
          departure_earliest: string;
          departure_latest: string;
          departure_preferred: string | null;
          departure_timezone: string;
          seats_available: number;
          seats_needed: number;
          space_capacity: number;
          gender_pref: string;
          quiet_ride: boolean;
          music_ok: boolean;
          pets_ok: boolean;
          smoking_ok: boolean;
          verified_only: boolean;
          notes: string | null;
          status: "active" | "matched" | "completed" | "cancelled";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          ride_type: "seeking";
          origin_lat?: number | null;
          origin_lng?: number | null;
          origin_name: string;
          dest_lat?: number | null;
          dest_lng?: number | null;
          dest_name: string;
          departure_earliest: string;
          departure_latest: string;
          departure_preferred?: string | null;
          departure_timezone?: string;
          seats_available?: number;
          seats_needed?: number;
          space_capacity?: number;
          gender_pref?: string;
          quiet_ride?: boolean;
          music_ok?: boolean;
          pets_ok?: boolean;
          smoking_ok?: boolean;
          verified_only?: boolean;
          notes?: string | null;
          status?: string;
        };
        Update: Partial<Database["public"]["Tables"]["rides"]["Insert"]>;
      };

      ride_requests: {
        Row: {
          id: string;
          ride_id: string;
          requester_ride_id: string;
          status: "pending" | "accepted" | "rejected" | "withdrawn";
          ride_status: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          ride_id: string;
          requester_ride_id: string;
          status?: "pending" | "accepted" | "rejected" | "withdrawn";
          ride_status?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["ride_requests"]["Insert"]>;
      };

      ride_groups: {
        Row: {
          id: string;
          ride_id: string;
          created_at: string;
          status: "active" | "archived";
          archived_at: string | null;
          updated_at: string | null;
          rider_count: number;
          total_bags: number;
          has_oversized: boolean;
          needs_xl: boolean;
          match_label: string | null;
          effective_departure_earliest: string | null;
          effective_departure_latest: string | null;
          effective_date: string | null;
          origin_centroid_lat: number | null;
          origin_centroid_lng: number | null;
        };
        Insert: {
          id?: string;
          ride_id: string;
          created_at?: string;
          status?: "active" | "archived";
          archived_at?: string | null;
          updated_at?: string | null;
          rider_count?: number;
          total_bags?: number;
          has_oversized?: boolean;
          needs_xl?: boolean;
          match_label?: string | null;
          effective_departure_earliest?: string | null;
          effective_departure_latest?: string | null;
          effective_date?: string | null;
          origin_centroid_lat?: number | null;
          origin_centroid_lng?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["ride_groups"]["Insert"]>;
      };

      ride_group_members: {
        Row: {
          id: string;
          ride_group_id: string;
          ride_id: string;
          joined_at: string;
          left_at: string | null;
          is_main: boolean;
        };
        Insert: {
          id?: string;
          ride_group_id: string;
          ride_id: string;
          joined_at?: string;
          left_at?: string | null;
          is_main?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["ride_group_members"]["Insert"]>;
      };

      messages: {
        Row: {
          id: string;
          conversation_id: string | null;
          ride_group_id: string | null;
          sender_id: string;
          content: string;
          message_type: "text" | "quick_action" | "location" | "system";
          metadata: Json | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id?: string | null;
          ride_group_id?: string | null;
          sender_id: string;
          content: string;
          message_type?: "text" | "quick_action" | "location" | "system";
          metadata?: Json | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["messages"]["Insert"]>;
      };

      message_email_cooldowns: {
        Row: {
          id: string;
          conversation_id: string | null;
          ride_group_id: string | null;
          recipient_profile_id: string;
          last_notified_at: string;
        };
        Insert: {
          id?: string;
          conversation_id?: string | null;
          ride_group_id?: string | null;
          recipient_profile_id: string;
          last_notified_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["message_email_cooldowns"]["Insert"]>;
      };
    };

    Functions: {
      get_my_profile: {
        Args: Record<string, never>;
        Returns: Database["public"]["Tables"]["profiles"]["Row"][];
      };
      get_public_profile: {
        Args: { p_profile_id: string };
        Returns: {
          id: string;
          created_at: string;
          first_name: string;
          last_name: string;
          photo_url: string | null;
          is_verified: boolean;
          rating: number;
          total_rides: number;
          phone_verified: boolean;
          email_verified: boolean;
          id_verified: boolean;
          completed_rides: number;
          gender_preference: string;
          gender_identity: string | null;
          bio: string | null;
          school: string | null;
          conversation_pref: string | null;
          music_pref: string | null;
          smoking_pref: string | null;
        }[];
      };
      find_matches_v4: {
        Args: {
          p_ride_id: string;
          p_max_results?: number;
        };
        Returns: {
          candidate_id: string;
          candidate_type: string;
          request_target_ride_id: string;
          ride_group_id: string | null;
          ride_id: string;
          user_id: string;
          ride_type: string;
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
          notes: string | null;
          first_name: string;
          last_name: string;
          photo_url: string | null;
          bio: string | null;
          school: string | null;
          time_tier: string;
          overlap_minutes: number;
          gap_minutes: number;
          d_origin_miles: number | null;
          d_origin_tier: string;
          d_destination_miles: number | null;
          d_destination_tier: string;
          needs_xl: boolean;
          xl_flag_message: string | null;
          seats_remaining_after_join: number;
          fill_efficiency: number;
          gender_compatible: boolean;
          pref_overall: number;
          group_size_before_join: number;
          group_size_after_join: number;
          members: Json;
          match_label: string;
          match_explanation: string;
        }[];
      };
      leave_ride_group: {
        Args: { p_ride_group_id: string };
        Returns: string;
      };
      get_message_thread_summaries: {
        Args: {
          p_reader_profile_id: string;
          p_conversation_ids: string[];
          p_group_ids: string[];
        };
        Returns: {
          thread_id: string;
          is_group: boolean;
          last_content: string | null;
          last_created_at: string | null;
          last_message_type: string | null;
          unread_count: number;
        }[];
      };
      get_ride_requests_enriched: {
        Args: { p_profile_id: string };
        Returns: {
          request_id: string;
          request_status: string;
          ride_status: string | null;
          created_at: string;
          ride_id: string;
          my_ride_origin: string;
          my_ride_dest: string;
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
          direction: string;
        }[];
      };
    };
  };
}
