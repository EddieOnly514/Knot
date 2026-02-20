import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
    const pathname = request.nextUrl.pathname;

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
        // Skip auth redirect in development
        if (process.env.NODE_ENV === "development") {
            return supabaseResponse;
        }
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    // For authenticated users, check onboarding completion only when needed.
    // We intentionally skip this query on regular app routes to keep
    // client-side navigation fast.
    if (user && (isAuthPath || isOnboardingPath)) {
        // Skip in development
        if (process.env.NODE_ENV === "development") {
            return supabaseResponse;
        }

        // Check if profile has been completed (first name is the onboarding gate)
        const { data: profile } = await supabase
            .from("profiles")
            .select("first_name")
            .eq("user_id", user.id)
            .single();

        const isNewUser = !profile?.first_name;

        if (isAuthPath && isNewUser) {
            const url = request.nextUrl.clone();
            url.pathname = "/onboarding";
            return NextResponse.redirect(url);
        }

        // Redirect completed users away from onboarding and auth pages.
        if ((isAuthPath || isOnboardingPath) && !isNewUser) {
            const url = request.nextUrl.clone();
            url.pathname = "/home";
            return NextResponse.redirect(url);
        }
    }

    return supabaseResponse;
}
