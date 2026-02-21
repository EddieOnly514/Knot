import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/** New users (e.g. just signed up with Google) go to onboarding; returning users go to `next`. */
const ONBOARDING_NEW_PROFILE_SECONDS = 120;

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? "/home";

    if (code) {
        const supabase = await createClient();
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error && data?.user) {
            // Send new users to onboarding: profile created very recently or first_name empty
            const { data: profileRow } = await supabase
                .from("profiles")
                .select("first_name, created_at")
                .eq("user_id", data.user.id)
                .single();

            type ProfileRow = { first_name: string | null; created_at: string } | null;
            const profile = profileRow as ProfileRow;

            const hasName = profile?.first_name?.trim();
            const isNewProfile =
                !profile ||
                !hasName ||
                (profile.created_at &&
                    Date.now() - new Date(profile.created_at).getTime() <
                        ONBOARDING_NEW_PROFILE_SECONDS * 1000);

            const target = isNewProfile ? "/onboarding" : next;
            return NextResponse.redirect(`${origin}${target}`);
        }
    }

    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
