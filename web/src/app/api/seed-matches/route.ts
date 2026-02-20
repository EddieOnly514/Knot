import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

const TEST_DOMAIN = "knot-test.dev";

/** Load .env.local into process.env so API route always sees vars (Next.js sometimes doesn't load it). */
function loadEnvLocalIfNeeded() {
    // Try every plausible location for web/.env.local
    const cwd = process.cwd();
    const possibleDirs = [
        cwd,
        path.join(cwd, "web"),
        // From source: web/src/app/api/seed-matches -> web (4 levels up)
        path.join(__dirname, "..", "..", "..", ".."),
        // From compiled: .next/server/app/api/seed-matches -> web (5 levels up)
        path.join(__dirname, "..", "..", "..", "..", ".."),
    ];
    for (const dir of possibleDirs) {
        const envPath = path.join(dir, ".env.local");
        try {
            if (!fs.existsSync(envPath)) continue;
            const content = fs.readFileSync(envPath, "utf8");
            for (const line of content.split(/\r?\n/)) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith("#")) continue;
                const idx = trimmed.indexOf("=");
                if (idx <= 0) continue;
                const key = trimmed.slice(0, idx).trim();
                let value = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "").replace(/\r$/, "");
                process.env[key] = value;
            }
            return;
        } catch {
            // continue to next path
        }
    }
}

interface FakeUser {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    school: string;
    bio: string;
    rating: number;
    completedRides: number;
    totalRides: number;
    phoneVerified: boolean;
    emailVerified: boolean;
    idVerified: boolean;
    conversationPref: string;
    musicPref: string;
    smokingPref: string;
    photoUrl: string | null;
}

