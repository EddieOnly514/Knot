import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? "/home";

    if (code) {
        const supabase = await createClient();
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error && data?.user) {
            // Check if user has completed onboarding (has a first_name)
            const { data: profileRow } = await supabase
                .from("profiles")
                .select("first_name")
                .eq("user_id", data.user.id)
                .single();

            const hasName = (profileRow as { first_name: string | null } | null)?.first_name?.trim();
            // Preserve the `next` param through onboarding so user lands on the right page after
            const onboardingUrl = next !== "/home" ? `/onboarding?next=${encodeURIComponent(next)}` : "/onboarding";
            const target = hasName ? next : onboardingUrl;
            return NextResponse.redirect(`${origin}${target}`);
        }
    }

    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
