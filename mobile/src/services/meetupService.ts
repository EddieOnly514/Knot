import { supabase } from '../lib/supabase';

export interface MeetupConfirmation {
    id: string;
    created_at: string;
    match_id: string;
    user_id: string;
    location_name: string;
    location_type: 'terminal' | 'landmark' | 'rideshare_zone' | 'custom';
    confirmed: boolean;
}

/**
 * Map the UI option IDs from MeetupConfirmSheet to DB location_type values.
 */
function toLocationType(optionId: string): MeetupConfirmation['location_type'] {
    switch (optionId) {
        case 'pickup_zone': return 'rideshare_zone';
        case 'baggage': return 'landmark';
        case 'terminal': return 'terminal';
        case 'landmark': return 'landmark';
        default: return 'custom';
    }
}

export const meetupService = {
    /**
     * Confirm a meetup. Inserts a row into meetup_confirmations and
     * updates the match status accordingly.
     */
    async confirmMeetup(
        matchId: string,
        locationName: string,
        locationOptionId?: string,
    ): Promise<{ data: MeetupConfirmation | null; bothConfirmed: boolean; error: Error | null }> {
        // Get the current user's profile ID
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: null, bothConfirmed: false, error: new Error('Not authenticated') };

        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (!profile) return { data: null, bothConfirmed: false, error: new Error('Profile not found') };

        // Insert our confirmation (upsert in case they re-confirm)
        const { data, error } = await supabase
            .from('meetup_confirmations')
            .upsert({
                match_id: matchId,
                user_id: profile.id,
                location_name: locationName,
                location_type: toLocationType(locationOptionId ?? 'custom'),
                confirmed: true,
            }, {
                onConflict: 'match_id,user_id',
            })
            .select()
            .single();

        if (error) return { data: null, bothConfirmed: false, error: error as Error };

        // Check if the other user has also confirmed
        const { data: allConfirmations } = await supabase
            .from('meetup_confirmations')
            .select('*')
            .eq('match_id', matchId)
            .eq('confirmed', true);

        const bothConfirmed = (allConfirmations?.length ?? 0) >= 2;

        // Update match status
        const newStatus = bothConfirmed ? 'meetup_confirmed' : 'meetup_pending';
        await supabase
            .from('matches')
            .update({ status: newStatus })
            .eq('id', matchId);

        return { data, bothConfirmed, error: null };
    },

    /**
     * Cancel a meetup confirmation.
     */
    async cancelConfirmation(matchId: string): Promise<{ error: Error | null }> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: new Error('Not authenticated') };

        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (!profile) return { error: new Error('Profile not found') };

        // Delete our confirmation
        const { error } = await supabase
            .from('meetup_confirmations')
            .delete()
            .eq('match_id', matchId)
            .eq('user_id', profile.id);

        if (error) return { error: error as Error };

        // Revert match status back to mutual (since our confirmation is gone)
        await supabase
            .from('matches')
            .update({ status: 'mutual' })
            .eq('id', matchId);

        return { error: null };
    },

    /**
     * Get current confirmations for a match (to hydrate UI state on load).
     */
    async getConfirmations(matchId: string): Promise<{ data: MeetupConfirmation[] | null; error: Error | null }> {
        const { data, error } = await supabase
            .from('meetup_confirmations')
            .select('*')
            .eq('match_id', matchId)
            .eq('confirmed', true);

        return { data, error: error as Error | null };
    },

    /**
     * Subscribe to match status changes (for detecting when the other user confirms).
     * Returns cleanup function.
     */
    subscribeToMatchStatus(
        matchId: string,
        onStatusChange: (newStatus: string) => void
    ): () => void {
        const subscription = supabase
            .channel(`match-status:${matchId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'matches',
                    filter: `id=eq.${matchId}`,
                },
                (payload) => {
                    if (payload.new && (payload.new as any).status) {
                        onStatusChange((payload.new as any).status);
                    }
                }
            )
            .subscribe();

        return () => { subscription.unsubscribe(); };
    },
};
