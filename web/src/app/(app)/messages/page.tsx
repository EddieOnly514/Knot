"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

const CONVERSATION_CACHE_TTL_MS = 60_000;
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
  const { profile } = useAuth();
  const cachedConversations = profile
    ? conversationsCache.get(profile.id)
    : undefined;
  const cacheIsValid =
    !!profile &&
    !!cachedConversations &&
    Date.now() - cachedConversations.fetchedAt < CONVERSATION_CACHE_TTL_MS;

  const [conversations, setConversations] = useState<Conversation[]>(
    cacheIsValid ? cachedConversations!.data : [],
  );
  const [loading, setLoading] = useState(!cacheIsValid);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!profile || !cacheIsValid || !cachedConversations) return;
    setConversations(cachedConversations.data);
    setLoading(false);
  }, [profile, cacheIsValid, cachedConversations]);

  useEffect(() => {
    async function load() {
      try {
        const data = await getConversations(profile?.id);
        setConversations(data);
        if (profile?.id) {
          conversationsCache.set(profile.id, {
            fetchedAt: Date.now(),
            data,
          });
        }
      } catch (err) {
        console.error("Failed to load conversations:", err);
      } finally {
        setLoading(false);
      }
    }
    if (profile) {
      load();
    }
  }, [profile]);

  const activeConversations = conversations.filter(
    (conv) => conv.ride_status !== "completed",
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
                className="w-full min-h-[72px] rounded-xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md active:bg-zinc-50 touch-manipulation"
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
                        "mt-1 truncate text-sm",
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
