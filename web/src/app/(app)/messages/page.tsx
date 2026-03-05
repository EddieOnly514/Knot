"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Loader2,
  Search,
  Navigation,
  MapPin,
} from "lucide-react";
import { getConversations } from "@/lib/services/chatService";
import type { Conversation } from "@/lib/services/chatService";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/contexts/AuthContext";
import { getSupabaseClientOrThrow } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

const CONVERSATION_CACHE_TTL_MS = 30_000; // 30s — show stale then refresh in background
const conversationsCache = new Map<
  string,
  { fetchedAt: number; data: Conversation[] }
>();

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const cachedConversations = profile
    ? conversationsCache.get(profile.id)
    : undefined;
  // When arriving from "accept request" we pass ?refresh=1 to force fresh list (1:1 → group)
  const forceRefresh = searchParams.get("refresh") === "1";
  const hasCachedData = !!cachedConversations?.data?.length;
  const cacheIsValid =
    !forceRefresh &&
    !!profile &&
    !!cachedConversations &&
    Date.now() - cachedConversations.fetchedAt < CONVERSATION_CACHE_TTL_MS;

  const [conversations, setConversations] = useState<Conversation[]>(
    hasCachedData ? cachedConversations!.data : [],
  );
  // Show spinner only if no cached data at all
  const [loading, setLoading] = useState(!hasCachedData);
  const [query, setQuery] = useState("");
  // Track which conversation IDs just received a new message for pulse animation
  const [recentlyUpdated, setRecentlyUpdated] = useState<Set<string>>(new Set());
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Load conversations — shows cached data instantly, refreshes in background
  const loadConversations = useCallback(async (showSpinner = false) => {
    if (!profile) return;
    if (showSpinner) setLoading(true);
    try {
      if (forceRefresh) {
        conversationsCache.delete(profile.id);
      }
      const data = await getConversations(profile.id);
      setConversations(data);
      conversationsCache.set(profile.id, {
        fetchedAt: Date.now(),
        data,
      });
      if (forceRefresh) {
        router.replace("/messages", { scroll: false });
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setLoading(false);
    }
  }, [profile, forceRefresh, router]);

  // Initial load
  useEffect(() => {
    if (!profile) return;
    // Always refresh in background; only show spinner if no cached data
    loadConversations(!hasCachedData || forceRefresh);
  }, [profile, forceRefresh, hasCachedData, loadConversations]);

  // ── Realtime: subscribe to ALL new messages and update conversations in-place ──
  useEffect(() => {
    if (!profile) return;

    const supabase = getSupabaseClientOrThrow();

    const channel = supabase
      .channel("messages-list-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMsg = payload.new as {
            id: string;
            conversation_id: string | null;
            ride_group_id: string | null;
            content: string;
            message_type: string;
            sender_id: string;
            created_at: string;
          };

          const convKey = newMsg.conversation_id ?? newMsg.ride_group_id;
          if (!convKey) return;

          // Format the display content
          let displayContent = newMsg.content;
          if (newMsg.message_type === "quick_action") {
            displayContent = `⚡ ${newMsg.content}`;
          } else if (newMsg.message_type === "location") {
            displayContent = "📍 Shared a location";
          }

          const isFromMe = newMsg.sender_id === profile.id;

          setConversations((prev) => {
            const idx = prev.findIndex((c) => c.id === convKey);
            if (idx === -1) {
              // New conversation we don't know about yet — do a full refresh
              loadConversations(false);
              return prev;
            }

            const updated = [...prev];
            updated[idx] = {
              ...updated[idx],
              last_message: displayContent,
              last_message_at: newMsg.created_at,
              unread_count: isFromMe
                ? updated[idx].unread_count
                : updated[idx].unread_count + 1,
            };

            // Re-sort: most recent message first
            updated.sort((a, b) => {
              const t1 = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
              const t2 = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
              return t2 - t1;
            });

            // Update cache
            if (profile.id) {
              conversationsCache.set(profile.id, {
                fetchedAt: Date.now(),
                data: updated,
              });
            }

            return updated;
          });

          // Pulse animation for the updated conversation
          if (!isFromMe) {
            setRecentlyUpdated((prev) => new Set(prev).add(convKey));
            setTimeout(() => {
              setRecentlyUpdated((prev) => {
                const next = new Set(prev);
                next.delete(convKey);
                return next;
              });
            }, 2000);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [profile, loadConversations]);

  const activeConversations = conversations.filter(
    (conv) =>
      conv.ride_status !== "completed" && conv.ride_status !== "cancelled",
  );

  const filteredConversations = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return activeConversations;
    return activeConversations.filter((c) => {
      const haystack = [
        c.partner_name,
        c.origin_name,
        c.dest_name,
        c.last_message || "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [activeConversations, query]);

  const goToChat = (conv: Conversation) => {
    // Mark as read locally so we don't flash the old unread count when coming back
    setConversations((prev) =>
      prev.map((c) => (c.id === conv.id ? { ...c, unread_count: 0 } : c))
    );
    router.push(`/messages/${conv.id}${conv.is_group ? "?group=1" : ""}`);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Messages"
        subtitle="Coordinate details with your ride buddies."
        backHref="/home"
      />

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="mb-3 h-7 w-7 animate-spin text-blue-600" />
          <p className="text-sm text-zinc-500">Loading conversations...</p>
        </div>
      ) : activeConversations.length === 0 ? (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
            <MessageSquare className="h-8 w-8 text-zinc-400" />
          </div>
          <h2 className="text-sm font-semibold text-zinc-900">
            No active conversations
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            When a match is accepted, you&apos;ll see your chat here. Completed
            ride chats live in your ride history.
          </p>
          <Button
            className="mt-5 h-9 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700"
            onClick={() => router.push("/matches")}
          >
            Find matches
          </Button>
        </div>
      ) : (
        <>
          {/* Search (optional, for when there are many conversations) */}
          <div className="max-w-md">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search conversations..."
                className="h-10 w-full rounded-full bg-zinc-100 pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Conversation list — clicking always opens full-screen chat */}
          <div className="space-y-2">
            {filteredConversations.map((conv) => (
              <button
                key={conv.id}
                type="button"
                className={[
                  "w-full min-h-[72px] rounded-xl border bg-white p-4 text-left shadow-sm transition-all duration-300 hover:shadow-md active:bg-zinc-50 touch-manipulation",
                  recentlyUpdated.has(conv.id)
                    ? "border-blue-300 ring-2 ring-blue-100"
                    : "border-zinc-200",
                ].join(" ")}
                onClick={() => goToChat(conv)}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-11 w-11">
                      <AvatarImage src={conv.partner_photo || undefined} />
                      <AvatarFallback className="bg-blue-50 text-sm font-medium text-blue-600">
                        {conv.partner_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    {conv.unread_count > 0 && (
                      <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600">
                        <span className="text-[10px] font-bold text-white">
                          {conv.unread_count}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="truncate text-sm font-semibold text-zinc-900">
                        {conv.partner_name}
                      </h3>
                      {conv.last_message_at && (
                        <span className="text-[11px] text-zinc-400">
                          {formatTimeAgo(conv.last_message_at)}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-[11px] text-zinc-500">
                      <Navigation className="h-3 w-3 text-emerald-500" />
                      <span className="truncate">{conv.origin_name}</span>
                      <span>→</span>
                      <MapPin className="h-3 w-3 text-blue-500" />
                      <span className="truncate">{conv.dest_name}</span>
                    </div>
                    <p
                      className={[
                        "mt-1 truncate text-sm transition-colors duration-300",
                        conv.unread_count > 0
                          ? "font-medium text-zinc-900"
                          : "text-zinc-500",
                      ].join(" ")}
                    >
                      {conv.last_message || "No messages yet — say hi!"}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={[
                      "text-[11px] capitalize",
                      conv.ride_status === "confirmed"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-blue-200 bg-blue-50 text-blue-600",
                    ].join(" ")}
                  >
                    {conv.ride_status}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
