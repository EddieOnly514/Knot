import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendMatchAcceptedEmail } from "@/lib/matchEmail";
import type { Database } from "@/types/database";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient<Database>(url, key);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const requestId = typeof body?.requestId === "string" ? body.requestId.trim() : null;
    if (!requestId) {
      return NextResponse.json({ error: "requestId is required" }, { status: 400 });
    }

    const admin = getAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: "Server not configured for notifications" },
        { status: 500 }
      );
    }

    const { data: reqRow, error: reqErr } = await admin
      .from("ride_requests")
      .select("id, status, ride_id, requester_ride_id")
      .eq("id", requestId)
      .single();

    if (reqErr || !reqRow) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    if (reqRow.status !== "accepted") {
      return NextResponse.json({ error: "Request is not accepted" }, { status: 400 });
    }

    const { data: rides, error: ridesErr } = await admin
      .from("rides")
      .select("id, user_id, origin_name, dest_name")
      .in("id", [reqRow.ride_id, reqRow.requester_ride_id]);

    if (ridesErr || !rides || rides.length !== 2) {
      return NextResponse.json({ error: "Rides not found" }, { status: 404 });
    }

    const ownerRide = rides.find((r) => r.id === reqRow.ride_id);
    const requesterRide = rides.find((r) => r.id === reqRow.requester_ride_id);
    if (!ownerRide || !requesterRide) {
      return NextResponse.json({ error: "Rides not found" }, { status: 404 });
    }

    const routeSummary = `${ownerRide.origin_name} → ${ownerRide.dest_name}`;
    const profileIds = [ownerRide.user_id, requesterRide.user_id];

    const { data: profiles, error: profilesErr } = await admin
      .from("profiles")
      .select("id, first_name, last_name, email, user_id")
      .in("id", profileIds);

    if (profilesErr || !profiles || profiles.length !== 2) {
      return NextResponse.json({ error: "Profiles not found" }, { status: 404 });
    }

    const getDisplayName = (p: { first_name: string | null; last_name: string | null }) =>
      [p.first_name, p.last_name ? `${String(p.last_name)[0]}.` : ""].filter(Boolean).join(" ") || "Someone";

    const resolveEmail = async (profile: (typeof profiles)[0]): Promise<string | null> => {
      if (profile.email && typeof profile.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
        return profile.email;
      }
      if (profile.user_id) {
        const { data: authUser } = await admin.auth.admin.getUserById(profile.user_id);
        if (authUser?.user?.email) return authUser.user.email;
      }
      return null;
    };

    const ownerProfile = profiles.find((p) => p.id === ownerRide.user_id);
    const requesterProfile = profiles.find((p) => p.id === requesterRide.user_id);
    if (!ownerProfile || !requesterProfile) {
      return NextResponse.json({ error: "Profiles not found" }, { status: 404 });
    }

    const ownerEmail = await resolveEmail(ownerProfile);
    const requesterEmail = await resolveEmail(requesterProfile);

    const ownerName = getDisplayName(ownerProfile);
    const requesterName = getDisplayName(requesterProfile);

    const results = await Promise.allSettled([
      ownerEmail ? sendMatchAcceptedEmail(ownerEmail, requesterName, routeSummary) : Promise.resolve({ ok: false, error: "No email" }),
      requesterEmail ? sendMatchAcceptedEmail(requesterEmail, ownerName, routeSummary) : Promise.resolve({ ok: false, error: "No email" }),
    ]);

    const failed = results.filter((r) => r.status === "fulfilled" && !(r.value as { ok: boolean }).ok).length;
    if (process.env.NODE_ENV === "development" && failed > 0) {
      console.warn("[notify/match-accepted] Some emails failed:", results);
    }

    return NextResponse.json({ success: true, sent: 2 - failed });
  } catch (e) {
    console.error("[notify/match-accepted]", e);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
