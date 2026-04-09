import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

const TEST_DOMAIN = "knot-test.dev";
const TEST_PASSWORD = "KnotTest2026!";

function loadEnvLocalIfNeeded() {
    const cwd = process.cwd();
    const possibleDirs = [
        cwd,
        path.join(cwd, "web"),
        path.join(__dirname, "..", "..", "..", ".."),
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
                const value = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "").replace(/\r$/, "");
                process.env[key] = value;
            }
            return;
        } catch {
            // continue
        }
    }
}

interface FakeUser {
    email: string;
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
}

const FAKE_USERS: FakeUser[] = [
    // ── Casey: main accept-flow account (grows group from 1→6) ──
    {
        email: `casey@${TEST_DOMAIN}`,
        firstName: "Casey",
        lastName: "Nguyen",
        school: "UCLA",
        bio: "Always coordinating airport runs for friends.",
        rating: 4.7,
        completedRides: 10,
        totalRides: 12,
        phoneVerified: true,
        emailVerified: true,
        idVerified: true,
    },
    {
        email: `morgan@${TEST_DOMAIN}`,
        firstName: "Morgan",
        lastName: "Lee",
        school: "UCLA",
        bio: "Red-eye flights and one backpack.",
        rating: 4.6,
        completedRides: 5,
        totalRides: 7,
        phoneVerified: true,
        emailVerified: true,
        idVerified: false,
    },
    {
        email: `jamie@${TEST_DOMAIN}`,
        firstName: "Jamie",
        lastName: "Patel",
        school: "USC",
        bio: "Usually down to share if pickup is easy.",
        rating: 4.5,
        completedRides: 4,
        totalRides: 6,
        phoneVerified: true,
        emailVerified: true,
        idVerified: false,
    },
    {
        email: `sam@${TEST_DOMAIN}`,
        firstName: "Sam",
        lastName: "Lopez",
        school: "Santa Monica College",
        bio: "Flexible on timing if it saves money.",
        rating: 4.4,
        completedRides: 3,
        totalRides: 5,
        phoneVerified: true,
        emailVerified: true,
        idVerified: false,
    },
    {
        email: `liam@${TEST_DOMAIN}`,
        firstName: "Liam",
        lastName: "Brooks",
        school: "UCLA",
        bio: "Good with airport pickups as long as timing is clear.",
        rating: 4.6,
        completedRides: 8,
        totalRides: 11,
        phoneVerified: true,
        emailVerified: true,
        idVerified: false,
    },
    {
        email: `ava@${TEST_DOMAIN}`,
        firstName: "Ava",
        lastName: "Singh",
        school: "USC",
        bio: "One carry-on and a clear pickup spot is all I need.",
        rating: 4.7,
        completedRides: 9,
        totalRides: 12,
        phoneVerified: true,
        emailVerified: true,
        idVerified: false,
    },

    // ── David: existing 3-person group chat ──
    {
        email: `david@${TEST_DOMAIN}`,
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
    },
    {
        email: `sophia@${TEST_DOMAIN}`,
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
    },
    {
        email: `alex@${TEST_DOMAIN}`,
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
    },

    // ── Sarah: match discovery (sees available solo candidates) ──
    {
        email: `sarah@${TEST_DOMAIN}`,
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
    },
    {
        email: `mike@${TEST_DOMAIN}`,
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
    },
    {
        email: `jordan@${TEST_DOMAIN}`,
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
    },

    // ── Maya: host-leaves test (3-person group, creator can leave) ──
    {
        email: `maya@${TEST_DOMAIN}`,
        firstName: "Maya",
        lastName: "Rodriguez",
        school: "LMU",
        bio: "Usually the planner, but happy to hand things off.",
        rating: 4.8,
        completedRides: 13,
        totalRides: 16,
        phoneVerified: true,
        emailVerified: true,
        idVerified: true,
    },
    {
        email: `riley@${TEST_DOMAIN}`,
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
    },
    {
        email: `quinn@${TEST_DOMAIN}`,
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
    },
];

