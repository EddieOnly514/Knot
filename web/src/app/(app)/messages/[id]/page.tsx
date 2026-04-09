"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Send,
  MapPin,
  CheckCheck,
  Check,
  Loader2,
  MoreVertical,
  LogOut,
  Zap,
  Car,
  Handshake,
  Flag,
  ArrowLeft,
  Navigation,
  Clock,
  ChevronRight,
  Users,
} from "lucide-react";
import {
  getMessages,
  sendMessage,
  markAsRead,
  subscribeToMessages,
  updateRideStatusForGroup,
  leaveGroup,
} from "@/lib/services/chatService";
import type { Message } from "@/lib/services/chatService";
import { getSupabaseClientOrThrow } from "@/lib/supabase/client";
import { toast } from "sonner";
import { invalidateHomeCache } from "@/lib/homeCache";

const QUICK_ACTIONS = [
  { label: "Confirm pickup time" },
  { label: "Running 5 min late" },
  { label: "I've arrived" },
  { label: "Cancel ride" },
];

const STATUS_STEPS = ["accepted", "confirmed", "completed"];
const STATUS_LABELS: Record<string, string> = {
  accepted: "Matched",
  confirmed: "Confirmed",
  completed: "Completed",
};

interface RideDetail {
  id: string;
  origin_name: string;
  dest_name: string;
  departure_earliest: string | null;
  departure_latest: string | null;
  departure_preferred: string | null;
  ride_type: string | null;
}

interface GroupParticipant {
  id: string;
  first_name: string;
  last_name: string;
  photo_url: string | null;
}

interface GroupInfo {
  ride_id: string;
  rider_count: number;
  origin: string;
  dest: string;
  participants: GroupParticipant[];
}

