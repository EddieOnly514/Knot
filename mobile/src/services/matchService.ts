import { supabase } from '../lib/supabase';

export interface Match {
    id: string;
    created_at: string;
    trip_intent_1: string;
    trip_intent_2: string;
    user_1: string;
    user_2: string;
    user_1_interested: boolean;
    user_2_interested: boolean;
    status: 'pending' | 'mutual' | 'meetup_pending' | 'meetup_confirmed' | 'completed';
}

export interface MatchWithProfile extends Match {
    other_user: {
        id: string;
        first_name: string;
        last_name: string;
        photo_url: string | null;
        rating: number;
        total_rides: number;
    };
    other_trip: {
        party_size: number;
        luggage: string;
        departure_time: string;
        rough_location: string | null;
    };
}

export const matchService = {
    /**
     * Express interest in a potential match
     */
    async expressInterest(
        myTripIntentId: string,
        otherTripIntentId: string,
        otherUserId: string
    ): Promise<{ data: Match | null; error: Error | null }> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { data: null, error: new Error('Not authenticated') };
        }

        // Check if match already exists
        const { data: existingMatch } = await supabase
            .from('matches')
            .select('*')
            .or(`and(trip_intent_1.eq.${myTripIntentId},trip_intent_2.eq.${otherTripIntentId}),and(trip_intent_1.eq.${otherTripIntentId},trip_intent_2.eq.${myTripIntentId})`)
            .single();

        if (existingMatch) {
            // Update existing match with interest
            const isUser1 = existingMatch.user_1 === user.id;
            const updateField = isUser1 ? 'user_1_interested' : 'user_2_interested';
            // Check if the OTHER user has already expressed interest (making this mutual)
            const otherAlreadyInterested = isUser1 ? existingMatch.user_2_interested : existingMatch.user_1_interested;

            const { data, error } = await supabase
                .from('matches')
                .update({
                    [updateField]: true,
                    status: otherAlreadyInterested ? 'mutual' : 'pending',
                })
                .eq('id', existingMatch.id)
                .select()
                .single();

            return { data, error: error as Error | null };
        }

        // Create new match
        const { data, error } = await supabase
            .from('matches')
            .insert({
                trip_intent_1: myTripIntentId,
                trip_intent_2: otherTripIntentId,
                user_1: user.id,
                user_2: otherUserId,
                user_1_interested: true,
                user_2_interested: false,
                status: 'pending',
            })
            .select()
            .single();

        return { data, error: error as Error | null };
    },

    /**
     * Get user's matches
     */
    async getMyMatches(): Promise<{ data: MatchWithProfile[] | null; error: Error | null }> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { data: null, error: new Error('Not authenticated') };
        }

        const { data, error } = await supabase
            .from('matches')
            .select(`
        *,
        user_1_profile:profiles!matches_user_1_fkey(id, first_name, last_name, photo_url, rating, total_rides),
        user_2_profile:profiles!matches_user_2_fkey(id, first_name, last_name, photo_url, rating, total_rides),
        trip_1:trip_intents!matches_trip_intent_1_fkey(party_size, luggage, departure_time, rough_location),
        trip_2:trip_intents!matches_trip_intent_2_fkey(party_size, luggage, departure_time, rough_location)
      `)
            .or(`user_1.eq.${user.id},user_2.eq.${user.id}`)
            .in('status', ['mutual', 'meetup_pending', 'meetup_confirmed']);

        if (error) {
            return { data: null, error: error as Error };
        }

        // Transform data to include other_user and other_trip
        const transformedData = data?.map((match: any) => {
            const isUser1 = match.user_1 === user.id;
            return {
                ...match,
                other_user: isUser1 ? match.user_2_profile : match.user_1_profile,
                other_trip: isUser1 ? match.trip_2 : match.trip_1,
            };
        });

        return { data: transformedData, error: null };
    },

    /**
     * Get a specific match by ID
     */
    async getMatch(matchId: string): Promise<{ data: MatchWithProfile | null; error: Error | null }> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { data: null, error: new Error('Not authenticated') };
        }

        const { data, error } = await supabase
            .from('matches')
            .select(`
        *,
        user_1_profile:profiles!matches_user_1_fkey(id, first_name, last_name, photo_url, rating, total_rides),
        user_2_profile:profiles!matches_user_2_fkey(id, first_name, last_name, photo_url, rating, total_rides),
        trip_1:trip_intents!matches_trip_intent_1_fkey(party_size, luggage, departure_time, rough_location),
        trip_2:trip_intents!matches_trip_intent_2_fkey(party_size, luggage, departure_time, rough_location)
      `)
            .eq('id', matchId)
            .single();

        if (error) {
            return { data: null, error: error as Error };
        }

        const isUser1 = data.user_1 === user.id;
        const transformedData = {
            ...data,
            other_user: isUser1 ? data.user_2_profile : data.user_1_profile,
            other_trip: isUser1 ? data.trip_2 : data.trip_1,
        };

        return { data: transformedData, error: null };
    },

    /**
     * Pass on a potential match
     */
    async passMatch(matchId: string): Promise<{ error: Error | null }> {
        const { error } = await supabase
            .from('matches')
            .delete()
            .eq('id', matchId);

        return { error: error as Error | null };
    },
};