function getAdmin() {
    loadEnvLocalIfNeeded();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        throw new Error(
            "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Add them to web/.env.local."
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

type Supabase = ReturnType<typeof createClient>;

async function cleanupTestUsers(supabase: Supabase): Promise<number> {
    const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const testUsers = (users || []).filter((u) => u.email?.endsWith(`@${TEST_DOMAIN}`));
    for (const user of testUsers) {
        await supabase.auth.admin.deleteUser(user.id);
    }
    return testUsers.length;
}

async function createTestUsers(supabase: Supabase) {
    const authIds: Record<string, string> = {};

    for (const u of FAKE_USERS) {
        const { data, error } = await supabase.auth.admin.createUser({
            email: u.email,
            password: TEST_PASSWORD,
            email_confirm: true,
            user_metadata: { first_name: u.firstName, last_name: u.lastName },
        });
        if (error) throw new Error(`Failed to create user ${u.email}: ${error.message}`);
        authIds[u.email] = data.user.id;
    }

    await new Promise((r) => setTimeout(r, 1500));

    const profileIds: Record<string, string> = {};
    for (const u of FAKE_USERS) {
        let profile: { id: string } | null = null;
        for (let attempt = 0; attempt < 5; attempt += 1) {
            const { data } = await supabase
                .from("profiles")
                .select("id")
                .eq("user_id", authIds[u.email])
                .maybeSingle();
            if (data) { profile = data as { id: string }; break; }
            await new Promise((r) => setTimeout(r, 500));
        }

        if (!profile) {
            const { data, error } = await (
                supabase.from("profiles") as unknown as {
                    insert: (p: unknown) => { select: (cols: string) => { single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }> } };
                }
            ).insert({
                user_id: authIds[u.email],
                email: u.email,
                first_name: u.firstName,
                last_name: u.lastName,
            }).select("id").single();
            if (error || !data) throw new Error(`Profile not created for ${u.email}: ${error?.message ?? "unknown"}`);
            profile = data;
        }

        profileIds[u.email] = profile.id;
    }

    for (const u of FAKE_USERS) {
        const table = supabase.from("profiles") as unknown as {
            update: (p: unknown) => { eq: (col: string, val: string) => Promise<{ error: { message: string } | null }> };
        };
        const { error } = await table.update({
            school: u.school,
            bio: u.bio,
            rating: u.rating,
            completed_rides: u.completedRides,
            total_rides: u.totalRides,
            phone_verified: u.phoneVerified,
            email_verified: u.emailVerified,
            id_verified: u.idVerified,
            is_verified: u.idVerified,
        }).eq("id", profileIds[u.email]);
        if (error) throw new Error(`Failed to update profile ${u.email}: ${error.message}`);
    }

    return profileIds;
}

async function createTestRides(supabase: Supabase, profileIds: Record<string, string>) {
    const rideIds: Record<string, string> = {};

    const rides = [
        // ── Casey accept flow: host ride + 5 candidates with nearby origins/dest ──
        {
            key: "casey_host",
            userId: profileIds[`casey@${TEST_DOMAIN}`],
            originName: "UCLA Ackerman Union, Los Angeles, CA",
            originLat: 34.0703, originLng: -118.4441,
            destName: "LAX Terminal B, Los Angeles, CA",
            destLat: 33.9435, destLng: -118.4085,
            earliest: tomorrowAtHour(18), latest: tomorrowAtHour(19),
            preferred: tomorrowAtHour(18, 30),
            seatsNeeded: 1,
        },
        {
            key: "morgan_req",
            userId: profileIds[`morgan@${TEST_DOMAIN}`],
            originName: "Westwood Plaza, Los Angeles, CA",
            originLat: 34.0719, originLng: -118.4449,
            destName: "LAX Terminal B, Los Angeles, CA",
            destLat: 33.9432, destLng: -118.4084,
            earliest: tomorrowAtHour(18, 10), latest: tomorrowAtHour(19, 10),
            preferred: tomorrowAtHour(18, 40),
            seatsNeeded: 1,
        },
        {
            key: "jamie_req",
            userId: profileIds[`jamie@${TEST_DOMAIN}`],
            originName: "Sawtelle Japantown, Los Angeles, CA",
            originLat: 34.0423, originLng: -118.4427,
            destName: "LAX Terminal 4, Los Angeles, CA",
            destLat: 33.9416, destLng: -118.4088,
            earliest: tomorrowAtHour(18, 20), latest: tomorrowAtHour(19, 15),
            preferred: tomorrowAtHour(18, 45),
            seatsNeeded: 1,
        },
        {
            key: "sam_req",
            userId: profileIds[`sam@${TEST_DOMAIN}`],
            originName: "Brentwood, Los Angeles, CA",
            originLat: 34.0546, originLng: -118.4695,
            destName: "LAX Terminal 6, Los Angeles, CA",
            destLat: 33.9427, destLng: -118.4067,
            earliest: tomorrowAtHour(18, 15), latest: tomorrowAtHour(19, 5),
            preferred: tomorrowAtHour(18, 35),
            seatsNeeded: 1,
        },
        {
            key: "liam_req",
            userId: profileIds[`liam@${TEST_DOMAIN}`],
            originName: "Westwood Village, Los Angeles, CA",
            originLat: 34.0637, originLng: -118.4455,
            destName: "LAX Terminal B, Los Angeles, CA",
            destLat: 33.9431, destLng: -118.4081,
            earliest: tomorrowAtHour(18, 5), latest: tomorrowAtHour(19),
            preferred: tomorrowAtHour(18, 30),
            seatsNeeded: 1,
        },
        {
            key: "ava_req",
            userId: profileIds[`ava@${TEST_DOMAIN}`],
            originName: "West Los Angeles, Los Angeles, CA",
            originLat: 34.0508, originLng: -118.4308,
            destName: "LAX Terminal 5, Los Angeles, CA",
            destLat: 33.9421, destLng: -118.4078,
            earliest: tomorrowAtHour(18, 10), latest: tomorrowAtHour(19, 10),
            preferred: tomorrowAtHour(18, 40),
            seatsNeeded: 1,
        },

        // ── David's existing group (3 accepted) ──
        {
            key: "david_host",
            userId: profileIds[`david@${TEST_DOMAIN}`],
            originName: "Westwood Gateway, Los Angeles, CA",
            originLat: 34.0621, originLng: -118.4468,
            destName: "LAX Terminal B, Los Angeles, CA",
            destLat: 33.9433, destLng: -118.4079,
            earliest: tomorrowAtHour(16, 45), latest: tomorrowAtHour(18),
            preferred: tomorrowAtHour(17, 15),
            seatsNeeded: 1,
        },
        {
            key: "sophia_member",
            userId: profileIds[`sophia@${TEST_DOMAIN}`],
            originName: "UCLA Gayley Center, Los Angeles, CA",
            originLat: 34.0733, originLng: -118.4441,
            destName: "LAX Terminal B, Los Angeles, CA",
            destLat: 33.9442, destLng: -118.4082,
            earliest: tomorrowAtHour(16, 50), latest: tomorrowAtHour(18, 10),
            preferred: tomorrowAtHour(17, 20),
            seatsNeeded: 1,
        },
        {
            key: "alex_member",
            userId: profileIds[`alex@${TEST_DOMAIN}`],
            originName: "Westwood Gardens, Los Angeles, CA",
            originLat: 34.0661, originLng: -118.4438,
            destName: "LAX Terminal 3, Los Angeles, CA",
            destLat: 33.9426, destLng: -118.4103,
            earliest: tomorrowAtHour(17), latest: tomorrowAtHour(18),
            preferred: tomorrowAtHour(17, 25),
            seatsNeeded: 1,
        },

        // ── Sarah: match discovery (has a ride, sees Mike + Jordan as candidates) ──
        {
            key: "sarah_main",
            userId: profileIds[`sarah@${TEST_DOMAIN}`],
            originName: "UCLA De Neve Plaza, Los Angeles, CA",
            originLat: 34.0713, originLng: -118.4501,
            destName: "LAX Terminal B, Los Angeles, CA",
            destLat: 33.9435, destLng: -118.4085,
            earliest: tomorrowAtHour(16), latest: tomorrowAtHour(18),
            preferred: tomorrowAtHour(17),
            seatsNeeded: 1,
        },
        {
            key: "mike_candidate",
            userId: profileIds[`mike@${TEST_DOMAIN}`],
            originName: "Westwood Village, Los Angeles, CA",
            originLat: 34.0637, originLng: -118.4455,
            destName: "LAX Terminal B, Los Angeles, CA",
            destLat: 33.9431, destLng: -118.4081,
            earliest: tomorrowAtHour(16, 30), latest: tomorrowAtHour(18, 30),
            preferred: tomorrowAtHour(17, 30),
            seatsNeeded: 1,
        },
        {
            key: "jordan_candidate",
            userId: profileIds[`jordan@${TEST_DOMAIN}`],
            originName: "Sawtelle, Los Angeles, CA",
            originLat: 34.0454, originLng: -118.4487,
            destName: "LAX Terminal 4, Los Angeles, CA",
            destLat: 33.9416, destLng: -118.4088,
            earliest: tomorrowAtHour(17, 15), latest: tomorrowAtHour(18, 15),
            preferred: tomorrowAtHour(17, 45),
            seatsNeeded: 1,
        },

        // ── Maya host-leaves test: 3-person group ──
        {
            key: "maya_host",
            userId: profileIds[`maya@${TEST_DOMAIN}`],
            originName: "LMU Campus, Los Angeles, CA",
            originLat: 33.9696, originLng: -118.4167,
            destName: "LAX Terminal 2, Los Angeles, CA",
            destLat: 33.9438, destLng: -118.4092,
            earliest: tomorrowAtHour(17, 30), latest: tomorrowAtHour(18, 30),
            preferred: tomorrowAtHour(18),
            seatsNeeded: 1,
        },
        {
            key: "riley_member",
            userId: profileIds[`riley@${TEST_DOMAIN}`],
            originName: "Westchester, Los Angeles, CA",
            originLat: 33.9598, originLng: -118.4182,
            destName: "LAX Terminal 2, Los Angeles, CA",
            destLat: 33.9433, destLng: -118.4089,
            earliest: tomorrowAtHour(17, 40), latest: tomorrowAtHour(18, 20),
            preferred: tomorrowAtHour(18),
            seatsNeeded: 1,
        },
        {
            key: "quinn_member",
            userId: profileIds[`quinn@${TEST_DOMAIN}`],
            originName: "Playa Vista, Los Angeles, CA",
            originLat: 33.9761, originLng: -118.4186,
            destName: "LAX Terminal 2, Los Angeles, CA",
            destLat: 33.9431, destLng: -118.4094,
            earliest: tomorrowAtHour(17, 45), latest: tomorrowAtHour(18, 25),
            preferred: tomorrowAtHour(18, 5),
            seatsNeeded: 1,
        },
    ];

    for (const r of rides) {
        const { data, error } = await (supabase.from("rides") as unknown as {
            insert: (p: unknown) => { select: (cols: string) => { single: () => Promise<{ data: { id: string }; error: { message: string } | null }> } };
        }).insert({
            user_id: r.userId,
            ride_type: "seeking",
            origin_name: r.originName,
            origin_lat: r.originLat,
            origin_lng: r.originLng,
            dest_name: r.destName,
            dest_lat: r.destLat,
            dest_lng: r.destLng,
            departure_earliest: r.earliest,
            departure_latest: r.latest,
            departure_preferred: r.preferred,
            seats_available: 1,
            seats_needed: r.seatsNeeded,
            space_capacity: 1,
            gender_pref: "any",
            quiet_ride: false,
            music_ok: true,
            status: "active",
        }).select("id").single();
        if (error) throw new Error(`Failed to create ride ${r.key}: ${error.message}`);
        rideIds[r.key] = data.id;
    }

    return rideIds;
}

async function createTestMatches(supabase: Supabase, rideIds: Record<string, string>) {
    const matchPairs: Array<{
        rideKey: string;
        requesterKey: string;
        status: string;
        rideStatus: string;
    }> = [
        // ── David's group: 2 accepted (3 people total) ──
        { rideKey: "david_host", requesterKey: "sophia_member", status: "accepted", rideStatus: "accepted" },
        { rideKey: "david_host", requesterKey: "alex_member", status: "accepted", rideStatus: "accepted" },

        // ── Casey accept flow: 5 pending requests (accept them one by one: 1→2→3→4→5→6) ──
        { rideKey: "casey_host", requesterKey: "morgan_req", status: "pending", rideStatus: "requested" },
        { rideKey: "casey_host", requesterKey: "jamie_req", status: "pending", rideStatus: "requested" },
        { rideKey: "casey_host", requesterKey: "sam_req", status: "pending", rideStatus: "requested" },
        { rideKey: "casey_host", requesterKey: "liam_req", status: "pending", rideStatus: "requested" },
        { rideKey: "casey_host", requesterKey: "ava_req", status: "pending", rideStatus: "requested" },

        // ── Maya host-leaves group: 2 accepted (3 people total) ──
        { rideKey: "maya_host", requesterKey: "riley_member", status: "accepted", rideStatus: "accepted" },
        { rideKey: "maya_host", requesterKey: "quinn_member", status: "accepted", rideStatus: "accepted" },
    ];

    const requests: Array<{ id: string; rideId: string; requesterRideId: string; status: string }> = [];

    for (const pair of matchPairs) {
        const { data, error } = await (supabase.from("ride_requests") as unknown as {
            insert: (p: unknown) => { select: (cols: string) => { single: () => Promise<{ data: { id: string }; error: { message: string } | null }> } };
        }).insert({
            ride_id: rideIds[pair.rideKey],
            requester_ride_id: rideIds[pair.requesterKey],
            status: pair.status,
            ride_status: pair.rideStatus,
        }).select("id").single();

        if (error) throw new Error(`Failed to create match ${pair.rideKey} ↔ ${pair.requesterKey}: ${error.message}`);
        requests.push({ id: data.id, rideId: rideIds[pair.rideKey], requesterRideId: rideIds[pair.requesterKey], status: pair.status });
    }

    await new Promise((r) => setTimeout(r, 500));

    const acceptedHostRideIds = [
        ...new Set(matchPairs.filter((p) => p.status === "accepted").map((p) => rideIds[p.rideKey])),
    ];

    const { data: groups } = await supabase
        .from("ride_groups")
        .select("id, ride_id")
        .in("ride_id", acceptedHostRideIds);

    const groupMap: Record<string, string> = {};
    (groups || []).forEach((g: { id: string; ride_id: string }) => (groupMap[g.ride_id] = g.id));

    return { requests, groupMap };
}

async function createTestMessages(
    supabase: Supabase,
    profileIds: Record<string, string>,
    rideIds: Record<string, string>,
    groupMap: Record<string, string>
) {
    const p = (name: string) => profileIds[`${name}@${TEST_DOMAIN}`];

    const davidGroup = groupMap[rideIds.david_host];
    if (davidGroup) {
        await (supabase.from("messages") as unknown as { insert: (p: unknown) => Promise<unknown> }).insert([
            { conversation_id: null, ride_group_id: davidGroup, sender_id: p("david"), content: "I can leave Westwood around 5:15 tomorrow. Terminal B still good for everyone?", message_type: "text" },
            { conversation_id: null, ride_group_id: davidGroup, sender_id: p("sophia"), content: "Works for me. I only have one carry-on.", message_type: "text" },
            { conversation_id: null, ride_group_id: davidGroup, sender_id: p("alex"), content: "Same here. I can walk to the pickup spot by 5:20.", message_type: "text" },
            { conversation_id: null, ride_group_id: davidGroup, sender_id: p("david"), content: "Confirm pickup time", message_type: "quick_action" },
        ]);
    }

    const mayaGroup = groupMap[rideIds.maya_host];
    if (mayaGroup) {
        await (supabase.from("messages") as unknown as { insert: (p: unknown) => Promise<unknown> }).insert([
            { conversation_id: null, ride_group_id: mayaGroup, sender_id: p("maya"), content: "I set up this group so everyone sees updates in one place.", message_type: "text" },
            { conversation_id: null, ride_group_id: mayaGroup, sender_id: p("riley"), content: "Awesome, I only have a backpack.", message_type: "text" },
            { conversation_id: null, ride_group_id: mayaGroup, sender_id: p("quinn"), content: "Same here. Pickup from LMU area works for me.", message_type: "text" },
        ]);
    }
}

// ─── POST: create all test data ───

export async function POST() {
    if (process.env.NODE_ENV !== "development") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    try {
        const supabase = getAdmin() as Supabase;

        const cleaned = await cleanupTestUsers(supabase);
        const profileIds = await createTestUsers(supabase);
        const rideIds = await createTestRides(supabase, profileIds);
        const { requests, groupMap } = await createTestMatches(supabase, rideIds);
        await createTestMessages(supabase, profileIds, rideIds, groupMap);

        return NextResponse.json({
            success: true,
            cleaned,
            summary: {
                users: FAKE_USERS.length,
                rides: Object.keys(rideIds).length,
                acceptedMatches: requests.filter((r) => r.status === "accepted").length,
                pendingRequests: requests.filter((r) => r.status === "pending").length,
                groups: Object.keys(groupMap).length,
            },
            scenarios: {
                casey_accept_flow: {
                    login: `casey@${TEST_DOMAIN}`,
                    description: "Main test: accept 5 pending requests one by one. Group grows from 1→2→3→4→5→6.",
                    pending: ["Morgan Lee", "Jamie Patel", "Sam Lopez", "Liam Brooks", "Ava Singh"],
                },
                david_group_chat: {
                    login: `david@${TEST_DOMAIN}`,
                    description: "Existing 3-person group chat with messages. Test chatting, viewing members, leaving.",
                    members: ["David Kim", "Sophia Taylor", "Alex Rivera"],
                },
                sarah_match_discovery: {
                    login: `sarah@${TEST_DOMAIN}`,
                    description: "See match candidates (Mike, Jordan) and send requests.",
                },
                maya_host_leaves: {
                    login: `maya@${TEST_DOMAIN}`,
                    description: "3-person group where the creator (Maya) can leave. Group survives for Riley and Quinn.",
                    members: ["Maya Rodriguez", "Riley Brown", "Quinn Harris"],
                },
            },
            credentials: {
                password: TEST_PASSWORD,
                accounts: FAKE_USERS.map((u) => ({ email: u.email, name: `${u.firstName} ${u.lastName}` })),
            },
        });
    } catch (error) {
        console.error("Seed error:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}

// ─── DELETE: remove all test data ───

export async function DELETE() {
    if (process.env.NODE_ENV !== "development") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    try {
        const supabase = getAdmin() as Supabase;
        const cleaned = await cleanupTestUsers(supabase);
        return NextResponse.json({ success: true, message: `Cleaned up ${cleaned} test users and all cascaded data` });
    } catch (error) {
        console.error("Cleanup error:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}
