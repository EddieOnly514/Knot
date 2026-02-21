"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
    useRef,
    useCallback,
    ReactNode,
} from "react";
import { Session, User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";

// Profile type matching actual SQL schema
export interface Profile {
    id: string;
    created_at: string;
    updated_at: string;
    user_id: string;
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
    // V3 trust fields
    phone_verified: boolean;
    email_verified: boolean;
    id_verified: boolean;
    completed_rides: number;
    gender_preference: string;
    // Profile extras
    bio: string | null;
    school: string | null;
    conversation_pref: string | null;  // 'chatty' | 'chill' | 'quiet'
    music_pref: string | null;         // 'yes' | 'no' | 'no_preference'
    smoking_pref: string | null;       // 'no' | 'outside_only'
}

interface AuthContextType {
    session: Session | null;
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    isAuthenticated: boolean;
    isNewUser: boolean;
    signInWithGoogle: () => Promise<{ error: Error | null }>;
    signInWithEmail: (email: string) => Promise<{ error: Error | null }>;
    signUpWithEmailPassword: (
        email: string,
        password: string
    ) => Promise<{ error: Error | null; needsEmailConfirmation?: boolean }>;
    resendEmailConfirmation: (email: string) => Promise<{ error: Error | null }>;
    signInWithEmailPassword: (
        email: string,
        password: string
    ) => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
    devSignIn: () => void;
    updateProfile: (
        updates: Partial<Profile>
    ) => Promise<{ error: Error | null }>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const supabase = getSupabaseClient();
    const profileFetchedForRef = useRef<string | null>(null);

    // When Supabase env is missing (e.g. static prerender), skip auth and stop loading
    useEffect(() => {
        if (!supabase) {
            setLoading(false);
        }
    }, [supabase]);

    // ── Step 1: Auth state listener (synchronous only — no DB calls) ──
    useEffect(() => {
        if (!supabase) return;
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(
            (event: string, session: Session | null) => {
                console.log("[AuthProvider] Auth event:", event);
                setSession(session);
                setUser(session?.user ?? null);

                if (!session) {
                    setProfile(null);
                    profileFetchedForRef.current = null;
                    setLoading(false);
                }
            }
        );

        return () => subscription.unsubscribe();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [supabase]);

    // ── Step 2: Profile fetch (separate effect, triggers when user changes) ──
    const fetchProfileForUser = useCallback(
        async (authUser: User, retryCount = 0) => {
            if (!supabase) return;
            try {
                console.log("[AuthProvider] Fetching profile for:", authUser.id);

                const { data: existing, error: fetchError } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("user_id", authUser.id)
                    .single();

                if (fetchError && fetchError.code === "PGRST116") {
                    // No profile found — trigger may not have fired yet, create one
                    console.log("[AuthProvider] No profile found, creating...");
                    const metadata = authUser.user_metadata || {};
                    const fullName = metadata.full_name || metadata.name || "";
                    const parts = fullName.split(" ");

                    const { data: newProfile, error: insertError } = await supabase
                        .from("profiles")
                        .insert({
                            user_id: authUser.id,
                            email: authUser.email || null,
                            first_name: parts[0] || authUser.email?.split("@")[0] || "",
                            last_name: parts.slice(1).join(" ") || "",
                            photo_url: metadata.avatar_url || metadata.picture || null,
                        })
                        .select()
                        .single();

                    if (insertError) {
                        console.error("[AuthProvider] Insert error:", insertError);
                        // Trigger may have created it concurrently — retry fetch
                        if (retryCount < 2) {
                            await new Promise((r) => setTimeout(r, 500));
                            return fetchProfileForUser(authUser, retryCount + 1);
                        }
                    } else {
                        console.log("[AuthProvider] Profile created:", newProfile?.id);
                        setProfile(newProfile);
                    }
                    return;
                }

                if (fetchError) {
                    console.error("[AuthProvider] Profile fetch error:", fetchError);
                    // Could be a stale token — retry after a brief delay
                    if (retryCount < 2) {
                        console.log("[AuthProvider] Retrying profile fetch...", retryCount + 1);
                        await new Promise((r) => setTimeout(r, 800));
                        return fetchProfileForUser(authUser, retryCount + 1);
                    }
                    return;
                }

                // Profile found — update photo/email from Google if missing
                if (existing) {
                    const metadata = authUser.user_metadata || {};
                    const photoUrl = metadata.avatar_url || metadata.picture;
                    const updates: Record<string, string> = {};

                    if (photoUrl && !existing.photo_url) {
                        updates.photo_url = photoUrl;
                    }
                    if (authUser.email && !existing.email) {
                        updates.email = authUser.email;
                    }

                    if (Object.keys(updates).length > 0) {
                        const { data: updated } = await supabase
                            .from("profiles")
                            .update(updates)
                            .eq("user_id", authUser.id)
                            .select()
                            .single();
                        setProfile(updated || existing);
                    } else {
                        setProfile(existing);
                    }
                }
            } catch (error) {
                console.error("[AuthProvider] Exception fetching profile:", error);
            } finally {
                setLoading(false);
            }
        },
        [supabase]
    );

    useEffect(() => {
        if (!user) return;
        // Skip dev users
        if (user.id.startsWith("dev-user-")) return;
        // Skip if we already fetched for this user
        if (profileFetchedForRef.current === user.id && profile) return;

        profileFetchedForRef.current = user.id;
        fetchProfileForUser(user);
    }, [user, profile, fetchProfileForUser]);

    // ── Auth methods ──

    const signInWithGoogle = async (): Promise<{ error: Error | null }> => {
        if (!supabase) return { error: new Error("Auth not available") };
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });
            return { error: error || null };
        } catch (error) {
            return { error: error as Error };
        }
    };

    const signInWithEmail = async (
        email: string
    ): Promise<{ error: Error | null }> => {
        if (!supabase) return { error: new Error("Auth not available") };
        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                },
            });
            return { error: error || null };
        } catch (error) {
            return { error: error as Error };
        }
    };

    const signOut = async () => {
        if (supabase) {
            try {
                await supabase.auth.signOut();
            } catch (e) {
                console.error("[AuthProvider] Sign out error:", e);
            }
        }
        setSession(null);
        setUser(null);
        setProfile(null);
        profileFetchedForRef.current = null;
        window.location.href = "/login";
    };

    const updateProfile = async (updates: Partial<Profile>) => {
        if (!supabase) return { error: new Error("Auth not available") };
        if (!user) {
            return { error: new Error("No user logged in") };
        }

        if (user.id.startsWith("dev-user-")) {
            setProfile((prev) => prev ? { ...prev, ...updates } as Profile : null);
            return { error: null };
        }

        try {
            console.log("[AuthProvider] Updating profile for user:", user.id);
            const { data: updated, error } = await supabase
                .from("profiles")
                .update(updates)
                .eq("user_id", user.id)
                .select()
                .single();

            if (error) {
                console.error("[AuthProvider] Update error:", error);
                return { error: error as unknown as Error };
            }

            console.log("[AuthProvider] Update success:", updated?.id);
            if (updated) {
                setProfile(updated);
            }
            return { error: null };
        } catch (error) {
            console.error("[AuthProvider] Update exception:", error);
            return { error: error as Error };
        }
    };

    const signUpWithEmailPassword = async (
        email: string,
        password: string
    ): Promise<{ error: Error | null; needsEmailConfirmation?: boolean }> => {
        if (!supabase) return { error: new Error("Auth not available") };
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
                },
            });
            if (error) return { error };
            // When "Confirm email" is enabled in Supabase, no session is created until the user clicks the link
            const needsEmailConfirmation = !!data?.user && !data?.session;
            return { error: null, needsEmailConfirmation };
        } catch (error) {
            return { error: error as Error };
        }
    };

    const resendEmailConfirmation = async (
        email: string
    ): Promise<{ error: Error | null }> => {
        if (!supabase) return { error: new Error("Auth not available") };
        try {
            const { error } = await supabase.auth.resend({
                type: "signup",
                email,
            });
            return { error: error ?? null };
        } catch (error) {
            return { error: error as Error };
        }
    };

    const signInWithEmailPassword = async (
        email: string,
        password: string
    ): Promise<{ error: Error | null }> => {
        if (!supabase) return { error: new Error("Auth not available") };
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            return { error: error || null };
        } catch (error) {
            return { error: error as Error };
        }
    };

    const refreshProfile = async () => {
        if (user && !user.id.startsWith("dev-user-")) {
            profileFetchedForRef.current = null; // Force re-fetch
            await fetchProfileForUser(user);
        }
    };

    const devSignIn = () => {
        const fakeUser = { id: "dev-user-" + Date.now(), email: "dev@test.com" } as User;
        const fakeProfile: Profile = {
            id: "dev-profile-" + Date.now(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            user_id: fakeUser.id,
            phone: null,
            email: "dev@test.com",
            first_name: "Test",
            last_name: "User",
            photo_url: null,
            default_party_size: 1,
            default_luggage: "carry_on",
            is_verified: false,
            rating: 5.0,
            total_rides: 0,
            phone_verified: false,
            email_verified: false,
            id_verified: false,
            completed_rides: 0,
            gender_preference: "any",
            bio: null,
            school: null,
            conversation_pref: null,
            music_pref: null,
            smoking_pref: null,
        };
        setSession({ user: fakeUser } as Session);
        setUser(fakeUser);
        setProfile(fakeProfile);
        profileFetchedForRef.current = fakeUser.id;
        setLoading(false);
    };

    const value = {
        session,
        user,
        profile,
        loading,
        isAuthenticated: !!session,
        isNewUser: !!session && !!profile && !profile.first_name,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmailPassword,
        resendEmailConfirmation,
        signInWithEmailPassword,
        signOut,
        devSignIn,
        updateProfile,
        refreshProfile,
    };

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
