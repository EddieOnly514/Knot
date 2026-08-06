"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { luggageLabel } from "@/components/match-trip-meta";
import { sendMatchRequest } from "@/lib/services/matchService";
import type { MatchCandidate } from "@/types";
import { Clock, Loader2, Music, Navigation, Users, VolumeX } from "lucide-react";
import { toast } from "sonner";

function formatTime(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatTimeRange(earliest: string, latest: string) {
  return `${formatTime(earliest)} – ${formatTime(latest)}`;
}

function matchBadgeClasses(label: string) {
  switch (label) {
    case "Great Match":
      return "bg-emerald-50 text-emerald-700";
    case "Okay Match":
      return "bg-amber-50 text-amber-700";
    case "Possible Match":
      return "bg-orange-50 text-orange-700";
    default:
      return "bg-zinc-100 text-zinc-700";
  }
}

export function DetailProfileCard({
  photoUrl,
  fallback,
  name,
  school,
  bio,
  distanceMiles,
  secondaryLine,
  badges,
}: {
  photoUrl?: string | null;
  fallback: string;
  name: string;
  school?: string | null;
  bio?: string | null;
  distanceMiles?: number | null;
  secondaryLine?: string | null;
  badges?: React.ReactNode;
}) {
  return (
    <Card className="rounded-2xl border-zinc-200/80 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14">
            <AvatarImage src={photoUrl || undefined} />
            <AvatarFallback className="bg-blue-50 text-lg font-medium text-blue-600">
              {fallback}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-zinc-900">{name}</p>
              {distanceMiles != null && (
                <span className="text-xs text-zinc-400">{distanceMiles.toFixed(1)} mi</span>
              )}
            </div>
            {secondaryLine && <p className="mt-1 text-xs text-zinc-500">{secondaryLine}</p>}
            {school && <p className="mt-1 text-sm text-zinc-500">{school}</p>}
            {bio && <p className="mt-2 text-sm text-zinc-600 line-clamp-3">{bio}</p>}
            {badges ? <div className="mt-2 flex flex-wrap gap-1.5">{badges}</div> : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DetailTripCard({
  origin,
  destination,
  departureEarliest,
  departureLatest,
  seatsNeeded,
  spaceCapacity,
  quietRide,
  musicOk,
  genderPref,
  needsXl,
  xlFlagMessage,
}: {
  origin: string;
  destination: string;
  departureEarliest: string;
  departureLatest: string;
  seatsNeeded: number;
  spaceCapacity: number;
  quietRide?: boolean;
  musicOk?: boolean;
  genderPref?: string | null;
  needsXl?: boolean;
  xlFlagMessage?: string | null;
}) {
  return (
    <Card className="rounded-2xl border-zinc-200/80 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <CardContent className="space-y-2.5 p-4 text-sm">
        <p className="text-xs font-semibold tracking-wide text-zinc-400">TRIP DETAILS</p>
        <div className="flex items-start gap-2">
          <Navigation className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
          <div>
            <p className="text-xs text-zinc-400">From</p>
            <p className="font-medium text-zinc-900">{origin}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Navigation className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
          <div>
            <p className="text-xs text-zinc-400">To</p>
            <p className="font-medium text-zinc-900">{destination}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
          <div>
            <p className="text-xs text-zinc-400">Departure window</p>
            <p className="font-medium text-zinc-900">
              {formatTimeRange(departureEarliest, departureLatest)}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Users className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
          <div>
            <p className="text-xs text-zinc-400">Party size</p>
            <p className="font-medium text-zinc-900">
              {seatsNeeded} {seatsNeeded === 1 ? "person" : "people"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          <Badge variant="secondary" className="text-[10px] gap-0.5">
            {luggageLabel(spaceCapacity)}
          </Badge>
          {quietRide && (
            <Badge variant="secondary" className="text-[10px] gap-0.5">
              <VolumeX className="h-2.5 w-2.5" /> Quiet ride
            </Badge>
          )}
          {musicOk && (
            <Badge variant="secondary" className="text-[10px] gap-0.5">
              <Music className="h-2.5 w-2.5" /> Music OK
            </Badge>
          )}
          {genderPref && genderPref !== "any" && (
            <Badge variant="secondary" className="text-[10px] gap-0.5">
              {genderPref === "same_only" ? "Same gender only" : "Any gender"}
            </Badge>
          )}
          {needsXl && (
            <Badge className="border-0 bg-amber-50 text-[10px] text-amber-800">
              {xlFlagMessage || "May need Uber XL"}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function MatchDetailDialog({
  item,
  open,
  onOpenChange,
  myRideId,
  onRequested,
}: {
  item: MatchCandidate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  myRideId: string | null;
  onRequested: (hideCandidateId?: string) => void;
}) {
  const router = useRouter();
  const [requesting, setRequesting] = useState(false);

  if (!item) return null;

  const match = item;
  const targetRideId = item.request_target_ride_id;
  const isGroup = item.candidate_type === "group" && item.group_size_before_join >= 2;

  const handleRequest = async () => {
    if (!myRideId) return;
    setRequesting(true);
    try {
      await sendMatchRequest(myRideId, targetRideId);
      toast.success(isGroup ? "Request sent to the group" : `Request sent to ${match.first_name}`);
      onRequested(item.candidate_id);
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to send request:", err);
      toast.error("Failed to send request");
    } finally {
      setRequesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg gap-0 overflow-hidden rounded-[1.75rem] border-white/80 p-0 shadow-2xl" showCloseButton>
        <DialogHeader className="shrink-0 px-6 pt-6 pb-2">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-lg">Match details</DialogTitle>
            <div className="flex items-center gap-2">
              {isGroup && (
                <Badge
                  variant="secondary"
                  className="rounded-full bg-amber-100 text-xs font-semibold text-amber-800"
                >
                  Group of {item.group_size_before_join}
                </Badge>
              )}
              <Badge
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${matchBadgeClasses(match.match_label)}`}
              >
                {match.match_label}
              </Badge>
            </div>
          </div>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-8rem)]">
          <div className="space-y-5 px-6 pb-6">
            <DetailProfileCard
              photoUrl={match.photo_url}
              fallback={match.first_name?.[0] || "U"}
              name={`${match.first_name} ${match.last_name?.[0] ? `${match.last_name[0]}.` : ""}`}
              school={match.school}
              bio={match.bio}
              distanceMiles={match.d_origin_miles}
              secondaryLine={
                isGroup && item.members.length > 1
                  ? `With: ${item.members
                      .filter((m) => m.ride_id !== match.ride_id)
                      .map((m) => `${m.first_name}${m.last_name?.[0] ? ` ${m.last_name[0]}.` : ""}`)
                      .join(", ")}`
                  : null
              }
              badges={
                <>
                  <Badge variant="secondary" className="text-[10px] gap-0.5">
                    {match.d_origin_tier.toLowerCase()} pickup
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] gap-0.5">
                    {match.d_destination_tier.toLowerCase().replace("_", " ")} dropoff
                  </Badge>
                  {!match.gender_compatible && (
                    <Badge className="border-0 bg-amber-50 text-[10px] text-amber-800">
                      Gender preference mismatch
                    </Badge>
                  )}
                </>
              }
            />

            <DetailTripCard
              origin={match.origin_name}
              destination={match.dest_name}
              departureEarliest={match.departure_earliest}
              departureLatest={match.departure_latest}
              seatsNeeded={match.seats_needed}
              spaceCapacity={match.space_capacity}
              quietRide={match.quiet_ride}
              musicOk={match.music_ok}
              genderPref={match.gender_pref}
              needsXl={match.needs_xl}
              xlFlagMessage={match.xl_flag_message}
            />

            <div className="flex flex-col gap-2 pt-2">
              <Button
                variant="outline"
                className="h-10 w-full rounded-full font-semibold"
                onClick={() => {
                  onOpenChange(false);
                  router.push(`/profile/${match.user_id}`);
                }}
              >
                View full profile
              </Button>
              <Button
                className="h-10 w-full rounded-full bg-blue-600 font-semibold text-white hover:bg-blue-700"
                onClick={handleRequest}
                disabled={requesting || !myRideId}
              >
                {requesting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send match request"
                )}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
