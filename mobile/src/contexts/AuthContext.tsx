import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { supabase } from '../lib/supabase';
import { handleAuthCallback } from '../auth/oauth';

// Configure Google Sign-In
GoogleSignin.configure({
    iosClientId: '629746611304-t2ebm9rdont9v7u0dcsale8f0lpg30r7.apps.googleusercontent.com',
    webClientId: '207315886424-03blbinho47anhbjsjgkf8ebrju4d4hd.apps.googleusercontent.com',
});

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
    hasProfile: boolean;
    signInWithGoogle: () => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
    updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
                    await fetchProfile(session.user.id);
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
                // PGRST116 = no rows found (new user, expected)
                console.error('[AuthProvider] Error fetching profile:', error);
            }

            // data will be null if no profile row exists (new user)
            setProfile(data ?? null);
        } catch (error) {
            console.error('[AuthProvider] Exception fetching profile:', error);
        } finally {
            setLoading(false);
        }
    };

    // Google Sign-In
    const signInWithGoogle = async (): Promise<{ error: Error | null }> => {
        try {
            console.log('[AuthProvider] Starting Google Sign-In...');

            await GoogleSignin.hasPlayServices();
            const signInResult = await GoogleSignin.signIn();
            console.log('[AuthProvider] Google Sign-In success, getting tokens...');

            const idToken = signInResult.data?.idToken;

            if (!idToken) {
                throw new Error('No ID token returned from Google Sign-In');
            }

            console.log('[AuthProvider] Got ID token, signing in to Supabase...');

            const { data, error } = await supabase.auth.signInWithIdToken({
                provider: 'google',
                token: idToken,
            });

            if (error) {
                console.error('[AuthProvider] Supabase sign-in error:', error);
                return { error };
            }

            console.log('[AuthProvider] Supabase sign-in success!');
            return { error: null };
        } catch (error: any) {
            console.error('[AuthProvider] Google Sign-In error:', error);

            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                return { error: new Error('Sign-in was cancelled') };
            } else if (error.code === statusCodes.IN_PROGRESS) {
                return { error: new Error('Sign-in already in progress') };
            } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                return { error: new Error('Google Play Services not available') };
            }

            return { error: error as Error };
        }
    };

    const signOut = async () => {
        try {
            await GoogleSignin.signOut();
        } catch (error) {
            console.log('[AuthProvider] Google sign-out error (non-fatal):', error);
        }

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

    const value = {
        session,
        user,
        profile,
        loading,
        isAuthenticated: !!session,
        hasProfile: !!profile,
        signInWithGoogle,
        signOut,
        updateProfile,
        refreshProfile,
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
