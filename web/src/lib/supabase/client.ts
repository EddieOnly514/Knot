import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
}

// Singleton for client-side usage. Returns null when env vars are missing (e.g. during static prerender on Vercel).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: any = null;

export function getSupabaseClient(): ReturnType<typeof createClient> | null {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    if (!client) {
        client = createBrowserClient(url, key);
    }
    return client;
}

/** Use in app code when Supabase is required; throws if env is missing (e.g. during static prerender). */
export function getSupabaseClientOrThrow(): ReturnType<typeof createClient> {
    const c = getSupabaseClient();
    if (!c) throw new Error("Supabase client not available. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
    return c;
}