const FAKE_USERS: FakeUser[] = [
    {
        email: `sarah@${TEST_DOMAIN}`,
        password: "KnotTest2026!",
        firstName: "Sarah",
        lastName: "Johnson",
        school: "UCLA",
        bio: "Film major at UCLA. Road trips > everything.",
        rating: 4.8,
        completedRides: 12,
        totalRides: 15,
        phoneVerified: true,
        emailVerified: true,
        idVerified: true,
        conversationPref: "chatty",
        musicPref: "yes",
        smokingPref: "no",
        photoUrl: "/avatars/sarah.svg",
    },
    {
        email: `mike@${TEST_DOMAIN}`,
        password: "KnotTest2026!",
        firstName: "Mike",
        lastName: "Chen",
        school: "USC",
        bio: "CS student. Low-key, always on time.",
        rating: 4.5,
        completedRides: 8,
        totalRides: 10,
        phoneVerified: true,
        emailVerified: true,
        idVerified: false,
        conversationPref: "chill",
        musicPref: "no_preference",
        smokingPref: "no",
        photoUrl: "/avatars/mike.svg",
    },
    {
        email: `david@${TEST_DOMAIN}`,
        password: "KnotTest2026!",
        firstName: "David",
        lastName: "Kim",
        school: "SJSU",
        bio: "Driving Bay Area for work. Always happy to share rides.",
        rating: 4.6,
        completedRides: 15,
        totalRides: 18,
        phoneVerified: true,
        emailVerified: true,
        idVerified: false,
        conversationPref: "chill",
        musicPref: "no_preference",
        smokingPref: "no",
        photoUrl: "/avatars/km.svg",
    },
    {
        email: `sophia@${TEST_DOMAIN}`,
        password: "KnotTest2026!",
        firstName: "Sophia",
        lastName: "Taylor",
        school: "Stanford",
        bio: "PhD candidate. Quiet rides preferred.",
        rating: 4.9,
        completedRides: 9,
        totalRides: 10,
        phoneVerified: true,
        emailVerified: true,
        idVerified: true,
        conversationPref: "quiet",
        musicPref: "no",
        smokingPref: "no",
        photoUrl: null,
    },
    {
        email: `alex@${TEST_DOMAIN}`,
        password: "KnotTest2026!",
        firstName: "Alex",
        lastName: "Rivera",
        school: "UC Berkeley",
        bio: "First year, exploring the Bay Area!",
        rating: 4.4,
        completedRides: 2,
        totalRides: 4,
        phoneVerified: true,
        emailVerified: true,
        idVerified: false,
        conversationPref: "chatty",
        musicPref: "yes",
        smokingPref: "no",
        photoUrl: null,
    },
    {
        email: `chris@${TEST_DOMAIN}`,
        password: "KnotTest2026!",
        firstName: "Chris",
        lastName: "Park",
        school: "UCLA",
        bio: "Engineering student. Burbank to campus all the time.",
        rating: 4.8,
        completedRides: 11,
        totalRides: 14,
        phoneVerified: true,
        emailVerified: true,
        idVerified: true,
        conversationPref: "chill",
        musicPref: "yes",
        smokingPref: "no",
        photoUrl: null,
    },
    {
        email: `jordan@${TEST_DOMAIN}`,
        password: "KnotTest2026!",
        firstName: "Jordan",
        lastName: "Liu",
        school: "USC",
        bio: "Music production. Early flights are my thing.",
        rating: 4.5,
        completedRides: 6,
        totalRides: 8,
        phoneVerified: true,
        emailVerified: false,
        idVerified: false,
        conversationPref: "quiet",
        musicPref: "no_preference",
        smokingPref: "no",
        photoUrl: null,
    },
    {
        email: `taylor@${TEST_DOMAIN}`,
        password: "KnotTest2026!",
        firstName: "Taylor",
        lastName: "Green",
        school: "USC",
        bio: "LAX runs every other week.",
        rating: 4.7,
        completedRides: 7,
        totalRides: 9,
        phoneVerified: true,
        emailVerified: true,
        idVerified: false,
        conversationPref: "chatty",
        musicPref: "yes",
        smokingPref: "no",
        photoUrl: null,
    },
    {
        email: `riley@${TEST_DOMAIN}`,
        password: "KnotTest2026!",
        firstName: "Riley",
        lastName: "Brown",
        school: "UCLA",
        bio: "New to ride share, excited to save!",
        rating: 4.3,
        completedRides: 1,
        totalRides: 2,
        phoneVerified: true,
        emailVerified: true,
        idVerified: false,
        conversationPref: "chill",
        musicPref: "yes",
        smokingPref: "no",
        photoUrl: null,
    },
    {
        email: `quinn@${TEST_DOMAIN}`,
        password: "KnotTest2026!",
        firstName: "Quinn",
        lastName: "Harris",
        school: "UC Berkeley",
        bio: "SFO to Berkeley regular. Let's split costs!",
        rating: 4.8,
        completedRides: 14,
        totalRides: 16,
        phoneVerified: true,
        emailVerified: true,
        idVerified: true,
        conversationPref: "chill",
        musicPref: "yes",
        smokingPref: "no",
        photoUrl: null,
    },
];

function getAdmin() {
    loadEnvLocalIfNeeded();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        const cwd = process.env.NODE_ENV === "development" ? process.cwd() : "";
        const hint =
            process.env.NODE_ENV === "development"
                ? ` cwd=${cwd} — run from web folder: cd web && npm run dev`
                : "";
        throw new Error(
            `Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Add them to web/.env.local.${hint}`
        );
    }
    return createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

function tomorrowAtHour(hour: number, min = 0): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(hour, min, 0, 0);
    return d.toISOString();
}

