import { supabase } from '../lib/supabase';

// DEV MODE flag - matches AuthContext
const DEV_MODE = false;

export interface TripIntent {
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
    latitude?: number;
    longitude?: number;
}

export interface CreateTripIntentParams {
    destination: string;
    departure_time: Date;
    party_size: number;
    luggage: string;
    ride_type: 'standard' | 'xl';
    rough_location?: string;
    latitude?: number;
    longitude?: number;
}

// Potential match with profile info and a user-facing compatibility tier.
export interface PotentialMatch {
    trip_intent_id: string;
    user_id: string;
    destination: string;
    departure_time: string;
    party_size: number;
    luggage: string;
    ride_type: string;
    rough_location: string | null;
    latitude: number | null;
    longitude: number | null;
    distance_meters: number | null;
    time_diff_minutes: number;
    match_label?: string;
    // Profile info
    first_name: string;
    last_name: string;
    photo_url: string | null;
    rating: number;
    total_rides: number;
}

// Mock trips for dev mode
const mockTrips: TripIntent[] = [
    {
        id: 'dev-trip-1',
        created_at: new Date().toISOString(),
        user_id: 'dev-user-001',
        destination: 'Downtown SF',
        departure_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        party_size: 1,
        luggage: 'none',
        ride_type: 'standard',
        status: 'searching',
        rough_location: 'Near Terminal 2, SFO',
    },
    {
        id: 'dev-trip-2',
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        user_id: 'dev-user-001',
        destination: 'Oakland',
        departure_time: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        party_size: 2,
        luggage: 'one',
        ride_type: 'xl',
        status: 'completed',
        rough_location: 'SFO Airport',
    },
];

// Mock matches for dev mode
const mockMatches: PotentialMatch[] = [
    {
        trip_intent_id: 'mock-trip-1',
        user_id: 'mock-user-1',
        destination: 'Downtown SF',
        departure_time: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        party_size: 1,
        luggage: 'one',
        ride_type: 'standard',
        rough_location: 'Near Terminal 2, SFO Airport',
        latitude: null,
        longitude: null,
        distance_meters: 500,
        time_diff_minutes: 15,
        match_label: 'Great Match',
        first_name: 'Sarah',
        last_name: 'M.',
        photo_url: 'https://randomuser.me/api/portraits/women/44.jpg',
        rating: 4.9,
        total_rides: 12,
    },
    {
        trip_intent_id: 'mock-trip-2',
        user_id: 'mock-user-2',
        destination: 'Downtown SF',
        departure_time: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
        party_size: 2,
        luggage: 'two',
        ride_type: 'xl',
        rough_location: 'Near Terminal 1, SFO Airport',
        latitude: null,
        longitude: null,
        distance_meters: 1200,
        time_diff_minutes: 20,
        match_label: 'Possible Match',
        first_name: 'Mike',
        last_name: 'J.',
        photo_url: 'https://randomuser.me/api/portraits/men/32.jpg',
        rating: 4.7,
        total_rides: 8,
    },
    {
        trip_intent_id: 'mock-trip-3',
        user_id: 'mock-user-3',
        destination: 'Downtown SF',
        departure_time: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        party_size: 1,
        luggage: 'none',
        ride_type: 'standard',
        rough_location: 'Near Baggage Claim, SFO Airport',
        latitude: null,
        longitude: null,
        distance_meters: 300,
        time_diff_minutes: 10,
        match_label: 'Great Match',
        first_name: 'Emily',
        last_name: 'C.',
        photo_url: 'https://randomuser.me/api/portraits/women/68.jpg',
        rating: 4.8,
        total_rides: 5,
    },
];

