import { getSupabaseClientOrThrow } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

// =============================================
// Types
// =============================================

export interface Message {
    id: string;
    conversation_id: string | null;
    ride_group_id: string | null;
    sender_id: string;
    content: string;
    message_type: "text" | "quick_action" | "location" | "system";
    metadata: Record<string, unknown> | null;
    read_at: string | null;
    created_at: string;
}

export interface Conversation {
    id: string; // ride_group id
    status: string;
    ride_status: string;
    created_at: string;
    group_name: string;
    participant_count: number;
    participants: { id: string; first_name: string; photo_url: string | null }[];
    ride_id: string;
    origin_name: string;
    dest_name: string;
    departure_preferred: string | null;
    last_message: string | null;
    last_message_at: string | null;
    unread_count: number;
}

// =============================================
// Conversations (group-only)
// =============================================

export async function getConversations(profileId?: string): Promise<Conversation[]> {
    const supabase = getSupabaseClientOrThrow();

    let effectiveProfileId = profileId;

    if (!effectiveProfileId) {
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) return [];

        const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("user_id", user.id)
            .single();
        if (!profile) return [];

        effectiveProfileId = profile.id;
    }

    const { data: myRides } = await supabase
        .from("rides")
        .select("id")
        .eq("user_id", effectiveProfileId);
    if (!myRides || myRides.length === 0) return [];

    const myRideIds = myRides.map((r: { id: string }) => r.id);

    const { data: myMemberships } = await supabase
        .from("ride_group_members")
        .select("ride_group_id, ride_id")
        .in("ride_id", myRideIds)
        .is("left_at", null);

    if (!myMemberships || myMemberships.length === 0) return [];

    const groupIds = [...new Set(myMemberships.map((m: { ride_group_id: string }) => m.ride_group_id))];

    const [{ data: rideGroups }, { data: allGroupMembers }] = await Promise.all([
        supabase
            .from("ride_groups")
            .select("id, ride_id, created_at, rider_count, status")
            .in("id", groupIds),
        supabase
            .from("ride_group_members")
            .select("ride_group_id, ride_id")
            .in("ride_group_id", groupIds)
            .is("left_at", null),
    ]);

    const memberRideIds = new Set<string>();
    (allGroupMembers || []).forEach((m: { ride_id: string }) => memberRideIds.add(m.ride_id));

    const { data: memberRides } = await supabase
        .from("rides")
        .select("id, user_id, origin_name, dest_name, departure_preferred")
        .in("id", [...memberRideIds]);

    const rideMap = new Map<string, { id: string; user_id: string; origin_name: string; dest_name: string; departure_preferred: string | null }>();
    (memberRides || []).forEach((r: { id: string; user_id: string; origin_name: string; dest_name: string; departure_preferred: string | null }) =>
        rideMap.set(r.id, r)
    );

    const allProfileIds = [...new Set((memberRides || []).map((r: { user_id: string }) => r.user_id))];

    const lastMessageByGroup = new Map<string, { content: string; created_at: string; message_type: string }>();
    const unreadCountByGroup = new Map<string, number>();

    const applySummariesFromRpc = (
        rows: Array<{
            thread_id: string;
            last_content: string | null;
            last_created_at: string | null;
            last_message_type: string | null;
            unread_count: number | string;
        }>
    ) => {
        for (const row of rows) {
            if (row.last_created_at && row.last_content != null) {
                lastMessageByGroup.set(row.thread_id, {
                    content: row.last_content,
                    created_at: row.last_created_at,
                    message_type: row.last_message_type || "text",
                });
            }
            const uc = typeof row.unread_count === "string" ? parseInt(row.unread_count, 10) : row.unread_count;
            unreadCountByGroup.set(row.thread_id, Number.isFinite(uc) ? uc : 0);
        }
    };

    const fetchSummariesFallback = async () => {
        if (groupIds.length === 0) return;
        const { data: groupMsgs } = await supabase
            .from("messages")
            .select("ride_group_id, content, created_at, message_type, sender_id, read_at")
            .in("ride_group_id", groupIds);

        (groupMsgs || []).forEach((msg: {
            ride_group_id: string | null;
            content: string;
            created_at: string;
            message_type: string;
            sender_id: string;
            read_at: string | null;
        }) => {
            const key = msg.ride_group_id ?? "";
            if (!key) return;
            const existing = lastMessageByGroup.get(key);
            if (!existing || new Date(msg.created_at) > new Date(existing.created_at)) {
                lastMessageByGroup.set(key, {
                    content: msg.content,
                    created_at: msg.created_at,
                    message_type: msg.message_type,
                });
            }
            if (msg.sender_id !== effectiveProfileId && msg.read_at === null) {
                unreadCountByGroup.set(key, (unreadCountByGroup.get(key) || 0) + 1);
            }
        });
    };

    const profilesQuery = allProfileIds.length > 0
        ? supabase.from("profiles").select("id, first_name, last_name, photo_url, school").in("id", allProfileIds)
        : Promise.resolve({ data: [] as unknown[], error: null });

    const summariesQuery = groupIds.length > 0
        ? supabase.rpc("get_message_thread_summaries", {
              p_reader_profile_id: effectiveProfileId,
              p_conversation_ids: [],
              p_group_ids: groupIds,
          })
        : Promise.resolve({ data: [] as unknown[], error: null });

    const [{ data: profiles }, { data: summaryRows, error: summaryError }] = await Promise.all([
        profilesQuery,
        summariesQuery,
    ]);

    if (summaryError) {
        if (process.env.NODE_ENV === "development") {
            console.warn("[chatService] get_message_thread_summaries unavailable:", summaryError.message);
        }
        await fetchSummariesFallback();
    } else {
        applySummariesFromRpc(
            (summaryRows || []) as Array<{
                thread_id: string;
                last_content: string | null;
                last_created_at: string | null;
                last_message_type: string | null;
                unread_count: number | string;
            }>
        );
    }

    const profileMap = new Map<string, { id: string; first_name: string; last_name: string; photo_url: string | null; school: string | null }>();
    ((profiles || []) as Array<{ id: string; first_name: string; last_name: string; photo_url: string | null; school: string | null }>)
        .forEach((p) => profileMap.set(p.id, p));

    const result: Conversation[] = [];

    for (const groupId of groupIds) {
        const group = (rideGroups || []).find((g: { id: string }) => g.id === groupId) as {
            id: string; ride_id: string; created_at?: string; rider_count?: number; status?: string;
        } | undefined;
        if (!group) continue;

        if (group.status === "archived") continue;

        const groupMembers = (allGroupMembers || []).filter(
            (m: { ride_group_id: string }) => m.ride_group_id === groupId
        );
        const participantCount = group.rider_count ?? groupMembers.length;

        const hostRide = rideMap.get(group.ride_id);

        const participantProfiles: { id: string; first_name: string; photo_url: string | null }[] = [];
        for (const member of groupMembers) {
            const ride = rideMap.get((member as { ride_id: string }).ride_id);
            if (ride) {
                const prof = profileMap.get(ride.user_id);
                if (prof) {
                    participantProfiles.push({ id: prof.id, first_name: prof.first_name, photo_url: prof.photo_url });
                }
            }
        }

        const otherNames = participantProfiles
            .filter(p => p.id !== effectiveProfileId)
            .map(p => p.first_name);
        const groupName = otherNames.length === 0
            ? "Ride Group"
            : otherNames.length === 1
                ? otherNames[0]
                : otherNames.length <= 3
                    ? otherNames.join(", ")
                    : `${otherNames.slice(0, 2).join(", ")} +${otherNames.length - 2}`;

        const lastMsg = lastMessageByGroup.get(group.id);
        const unreadCount = unreadCountByGroup.get(group.id) || 0;

        let displayContent: string | null = null;
        if (lastMsg) {
            if (lastMsg.message_type === "quick_action") displayContent = `⚡ ${lastMsg.content}`;
            else if (lastMsg.message_type === "location") displayContent = "📍 Shared a location";
            else displayContent = lastMsg.content;
        }

        result.push({
            id: group.id,
            status: "accepted",
            ride_status: "accepted",
            created_at: group.created_at ?? new Date().toISOString(),
            group_name: groupName,
            participant_count: participantCount,
            participants: participantProfiles,
            ride_id: group.ride_id,
            origin_name: hostRide?.origin_name ?? "",
            dest_name: hostRide?.dest_name ?? "",
            departure_preferred: hostRide?.departure_preferred ?? null,
            last_message: displayContent,
            last_message_at: lastMsg?.created_at || null,
            unread_count: unreadCount,
        });
    }

    result.sort((a, b) => {
        const t1 = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
        const t2 = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
        return t2 - t1;
    });

    return result;
}

