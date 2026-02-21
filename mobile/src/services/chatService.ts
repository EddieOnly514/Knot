import { supabase } from '../lib/supabase';

export interface Message {
    id: string;
    created_at: string;
    match_id: string;
    sender_id: string;
    content: string;
    read: boolean;
}

export interface MessageWithSender extends Message {
    sender: {
        first_name: string;
        last_name: string;
        photo_url: string | null;
    };
}

export const chatService = {
    /**
     * Get messages for a match
     */
    async getMessages(matchId: string): Promise<{ data: MessageWithSender[] | null; error: Error | null }> {
        const { data, error } = await supabase
            .from('messages')
            .select(`
        *,
        sender:profiles!messages_sender_id_fkey(first_name, last_name, photo_url)
      `)
            .eq('match_id', matchId)
            .order('created_at', { ascending: true });

        return { data: data as MessageWithSender[] | null, error: error as Error | null };
    },

    /**
     * Send a message
     */
    async sendMessage(matchId: string, content: string): Promise<{ data: Message | null; error: Error | null }> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { data: null, error: new Error('Not authenticated') };
        }

        const { data, error } = await supabase
            .from('messages')
            .insert({
                match_id: matchId,
                sender_id: user.id,
                content,
            })
            .select()
            .single();

        return { data, error: error as Error | null };
    },

    /**
     * Mark messages as read
     */
    async markAsRead(matchId: string): Promise<{ error: Error | null }> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { error: new Error('Not authenticated') };
        }

        const { error } = await supabase
            .from('messages')
            .update({ read: true })
            .eq('match_id', matchId)
            .neq('sender_id', user.id)
            .eq('read', false);

        return { error: error as Error | null };
    },

    /**
     * Subscribe to new messages in a match (real-time)
     * NOTE: Realtime payloads only include raw row data (no JOINs), so we
     * re-fetch the full message with sender profile after each INSERT event.
     */
    subscribeToMessages(
        matchId: string,
        onNewMessage: (message: MessageWithSender) => void
    ) {
        const subscription = supabase
            .channel(`messages:${matchId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `match_id=eq.${matchId}`,
                },
                async (payload) => {
                    // Fetch the full message with sender profile since realtime
                    // payloads don't include JOIN data
                    const { data } = await supabase
                        .from('messages')
                        .select(`
                            *,
                            sender:profiles!messages_sender_id_fkey(first_name, last_name, photo_url)
                        `)
                        .eq('id', payload.new.id)
                        .single();

                    if (data) {
                        onNewMessage(data as MessageWithSender);
                    }
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    },

    /**
     * Get unread message count for a match
     */
    async getUnreadCount(matchId: string): Promise<{ count: number; error: Error | null }> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { count: 0, error: new Error('Not authenticated') };
        }

        const { count, error } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('match_id', matchId)
            .neq('sender_id', user.id)
            .eq('read', false);

        return { count: count || 0, error: error as Error | null };
    },
};