export const tripService = {
    /**
     * Create a new trip intent
     */
    async createTripIntent(params: CreateTripIntentParams): Promise<{ data: TripIntent | null; error: Error | null }> {
        if (DEV_MODE) {
            const mockTrip: TripIntent = {
                id: 'dev-trip-' + Date.now(),
                created_at: new Date().toISOString(),
                user_id: 'dev-user-001',
                destination: params.destination,
                departure_time: params.departure_time.toISOString(),
                party_size: params.party_size,
                luggage: params.luggage,
                ride_type: params.ride_type,
                status: 'searching',
                rough_location: params.rough_location || null,
            };
            mockTrips.unshift(mockTrip);
            return { data: mockTrip, error: null };
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { data: null, error: new Error('Not authenticated') };
        }

        // Get user's profile ID
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (!profile) {
            return { data: null, error: new Error('Profile not found') };
        }

        const { data, error } = await supabase
            .from('trip_intents')
            .insert({
                user_id: profile.id,
                destination: params.destination,
                departure_time: params.departure_time.toISOString(),
                party_size: params.party_size,
                luggage: params.luggage,
                ride_type: params.ride_type,
                rough_location: params.rough_location,
                latitude: params.latitude,
                longitude: params.longitude,
                status: 'searching',
            })
            .select()
            .single();

        return { data, error: error as Error | null };
    },

    /**
     * Get user's trip intents
     */
    async getMyTripIntents(): Promise<{ data: TripIntent[] | null; error: Error | null }> {
        if (DEV_MODE) {
            return { data: mockTrips, error: null };
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { data: null, error: new Error('Not authenticated') };
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (!profile) {
            return { data: null, error: new Error('Profile not found') };
        }

        const { data, error } = await supabase
            .from('trip_intents')
            .select('*')
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false });

        return { data, error: error as Error | null };
    },

    /**
     * Get trip intent by ID
     */
    async getTripIntent(id: string): Promise<{ data: TripIntent | null; error: Error | null }> {
        if (DEV_MODE) {
            const trip = mockTrips.find(t => t.id === id);
            return { data: trip || null, error: trip ? null : new Error('Trip not found') };
        }

        const { data, error } = await supabase
            .from('trip_intents')
            .select('*')
            .eq('id', id)
            .single();

        return { data, error: error as Error | null };
    },

    /**
     * Cancel a trip intent
     */
    async cancelTripIntent(id: string): Promise<{ error: Error | null }> {
        if (DEV_MODE) {
            const idx = mockTrips.findIndex(t => t.id === id);
            if (idx >= 0) mockTrips[idx].status = 'cancelled';
            return { error: null };
        }

        const { error } = await supabase
            .from('trip_intents')
            .update({ status: 'cancelled' })
            .eq('id', id);

        return { error: error as Error | null };
    },

    /**
     * Find potential matches for a trip intent using the database function
     */
    async findPotentialMatches(
        tripIntentId: string,
        options?: { timeWindowMinutes?: number; maxDistanceMeters?: number }
    ): Promise<{ data: PotentialMatch[] | null; error: Error | null }> {
        if (DEV_MODE) {
            // Return mock matches for dev mode
            return { data: mockMatches, error: null };
        }

        const timeWindow = options?.timeWindowMinutes ?? 30;
        const maxDistance = options?.maxDistanceMeters ?? 10000;

        const { data, error } = await supabase.rpc('find_potential_matches', {
            p_trip_intent_id: tripIntentId,
            p_time_window_minutes: timeWindow,
            p_max_distance_meters: maxDistance,
        });

        if (error) {
            console.error('[tripService] findPotentialMatches error:', error);
            return { data: null, error: error as Error };
        }

        return { data: data as PotentialMatch[], error: null };
    },

    /**
     * Express interest in a potential match
     */
    async expressInterest(
        myTripIntentId: string,
        otherTripIntentId: string
    ): Promise<{ matchId: string | null; error: Error | null }> {
        if (DEV_MODE) {
            return { matchId: 'dev-match-' + Date.now(), error: null };
        }

        const { data, error } = await supabase.rpc('express_interest', {
            p_my_trip_intent_id: myTripIntentId,
            p_other_trip_intent_id: otherTripIntentId,
        });

        if (error) {
            console.error('[tripService] expressInterest error:', error);
            return { matchId: null, error: error as Error };
        }

        return { matchId: data as string, error: null };
    },
};