async function cleanupTestUsers(
    supabase: ReturnType<typeof createClient>
): Promise<number> {
    const {
        data: { users },
    } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const testUsers = (users || []).filter((u) =>
        u.email?.endsWith(`@${TEST_DOMAIN}`)
    );

    for (const user of testUsers) {
        await supabase.auth.admin.deleteUser(user.id);
    }
    return testUsers.length;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Supabase = ReturnType<typeof createClient>;

async function createTestUsers(supabase: Supabase) {
    const authIds: Record<string, string> = {};

    for (const u of FAKE_USERS) {
        const { data, error } = await supabase.auth.admin.createUser({
            email: u.email,
            password: u.password,
            email_confirm: true,
            user_metadata: {
                first_name: u.firstName,
                last_name: u.lastName,
            },
        });
        if (error)
            throw new Error(
                `Failed to create user ${u.email}: ${error.message}`
            );
        authIds[u.email] = data.user.id;
    }

    // Let the handle_new_user trigger fire and create profiles
    await new Promise((r) => setTimeout(r, 2000));

    const profileIds: Record<string, string> = {};
    for (const u of FAKE_USERS) {
        const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("user_id", authIds[u.email])
            .single();
        if (!profile)
            throw new Error(`Profile not created for ${u.email}`);
        profileIds[u.email] = profile.id;
    }

    // Enrich profiles
    for (const u of FAKE_USERS) {
        const { error } = await supabase
            .from("profiles")
            .update({
                school: u.school,
                bio: u.bio,
                rating: u.rating,
                completed_rides: u.completedRides,
                total_rides: u.totalRides,
                phone_verified: u.phoneVerified,
                email_verified: u.emailVerified,
                id_verified: u.idVerified,
                conversation_pref: u.conversationPref,
                music_pref: u.musicPref,
                smoking_pref: u.smokingPref,
                photo_url: u.photoUrl,
                is_verified: u.idVerified,
            })
            .eq("id", profileIds[u.email]);
        if (error)
            throw new Error(
                `Failed to update profile ${u.email}: ${error.message}`
            );
    }

    return profileIds;
}

async function createTestRides(
    supabase: Supabase,
    profileIds: Record<string, string>
) {
    const rideIds: Record<string, string> = {};

    const rides = [
        // ── Route A: LAX → UCLA (single match) ──
        {
            key: "sarah_offering",
            userId: profileIds[`sarah@${TEST_DOMAIN}`],
            rideType: "offering",
            originName: "Los Angeles International Airport (LAX)",
            originLat: 33.9425,
            originLng: -118.4081,
            destName: "UCLA, Westwood, Los Angeles, CA",
            destLat: 34.0689,
            destLng: -118.4452,
            earliest: tomorrowAtHour(14),
            latest: tomorrowAtHour(16),
            preferred: tomorrowAtHour(15),
            seatsAvailable: 4,
            seatsNeeded: 1,
            spaceCapacity: 3,
        },
        {
            key: "mike_seeking",
            userId: profileIds[`mike@${TEST_DOMAIN}`],
            rideType: "seeking",
            originName: "Los Angeles International Airport (LAX)",
            originLat: 33.9425,
            originLng: -118.4081,
            destName: "UCLA, Westwood, Los Angeles, CA",
            destLat: 34.0689,
            destLng: -118.4452,
            earliest: tomorrowAtHour(14, 30),
            latest: tomorrowAtHour(16, 30),
            preferred: tomorrowAtHour(15, 15),
            seatsAvailable: 1,
            seatsNeeded: 1,
            spaceCapacity: 1,
        },

        // ── Route B: SFO → Stanford (group of 3) ──
        {
            key: "david_offering",
            userId: profileIds[`david@${TEST_DOMAIN}`],
            rideType: "offering",
            originName: "San Francisco International Airport (SFO)",
            originLat: 37.6213,
            originLng: -122.379,
            destName: "Stanford University, Palo Alto, CA",
            destLat: 37.4275,
            destLng: -122.1697,
            earliest: tomorrowAtHour(14),
            latest: tomorrowAtHour(15),
            preferred: tomorrowAtHour(14, 30),
            seatsAvailable: 3,
            seatsNeeded: 1,
            spaceCapacity: 2,
        },
        {
            key: "sophia_seeking",
            userId: profileIds[`sophia@${TEST_DOMAIN}`],
            rideType: "seeking",
            originName: "San Francisco International Airport (SFO)",
            originLat: 37.6213,
            originLng: -122.379,
            destName: "Stanford University, Palo Alto, CA",
            destLat: 37.4275,
            destLng: -122.1697,
            earliest: tomorrowAtHour(14),
            latest: tomorrowAtHour(15),
            preferred: tomorrowAtHour(14, 30),
            seatsAvailable: 1,
            seatsNeeded: 1,
            spaceCapacity: 1,
        },
        {
            key: "alex_seeking",
            userId: profileIds[`alex@${TEST_DOMAIN}`],
            rideType: "seeking",
            originName: "San Francisco International Airport (SFO)",
            originLat: 37.6213,
            originLng: -122.379,
            destName: "Stanford University, Palo Alto, CA",
            destLat: 37.4275,
            destLng: -122.1697,
            earliest: tomorrowAtHour(14, 15),
            latest: tomorrowAtHour(15, 15),
            preferred: tomorrowAtHour(14, 45),
            seatsAvailable: 1,
            seatsNeeded: 1,
            spaceCapacity: 1,
        },
        {
            key: "jordan_seeking_sfo",
            userId: profileIds[`jordan@${TEST_DOMAIN}`],
            rideType: "seeking",
            originName: "San Francisco International Airport (SFO)",
            originLat: 37.6213,
            originLng: -122.379,
            destName: "Stanford University, Palo Alto, CA",
            destLat: 37.4275,
            destLng: -122.1697,
            earliest: tomorrowAtHour(14, 10),
            latest: tomorrowAtHour(15, 10),
            preferred: tomorrowAtHour(14, 35),
            seatsAvailable: 1,
            seatsNeeded: 1,
            spaceCapacity: 1,
        },
        {
            key: "taylor_seeking_sfo",
            userId: profileIds[`taylor@${TEST_DOMAIN}`],
            rideType: "seeking",
            originName: "San Francisco International Airport (SFO)",
            originLat: 37.6213,
            originLng: -122.379,
            destName: "Stanford University, Palo Alto, CA",
            destLat: 37.4275,
            destLng: -122.1697,
            earliest: tomorrowAtHour(14, 20),
            latest: tomorrowAtHour(15, 20),
            preferred: tomorrowAtHour(14, 50),
            seatsAvailable: 1,
            seatsNeeded: 1,
            spaceCapacity: 1,
        },
        {
            key: "riley_seeking_sfo",
            userId: profileIds[`riley@${TEST_DOMAIN}`],
            rideType: "seeking",
            originName: "San Francisco International Airport (SFO)",
            originLat: 37.6213,
            originLng: -122.379,
            destName: "Stanford University, Palo Alto, CA",
            destLat: 37.4275,
            destLng: -122.1697,
            earliest: tomorrowAtHour(14, 25),
            latest: tomorrowAtHour(15, 25),
            preferred: tomorrowAtHour(14, 55),
            seatsAvailable: 1,
            seatsNeeded: 1,
            spaceCapacity: 1,
        },

        // ── Route C: BUR → UCLA (group of 4 + 1 pending) ──
        {
            key: "chris_offering",
            userId: profileIds[`chris@${TEST_DOMAIN}`],
            rideType: "offering",
            originName: "Hollywood Burbank Airport (BUR)",
            originLat: 34.2,
            originLng: -118.3587,
            destName: "UCLA, Westwood, Los Angeles, CA",
            destLat: 34.0689,
            destLng: -118.4452,
            earliest: tomorrowAtHour(8),
            latest: tomorrowAtHour(10),
            preferred: tomorrowAtHour(9),
            seatsAvailable: 4,
            seatsNeeded: 1,
            spaceCapacity: 2,
        },
        {
            key: "jordan_seeking",
            userId: profileIds[`jordan@${TEST_DOMAIN}`],
            rideType: "seeking",
            originName: "Hollywood Burbank Airport (BUR)",
            originLat: 34.2,
            originLng: -118.3587,
            destName: "UCLA, Westwood, Los Angeles, CA",
            destLat: 34.0689,
            destLng: -118.4452,
            earliest: tomorrowAtHour(8),
            latest: tomorrowAtHour(10),
            preferred: tomorrowAtHour(9, 15),
            seatsAvailable: 1,
            seatsNeeded: 1,
            spaceCapacity: 1,
        },
        {
            key: "taylor_seeking",
            userId: profileIds[`taylor@${TEST_DOMAIN}`],
            rideType: "seeking",
            originName: "Hollywood Burbank Airport (BUR)",
            originLat: 34.2,
            originLng: -118.3587,
            destName: "UCLA, Westwood, Los Angeles, CA",
            destLat: 34.0689,
            destLng: -118.4452,
            earliest: tomorrowAtHour(8, 15),
            latest: tomorrowAtHour(10, 15),
            preferred: tomorrowAtHour(9, 30),
            seatsAvailable: 1,
            seatsNeeded: 1,
            spaceCapacity: 1,
        },
        {
            key: "riley_seeking",
            userId: profileIds[`riley@${TEST_DOMAIN}`],
            rideType: "seeking",
            originName: "Hollywood Burbank Airport (BUR)",
            originLat: 34.2,
            originLng: -118.3587,
            destName: "UCLA, Westwood, Los Angeles, CA",
            destLat: 34.0689,
            destLng: -118.4452,
            earliest: tomorrowAtHour(8, 30),
            latest: tomorrowAtHour(10, 30),
            preferred: tomorrowAtHour(9, 45),
            seatsAvailable: 1,
            seatsNeeded: 1,
            spaceCapacity: 1,
        },
        {
            key: "quinn_seeking",
            userId: profileIds[`quinn@${TEST_DOMAIN}`],
            rideType: "seeking",
            originName: "Hollywood Burbank Airport (BUR)",
            originLat: 34.2,
            originLng: -118.3587,
            destName: "UCLA, Westwood, Los Angeles, CA",
            destLat: 34.0689,
            destLng: -118.4452,
            earliest: tomorrowAtHour(8, 45),
            latest: tomorrowAtHour(10, 45),
            preferred: tomorrowAtHour(9, 30),
            seatsAvailable: 1,
            seatsNeeded: 1,
            spaceCapacity: 1,
        },
    ];

    for (const r of rides) {
        const { data, error } = await supabase
            .from("rides")
            .insert({
                user_id: r.userId,
                ride_type: r.rideType,
                origin_name: r.originName,
                origin_lat: r.originLat,
                origin_lng: r.originLng,
                dest_name: r.destName,
                dest_lat: r.destLat,
                dest_lng: r.destLng,
                departure_earliest: r.earliest,
                departure_latest: r.latest,
                departure_preferred: r.preferred,
                seats_available: r.seatsAvailable,
                seats_needed: r.seatsNeeded,
                space_capacity: r.spaceCapacity,
                gender_pref: "any",
                quiet_ride: false,
                music_ok: true,
                status: "active",
            })
            .select("id")
            .single();
        if (error)
            throw new Error(`Failed to create ride ${r.key}: ${error.message}`);
        rideIds[r.key] = data.id;
    }

    return rideIds;
}

interface MatchRequest {
    id: string;
    rideId: string;
    requesterRideId: string;
    status: string;
}

async function createTestMatches(
    supabase: Supabase,
    rideIds: Record<string, string>
) {
    const requests: MatchRequest[] = [];

    const matchPairs: Array<{
        rideKey: string;
        requesterKey: string;
        status: string;
        rideStatus: string;
    }> = [
        // Route A: single match (Sarah ↔ Mike)
        {
            rideKey: "sarah_offering",
            requesterKey: "mike_seeking",
            status: "accepted",
            rideStatus: "accepted",
        },
        // Route B (flow test): 0 accepted, 4 pending — max group = 4 people (host + 3). Accept 1→1:1, 2→GC3, 3→GC4 (max), 4th→blocked
        {
            rideKey: "david_offering",
            requesterKey: "sophia_seeking",
            status: "pending",
            rideStatus: "requested",
        },
        {
            rideKey: "david_offering",
            requesterKey: "alex_seeking",
            status: "pending",
            rideStatus: "requested",
        },
        {
            rideKey: "david_offering",
            requesterKey: "jordan_seeking_sfo",
            status: "pending",
            rideStatus: "requested",
        },
        {
            rideKey: "david_offering",
            requesterKey: "taylor_seeking_sfo",
            status: "pending",
            rideStatus: "requested",
        },
        // Route C: group of 4 (Chris ↔ Jordan, Taylor, Riley) + Quinn pending
        {
            rideKey: "chris_offering",
            requesterKey: "jordan_seeking",
            status: "accepted",
            rideStatus: "accepted",
        },
        {
            rideKey: "chris_offering",
            requesterKey: "taylor_seeking",
            status: "accepted",
            rideStatus: "accepted",
        },
        {
            rideKey: "chris_offering",
            requesterKey: "riley_seeking",
            status: "accepted",
            rideStatus: "accepted",
        },
        {
            rideKey: "chris_offering",
            requesterKey: "quinn_seeking",
            status: "pending",
            rideStatus: "requested",
        },
    ];

    // Insert one at a time so triggers fire in order
    for (const pair of matchPairs) {
        const { data, error } = await supabase
            .from("ride_requests")
            .insert({
                ride_id: rideIds[pair.rideKey],
                requester_ride_id: rideIds[pair.requesterKey],
                status: pair.status,
                ride_status: pair.rideStatus,
            })
            .select("id")
            .single();
        if (error)
            throw new Error(
                `Failed to create match ${pair.rideKey} ↔ ${pair.requesterKey}: ${error.message}`
            );
        requests.push({
            id: data.id,
            rideId: rideIds[pair.rideKey],
            requesterRideId: rideIds[pair.requesterKey],
            status: pair.status,
        });
    }

    // Give triggers a moment to create ride_groups (only Chris has 2+ accepted here; David has 1 accepted + 1 pending)
    await new Promise((r) => setTimeout(r, 500));

    const { data: groups } = await supabase
        .from("ride_groups")
        .select("id, ride_id")
        .in("ride_id", [rideIds.chris_offering]);

    const groupMap: Record<string, string> = {};
    (groups || []).forEach(
        (g: { id: string; ride_id: string }) =>
            (groupMap[g.ride_id] = g.id)
    );

    // If trigger didn't fire for Chris's ride, insert group manually (David's stays 1:1 until user accepts Alex)
    if (!groupMap[rideIds.chris_offering]) {
        const { data, error } = await supabase
            .from("ride_groups")
            .insert({ ride_id: rideIds.chris_offering })
            .select("id")
            .single();
        if (!error && data) {
            groupMap[rideIds.chris_offering] = data.id;
        }
    }

    return { requests, groupMap };
}

async function createTestMessages(
    supabase: Supabase,
    profileIds: Record<string, string>,
    requests: MatchRequest[],
    rideIds: Record<string, string>,
    groupMap: Record<string, string>
) {
    const p = (name: string) => profileIds[`${name}@${TEST_DOMAIN}`];

    // Route A: 1:1 messages (Sarah ↔ Mike)
    const singleReq = requests.find(
        (r) => r.requesterRideId === rideIds.mike_seeking
    );
    if (singleReq) {
        await supabase.from("messages").insert([
            {
                conversation_id: singleReq.id,
                ride_group_id: null,
                sender_id: p("sarah"),
                content:
                    "Hey Mike! I'll be at LAX Terminal 2 around 3pm tomorrow. Where should I pick you up?",
                message_type: "text",
            },
            {
                conversation_id: singleReq.id,
                ride_group_id: null,
                sender_id: p("mike"),
                content:
                    "Awesome! I'll be at arrivals. I have a small roller bag, hope that's ok.",
                message_type: "text",
            },
            {
                conversation_id: singleReq.id,
                ride_group_id: null,
                sender_id: p("sarah"),
                content:
                    "Totally fine! I have plenty of trunk space. See you there!",
                message_type: "text",
            },
        ]);
    }

    // Route B: no messages (flow test — 0 accepted until user accepts from Home)

    // Route C: group messages (Chris + Jordan + Taylor + Riley)
    const groupC = groupMap[rideIds.chris_offering];
    if (groupC) {
        await supabase.from("messages").insert([
            {
                conversation_id: null,
                ride_group_id: groupC,
                sender_id: p("chris"),
                content:
                    "Morning everyone! I'll be at BUR curbside around 9am. White Toyota RAV4.",
                message_type: "text",
            },
            {
                conversation_id: null,
                ride_group_id: groupC,
                sender_id: p("jordan"),
                content: "Sweet. I'll be there at 9:15 — is that too late?",
                message_type: "text",
            },
            {
                conversation_id: null,
                ride_group_id: groupC,
                sender_id: p("chris"),
                content:
                    "No worries, I can wait. Taylor & Riley, what's your ETA?",
                message_type: "text",
            },
            {
                conversation_id: null,
                ride_group_id: groupC,
                sender_id: p("taylor"),
                content: "I'll be there at 9! Right on time.",
                message_type: "text",
            },
            {
                conversation_id: null,
                ride_group_id: groupC,
                sender_id: p("riley"),
                content: "Same, around 9:15 with Jordan. Can't wait!",
                message_type: "text",
            },
        ]);
    }
}

// ─── POST: create all fake matches ───

export async function POST() {
    try {
        const supabase = getAdmin();

        // 1. Clean up old test data
        const cleaned = await cleanupTestUsers(supabase);

        // 2. Create users + enriched profiles
        const profileIds = await createTestUsers(supabase);

        // 3. Create rides
        const rideIds = await createTestRides(supabase, profileIds);

        // 4. Create ride_requests (matches) — triggers create ride_groups
        const { requests, groupMap } = await createTestMatches(
            supabase,
            rideIds
        );

        // 5. Create messages
        await createTestMessages(
            supabase,
            profileIds,
            requests,
            rideIds,
            groupMap
        );

        return NextResponse.json({
            success: true,
            cleaned,
            summary: {
                users: FAKE_USERS.length,
                rides: Object.keys(rideIds).length,
                acceptedMatches: requests.filter((r) => r.status === "accepted")
                    .length,
                pendingRequests: requests.filter((r) => r.status === "pending")
                    .length,
                groups: Object.keys(groupMap).length,
            },
            matches: {
                single: [
                    {
                        route: "LAX → UCLA",
                        driver: "Sarah Johnson",
                        rider: "Mike Chen",
                        type: "1:1 match with chat",
                    },
                ],
                groups: [
                    {
                        route: "SFO → Stanford",
                        driver: "David Kim",
                        riders: "5 pending (Sophia, Alex, Jordan, Taylor, Riley)",
                        type: "Flow test: accept 1→1:1, 2→GC3, 3→GC4 (max 4 people), 4th blocked",
                    },
                    {
                        route: "BUR → UCLA",
                        driver: "Chris Park",
                        riders: [
                            "Jordan Liu",
                            "Taylor Green",
                            "Riley Brown",
                        ],
                        pending: ["Quinn Harris"],
                        type: "Group of 4 with group chat (+ 1 pending)",
                    },
                ],
            },
            credentials: FAKE_USERS.map((u) => ({
                email: u.email,
                password: u.password,
                name: `${u.firstName} ${u.lastName}`,
            })),
        });
    } catch (error) {
        console.error("Seed matches error:", error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}

// ─── DELETE: remove all fake test data ───

export async function DELETE() {
    try {
        const supabase = getAdmin();
        const cleaned = await cleanupTestUsers(supabase);
        return NextResponse.json({
            success: true,
            message: `Cleaned up ${cleaned} test users and all cascaded data`,
        });
    } catch (error) {
        console.error("Cleanup error:", error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}
