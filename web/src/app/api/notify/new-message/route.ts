import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { sendNewMessageEmail } from "@/lib/matchEmail";

const MESSAGE_EMAIL_COOLDOWN_MINUTES = 15;

type MessageRow = Pick<
  Database["public"]["Tables"]["messages"]["Row"],
  "id" | "conversation_id" | "ride_group_id" | "sender_id" | "content" | "message_type" | "created_at"
>;

type RideRequestRow = Pick<
  Database["public"]["Tables"]["ride_requests"]["Row"],
  "id" | "status" | "ride_id" | "requester_ride_id"
>;

type RideRow = Pick<
  Database["public"]["Tables"]["rides"]["Row"],
  "id" | "user_id" | "origin_name" | "dest_name"
>;

type ProfileRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "first_name" | "last_name" | "email" | "user_id"
>;

type RideGroupRow = Pick<Database["public"]["Tables"]["ride_groups"]["Row"], "id" | "ride_id">;

type MessageEmailCooldownRow = {
  conversation_id: string | null;
  ride_group_id: string | null;
  recipient_profile_id: string;
  last_notified_at: string;
};

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient<Database>(url, key);
}

function formatRouteSummary(origin: string | null, dest: string | null): string | null {
  const from = origin?.trim();
  const to = dest?.trim();
  if (!from && !to) return null;
  if (from && to) return `${from} → ${to}`;
  return from || to || null;
}