export default function ChatThreadPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;
  const { profile } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [rideStatus, setRideStatus] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showRideDetail, setShowRideDetail] = useState(false);
  const [rideDetailLoading, setRideDetailLoading] = useState(false);
  const [rideDetails, setRideDetails] = useState<RideDetail[]>([]);
  const [showGroupMembers, setShowGroupMembers] = useState(false);
  const [senderProfiles, setSenderProfiles] = useState<Record<string, { name: string; photo: string | null }>>({});
  const [notFound, setNotFound] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    setNotFound(false);
    async function loadGroup() {
      const supabase = getSupabaseClientOrThrow();
      if (!profile) return;

      const { data: grp } = await supabase
        .from("ride_groups")
        .select("ride_id, rider_count")
        .eq("id", groupId)
        .single();

      if (!grp) {
        setNotFound(true);
        return;
      }

      const { data: hostRide } = await supabase
        .from("rides")
        .select("id, origin_name, dest_name")
        .eq("id", grp.ride_id)
        .single();

      const { data: memberRows } = await supabase
        .from("ride_group_members")
        .select("ride_id")
        .eq("ride_group_id", groupId)
        .is("left_at", null);

      const memberRideIds = (memberRows || []).map((r: { ride_id: string }) => r.ride_id);

      const profileIds: string[] = [];
      if (memberRideIds.length > 0) {
        const { data: memberRides } = await supabase
          .from("rides")
          .select("user_id")
          .in("id", memberRideIds);
        (memberRides || []).forEach((r: { user_id: string }) => profileIds.push(r.user_id));
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, photo_url")
        .in("id", [...new Set(profileIds)]);

      setGroupInfo({
        ride_id: grp.ride_id,
        rider_count: grp.rider_count ?? memberRideIds.length,
        origin: hostRide?.origin_name ?? "",
        dest: hostRide?.dest_name ?? "",
        participants: (profiles as GroupParticipant[]) ?? [],
      });

      setRideStatus("accepted");
    }

    loadGroup();
  }, [groupId, profile]);

  useEffect(() => {
    if (!showRideDetail || !groupInfo) return;
    setRideDetailLoading(true);
    (async () => {
      const supabase = getSupabaseClientOrThrow();
      const { data: memberRows } = await supabase
        .from("ride_group_members")
        .select("ride_id")
        .eq("ride_group_id", groupId)
        .is("left_at", null);

      const rideIds = (memberRows || []).map((r: { ride_id: string }) => r.ride_id);
      if (rideIds.length === 0) {
        setRideDetails([]);
        setRideDetailLoading(false);
        return;
      }

      const { data } = await supabase
        .from("rides")
        .select("id, origin_name, dest_name, departure_earliest, departure_latest, departure_preferred, ride_type")
        .in("id", rideIds);
      setRideDetails((data as RideDetail[]) ?? []);
      setRideDetailLoading(false);
    })();
  }, [showRideDetail, groupInfo, groupId]);

  useEffect(() => {
    async function load() {
      try {
        const msgs = await getMessages(groupId);
        setMessages(msgs);
        await markAsRead(groupId);
      } catch (err) {
        console.error("Failed to load messages:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [groupId]);

  useEffect(() => {
    if (messages.length === 0) return;
    const allSenderIds = [...new Set(messages.map((m) => m.sender_id))];
    const unknownSenderIds = allSenderIds.filter(id => !senderProfiles[id]);
    if (unknownSenderIds.length === 0) return;
    (async () => {
      const supabase = getSupabaseClientOrThrow();
      const { data } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, photo_url")
        .in("id", unknownSenderIds);
      const map: Record<string, { name: string; photo: string | null }> = {};
      (data || []).forEach((p: { id: string; first_name: string; last_name: string; photo_url: string | null }) => {
        map[p.id] = {
          name: `${p.first_name} ${p.last_name?.[0] ?? ""}.`.trim(),
          photo: p.photo_url,
        };
      });
      setSenderProfiles((prev) => ({ ...prev, ...map }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, messages.length]);

  useEffect(() => {
    const channel = subscribeToMessages(groupId, (newMsg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      markAsRead(groupId);
    });

    return () => {
      const supabase = getSupabaseClientOrThrow();
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || sending) return;
    setInputText("");
    setSending(true);
    try {
      const msg = await sendMessage(groupId, text, "text");
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    } catch (err) {
      console.error("Failed to send:", err);
      if (err instanceof Error && err.message === "Not authenticated") {
        toast.error("Your session expired. Please log in again.");
        router.push("/login");
      } else {
        toast.error("Failed to send message.");
      }
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleQuickAction = async (label: string) => {
    setSending(true);
    setShowQuickActions(false);
    try {
      const msg = await sendMessage(groupId, label, "quick_action");
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      if (label === "Confirm pickup time" && rideStatus === "accepted" && groupInfo?.ride_id) {
        await updateRideStatusForGroup(groupInfo.ride_id, "confirmed");
        setRideStatus("confirmed");
      }
      if (label === "Cancel ride") {
        await leaveGroup(groupId);
        router.push("/messages");
      }
    } catch (err) {
      console.error("Failed to send quick action:", err);
      if (err instanceof Error && err.message === "Not authenticated") {
        toast.error("Your session expired. Please log in again.");
        router.push("/login");
      } else {
        toast.error("Failed to send quick action.");
      }
    } finally {
      setSending(false);
    }
  };

  const handleStatusAction = async (newStatus: "confirmed" | "completed") => {
    const previousStatus = rideStatus;
    setRideStatus(newStatus);
    setUpdatingStatus(true);

    try {
      if (groupInfo?.ride_id) {
        await updateRideStatusForGroup(groupInfo.ride_id, newStatus);
      }

      if (newStatus === "completed") {
        invalidateHomeCache();
      }

      try {
        const label =
          newStatus === "confirmed"
            ? "Meetup confirmed! See you there."
            : "Ride completed. Thanks for riding together!";
        const msg = await sendMessage(groupId, label, "quick_action");
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      } catch (msgErr) {
        console.warn("Status updated but system message failed:", msgErr);
      }
    } catch (err) {
      setRideStatus(previousStatus);
      console.error("Failed to update status:", err);
      if (err instanceof Error && err.message === "Not authenticated") {
        toast.error("Your session expired. Please log in again.");
        router.push("/login");
      } else {
        toast.error("Failed to update ride status.");
      }
    } finally {
      setUpdatingStatus(false);
    }
  };

  const formatMsgTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatDateSeparator = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Today";
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatRideTime = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const groupedMessages: { date: string; msgs: Message[] }[] = [];
  messages.forEach((msg) => {
    const dateKey = new Date(msg.created_at).toDateString();
    const lastGroup = groupedMessages[groupedMessages.length - 1];
    if (lastGroup && lastGroup.date === dateKey) {
      lastGroup.msgs.push(msg);
    } else {
      groupedMessages.push({ date: dateKey, msgs: [msg] });
    }
  });

  const currentStepIndex = rideStatus != null ? STATUS_STEPS.indexOf(rideStatus) : -1;

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/messages");
  };

  const groupName = groupInfo
    ? groupInfo.participants
        .filter(p => p.id !== profile?.id)
        .map(p => p.first_name)
        .join(", ") || "Ride Group"
    : "Group Chat";

  if (notFound) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="mb-4 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="-ml-2 h-11 w-11 shrink-0 text-zinc-600"
            onClick={() => router.push("/messages")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
          <p className="text-center text-sm text-zinc-600">
            Group chat not found. It may have been archived or you don&apos;t have access.
          </p>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => router.push("/messages")}
          >
            Back to Messages
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="-ml-2 h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 text-zinc-600 hover:text-zinc-900 touch-manipulation md:h-9 md:w-9 md:min-h-0 md:min-w-0"
            onClick={handleBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="truncate text-base font-semibold text-zinc-900 sm:text-lg">
                {groupName}
              </h1>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 h-8 px-2 text-xs text-zinc-500 hover:text-zinc-900"
                onClick={() => setShowGroupMembers(true)}
              >
                <Users className="h-4 w-4 mr-1" />
                {groupInfo?.rider_count ?? 0}
              </Button>
            </div>
            {groupInfo && (
              <button
                type="button"
                className="mt-0.5 flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left text-xs text-zinc-600 hover:bg-zinc-100 hover:text-zinc-800 transition-colors"
                onClick={() => setShowRideDetail(true)}
              >
                <Send className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                <span className="truncate">{groupInfo.origin}</span>
                <span className="shrink-0">→</span>
                <MapPin className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                <span className="truncate">{groupInfo.dest}</span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
              </button>
            )}
            {!groupInfo && (
              <p className="text-xs text-zinc-500">Loading group...</p>
            )}
          </div>
        </div>
        <div className="relative shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 min-h-[44px] min-w-[44px] text-zinc-500 hover:text-zinc-900 touch-manipulation md:h-8 md:w-8 md:min-h-0 md:min-w-0"
            onClick={() => setShowMenu(!showMenu)}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-9 z-50 w-48 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
                <button
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs text-zinc-700 hover:bg-zinc-50"
                  onClick={() => {
                    setShowMenu(false);
                    setShowGroupMembers(true);
                  }}
                >
                  <Users className="h-4 w-4 text-blue-500" />
                  View members
                </button>
                <div className="my-1 border-t border-zinc-100" />
                <button
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs text-rose-600 hover:bg-rose-50"
                  onClick={() => {
                    setShowMenu(false);
                    setShowLeaveConfirm(true);
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Leave group
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Ride details dialog */}
      <Dialog open={showRideDetail} onOpenChange={setShowRideDetail}>
        <DialogContent className="sm:max-w-md" showCloseButton={true}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="h-5 w-5 text-blue-600" />
              Ride details
            </DialogTitle>
          </DialogHeader>
          {rideDetailLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : rideDetails.length === 0 ? (
            <p className="text-sm text-zinc-500">
              {groupInfo ? `${groupInfo.origin} → ${groupInfo.dest}` : "No ride details."}
            </p>
          ) : (
            <div className="space-y-4">
              {rideDetails.map((ride) => (
                <div
                  key={ride.id}
                  className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4"
                >
                  <div className="flex items-start gap-2">
                    <Navigation className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="font-medium text-zinc-900">{ride.origin_name}</p>
                      <p className="text-xs text-zinc-500">↓ to</p>
                      <p className="font-medium text-zinc-900">{ride.dest_name}</p>
                    </div>
                  </div>
                  {(ride.departure_earliest || ride.departure_latest || ride.departure_preferred) && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-zinc-600">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      {ride.departure_preferred && (
                        <span>Preferred: {formatRideTime(ride.departure_preferred)}</span>
                      )}
                      {(ride.departure_earliest || ride.departure_latest) && (
                        <span>
                          Window: {formatRideTime(ride.departure_earliest) ?? "—"} – {formatRideTime(ride.departure_latest) ?? "—"}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Group members dialog */}
      <Dialog open={showGroupMembers} onOpenChange={setShowGroupMembers}>
        <DialogContent className="sm:max-w-md" showCloseButton={true}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Group members ({groupInfo?.rider_count ?? 0})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {(groupInfo?.participants ?? []).map((p) => (
              <button
                key={p.id}
                type="button"
                className="flex w-full items-center gap-3 rounded-lg border border-zinc-100 p-3 text-left hover:bg-zinc-50 transition-colors"
                onClick={() => {
                  setShowGroupMembers(false);
                  router.push(`/profile/${p.id}`);
                }}
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={p.photo_url || undefined} />
                  <AvatarFallback className="bg-blue-50 text-sm font-medium text-blue-600">
                    {(p.first_name?.[0] ?? "?")}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium text-zinc-900">
                  {p.first_name} {p.last_name?.[0] ?? ""}.
                </span>
                {p.id === profile?.id && (
                  <span className="text-xs text-zinc-400">You</span>
                )}
                <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400 ml-auto" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Leave confirmation dialog */}
      <Dialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <DialogContent className="sm:max-w-md" showCloseButton={true}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-rose-500" />
              Leave group?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-600">
            You will be removed from this group chat. The chat will continue for other members.
          </p>
          <div className="flex gap-2 justify-end mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLeaveConfirm(false)}
              disabled={leaving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-rose-600 hover:bg-rose-700"
              disabled={leaving}
              onClick={async () => {
                setLeaving(true);
                try {
                  await leaveGroup(groupId);
                  setShowLeaveConfirm(false);
                  router.push("/messages");
                } catch (err) {
                  console.error("Leave failed:", err);
                  toast.error(err instanceof Error ? err.message : "Failed to leave group.");
                } finally {
                  setLeaving(false);
                }
              }}
            >
              {leaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Leave group"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Status bar */}
      {rideStatus !== null && rideStatus !== "cancelled" && (
        <div className="mb-2">
          <div className="flex items-center px-1">
            {STATUS_STEPS.map((step, i) => {
              const isActive = i <= currentStepIndex;
              const isCurrent = i === currentStepIndex;
              return (
                <div key={step} className="flex flex-1 items-center">
                  <div className="flex flex-1 flex-col items-center">
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium ${
                        isCurrent
                          ? "bg-blue-600 text-white"
                          : isActive
                            ? "bg-emerald-500 text-white"
                            : "bg-zinc-200 text-zinc-400"
                      }`}
                    >
                      {isActive && i < currentStepIndex ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        i + 1
                      )}
                    </div>
                    <span
                      className={`mt-1 text-[10px] ${
                        isCurrent
                          ? "font-semibold text-blue-600"
                          : isActive
                            ? "text-emerald-600"
                            : "text-zinc-400"
                      }`}
                    >
                      {STATUS_LABELS[step]}
                    </span>
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div
                      className={`-mt-4 h-0.5 flex-1 ${
                        i < currentStepIndex ? "bg-emerald-400" : "bg-zinc-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
          {rideStatus === "accepted" && (
            <Button
              className="mt-2 h-9 w-full rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700"
              onClick={() => handleStatusAction("confirmed")}
              disabled={updatingStatus}
            >
              {updatingStatus ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Handshake className="mr-2 h-4 w-4" />
              )}
              Confirm meetup
            </Button>
          )}
          {rideStatus === "confirmed" && (
            <Button
              className="mt-2 h-9 w-full rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700"
              onClick={() => handleStatusAction("completed")}
              disabled={updatingStatus}
            >
              {updatingStatus ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Flag className="mr-2 h-4 w-4" />
              )}
              Complete ride
            </Button>
          )}
        </div>
      )}

      {/* Messages area */}
      <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain bg-white px-4 py-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        ) : messages.length === 0 ? (
          <div className="py-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
              <Car className="h-6 w-6 text-blue-400" />
            </div>
            <p className="text-sm text-zinc-500">
              Start the conversation and coordinate your ride.
            </p>
          </div>
        ) : (
          groupedMessages.map((group) => (
            <div key={group.date}>
              <div className="my-3 flex items-center justify-center">
                <span className="rounded-full border border-zinc-100 bg-white px-3 py-1 text-[11px] text-zinc-400">
                  {formatDateSeparator(group.msgs[0].created_at)}
                </span>
              </div>
              {group.msgs.map((msg) => {
                const isMine = msg.sender_id === profile?.id;
                const sender = senderProfiles[msg.sender_id];

                if (msg.message_type === "system") {
                  return (
                    <div key={msg.id} className="my-3 flex justify-center">
                      <span className="rounded-full bg-zinc-100 px-3 py-1 text-[11px] text-zinc-500">
                        {msg.content}
                      </span>
                    </div>
                  );
                }

                if (msg.message_type === "quick_action") {
                  return (
                    <div
                      key={msg.id}
                      className={`mb-3 flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[80%] flex ${isMine ? "flex-col items-end" : "flex-col items-start"}`}>
                        {!isMine && sender && (
                          <div className="flex items-center gap-1.5 mb-1">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={sender.photo || undefined} />
                              <AvatarFallback className="text-[10px] bg-zinc-200 text-zinc-600">
                                {sender.name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-[11px] font-medium text-zinc-600">{sender.name}</span>
                          </div>
                        )}
                        <div
                          className={`rounded-2xl px-4 py-2.5 text-xs ${
                            isMine
                              ? "rounded-br-md bg-blue-600 text-white"
                              : "rounded-bl-md bg-blue-50 text-blue-900"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{msg.content}</span>
                          </div>
                          <div className={`mt-1 flex items-center gap-1 ${isMine ? "justify-end" : ""}`}>
                            <span className={`text-[10px] ${isMine ? "text-blue-200" : "text-blue-700"}`}>
                              {formatMsgTime(msg.created_at)}
                            </span>
                            {isMine && (msg.read_at ? (
                              <CheckCheck className="h-3 w-3 text-blue-200" />
                            ) : (
                              <Check className="h-3 w-3 text-blue-300" />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (msg.message_type === "location") {
                  const meta = msg.metadata as { lat: number; lng: number; map_url: string } | null;
                  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
                  const staticMapUrl =
                    meta && apiKey
                      ? `https://maps.googleapis.com/maps/api/staticmap?center=${meta.lat},${meta.lng}&zoom=15&size=300x150&markers=color:red%7C${meta.lat},${meta.lng}&key=${apiKey}`
                      : null;
                  return (
                    <div
                      key={msg.id}
                      className={`mb-3 flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[80%] flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                        {!isMine && sender && (
                          <div className="flex items-center gap-1.5 mb-1">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={sender.photo || undefined} />
                              <AvatarFallback className="text-[10px] bg-zinc-200 text-zinc-600">
                                {sender.name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-[11px] font-medium text-zinc-600">{sender.name}</span>
                          </div>
                        )}
                        <div
                          className={`overflow-hidden rounded-2xl ${
                            isMine
                              ? "rounded-br-md bg-blue-600 text-white"
                              : "rounded-bl-md border border-zinc-200 bg-white"
                          }`}
                        >
                          {staticMapUrl && (
                            <a href={meta?.map_url} target="_blank" rel="noopener noreferrer">
                              <img src={staticMapUrl} alt="Location" className="h-[120px] w-full object-cover" />
                            </a>
                          )}
                          <div className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3.5 w-3.5" />
                              <span className="text-sm font-medium">Shared location</span>
                            </div>
                            {meta?.map_url && (
                              <a
                                href={meta.map_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`mt-1 block text-xs underline ${isMine ? "text-blue-200" : "text-blue-600"}`}
                              >
                                Open in Google Maps
                              </a>
                            )}
                            <div className={`mt-1 flex items-center gap-1 ${isMine ? "justify-end" : ""}`}>
                              <span className={`text-[10px] ${isMine ? "text-blue-200" : "text-zinc-400"}`}>
                                {formatMsgTime(msg.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`mb-3 flex ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[80%] flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                      {!isMine && sender && (
                        <div className="flex items-center gap-1.5 mb-1">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={sender.photo || undefined} />
                            <AvatarFallback className="text-[10px] bg-zinc-200 text-zinc-600">
                              {sender.name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-[11px] font-medium text-zinc-600">{sender.name}</span>
                        </div>
                      )}
                      <div
                        className={`rounded-2xl px-4 py-2.5 text-sm ${
                          isMine
                            ? "rounded-br-md bg-blue-600 text-white"
                            : "rounded-bl-md border border-zinc-200 bg-white text-zinc-900"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <div className={`mt-1 flex items-center gap-1 ${isMine ? "justify-end" : ""}`}>
                          <span className={`text-[10px] ${isMine ? "text-blue-200" : "text-zinc-400"}`}>
                            {formatMsgTime(msg.created_at)}
                          </span>
                          {isMine && (msg.read_at ? (
                            <CheckCheck className="h-3 w-3 text-blue-200" />
                          ) : (
                            <Check className="h-3 w-3 text-blue-300" />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick actions */}
      {showQuickActions && (
        <div className="border-t border-zinc-200 bg-white px-3 py-2 text-[11px]">
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                type="button"
                className="min-h-[44px] rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2.5 font-medium text-zinc-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 touch-manipulation"
                onClick={() => handleQuickAction(action.label)}
                disabled={sending}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div
        className="border-t border-zinc-200 bg-white"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center gap-1 px-3 py-3 sm:gap-0">
          <Button
            variant="ghost"
            size="icon"
            className={`h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 touch-manipulation md:h-9 md:w-9 md:min-h-0 md:min-w-0 ${
              showQuickActions ? "bg-blue-50 text-blue-600" : "text-zinc-400"
            }`}
            onClick={() => setShowQuickActions(!showQuickActions)}
          >
            <Zap className="h-5 w-5" />
          </Button>
          <div className="relative min-w-0 flex-1">
            <input
              ref={inputRef}
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
              className="h-11 min-h-[44px] w-full rounded-full bg-zinc-100 px-4 text-base text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 md:h-10 md:min-h-0 md:text-sm"
            />
          </div>
          <Button
            size="icon"
            className="h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 rounded-full bg-blue-600 text-white hover:bg-blue-700 touch-manipulation md:h-10 md:w-10 md:min-h-0 md:min-w-0"
            onClick={handleSend}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="px-4 pb-3 md:px-6">
          <p className="text-center text-[10px] text-zinc-400">
            Knot is a matching platform only. Always meet in safe, public locations.
          </p>
        </div>
      </div>
    </div>
  );
}
