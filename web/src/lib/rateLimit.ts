import { NextResponse } from "next/server";

/**
 * Simple in-memory rate limiter for Next.js API routes.
 * Tracks request counts per IP in a Map with automatic cleanup.
 *
 * Usage:
 *   const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 10 });
 *   export async function POST(request: Request) {
 *     const limited = limiter(request);
 *     if (limited) return limited;
 *     // ... handle request
 *   }
 */

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

export function createRateLimiter(options: {
    windowMs: number;
    maxRequests: number;
    /** Optional key to namespace this limiter (defaults to "default") */
    key?: string;
}) {
    const { windowMs, maxRequests, key = "default" } = options;

    if (!stores.has(key)) {
        stores.set(key, new Map());
    }
    const store = stores.get(key)!;

    // Periodically clean up expired entries (every 60s)
    if (typeof globalThis !== "undefined") {
        const cleanupKey = `__rateLimit_cleanup_${key}`;
        if (!(globalThis as Record<string, unknown>)[cleanupKey]) {
            (globalThis as Record<string, unknown>)[cleanupKey] = true;
            setInterval(() => {
                const now = Date.now();
                for (const [ip, entry] of store) {
                    if (now > entry.resetAt) store.delete(ip);
                }
            }, 60_000);
        }
    }

    return function checkRateLimit(request: Request): NextResponse | null {
        const forwarded = request.headers.get("x-forwarded-for");
        const ip = forwarded?.split(",")[0]?.trim() || "unknown";
        const now = Date.now();

        const entry = store.get(ip);

        if (!entry || now > entry.resetAt) {
            store.set(ip, { count: 1, resetAt: now + windowMs });
            return null;
        }

        entry.count++;
        if (entry.count > maxRequests) {
            const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
            return NextResponse.json(
                { error: "Too many requests. Please try again later." },
                {
                    status: 429,
                    headers: { "Retry-After": String(retryAfter) },
                }
            );
        }

        return null;
    };
}
