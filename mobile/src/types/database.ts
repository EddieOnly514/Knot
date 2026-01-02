/**
 * Database types generated from Supabase schema
 * These types match exactly with our database schema
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
          user_id: string;
          name: string;
          photo_url: string;
          bio: string | null;
          phone_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          name: string;
          photo_url: string;
          bio?: string | null;
          phone_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          name?: string;
          photo_url?: string;
          bio?: string | null;
          phone_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      trip_intents: {
        Row: {
          id: string;
          user_id: string;
          mode: 'now' | 'arrival';
          status: 'active' | 'expired' | 'canceled' | 'completed';
          origin_lat: number;
          origin_lng: number;
          origin_airport_code: string | null;
          destination_label: string;
          destination_lat: number;
          destination_lng: number;
          destination_radius_m: number;
          time_start: string;
          time_end: string;
          party_size: number;
          luggage: 'none' | 'carry_on' | 'one_suitcase' | 'two_plus';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          mode: 'now' | 'arrival';
          status?: 'active' | 'expired' | 'canceled' | 'completed';
          origin_lat: number;
          origin_lng: number;
          origin_airport_code?: string | null;
          destination_label: string;
          destination_lat: number;
          destination_lng: number;
          destination_radius_m: number;
          time_start: string;
          time_end: string;
          party_size?: number;
          luggage?: 'none' | 'carry_on' | 'one_suitcase' | 'two_plus';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          mode?: 'now' | 'arrival';
          status?: 'active' | 'expired' | 'canceled' | 'completed';
          origin_lat?: number;
          origin_lng?: number;
          origin_airport_code?: string | null;
          destination_label?: string;
          destination_lat?: number;
          destination_lng?: number;
          destination_radius_m?: number;
          time_start?: string;
          time_end?: string;
          party_size?: number;
          luggage?: 'none' | 'carry_on' | 'one_suitcase' | 'two_plus';
          created_at?: string;
          updated_at?: string;
        };
      };
      swipes: {
        Row: {
          id: string;
          from_user_id: string;
          to_user_id: string;
          trip_intent_id: string;
          action: 'interested' | 'pass';
          created_at: string;
        };
        Insert: {
          id?: string;
          from_user_id: string;
          to_user_id: string;
          trip_intent_id: string;
          action: 'interested' | 'pass';
          created_at?: string;
        };
        Update: {
          id?: string;
          from_user_id?: string;
          to_user_id?: string;
          trip_intent_id?: string;
          action?: 'interested' | 'pass';
          created_at?: string;
        };
      };
      matches: {
        Row: {
          id: string;
          user_a: string;
          user_b: string;
          trip_intent_a: string;
          trip_intent_b: string;
          status: 'pending' | 'matched' | 'meetup_confirmed' | 'canceled' | 'completed' | 'blocked';
          meetup_confirm_a: boolean;
          meetup_confirm_b: boolean;
          meetup_label: string | null;
          meetup_lat: number | null;
          meetup_lng: number | null;
          destination_revealed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_a: string;
          user_b: string;
          trip_intent_a: string;
          trip_intent_b: string;
          status?: 'pending' | 'matched' | 'meetup_confirmed' | 'canceled' | 'completed' | 'blocked';
          meetup_confirm_a?: boolean;
          meetup_confirm_b?: boolean;
          meetup_label?: string | null;
          meetup_lat?: number | null;
          meetup_lng?: number | null;
          destination_revealed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_a?: string;
          user_b?: string;
          trip_intent_a?: string;
          trip_intent_b?: string;
          status?: 'pending' | 'matched' | 'meetup_confirmed' | 'canceled' | 'completed' | 'blocked';
          meetup_confirm_a?: boolean;
          meetup_confirm_b?: boolean;
          meetup_label?: string | null;
          meetup_lat?: number | null;
          meetup_lng?: number | null;
          destination_revealed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          match_id: string;
          sender_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          sender_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          sender_id?: string;
          content?: string;
          created_at?: string;
        };
      };
      blocks: {
        Row: {
          id: string;
          blocker_id: string;
          blocked_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          blocker_id: string;
          blocked_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          blocker_id?: string;
          blocked_id?: string;
          created_at?: string;
        };
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          reported_id: string;
          match_id: string | null;
          reason: string;
          details: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          reported_id: string;
          match_id?: string | null;
          reason: string;
          details?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          reporter_id?: string;
          reported_id?: string;
          match_id?: string | null;
          reason?: string;
          details?: string | null;
          created_at?: string;
        };
      };
      ratings: {
        Row: {
          id: string;
          match_id: string;
          rater_id: string;
          ratee_id: string;
          stars: 1 | 2 | 3 | 4 | 5;
          would_ride_again: boolean;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          rater_id: string;
          ratee_id: string;
          stars: 1 | 2 | 3 | 4 | 5;
          would_ride_again: boolean;
          comment?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          rater_id?: string;
          ratee_id?: string;
          stars?: 1 | 2 | 3 | 4 | 5;
          would_ride_again?: boolean;
          comment?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      expire_old_trip_intents: {
        Args: {};
        Returns: void;
      };
    };
    Enums: {
      trip_mode: 'now' | 'arrival';
      trip_status: 'active' | 'expired' | 'canceled' | 'completed';
      match_status: 'pending' | 'matched' | 'meetup_confirmed' | 'canceled' | 'completed' | 'blocked';
      luggage_level: 'none' | 'carry_on' | 'one_suitcase' | 'two_plus';
      swipe_action: 'interested' | 'pass';
    };
  };
}