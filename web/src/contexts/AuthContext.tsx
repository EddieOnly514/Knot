"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
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
}

interface AuthContextType {
    session: Session | null;
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    isAuthenticated: boolean;
    signInWithGoogle: () => Promise<{ error: Error | null }>;
    signInWithEmail: (email: string) => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
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

    // Initialize auth state
    useEffect(() => {
        // Get initial session
        supabase.auth
            .getSession()
            .then(
                (response: { data: { session: Session | null } }) => {
                    const { session } = response.data;
                    setSession(session);
                    setUser(session?.user ?? null);
                    if (session?.user) {
                        fetchProfile(session.user.id);
                    } else {
                        setLoading(false);
                    }
                }
            );

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(
            async (event: string, session: Session | null) => {
                console.log("[AuthProvider] Auth state changed:", event);
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("user_id", userId)
                .single();

            if (error && error.code !== "PGRST116") {
                console.error("[AuthProvider] Error fetching profile:", error);
            }

            setProfile(data);
        } catch (error) {
            console.error("[AuthProvider] Exception fetching profile:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchOrCreateProfile = async (authUser: User) => {
        try {
            // First try to fetch existing profile
            // The handle_new_user trigger should auto-create the profile on signup
            const { data: existing, error: fetchError } = await supabase
                .from("profiles")
                .select("*")
                .eq("user_id", authUser.id)
                .single();

            if (existing) {
                // If Google OAuth provided a photo and the profile doesn't have one, update it
                const metadata = authUser.user_metadata || {};
                const photoUrl = metadata.avatar_url || metadata.picture;
                const email = authUser.email;

                const updates: Record<string, string> = {};
                if (photoUrl && !existing.photo_url) {
                    updates.photo_url = photoUrl;
                }
                if (email && !existing.email) {
                    updates.email = email;
                }
                // Google gives full_name, update first/last if empty
                if (metadata.full_name && !existing.first_name) {
                    const parts = metadata.full_name.split(" ");
                    updates.first_name = parts[0] || "";
                    updates.last_name = parts.slice(1).join(" ") || "";
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
                return;
            }

            // Profile doesn't exist (trigger might not have fired, or this is recovery)
            console.log(
                "[AuthProvider] No profile found, creating one...",
                fetchError
            );
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
                console.error(
                    "[AuthProvider] Error creating profile:",
                    insertError
                );
                // Retry fetch - maybe the trigger created it concurrently
                await fetchProfile(authUser.id);
            } else {
                console.log("[AuthProvider] Profile created:", newProfile);
                setProfile(newProfile);
            }
        } catch (error) {
            console.error(
                "[AuthProvider] Exception in fetchOrCreateProfile:",
                error
            );
        } finally {
            setLoading(false);
        }
    };

    // Google Sign-In via OAuth
    const signInWithGoogle = async (): Promise<{ error: Error | null }> => {
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

    // Email Magic Link
    const signInWithEmail = async (
        email: string
    ): Promise<{ error: Error | null }> => {
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
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setProfile(null);
        router.push("/login");
    };

    const updateProfile = async (updates: Partial<Profile>) => {
        if (!user) {
            return { error: new Error("No user logged in") };
        }

        try {
            const { error } = await supabase
                .from("profiles")
                .update(updates)
                .eq("user_id", user.id);

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
        signInWithGoogle,
        signInWithEmail,
        signOut,
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
