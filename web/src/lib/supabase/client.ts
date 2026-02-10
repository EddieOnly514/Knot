import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
}

// Singleton for client-side usage
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: any = null;

export function getSupabaseClient() {
    if (!client) {
        client = createClient();
    }
    return client;
}
