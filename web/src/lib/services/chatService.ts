import { getSupabaseClient } from "@/lib/supabase/client";
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
    id: string; // ride_request id (1:1) or ride_group id (group)
    is_group: boolean;
    status: string;
    ride_status: string;
    created_at: string;
    // Partner info (1:1: single partner; group: summary e.g. "Group (3)")
    partner_name: string;
    partner_photo: string | null;
    partner_school: string | null;
    partner_profile_id: string;
    // Group: participant count and ride_id that owns the group
    participant_count?: number;
    ride_id?: string;
    // Route
    origin_name: string;
    dest_name: string;
    departure_preferred: string | null;
    // Last message
    last_message: string | null;
    last_message_at: string | null;
    unread_count: number;
}

// =============================================
// Conversations
// =============================================

export async function getConversations(profileId?: string): Promise<Conversation[]> {
    const supabase = getSupabaseClient();

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

    // Get my rides
    const { data: myRides } = await supabase
        .from("rides")
        .select("id, origin_name, dest_name, departure_preferred, user_id")
        .eq("user_id", effectiveProfileId);
    if (!myRides || myRides.length === 0) return [];

    const myRideIds = myRides.map((r: { id: string }) => r.id);

    // Get accepted ride requests
    const { data: requests, error } = await supabase
        .from("ride_requests")
        .select("*")
        .or(
            `ride_id.in.(${myRideIds.join(",")}),requester_ride_id.in.(${myRideIds.join(",")})`
        )
        .eq("status", "accepted")
        .order("updated_at", { ascending: false });

    if (error) throw error;
    if (!requests || requests.length === 0) return [];

    // Rides that have a group (3+ participants): one group convo per such ride
    const allRideIdsInRequests = [...new Set(requests.flatMap((r: { ride_id: string; requester_ride_id: string }) => [r.ride_id, r.requester_ride_id]))];
    const { data: rideGroups } = await supabase
        .from("ride_groups")
        .select("id, ride_id, created_at")
        .in("ride_id", allRideIdsInRequests);

    const rideIdToGroup = new Map<string, { id: string; ride_id: string; created_at?: string }>();
    (rideGroups || []).forEach((g: { id: string; ride_id: string; created_at?: string }) =>
        rideIdToGroup.set(g.ride_id, g)
    );

    // Group requests by ride_id (host ride); if host has a group, we'll show one group convo
    const rideIdsWithGroup = new Set(rideIdToGroup.keys());
    const requests1to1 = requests.filter(
        (r: { ride_id: string }) => !rideIdsWithGroup.has(r.ride_id)
    );
    const groupRideIds = [...rideIdsWithGroup].filter((rideId) => {
        const involved = requests.some(
            (r: { ride_id: string; requester_ride_id: string }) =>
                r.ride_id === rideId && myRideIds.includes(r.requester_ride_id) ||
                r.requester_ride_id === rideId && myRideIds.includes(r.ride_id)
        );
        return involved;
    });

    const otherRideIds = [
        ...requests1to1.map((r: { ride_id: string; requester_ride_id: string }) =>
            myRideIds.includes(r.ride_id) ? r.requester_ride_id : r.ride_id
        ),
    ];
    const { data: otherRides } = await supabase
        .from("rides")
        .select("id, user_id, origin_name, dest_name, departure_preferred")
        .in("id", [...new Set(otherRideIds)]);

    const otherRideMap = Object.fromEntries(
        (otherRides || []).map((r: { id: string }) => [r.id, r])
    );

    // Rides for group convos (host ride + all requesters)
    const groupRideIdsExpanded = new Set<string>();
    groupRideIds.forEach((rid) => groupRideIdsExpanded.add(rid));
    requests.forEach((r: { ride_id: string; requester_ride_id: string }) => {
        if (rideIdsWithGroup.has(r.ride_id)) {
            groupRideIdsExpanded.add(r.ride_id);
            groupRideIdsExpanded.add(r.requester_ride_id);
        }
    });
    const { data: groupRides } = await supabase
        .from("rides")
        .select("id, user_id, origin_name, dest_name, departure_preferred")
        .in("id", [...groupRideIdsExpanded]);

    const allRideMap = { ...otherRideMap, ...Object.fromEntries((groupRides || []).map((r: { id: string }) => [r.id, r])) };

    const partnerProfileIds = [...new Set(
        (otherRides || []).map((r: { user_id: string }) => r.user_id)
    )];
    const groupProfileIds = [...new Set(
        (groupRides || []).map((r: { user_id: string }) => r.user_id)
    )];
    const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, photo_url, school")
        .in("id", [...new Set([...partnerProfileIds, ...groupProfileIds])]);

    const profileMap = Object.fromEntries(
        (profiles || []).map((p: { id: string }) => [p.id, p])
    );

    const conversationIds = requests1to1.map((req: { id: string }) => req.id);
    const groupIds = groupRideIds
        .map((rid) => rideIdToGroup.get(rid)?.id)
        .filter(Boolean) as string[];

    // Messages: fetch 1:1 and group messages, key by conversation_id or ride_group_id
    const lastMessageByConv = new Map<
        string,
        { content: string; created_at: string; message_type: string }
    >();
    const unreadCountByConv = new Map<string, number>();

    const processMessages = (
        msgs: Array<{
            conversation_id: string | null;
            ride_group_id: string | null;
            content: string;
            created_at: string;
            message_type: string;
            sender_id: string;
            read_at: string | null;
        }>
    ) => {
        msgs.forEach((msg) => {
            const key = msg.conversation_id ?? msg.ride_group_id ?? "";
            if (!key) return;
            const existing = lastMessageByConv.get(key);
            if (!existing || new Date(msg.created_at) > new Date(existing.created_at)) {
                lastMessageByConv.set(key, {
                    content: msg.content,
                    created_at: msg.created_at,
                    message_type: msg.message_type,
                });
            }
            if (msg.sender_id !== effectiveProfileId && msg.read_at === null) {
                unreadCountByConv.set(key, (unreadCountByConv.get(key) || 0) + 1);
            }
        });
    };

    if (conversationIds.length > 0) {
        const { data: directMsgs } = await supabase
            .from("messages")
            .select("conversation_id, ride_group_id, content, created_at, message_type, sender_id, read_at")
            .in("conversation_id", conversationIds);
        processMessages(directMsgs ?? []);
    }
    if (groupIds.length > 0) {
        const { data: groupMsgs } = await supabase
            .from("messages")
            .select("conversation_id, ride_group_id, content, created_at, message_type, sender_id, read_at")
            .in("ride_group_id", groupIds);
        processMessages(groupMsgs ?? []);
    }

    const result: Conversation[] = [];

    // 1:1 conversations
    for (const req of requests1to1) {
        const isMyRide = myRideIds.includes(req.ride_id);
        const otherRideId = isMyRide ? req.requester_ride_id : req.ride_id;
        const otherRide = otherRideMap[otherRideId] as {
            user_id: string;
            origin_name: string;
            dest_name: string;
            departure_preferred: string | null;
        } | undefined;
        const partner = otherRide
            ? (profileMap[otherRide.user_id] as {
                  id: string;
                  first_name: string;
                  last_name: string;
                  photo_url: string | null;
                  school: string | null;
              } | undefined)
            : null;
        const lastMsg = lastMessageByConv.get(req.id);
        const unreadCount = unreadCountByConv.get(req.id) || 0;
        result.push({
            id: req.id,
            is_group: false,
            status: req.status,
            ride_status: req.ride_status || "accepted",
            created_at: req.created_at,
            partner_name: partner
                ? `${partner.first_name} ${partner.last_name?.[0] || ""}.`
                : "Unknown",
            partner_photo: partner?.photo_url || null,
            partner_school: partner?.school || null,
            partner_profile_id: partner?.id || "",
            origin_name: otherRide?.origin_name || "",
            dest_name: otherRide?.dest_name || "",
            departure_preferred: otherRide?.departure_preferred || null,
            last_message: lastMsg
                ? lastMsg.message_type === "quick_action"
                    ? `⚡ ${lastMsg.content}`
                    : lastMsg.message_type === "location"
                        ? "📍 Shared a location"
                        : lastMsg.content
                : null,
            last_message_at: lastMsg?.created_at || null,
            unread_count: unreadCount,
        });
    }

    // Group conversations (one per ride that has a group)
    for (const rideId of groupRideIds) {
        const group = rideIdToGroup.get(rideId);
        if (!group) continue;
        const hostRide = allRideMap[rideId] as { origin_name: string; dest_name: string; departure_preferred: string | null } | undefined;
        const acceptedCount = requests.filter(
            (r: { ride_id: string; status: string }) => r.ride_id === rideId && r.status === "accepted"
        ).length;
        const participantCount = 1 + acceptedCount; // host + requesters
        const lastMsg = lastMessageByConv.get(group.id);
        const unreadCount = unreadCountByConv.get(group.id) || 0;
        result.push({
            id: group.id,
            is_group: true,
            status: "accepted",
            ride_status: "accepted",
            created_at: group.created_at ?? new Date().toISOString(),
            partner_name: `Group (${participantCount})`,
            partner_photo: null,
            partner_school: null,
            partner_profile_id: "",
            participant_count: participantCount,
            ride_id: rideId,
            origin_name: hostRide?.origin_name ?? "",
            dest_name: hostRide?.dest_name ?? "",
            departure_preferred: hostRide?.departure_preferred ?? null,
            last_message: lastMsg
                ? lastMsg.message_type === "quick_action"
                    ? `⚡ ${lastMsg.content}`
                    : lastMsg.message_type === "location"
                        ? "📍 Shared a location"
                        : lastMsg.content
                : null,
            last_message_at: lastMsg?.created_at || null,
            unread_count: unreadCount,
        });
    }

    // Sort by last_message_at desc
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

/**
 * Get messages for a conversation (1:1 ride_request id) or a group (ride_group id).
 */
export async function getMessages(conversationOrGroupId: string): Promise<Message[]> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`conversation_id.eq.${conversationOrGroupId},ride_group_id.eq.${conversationOrGroupId}`)
        .order("created_at", { ascending: true });

    if (error) throw error;
    return (data || []) as Message[];
}

