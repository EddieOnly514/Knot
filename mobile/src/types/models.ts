/**
 * Knot App - Data Models
 * Matching the Supabase schema
 */

// Enums
export type TripMode = 'now' | 'arrival';
export type TripStatus = 'active' | 'expired' | 'canceled' | 'completed';
export type MatchStatus = 'pending' | 'matched' | 'meetup_confirmed' | 'canceled' | 'completed' | 'blocked';
export type LuggageLevel = 'none' | 'carry_on' | 'one_suitcase' | 'two_plus';
export type SwipeAction = 'interested' | 'pass';

// Profile
export interface Profile {
  user_id: string;
  name: string;
  photo_url: string;
  bio?: string;
  phone_verified: boolean;
  created_at: string;
}

// Trip Intent
export interface TripIntent {
  id: string;
  user_id: string;
  mode: TripMode;
  status: TripStatus;
  origin_lat: number;
  origin_lng: number;
  origin_airport_code?: string; // Required if mode=arrival
  destination_label: string; // e.g., "Downtown", "UCI", "Santa Monica"
  destination_lat: number; // centroid
  destination_lng: number;
  destination_radius_m: number; // e.g., 1500
  time_start: string; // ISO timestamp
  time_end: string; // ISO timestamp
  party_size: number; // 1-2 for MVP
  luggage: LuggageLevel;
  created_at: string;
  updated_at: string;
}

// Swipe
export interface Swipe {
  id: string;
  from_user_id: string;
  to_user_id: string;
  trip_intent_id: string; // the swiper's active intent
  action: SwipeAction;
  created_at: string;
}

// Match
export interface Match {
  id: string;
  user_a: string;
  user_b: string;
  trip_intent_a: string;
  trip_intent_b: string;
  status: MatchStatus;
  meetup_confirm_a: boolean;
  meetup_confirm_b: boolean;
  meetup_label?: string;
  meetup_lat?: number;
  meetup_lng?: number;
  destination_revealed: boolean;
  created_at: string;
  updated_at: string;
}

// Message
export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

// Block
export interface Block {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

// Report
export interface Report {
  id: string;
  reporter_id: string;
  reported_id: string;
  match_id?: string;
  reason: string;
  details?: string;
  created_at: string;
}

// Rating
export interface Rating {
  id: string;
  match_id: string;
  rater_id: string;
  ratee_id: string;
  stars: 1 | 2 | 3 | 4 | 5;
  would_ride_again: boolean;
  comment?: string;
  created_at: string;
}

// Suggestion (for match feed)
export interface Suggestion {
  profile: Profile;
  trip_intent: TripIntent;
  match_label: string;
}

// Combined Match with profiles (for UI)
export interface MatchWithProfiles extends Match {
  other_profile: Profile;
  other_intent: TripIntent;
  messages?: Message[];
}