async function resolveEmailForProfile(
  admin: ReturnType<typeof getAdminClient>,
  profile: ProfileRow
): Promise<string | null> {
  if (
    profile.email &&
    typeof profile.email === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)
  ) {
    return profile.email;
  }
  if (profile.user_id) {
    const { data: authUser } = await admin!.auth.admin.getUserById(profile.user_id);
    if (authUser?.user?.email) return authUser.user.email;
  }
  return null;
}

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
    const messageId = typeof body?.messageId === "string" ? body.messageId.trim() : null;
    if (!messageId) {
      return NextResponse.json({ error: "messageId is required" }, { status: 400 });
    }

    const admin = getAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: "Server not configured for notifications" },
        { status: 500 }
      );
    }

    const { data: messageData, error: msgErr } = await admin
      .from("messages")
      .select("id, conversation_id, ride_group_id, sender_id, content, message_type, created_at")
      .eq("id", messageId)
      .single();

    const message = messageData as MessageRow | null;
    if (msgErr || !message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (message.message_type !== "text" || !message.content?.trim()) {
      return NextResponse.json({ success: true, sent: 0, reason: "non-text" });
    }

    const { data: senderProfileData } = await admin
      .from("profiles")
      .select("id, first_name, last_name, email, user_id")
      .eq("id", message.sender_id)
      .single();

    const senderProfile = senderProfileData as ProfileRow | null;
    if (!senderProfile || senderProfile.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const senderName = [
      senderProfile.first_name?.trim(),
      senderProfile.last_name ? `${String(senderProfile.last_name)[0]}.` : "",
    ]
      .filter(Boolean)
      .join(" ") || "Someone";

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://knotride.com";

    const recipientProfiles: ProfileRow[] = [];
    let routeSummary: string | null = null;
    let threadUrl = `${appUrl}/messages`;
    const now = new Date();

    let cooldownMap = new Map<string, MessageEmailCooldownRow>();

    if (message.conversation_id) {
      const { data: reqData, error: reqErr } = await admin
        .from("ride_requests")
        .select("id, status, ride_id, requester_ride_id")
        .eq("id", message.conversation_id)
        .single();

      const reqRow = reqData as RideRequestRow | null;
      if (reqErr || !reqRow) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }

      const rideIds = [reqRow.ride_id, reqRow.requester_ride_id].filter(Boolean);
      const { data: ridesData } = await admin
        .from("rides")
        .select("id, user_id, origin_name, dest_name")
        .in("id", rideIds);

      const rides = (ridesData ?? []) as RideRow[];
      if (!rides.length) {
        return NextResponse.json({ error: "Rides not found" }, { status: 404 });
      }

      const primaryRide = rides[0];
      routeSummary = formatRouteSummary(primaryRide.origin_name, primaryRide.dest_name);

      const profileIds = Array.from(new Set(rides.map((r) => r.user_id)));
      const { data: profilesData } = await admin
        .from("profiles")
        .select("id, first_name, last_name, email, user_id")
        .in("id", profileIds);

      const profiles = (profilesData ?? []) as ProfileRow[];
      for (const p of profiles) {
        if (p.id !== message.sender_id) {
          recipientProfiles.push(p);
        }
      }

      threadUrl = `${appUrl}/messages/${message.conversation_id}`;
      if (recipientProfiles.length) {
        const { data: cooldownData } = await admin
          .from("message_email_cooldowns")
          .select("conversation_id, ride_group_id, recipient_profile_id, last_notified_at")
          .eq("conversation_id", message.conversation_id)
          .in(
            "recipient_profile_id",
            recipientProfiles.map((p) => p.id)
          );
        cooldownMap = new Map(
          ((cooldownData ?? []) as MessageEmailCooldownRow[]).map((row) => [
            row.recipient_profile_id,
            row,
          ])
        );
      }
    } else if (message.ride_group_id) {
      const { data: groupData, error: groupErr } = await admin
        .from("ride_groups")
        .select("id, ride_id")
        .eq("id", message.ride_group_id)
        .single();

      const group = groupData as RideGroupRow | null;
      if (groupErr || !group) {
        return NextResponse.json({ error: "Group not found" }, { status: 404 });
      }

      const { data: groupRidesData } = await admin
        .from("rides")
        .select("id, user_id, origin_name, dest_name")
        .eq("id", group.ride_id)
        .single();

      const groupRide = groupRidesData as RideRow | null;
      if (!groupRide) {
        return NextResponse.json({ error: "Ride not found" }, { status: 404 });
      }

      routeSummary = formatRouteSummary(groupRide.origin_name, groupRide.dest_name);

      const { data: reqRows } = await admin
        .from("ride_requests")
        .select("ride_id, requester_ride_id, status")
        .or(`ride_id.eq.${group.ride_id},requester_ride_id.eq.${group.ride_id}`)
        .eq("status", "accepted");

      const rideIds = new Set<string>();
      rideIds.add(group.ride_id);
      (reqRows as RideRequestRow[] | null ?? []).forEach((row) => {
        rideIds.add(row.ride_id);
        rideIds.add(row.requester_ride_id);
      });

      const { data: ridesData } = await admin
        .from("rides")
        .select("id, user_id")
        .in("id", Array.from(rideIds));

      const rides = (ridesData ?? []) as RideRow[];
      const profileIds = Array.from(new Set(rides.map((r) => r.user_id)));

      const { data: profilesData } = await admin
        .from("profiles")
        .select("id, first_name, last_name, email, user_id")
        .in("id", profileIds);

      const profiles = (profilesData ?? []) as ProfileRow[];
      for (const p of profiles) {
        if (p.id !== message.sender_id) {
          recipientProfiles.push(p);
        }
      }

      threadUrl = `${appUrl}/messages/${message.ride_group_id}?group=1`;
      if (recipientProfiles.length) {
        const { data: cooldownData } = await admin
          .from("message_email_cooldowns")
          .select("conversation_id, ride_group_id, recipient_profile_id, last_notified_at")
          .eq("ride_group_id", message.ride_group_id)
          .in(
            "recipient_profile_id",
            recipientProfiles.map((p) => p.id)
          );
        cooldownMap = new Map(
          ((cooldownData ?? []) as MessageEmailCooldownRow[]).map((row) => [
            row.recipient_profile_id,
            row,
          ])
        );
      }
    } else {
      return NextResponse.json({ success: true, sent: 0, reason: "no-conversation" });
    }

    if (!recipientProfiles.length) {
      return NextResponse.json({ success: true, sent: 0, reason: "no-recipients" });
    }

    const results = await Promise.allSettled(
      recipientProfiles.map(async (profile) => {
        const existingCooldown = cooldownMap.get(profile.id);
        if (existingCooldown) {
          const last = new Date(existingCooldown.last_notified_at);
          if (
            now.getTime() - last.getTime() <
            MESSAGE_EMAIL_COOLDOWN_MINUTES * 60 * 1000
          ) {
            return { ok: false, error: "cooldown" as const };
          }
        }

        const email = await resolveEmailForProfile(admin, profile);
        if (!email) {
          return { ok: false, error: "No email" as const };
        }
        const sendResult = await sendNewMessageEmail(
          email,
          senderName,
          routeSummary,
          message.content,
          threadUrl
        );
        if (sendResult.ok) {
          const payload = {
            conversation_id: message.conversation_id ?? null,
            ride_group_id: message.ride_group_id ?? null,
            recipient_profile_id: profile.id,
            last_notified_at: new Date().toISOString(),
          };
          const onConflict =
            message.conversation_id != null
              ? "conversation_id,recipient_profile_id"
              : "ride_group_id,recipient_profile_id";
          await admin
            .from("message_email_cooldowns")
            .upsert(payload as never, { onConflict });
        }
        return sendResult;
      })
    );

    const sentCount = results.filter(
      (r) => r.status === "fulfilled" && (r.value as { ok: boolean }).ok
    ).length;

    if (process.env.NODE_ENV === "development") {
      const failed = results.length - sentCount;
      if (failed > 0) {
        console.warn("[notify/new-message] Some emails failed:", results);
      }
    }

    return NextResponse.json({ success: true, sent: sentCount });
  } catch (e) {
    console.error("[notify/new-message]", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

