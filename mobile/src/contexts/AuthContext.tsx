import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';
import { handleAuthCallback } from '../auth/oauth';

export interface Profile {
    id: string;
    user_id?: string;
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
}

interface AuthContextType {
    session: Session | null;
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    isAuthenticated: boolean;
    signOut: () => Promise<void>;
    updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
    refreshProfile: () => Promise<void>;
    devBypassAuth: () => void; // DEV ONLY
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// DEV ONLY: Mock profile for testing
const DEV_PROFILE: Profile = {
    id: 'dev-user-001',
    user_id: 'dev-user-001',
    phone: '+15550000000',
    email: 'dev@knot.app',
    first_name: 'Dev',
    last_name: 'User',
    photo_url: null,
    default_party_size: 1,
    default_luggage: 'none',
    is_verified: true,
    rating: 5.0,
    total_rides: 0,
};

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    // Handle deep link callbacks
    useEffect(() => {
        const handleDeepLink = async (event: { url: string }) => {
            console.log('[AuthProvider] Deep link received:', event.url);
            if (event.url.includes('auth/callback')) {
                await handleAuthCallback(event.url);
            }
        };

        // Listen for incoming links
        const subscription = Linking.addEventListener('url', handleDeepLink);

        // Check for initial URL (app opened via link)
        Linking.getInitialURL().then((url) => {
            if (url && url.includes('auth/callback')) {
                handleDeepLink({ url });
            }
        });

        return () => {
            subscription.remove();
        };
    }, []);

    // Initialize auth state
    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            console.log('[AuthProvider] Initial session:', session ? 'exists' : 'none');
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setLoading(false);
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('[AuthProvider] Auth state changed:', event);
                setSession(session);
                setUser(session?.user ?? null);

                if (session?.user) {
                    await fetchOrCreateProfile(session.user);
                } else {
                    setProfile(null);
                }
                setLoading(false);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('[AuthProvider] Error fetching profile:', error);
            }

            setProfile(data);
        } catch (error) {
            console.error('[AuthProvider] Exception fetching profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchOrCreateProfile = async (authUser: User) => {
        try {
            // First try to fetch existing profile
            const { data: existing, error: fetchError } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', authUser.id)
                .single();

            if (existing) {
                setProfile(existing);
                return;
            }

            // Profile doesn't exist, create one
            const email = authUser.email;
            const metadata = authUser.user_metadata || {};
            const firstName = metadata.full_name?.split(' ')[0] || metadata.name?.split(' ')[0] || '';
            const lastName = metadata.full_name?.split(' ').slice(1).join(' ') || '';
            const photoUrl = metadata.avatar_url || metadata.picture || null;

            const { data: newProfile, error: insertError } = await supabase
                .from('profiles')
                .insert({
                    user_id: authUser.id,
                    email,
                    first_name: firstName,
                    last_name: lastName,
                    photo_url: photoUrl,
                    is_verified: true, // OAuth users are verified
                })
                .select()
                .single();

            if (insertError) {
                console.error('[AuthProvider] Error creating profile:', insertError);
            } else {
                console.log('[AuthProvider] Profile created:', newProfile);
                setProfile(newProfile);
            }
        } catch (error) {
            console.error('[AuthProvider] Exception in fetchOrCreateProfile:', error);
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setProfile(null);
    };

    const updateProfile = async (updates: Partial<Profile>) => {
        if (!user) {
            return { error: new Error('No user logged in') };
        }

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString(),
                })
                .eq('user_id', user.id);

            if (!error) {
                await fetchProfile(user.id);
            }

            return { error: error as Error | null };
        } catch (error) {
            return { error: error as Error };
        }
    };

    const refreshProfile = async () => {
        if (user) {
            await fetchProfile(user.id);
        }
    };

    // DEV ONLY: Bypass auth for testing
    const devBypassAuth = () => {
        if (__DEV__) {
            console.log('[AuthProvider] DEV: Bypassing auth');
            setProfile(DEV_PROFILE);
            // Create a fake session to trigger isAuthenticated
            setSession({ access_token: 'dev-token', refresh_token: 'dev-token' } as Session);
            setLoading(false);
        }
    };

    const value = {
        session,
        user,
        profile,
        loading,
        isAuthenticated: !!session || !!profile, // Allow dev profile to auth
        signOut,
        updateProfile,
        refreshProfile,
        devBypassAuth,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