/**
 * Send a message to a conversation (1:1 ride_request id) or a group (ride_group id).
 * Pass isGroup: true when the id is a ride_group id.
 */
export async function sendMessage(
    conversationOrGroupId: string,
    content: string,
    type: "text" | "quick_action" | "location" = "text",
    metadata?: Record<string, unknown>,
    isGroup?: boolean
): Promise<Message> {
    const supabase = getSupabaseClient();

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

    const { data, error } = await supabase
        .from("messages")
        .insert({
            conversation_id: isGroup ? null : conversationOrGroupId,
            ride_group_id: isGroup ? conversationOrGroupId : null,
            sender_id: profile.id,
            content,
            message_type: type,
            metadata: metadata || null,
        })
        .select()
        .single();

    if (error) throw error;
    return data as Message;
}

export async function markAsRead(conversationOrGroupId: string): Promise<void> {
    const supabase = getSupabaseClient();

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

    await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .or(`conversation_id.eq.${conversationOrGroupId},ride_group_id.eq.${conversationOrGroupId}`)
        .neq("sender_id", profile.id)
        .is("read_at", null);
}

// =============================================
// Ride Status
// =============================================

export async function updateRideStatus(
    requestId: string,
    status: "confirmed" | "completed" | "cancelled"
): Promise<void> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
        .from("ride_requests")
        .update({ ride_status: status })
        .eq("id", requestId)
        .select("id, ride_id, requester_ride_id, ride_status");

    if (error) throw error;

    // Supabase RLS silently returns 0 rows if the policy blocks the update
    if (!data || data.length === 0) {
        throw new Error(
            "Ride status update was blocked — you may not have permission to update this request."
        );
    }

    // When a ride is completed, also mark both associated rides as completed
    // so they no longer show up as "active" on the home page
    if (status === "completed" && data[0]) {
        const { ride_id, requester_ride_id } = data[0];
        await supabase
            .from("rides")
            .update({ status: "completed" })
            .in("id", [ride_id, requester_ride_id]);
    }
}

// =============================================
// Realtime
// =============================================

/**
 * Subscribe to new messages in a conversation (1:1) or group.
 * Pass isGroup: true when the id is a ride_group id.
 */
export function subscribeToMessages(
    conversationOrGroupId: string,
    onNewMessage: (message: Message) => void,
    isGroup?: boolean
): RealtimeChannel {
    const supabase = getSupabaseClient();
    const filterColumn = isGroup ? "ride_group_id" : "conversation_id";

    const channel = supabase
        .channel(`messages:${conversationOrGroupId}`)
        .on(
            "postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "messages",
                filter: `${filterColumn}=eq.${conversationOrGroupId}`,
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (payload: any) => {
                onNewMessage(payload.new as Message);
            }
        )
        .subscribe();

    return channel;
}