// =============================================
// Messages
// =============================================

export async function getMessages(groupId: string): Promise<Message[]> {
    const supabase = getSupabaseClientOrThrow();

    const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("ride_group_id", groupId)
        .order("created_at", { ascending: true });

    if (error) throw error;
    return (data || []) as Message[];
}

export async function sendMessage(
    groupId: string,
    content: string,
    type: "text" | "quick_action" | "location" = "text",
    metadata?: Record<string, unknown>,
    senderProfileId?: string
): Promise<Message> {
    const supabase = getSupabaseClientOrThrow();

    let senderId = senderProfileId;
    if (!senderId) {
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("user_id", user.id)
            .single();
        if (!profile) throw new Error("Profile not found");
        senderId = profile.id;
    }

    const { data, error } = await supabase
        .from("messages")
        .insert({
            conversation_id: null,
            ride_group_id: groupId,
            sender_id: senderId,
            content,
            message_type: type,
            metadata: metadata || null,
        })
        .select()
        .single();

    if (error) throw error;
    const message = data as Message;

    if (typeof window !== "undefined") {
        fetch("/api/notify/new-message", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messageId: message.id }),
        }).catch((err) => {
            if (process.env.NODE_ENV === "development") {
                console.warn("[chatService] Failed to notify new-message:", err);
            }
        });
    }

    return message;
}

