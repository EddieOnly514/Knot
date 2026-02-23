import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendSuggestedMatchesEmail } from "@/lib/matchEmail";
import type { Database } from "@/types/database";

/**
 * Send "you have suggested matches" email to a user.
 * Call with POST { profileId: string }.
 * Optional: set CRON_SECRET and send Authorization: Bearer <CRON_SECRET> for cron jobs.
 */
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient<Database>(url, key);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const profileId = typeof body?.profileId === "string" ? body.profileId.trim() : null;
    if (!profileId) {
      return NextResponse.json({ error: "profileId is required" }, { status: 400 });
    }

    const admin = getAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: "Server not configured for notifications" },
        { status: 500 }
      );
    }

    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("id, first_name, email, user_id")
      .eq("id", profileId)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    let email: string | null = profile.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email) ? profile.email : null;
    if (!email && profile.user_id) {
      const { data: authUser } = await admin.auth.admin.getUserById(profile.user_id);
      if (authUser?.user?.email) email = authUser.user.email;
    }
    if (!email) {
      return NextResponse.json({ error: "No email for profile" }, { status: 400 });
    }

    const { data: rides, error: ridesErr } = await admin
      .from("rides")
      .select("id")
      .eq("user_id", profileId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1);

    if (ridesErr || !rides?.length) {
      return NextResponse.json({ error: "No active ride", sent: false }, { status: 200 });
    }

    const rideId = rides[0].id;
    const { data: matches, error: rpcErr } = await admin.rpc("find_matches_v3", {
      p_ride_id: rideId,
      p_max_results: 20,
      p_min_score: 30,
    });

    if (rpcErr || !Array.isArray(matches)) {
      return NextResponse.json({ error: "Failed to get matches", sent: false }, { status: 200 });
    }

    const { data: existing } = await admin
      .from("ride_requests")
      .select("ride_id, requester_ride_id")
      .or(`ride_id.eq.${rideId},requester_ride_id.eq.${rideId}`)
      .in("status", ["accepted", "pending"]);

    const existingIds = new Set(
      (existing ?? []).map((r: { ride_id: string; requester_ride_id: string }) =>
        r.ride_id === rideId ? r.requester_ride_id : r.ride_id
      )
    );
    const suggestedCount = (matches as { ride_id: string }[]).filter((m) => !existingIds.has(m.ride_id)).length;

    if (suggestedCount === 0) {
      return NextResponse.json({ success: true, sent: false, suggestedCount: 0 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://knot.app";
    const result = await sendSuggestedMatchesEmail(email, suggestedCount, appUrl);
    if (!result.ok && process.env.NODE_ENV === "development") {
      console.warn("[notify/suggested-matches] send failed:", result.error);
    }
    return NextResponse.json({ success: true, sent: result.ok, suggestedCount });
  } catch (e) {
    console.error("[notify/suggested-matches]", e);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
