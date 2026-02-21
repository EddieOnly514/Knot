import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
    const pathname = request.nextUrl.pathname;

    // If a Supabase auth `code` param landed on the wrong page (e.g. "/" due
    // to a misconfigured redirect URL in the Supabase dashboard), forward the
    // request to /auth/callback so the code still gets exchanged for a session.
    if (
        !pathname.startsWith("/auth/callback") &&
        request.nextUrl.searchParams.has("code") &&
        (request.nextUrl.searchParams.has("next") ||
            request.nextUrl.searchParams.get("code")?.length === 36)
    ) {
        const url = request.nextUrl.clone();
        url.pathname = "/auth/callback";
        return NextResponse.redirect(url);
    }

    // Routes that require an authenticated user
    const protectedPaths = [
        "/home",
        "/post",
        "/matches",
        "/chat",
        "/messages",
        "/profile",
        "/settings",
        "/history",
        "/onboarding",
    ];
    const authPaths = ["/login", "/signup"];
    const isOnboardingPath = pathname.startsWith("/onboarding");

    const isProtectedPath = protectedPaths.some((path) =>
        pathname.startsWith(path)
    );
    const isAuthPath = authPaths.some((path) => pathname.startsWith(path));
    const needsAuthCheck = isProtectedPath || isAuthPath || isOnboardingPath;

    // Fast-path: for routes that don't care about auth, skip Supabase entirely
    if (!needsAuthCheck) {
        return NextResponse.next({
            request,
        });
    }

    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // Refresh session if expired - required for Server Components
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Protected routes - redirect to login if not authenticated
    if (isProtectedPath && !user) {
        if (process.env.NODE_ENV === "development") {
            return supabaseResponse;
        }
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    // For authenticated users: ensure new users complete onboarding before app routes
    if (user && (isProtectedPath || isAuthPath || isOnboardingPath)) {
        const { data: profile } = await supabase
            .from("profiles")
            .select("first_name")
            .eq("user_id", user.id)
            .single();

        const isNewUser = !profile?.first_name;

        // New users on login/signup → send to onboarding
        if (isAuthPath && isNewUser) {
            const url = request.nextUrl.clone();
            url.pathname = "/onboarding";
            return NextResponse.redirect(url);
        }

        // New users on any protected route (e.g. /home after email sign-in) → onboarding
        if (isProtectedPath && isNewUser) {
            const url = request.nextUrl.clone();
            url.pathname = "/onboarding";
            return NextResponse.redirect(url);
        }

        // Completed users on auth or onboarding → send to app
        if ((isAuthPath || isOnboardingPath) && !isNewUser) {
            const url = request.nextUrl.clone();
            url.pathname = "/home";
            return NextResponse.redirect(url);
        }
    }

    return supabaseResponse;
}
