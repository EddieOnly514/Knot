"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, Clock3, Loader2, MapPin, Users, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TripCardMeta } from "@/components/match-trip-meta";
import { sendMatchRequest, type RideRequest } from "@/lib/services/matchService";
import type { MatchCandidate } from "@/types";
import { toast } from "sonner";

export function formatRideTime(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatRideDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function matchBadgeClasses(label: string) {
  switch (label) {
    case "Great Match":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "Okay Match":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "Possible Match":
      return "border-orange-200 bg-orange-50 text-orange-700";
    default:
      return "border-zinc-200 bg-zinc-100 text-zinc-700";
  }
}

export function RideRequestCard({
  request,
  variant,
  busy,
  onPrimary,
  onSecondary,
  onOpenDetails,
  onOpenProfile,
}: {
  request: RideRequest;
  variant: "incoming" | "outgoing";
  busy: boolean;
  onPrimary: () => void;
  onSecondary?: () => void;
  onOpenDetails: () => void;
  onOpenProfile?: () => void;
}) {
  const incoming = variant === "incoming";

  return (
    <Card
      role="group"
      tabIndex={0}
      aria-label={`${incoming ? "View incoming request from" : "View request sent to"} ${request.requester_name}`}
      className="group cursor-pointer rounded-2xl border-white/80 bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_14px_32px_rgba(37,99,235,0.10)]"
      onClick={onOpenDetails}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenDetails();
        }
      }}
    >
      <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            aria-label={`View ${request.requester_name}'s profile`}
            onClick={(event) => {
              event.stopPropagation();
              onOpenProfile?.();
            }}
          >
            <Avatar className="h-10 w-10 border border-blue-100 shadow-sm">
              <AvatarImage src={request.requester_photo || undefined} />
              <AvatarFallback className="bg-blue-50 text-sm font-semibold text-blue-700">
                {request.requester_name[0]}
              </AvatarFallback>
            </Avatar>
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-sm font-semibold text-zinc-950">
                {request.requester_name}
              </p>
              {request.requester_school && (
                <span className="shrink-0 text-[11px] font-medium text-zinc-400">
                  {request.requester_school}
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-xs font-medium text-zinc-600">
              {request.requester_origin} <span className="mx-1 text-zinc-300">→</span> {request.requester_dest}
            </p>
            <div className="mt-1 flex items-center gap-3 text-[11px] text-zinc-400">
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3 w-3" />
                {request.requester_departure ? formatRideTime(request.requester_departure) : "Time TBD"}
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="h-3 w-3" />
                {request.requester_seats} {request.requester_seats === 1 ? "rider" : "riders"}
              </span>
            </div>
          </div>
        </div>

        <div
          className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0"
          onClick={(event) => event.stopPropagation()}
        >
          {incoming ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-xl border-zinc-200 px-3 text-xs font-semibold text-zinc-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                onClick={onSecondary}
                disabled={busy}
              >
                <X className="mr-1.5 h-3.5 w-3.5" />
                Decline
              </Button>
              <Button
                size="sm"
                className="h-9 rounded-xl bg-blue-600 px-3 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
                onClick={onPrimary}
                disabled={busy}
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1.5 h-3.5 w-3.5" />}
                {!busy && "Accept"}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="col-span-2 h-9 rounded-xl border-zinc-200 px-4 text-xs font-semibold text-zinc-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
              onClick={onPrimary}
              disabled={busy}
            >
              {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <X className="mr-1.5 h-3.5 w-3.5" />}
              Withdraw request
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function MatchCandidateCard({
  match,
  myRideId,
  onRequested,
  onShowInfo,
}: {
  match: MatchCandidate;
  myRideId: string;
  onRequested: (candidateId?: string) => void;
  onShowInfo: () => void;
}) {
  const [requesting, setRequesting] = useState(false);
  const router = useRouter();
  const isGroup = match.candidate_type === "group";
  const departure = match.departure_preferred ?? match.departure_earliest;

  const handleRequest = async () => {
    setRequesting(true);
    try {
      await sendMatchRequest(myRideId, match.request_target_ride_id);
      toast.success(isGroup ? "Request sent to the group" : `Request sent to ${match.first_name}`);
      onRequested(match.candidate_id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send request");
    } finally {
      setRequesting(false);
    }
  };

  return (
    <Card
      role="group"
      tabIndex={0}
      aria-label={`View match details for ${match.first_name}`}
      className="group h-full cursor-pointer overflow-hidden rounded-[1.75rem] border border-zinc-200/80 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.07)] transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_20px_48px_rgba(37,99,235,0.13)]"
      onClick={onShowInfo}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onShowInfo();
        }
      }}
    >
      <CardContent className="flex h-full flex-col p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Avatar className="h-11 w-11 shrink-0 border-2 border-white shadow-md ring-1 ring-zinc-100">
            <AvatarImage src={match.photo_url || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-blue-50 to-sky-100 text-sm font-bold text-blue-700">
              {match.first_name?.[0] || "K"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-bold tracking-tight text-zinc-950">
                  {match.first_name} {match.last_name?.[0] ? `${match.last_name[0]}.` : ""}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500">
                  {isGroup && (
                    <Badge className="border-0 bg-blue-50 px-2 py-0 text-[10px] font-semibold text-blue-700">
                      Group of {match.group_size_before_join}
                    </Badge>
                  )}
                  {match.school && <span>{match.school}</span>}
                </div>
              </div>
              <Badge className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${matchBadgeClasses(match.match_label)}`}>
                {match.match_label}
              </Badge>
            </div>
          </div>
        </div>

        <div className="mt-4 flex-1 rounded-2xl border border-zinc-100 bg-gradient-to-br from-zinc-50 to-blue-50/40 p-3.5">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
            <p className="line-clamp-2 text-sm font-bold leading-5 text-zinc-950">
              {match.origin_name} <span className="mx-1 text-zinc-300">→</span> {match.dest_name}
            </p>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-zinc-600">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-zinc-400" />
              {formatRideDate(departure)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5 text-zinc-400" />
              {formatRideTime(departure)}
            </span>
            <span className="inline-flex items-center justify-end gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-zinc-400" />
              {match.d_origin_miles?.toFixed(1) ?? "?"} mi
            </span>
          </div>
          <TripCardMeta spaceCapacity={match.space_capacity} needsXl={match.needs_xl} />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2" onClick={(event) => event.stopPropagation()}>
          <Button
            variant="outline"
            className="h-10 rounded-xl border-zinc-200 text-xs font-bold text-zinc-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            onClick={() => router.push(`/profile/${match.user_id}`)}
          >
            View profile
          </Button>
          <Button
            className="h-10 rounded-xl bg-blue-600 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
            onClick={handleRequest}
            disabled={requesting}
          >
            {requesting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Request match"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
