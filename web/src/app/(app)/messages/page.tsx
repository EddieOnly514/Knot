"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Loader2,
  Search,
  Navigation,
  MapPin,
  Users,
} from "lucide-react";
import { getConversations } from "@/lib/services/chatService";
import type { Conversation } from "@/lib/services/chatService";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/contexts/AuthContext";
import { getSupabaseClientOrThrow } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

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
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const forceRefresh = searchParams.get("refresh") === "1";
  const refreshHandled = useRef(false);

  const { data: conversations = [], isPending: loading, refetch } = useQuery({
    queryKey: ["conversations", profile?.id ?? ""],
    queryFn: () => getConversations(profile!.id),
    enabled: !!profile,
    staleTime: 45_000,
  });

  const [query, setQuery] = useState("");
  const [recentlyUpdated, setRecentlyUpdated] = useState<Set<string>>(new Set());
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!forceRefresh) refreshHandled.current = false;
  }, [forceRefresh]);

  useEffect(() => {
    if (!profile || !forceRefresh || refreshHandled.current) return;
    refreshHandled.current = true;
    void refetch().then(() => {
      router.replace("/messages", { scroll: false });
    });
  }, [profile, forceRefresh, refetch, router]);

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

          const convKey = newMsg.ride_group_id ?? newMsg.conversation_id;
          if (!convKey) return;

          let displayContent = newMsg.content;
          if (newMsg.message_type === "quick_action") {
            displayContent = `⚡ ${newMsg.content}`;
          } else if (newMsg.message_type === "location") {
            displayContent = "📍 Shared a location";
          }

          const isFromMe = newMsg.sender_id === profile.id;
          const qk = ["conversations", profile.id] as const;

          queryClient.setQueryData<Conversation[]>(qk, (prev) => {
            const list = prev ?? [];
            const idx = list.findIndex((c) => c.id === convKey);
            if (idx === -1) {
              void queryClient.invalidateQueries({ queryKey: qk });
              return list;
            }

            const updated = [...list];
            updated[idx] = {
              ...updated[idx],
              last_message: displayContent,
              last_message_at: newMsg.created_at,
              unread_count: isFromMe
                ? updated[idx].unread_count
                : updated[idx].unread_count + 1,
            };

            updated.sort((a, b) => {
              const t1 = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
              const t2 = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
              return t2 - t1;
            });

            return updated;
          });

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
  }, [profile, queryClient]);

  const filteredConversations = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      const haystack = [
        c.group_name,
        c.origin_name,
        c.dest_name,
        c.last_message || "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [conversations, query]);

  const goToChat = (conv: Conversation) => {
    if (profile) {
      queryClient.setQueryData<Conversation[]>(
        ["conversations", profile.id],
        (prev) =>
          (prev ?? []).map((c) =>
            c.id === conv.id ? { ...c, unread_count: 0 } : c,
          ),
      );
    }
    router.push(`/messages/${conv.id}`);
  };

  const renderAvatarStack = (conv: Conversation) => {
    const others = conv.participants.filter(p => p.id !== profile?.id);
    if (others.length === 0) return null;

    if (others.length === 1) {
      const p = others[0];
      return (
        <Avatar className="h-11 w-11">
          <AvatarImage src={p.photo_url || undefined} />
          <AvatarFallback className="bg-blue-50 text-sm font-medium text-blue-600">
            {p.first_name[0]}
          </AvatarFallback>
        </Avatar>
      );
    }

    const shown = others.slice(0, 2);
    return (
      <div className="relative h-11 w-11">
        <Avatar className="absolute left-0 top-0 h-8 w-8 ring-2 ring-white">
          <AvatarImage src={shown[0].photo_url || undefined} />
          <AvatarFallback className="bg-blue-50 text-xs font-medium text-blue-600">
            {shown[0].first_name[0]}
          </AvatarFallback>
        </Avatar>
        <Avatar className="absolute bottom-0 right-0 h-8 w-8 ring-2 ring-white">
          <AvatarImage src={shown[1]?.photo_url || undefined} />
          <AvatarFallback className="bg-emerald-50 text-xs font-medium text-emerald-600">
            {shown[1]?.first_name[0] ?? "?"}
          </AvatarFallback>
        </Avatar>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Messages"
        subtitle="Coordinate details with your ride group."
        backHref="/home"
      />

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="mb-3 h-7 w-7 animate-spin text-blue-600" />
          <p className="text-sm text-zinc-500">Loading conversations...</p>
        </div>
      ) : conversations.length === 0 ? (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
            <MessageSquare className="h-8 w-8 text-zinc-400" />
          </div>
          <h2 className="text-sm font-semibold text-zinc-900">
            No active group chats
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            When a match is accepted, a group chat is created automatically.
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
          <div className="max-w-md">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search conversations..."
                className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-4 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="space-y-2">
            {filteredConversations.map((conv) => (
              <button
                key={conv.id}
                type="button"
                className={[
                  "w-full min-h-[76px] rounded-2xl border bg-white p-4 text-left shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_14px_30px_rgba(37,99,235,0.09)] active:bg-zinc-50 touch-manipulation",
                  recentlyUpdated.has(conv.id)
                    ? "border-blue-300 ring-2 ring-blue-100"
                    : "border-zinc-200",
                ].join(" ")}
                onClick={() => goToChat(conv)}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {renderAvatarStack(conv)}
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
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h3 className="truncate text-sm font-semibold text-zinc-900">
                          {conv.group_name}
                        </h3>
                        {conv.participant_count > 2 && (
                          <span className="flex items-center gap-0.5 text-[11px] text-zinc-400">
                            <Users className="h-3 w-3" />
                            {conv.participant_count}
                          </span>
                        )}
                      </div>
                      {conv.last_message_at && (
                        <span className="shrink-0 text-[11px] text-zinc-400">
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
                    className="shrink-0 text-[11px] capitalize border-blue-200 bg-blue-50 text-blue-600"
                  >
                    {conv.participant_count} riders
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
