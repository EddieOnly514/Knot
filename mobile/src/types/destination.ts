/**
 * Destination Search Types
 */

// Unified destination object used throughout the app
export interface Destination {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    type: DestinationType;
    entryHint?: string; // e.g., "Terminal 2", "Main entrance"
}

export type DestinationType = 'airport' | 'transit' | 'address' | 'poi' | 'city' | 'saved';

// Autocomplete suggestion (lightweight, no lat/lng)
export interface Suggestion {
    id: string;
    placeId: string; // Google Place ID for resolution
    primaryText: string;
    secondaryText: string;
    category: SuggestionCategory;
    source: SuggestionSource;
    distance?: number; // meters from user
}

export type SuggestionCategory =
    | 'airport'
    | 'transit'
    | 'city'
    | 'address'
    | 'poi'
    | 'home'
    | 'work'
    | 'recent';

export type SuggestionSource = 'live' | 'recent' | 'saved';

// Saved place (Home, Work)
export interface SavedPlace {
    id: string;
    label: 'Home' | 'Work' | string;
    destination: Destination;
}

// Recent destination entry
export interface RecentDestination {
    destination: Destination;
    timestamp: number;
}

// Search input parameters
export interface SearchParams {
    query: string;
    userLocation?: {
        latitude: number;
        longitude: number;
    };
    biasRadius?: number; // meters, default 50000
}
