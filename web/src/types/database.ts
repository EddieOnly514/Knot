/**
 * Database types matching the actual Supabase SQL schema
 * from mobile/supabase/migrations/001_initial_schema.sql
 * + web/supabase/004_matching_v2.sql
 */

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
          created_at: string;
          updated_at: string;
          user_id: string;
          phone: string | null;
          email: string | null;
          first_name: string;
          last_name: string;
          photo_url: string | null;
          default_party_size: number;
          default_luggage: string;
          is_verified: boolean;
          rating: number;
          total_rides: number;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id: string;
          phone?: string | null;
          email?: string | null;
          first_name?: string;
          last_name?: string;
          photo_url?: string | null;
          default_party_size?: number;
          default_luggage?: string;
          is_verified?: boolean;
          rating?: number;
          total_rides?: number;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
          phone?: string | null;
          email?: string | null;
          first_name?: string;
          last_name?: string;
          photo_url?: string | null;
          default_party_size?: number;
          default_luggage?: string;
          is_verified?: boolean;
          rating?: number;
          total_rides?: number;
        };
      };
      trip_intents: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          destination: string;
          departure_time: string;
          party_size: number;
          luggage: string;
          ride_type: 'standard' | 'xl';
          status: 'searching' | 'matched' | 'confirmed' | 'completed' | 'cancelled';
          rough_location: string | null;
          latitude: number | null;
          longitude: number | null;
          // V2 address fields
          departure_address: string | null;
          departure_city: string | null;
          departure_lat: number | null;
          departure_lng: number | null;
          destination_address: string | null;
          destination_city: string | null;
          destination_lat: number | null;
          destination_lng: number | null;
          car_preference: 'standard' | 'premium';
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id: string;
          destination: string;
          departure_time: string;
          party_size?: number;
          luggage?: string;
          ride_type?: 'standard' | 'xl';
          status?: 'searching' | 'matched' | 'confirmed' | 'completed' | 'cancelled';
          rough_location?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          departure_address?: string | null;
          departure_city?: string | null;
          departure_lat?: number | null;
          departure_lng?: number | null;
          destination_address?: string | null;
          destination_city?: string | null;
          destination_lat?: number | null;
          destination_lng?: number | null;
          car_preference?: 'standard' | 'premium';
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string;
          destination?: string;
          departure_time?: string;
          party_size?: number;
          luggage?: string;
          ride_type?: 'standard' | 'xl';
          status?: 'searching' | 'matched' | 'confirmed' | 'completed' | 'cancelled';
          rough_location?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          departure_address?: string | null;
          departure_city?: string | null;
          departure_lat?: number | null;
          departure_lng?: number | null;
          destination_address?: string | null;
          destination_city?: string | null;
          destination_lat?: number | null;
          destination_lng?: number | null;
          car_preference?: 'standard' | 'premium';
          expires_at?: string | null;
        };
      };
      matches: {
        Row: {
          id: string;
          created_at: string;
          trip_intent_1: string;
          trip_intent_2: string;
          user_1: string;
          user_2: string;
          user_1_interested: boolean;
          user_2_interested: boolean;
          status: 'pending' | 'mutual' | 'meetup_pending' | 'meetup_confirmed' | 'completed';
        };
        Insert: {
          id?: string;
          created_at?: string;
          trip_intent_1: string;
          trip_intent_2: string;
          user_1: string;
          user_2: string;
          user_1_interested?: boolean;
          user_2_interested?: boolean;
          status?: 'pending' | 'mutual' | 'meetup_pending' | 'meetup_confirmed' | 'completed';
        };
        Update: {
          id?: string;
          created_at?: string;
          trip_intent_1?: string;
          trip_intent_2?: string;
          user_1?: string;
          user_2?: string;
          user_1_interested?: boolean;
          user_2_interested?: boolean;
          status?: 'pending' | 'mutual' | 'meetup_pending' | 'meetup_confirmed' | 'completed';
        };
      };
      messages: {
        Row: {
          id: string;
          created_at: string;
          match_id: string;
          sender_id: string;
          content: string;
          read: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          match_id: string;
          sender_id: string;
          content: string;
          read?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          match_id?: string;
          sender_id?: string;
          content?: string;
          read?: boolean;
        };
      };
      meetup_confirmations: {
        Row: {
          id: string;
          created_at: string;
          match_id: string;
          user_id: string;
          location_name: string;
          location_type: 'terminal' | 'landmark' | 'rideshare_zone' | 'custom';
          confirmed: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          match_id: string;
          user_id: string;
          location_name: string;
          location_type?: 'terminal' | 'landmark' | 'rideshare_zone' | 'custom';
          confirmed?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          match_id?: string;
          user_id?: string;
          location_name?: string;
          location_type?: 'terminal' | 'landmark' | 'rideshare_zone' | 'custom';
          confirmed?: boolean;
        };
      };
      trip_ratings: {
        Row: {
          id: string;
          created_at: string;
          match_id: string;
          rater_id: string;
          rated_id: string;
          rating: number;
          would_ride_again: boolean;
          comment: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          match_id: string;
          rater_id: string;
          rated_id: string;
          rating: number;
          would_ride_again: boolean;
          comment?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          match_id?: string;
          rater_id?: string;
          rated_id?: string;
          rating?: number;
          would_ride_again?: boolean;
          comment?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      haversine_distance: {
        Args: {
          lat1: number;
          lon1: number;
          lat2: number;
          lon2: number;
        };
        Returns: number;
      };
      find_potential_matches: {
        Args: {
          p_trip_intent_id: string;
          p_time_window_minutes?: number;
          p_max_origin_meters?: number;
          p_max_dest_meters?: number;
        };
        Returns: {
          trip_intent_id: string;
          user_id: string;
          departure_address: string | null;
          departure_city: string | null;
          destination: string;
          destination_address: string | null;
          destination_city: string | null;
          departure_time: string;
          party_size: number;
          luggage: string;
          car_preference: string;
          origin_distance_meters: number | null;
          dest_distance_meters: number | null;
          time_diff_minutes: number;
          combined_party_size: number;
          match_score: number;
          score_origin: number;
          score_destination: number;
          score_time: number;
          score_party: number;
          score_luggage: number;
          score_car_pref: number;
          match_label: string;
          estimated_savings_cents: number | null;
          first_name: string;
          last_name: string;
          photo_url: string | null;
          rating: number;
          total_rides: number;
          is_verified: boolean;
        }[];
      };
      express_interest: {
        Args: {
          p_my_trip_intent_id: string;
          p_other_trip_intent_id: string;
        };
        Returns: string;
      };
      check_and_update_mutual_match: {
        Args: {
          p_match_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}