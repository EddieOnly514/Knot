import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendSuggestedMatchesEmail } from "@/lib/matchEmail";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

const COOLDOWN_HOURS = 24;

type ProfileRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "email" | "user_id" | "suggested_matches_email_sent_at"
>;
type RideRow = Pick<Database["public"]["Tables"]["rides"]["Row"], "id" | "user_id">;

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient<Database>(url, key);
}

/**
 * Called after user posts a new ride. Sends "you have suggested matches" email
 * if there are matches and we haven't sent one to this user in the last 24h.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const rideId = typeof body?.rideId === "string" ? body.rideId.trim() : null;
    if (!rideId) {
      return NextResponse.json({ error: "rideId is required" }, { status: 400 });
    }

    const admin = getAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: "Server not configured for notifications" },
        { status: 500 }
      );
    }

    const { data: rideData, error: rideErr } = await admin
      .from("rides")
      .select("id, user_id")
      .eq("id", rideId)
      .single();

    const ride = rideData as RideRow | null;
    if (rideErr || !ride) {
      return NextResponse.json({ error: "Ride not found" }, { status: 404 });
    }

    const { data: profileByUserData } = await admin
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    const profileByUser = profileByUserData as { id: string } | null;
    if (!profileByUser || profileByUser.id !== ride.user_id) {
      return NextResponse.json({ error: "Ride not found" }, { status: 404 });
    }

    const profileId = ride.user_id;

    const { data: profileData, error: profileErr } = await admin
      .from("profiles")
      .select("id, email, user_id, suggested_matches_email_sent_at")
      .eq("id", profileId)
      .single();

    const profile = profileData as ProfileRow | null;
    if (profileErr || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const now = new Date();
    const sentAt = profile.suggested_matches_email_sent_at
      ? new Date(profile.suggested_matches_email_sent_at)
      : null;
    if (sentAt && now.getTime() - sentAt.getTime() < COOLDOWN_HOURS * 60 * 60 * 1000) {
      return NextResponse.json({
        success: true,
        sent: false,
        reason: "cooldown",
        suggestedCount: 0,
      });
    }

    let email: string | null =
      profile.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email) ? profile.email : null;
    if (!email && profile.user_id) {
      const { data: authUser } = await admin.auth.admin.getUserById(profile.user_id);
      if (authUser?.user?.email) email = authUser.user.email;
    }
    if (!email) {
      return NextResponse.json({ error: "No email for profile" }, { status: 400 });
    }

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
    const suggestedCount = (matches as { ride_id: string }[]).filter(
      (m) => !existingIds.has(m.ride_id)
    ).length;

    if (suggestedCount === 0) {
      return NextResponse.json({ success: true, sent: false, suggestedCount: 0 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://knotride.com";
    const result = await sendSuggestedMatchesEmail(email, suggestedCount, appUrl);

    if (result.ok) {
      const updatePayload: Database["public"]["Tables"]["profiles"]["Update"] = {
        suggested_matches_email_sent_at: now.toISOString(),
      };
      await admin.from("profiles").update(updatePayload as never).eq("id", profileId);
    } else if (process.env.NODE_ENV === "development") {
      console.warn("[notify/suggested-matches-after-post] send failed:", result.error);
    }

    return NextResponse.json({
      success: true,
      sent: result.ok,
      suggestedCount,
    });
  } catch (e) {
    console.error("[notify/suggested-matches-after-post]", e);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
