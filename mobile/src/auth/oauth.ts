import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase, SUPABASE_URL } from '../lib/supabase';
import { makeRedirectUri } from 'expo-auth-session';
import { Platform } from 'react-native';

// Configure redirect URI for OAuth
// In development: exp://... or custom scheme
// In production: knot://auth/callback
export const getRedirectUri = () => {
    if (__DEV__) {
        // For development with Expo Go, use the exp:// scheme
        return makeRedirectUri({
            scheme: 'knot',
            path: 'auth/callback',
        });
    }
    // Production: use custom scheme
    return 'knot://auth/callback';
};

export type OAuthProvider = 'apple' | 'google';

interface OAuthResult {
    success: boolean;
    error?: Error;
}

/**
 * Sign in with OAuth provider (Apple or Google)
 */
export async function signInWithOAuth(provider: OAuthProvider): Promise<OAuthResult> {
    try {
        const redirectTo = getRedirectUri();
        console.log(`[OAuth] Starting ${provider} sign-in with redirect: ${redirectTo}`);

        // Get OAuth URL from Supabase
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo,
                skipBrowserRedirect: true, // We'll handle the browser ourselves
            },
        });

        if (error) {
            console.error('[OAuth] Supabase error:', error);
            return { success: false, error };
        }

        if (!data.url) {
            return { success: false, error: new Error('No OAuth URL returned') };
        }

        console.log('[OAuth] Opening browser for authentication...');

        // Open the OAuth URL in a browser
        const result = await WebBrowser.openAuthSessionAsync(
            data.url,
            redirectTo,
            {
                showInRecents: true,
                preferEphemeralSession: false, // Keep session for auto-login UX
            }
        );

        console.log('[OAuth] Browser result:', result.type);

        if (result.type === 'success' && result.url) {
            // Extract the URL and handle the callback
            const url = result.url;
            console.log('[OAuth] Callback URL:', url);

            // Parse the URL for tokens or code
            const params = new URL(url);
            const accessToken = params.searchParams.get('access_token');
            const refreshToken = params.searchParams.get('refresh_token');

            if (accessToken && refreshToken) {
                // Set the session manually
                const { error: sessionError } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                });

                if (sessionError) {
                    console.error('[OAuth] Session error:', sessionError);
                    return { success: false, error: sessionError };
                }

                console.log('[OAuth] Session set successfully!');
                return { success: true };
            }

            // Check for code (PKCE flow)
            const code = params.searchParams.get('code');
            if (code) {
                const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
                if (exchangeError) {
                    console.error('[OAuth] Code exchange error:', exchangeError);
                    return { success: false, error: exchangeError };
                }
                console.log('[OAuth] Code exchanged successfully!');
                return { success: true };
            }

            // Check for error in URL
            const errorDescription = params.searchParams.get('error_description');
            if (errorDescription) {
                return { success: false, error: new Error(errorDescription) };
            }
        }

        if (result.type === 'cancel') {
            return { success: false, error: new Error('Sign in was cancelled') };
        }

        if (result.type === 'dismiss') {
            return { success: false, error: new Error('Sign in was dismissed') };
        }

        return { success: false, error: new Error('Unknown OAuth result') };
    } catch (error) {
        console.error('[OAuth] Exception:', error);
        return { success: false, error: error as Error };
    }
}

/**
 * Sign in with Apple
 */
export async function signInWithApple(): Promise<OAuthResult> {
    return signInWithOAuth('apple');
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle(): Promise<OAuthResult> {
    return signInWithOAuth('google');
}

/**
 * Sign out
 */
export async function signOut(): Promise<{ error: Error | null }> {
    const { error } = await supabase.auth.signOut();
    return { error: error as Error | null };
}

/**
 * Handle deep link callback (for manual URL handling if needed)
 */
export async function handleAuthCallback(url: string): Promise<OAuthResult> {
    try {
        console.log('[OAuth] Handling callback URL:', url);
        const params = new URL(url);

        const accessToken = params.searchParams.get('access_token');
        const refreshToken = params.searchParams.get('refresh_token');

        if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
            });
            return { success: !error, error: error as Error | undefined };
        }

        const code = params.searchParams.get('code');
        if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            return { success: !error, error: error as Error | undefined };
        }

        return { success: false, error: new Error('No tokens in callback URL') };
    } catch (error) {
        return { success: false, error: error as Error };
    }
}
