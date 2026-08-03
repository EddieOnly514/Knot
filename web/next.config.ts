import type { NextConfig } from "next";
import path from "path";
import fs from "fs";

// Ensure .env.local is loaded so API routes (e.g. seed-matches) see SUPABASE_SERVICE_ROLE_KEY
// even when dev server is started from repo root or env isn't loaded yet.
function loadEnvLocal() {
    const dir = __dirname;
    const envPath = path.join(dir, ".env.local");
    try {
        if (!fs.existsSync(envPath)) return;
        const content = fs.readFileSync(envPath, "utf8");
        for (const line of content.split(/\r?\n/)) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("#")) continue;
            const idx = trimmed.indexOf("=");
            if (idx <= 0) continue;
            const key = trimmed.slice(0, idx).trim();
            const value = trimmed
                .slice(idx + 1)
                .trim()
                .replace(/^["']|["']$/g, "")
                .replace(/\r$/, "");
            process.env[key] = value;
        }
    } catch {
        // ignore
    }
}
loadEnvLocal();

const nextConfig: NextConfig = {
    turbopack: {
        root: path.resolve(__dirname),
    },
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "maps.googleapis.com",
                pathname: "/maps/api/staticmap",
            },
        ],
    },
};

export default nextConfig;