export async function markAsRead(groupId: string, readerProfileId?: string): Promise<void> {
    const supabase = getSupabaseClientOrThrow();

    let readerId = readerProfileId;
    if (!readerId) {
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("user_id", user.id)
            .single();
        if (!profile) return;
        readerId = profile.id;
    }

    await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("ride_group_id", groupId)
        .neq("sender_id", readerId)
        .is("read_at", null);
}

// =============================================
// Ride Status
// =============================================

export async function updateRideStatusForGroup(
    rideId: string,
    status: "confirmed" | "completed" | "cancelled"
): Promise<void> {
    const supabase = getSupabaseClientOrThrow();

    const { data: requests, error: fetchError } = await supabase
        .from("ride_requests")
        .select("id, requester_ride_id")
        .eq("ride_id", rideId)
        .eq("status", "accepted");

    if (fetchError) throw fetchError;
    if (!requests?.length) {
        throw new Error("No accepted requests found for this ride.");
    }

    const { error: updateError } = await supabase
        .from("ride_requests")
        .update({ ride_status: status })
        .eq("ride_id", rideId)
        .eq("status", "accepted");

    if (updateError) throw updateError;

    if (status === "completed") {
        const { data: membership } = await supabase
            .from("ride_group_members")
            .select("ride_group_id")
            .eq("ride_id", rideId)
            .is("left_at", null)
            .limit(1)
            .maybeSingle();

        if (membership?.ride_group_id) {
            await supabase
                .from("ride_groups")
                .update({ status: "archived", archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
                .eq("id", membership.ride_group_id);
        }

        const requesterRideIds = requests.map((r: { requester_ride_id: string }) => r.requester_ride_id);
        await supabase
            .from("rides")
            .update({ status: "completed" })
            .in("id", [rideId, ...requesterRideIds]);
    }
}

export async function leaveGroup(groupId: string): Promise<void> {
    const supabase = getSupabaseClientOrThrow();
    const { error } = await supabase.rpc("leave_ride_group", {
        p_ride_group_id: groupId,
    });
    if (error) throw error;
}

// =============================================
// Realtime
// =============================================

export function subscribeToMessages(
    groupId: string,
    onNewMessage: (message: Message) => void
): RealtimeChannel {
    const supabase = getSupabaseClientOrThrow();

    const channel = supabase
        .channel(`messages:${groupId}`)
        .on(
            "postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "messages",
                filter: `ride_group_id=eq.${groupId}`,
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (payload: any) => {
                onNewMessage(payload.new as Message);
            }
        )
        .subscribe();

    return channel;
}
