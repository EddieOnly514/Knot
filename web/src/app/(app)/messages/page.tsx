"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Plus,
  Loader2,
  Search,
  Navigation,
  MapPin,
  SendHorizontal,
  Smile,
} from "lucide-react";
import {
  getConversations,
  getMessages,
  markAsRead,
  sendMessage,
  subscribeToMessages,
} from "@/lib/services/chatService";
import type { Conversation, Message } from "@/lib/services/chatService";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/contexts/AuthContext";
import { getSupabaseClient } from "@/lib/supabase/client";

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

function formatMsgTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
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

  // Desktop thread state (keeps /messages/[id] for mobile)
  const selectedFromUrl = searchParams.get("c");
  const [selectedId, setSelectedId] = useState<string | null>(selectedFromUrl);
  const [threadLoading, setThreadLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Keep selectedId in sync with URL param
  useEffect(() => {
    setSelectedId(selectedFromUrl);
  }, [selectedFromUrl]);

  // Default select first conversation on desktop if none chosen yet
  useEffect(() => {
    if (loading) return;
    if (!selectedId && filteredConversations.length > 0) {
      const first = filteredConversations[0]?.id;
      if (first) {
        setSelectedId(first);
        router.replace(`/messages?c=${first}`);
      }
    }
  }, [filteredConversations, loading, router, selectedId]);

  const selectedConversation = useMemo(() => {
    if (!selectedId) return null;
    return activeConversations.find((c) => c.id === selectedId) || null;
  }, [activeConversations, selectedId]);

  // Load thread messages for selected conversation (desktop)
  useEffect(() => {
    let isCancelled = false;
    if (!selectedId) return;
    setThreadLoading(true);
    (async () => {
      try {
        const msgs = await getMessages(selectedId);
        if (isCancelled) return;
        setMessages(msgs);
        await markAsRead(selectedId);
      } catch (err) {
        console.error("Failed to load messages:", err);
      } finally {
        if (!isCancelled) setThreadLoading(false);
      }
    })();
    return () => {
      isCancelled = true;
    };
  }, [selectedId]);

  // Realtime subscription (desktop)
  useEffect(() => {
    if (!selectedId) return;
    const channel = subscribeToMessages(selectedId, (newMsg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      markAsRead(selectedId);
    }, selectedIsGroup);
    return () => {
      const supabase = getSupabaseClient();
      supabase.removeChannel(channel);
    };
  }, [selectedId, selectedConversation?.is_group]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || sending || !selectedId) return;
    setInputText("");
    setSending(true);
    try {
      const msg = await sendMessage(
        selectedId,
        text,
        "text",
        undefined,
        selectedConversation?.is_group ?? false,
      );
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    } catch (err) {
      console.error("Failed to send:", err);
    } finally {
      setSending(false);
    }
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
          {/* Mobile: keep simple list that navigates to /messages/[id] */}
          <div className="space-y-2 md:hidden">
            {filteredConversations.map((conv) => (
              <button
                key={conv.id}
                type="button"
                className="w-full rounded-xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md"
                onClick={() =>
                  router.push(
                    `/messages/${conv.id}${conv.is_group ? "?group=1" : ""}`,
                  )
                }
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

          {/* Desktop: split view like the screenshot */}
          <div className="hidden h-[calc(100vh-8.5rem)] min-h-[560px] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm md:flex">
            {/* Left rail */}
            <div className="w-[340px] border-r border-zinc-200 bg-white">
              <div className="p-4">
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

              <div className="h-[calc(100%-72px)] overflow-y-auto px-2 pb-3">
                {filteredConversations.map((conv) => {
                  const isActive = conv.id === selectedId;
                  return (
                    <button
                      key={conv.id}
                      type="button"
                      className={[
                        "mb-1 w-full rounded-xl p-3 text-left transition-colors",
                        isActive
                          ? "bg-blue-50"
                          : "hover:bg-zinc-50 active:bg-zinc-100",
                      ].join(" ")}
                      onClick={() => {
                        setSelectedId(conv.id);
                        router.replace(`/messages?c=${conv.id}`);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={conv.partner_photo || undefined} />
                            <AvatarFallback className="bg-blue-50 text-sm font-medium text-blue-600">
                              {conv.partner_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-zinc-900">
                              {conv.partner_name}
                            </p>
                            {conv.last_message_at && (
                              <span className="text-[11px] text-zinc-400">
                                {formatTimeAgo(conv.last_message_at)}
                              </span>
                            )}
                          </div>
                          <p
                            className={[
                              "mt-0.5 truncate text-sm",
                              conv.unread_count > 0
                                ? "font-medium text-zinc-900"
                                : "text-zinc-500",
                            ].join(" ")}
                          >
                            {conv.last_message || "No messages yet — say hi!"}
                          </p>
                        </div>

                        {conv.unread_count > 0 && (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600">
                            <span className="text-[11px] font-bold text-white">
                              {conv.unread_count}
                            </span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chat panel */}
            <div className="flex flex-1 flex-col bg-zinc-50">
              {/* Chat header */}
              <div className="border-b border-zinc-200 bg-white px-5 py-4">
                {selectedConversation ? (
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={selectedConversation.partner_photo || undefined}
                        />
                        <AvatarFallback className="bg-blue-50 text-sm font-medium text-blue-600">
                          {selectedConversation.partner_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h2 className="truncate text-sm font-semibold text-zinc-900">
                            {selectedConversation.partner_name}
                          </h2>
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        </div>
                        <p className="text-xs text-zinc-500">Online now</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600">
                        <Navigation className="h-3.5 w-3.5 text-blue-600" />
                        <span className="max-w-[220px] truncate">
                          {selectedConversation.origin_name}
                        </span>
                        <span>→</span>
                        <MapPin className="h-3.5 w-3.5 text-blue-600" />
                        <span className="max-w-[220px] truncate">
                          {selectedConversation.dest_name}
                        </span>
                      </div>
                      {selectedConversation.departure_preferred && (
                        <div className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600">
                          {selectedConversation.departure_preferred}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm font-medium text-zinc-700">
                    Select a conversation
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {!selectedConversation ? (
                  <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                    Choose a conversation on the left to start chatting.
                  </div>
                ) : threadLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                    Send the first message to coordinate your ride.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg) => {
                      const isMine = msg.sender_id === profile?.id;
                      const bubble =
                        msg.message_type === "quick_action"
                          ? isMine
                            ? "bg-amber-500 text-white"
                            : "bg-amber-100 text-amber-900"
                          : isMine
                            ? "bg-blue-600 text-white"
                            : "bg-white text-zinc-900 border border-zinc-200";
                      return (
                        <div
                          key={msg.id}
                          className={isMine ? "flex justify-end" : "flex justify-start"}
                        >
                          <div className="max-w-[70%]">
                            <div
                              className={[
                                "rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                                isMine ? "rounded-br-md" : "rounded-bl-md",
                                bubble,
                              ].join(" ")}
                            >
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>
                            <div
                              className={[
                                "mt-1 text-[11px] text-zinc-400",
                                isMine ? "text-right" : "text-left",
                              ].join(" ")}
                            >
                              {formatMsgTime(msg.created_at)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="border-t border-zinc-200 bg-white px-5 py-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                    aria-label="Add"
                    onClick={() => {}}
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder="Type a message..."
                      className="h-11 w-full rounded-full bg-zinc-100 px-5 pr-12 text-sm text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={!selectedConversation}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                      aria-label="Emoji"
                      onClick={() => {}}
                      disabled={!selectedConversation}
                    >
                      <Smile className="h-5 w-5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                    onClick={handleSend}
                    disabled={!selectedConversation || !inputText.trim() || sending}
                    aria-label="Send"
                  >
                    {sending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <SendHorizontal className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

