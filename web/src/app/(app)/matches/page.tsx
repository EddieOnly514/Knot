"use client";

import { useMemo, useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Star,
  Users,
  Loader2,
  ArrowRight,
  Clock,
  Navigation,
  CheckCircle,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
  VolumeX,
  Music,
  Calendar,
} from "lucide-react";
import {
  findMatches,
  sendMatchRequest,
  collapseMatchesIntoItems,
  getMyRequests,
  type RideRequest,
} from "@/lib/services/matchService";
import { getMyRides } from "@/lib/services/rideService";
import { getSupabaseClientOrThrow } from "@/lib/supabase/client";
import type { PotentialMatch, MatchItem } from "@/types";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

function formatTime(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  const fmt = (d: Date) =>
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return fmt(d);
}

function estimateSavingsDollars(match: PotentialMatch) {
  // UI-only estimate until we have real pricing data.
  const base = 28;
  const factor = Math.max(0.55, Math.min(0.95, match.total_score / 100));
  return Math.round(base * factor * 2) / 2;
}

function MatchDetailDialog({
  item,
  open,
  onOpenChange,
  myRideId,
  onRequested,
}: {
  item: MatchItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  myRideId: string | null;
  onRequested: () => void;
}) {
  const router = useRouter();
  const [requesting, setRequesting] = useState(false);

  if (!item) return null;

  const match = item.kind === "single" ? item.match : item.primaryMatch;
  const targetRideId = item.kind === "group" ? item.groupHostRideId : match.ride_id;
  const isGroup = item.kind === "group" && item.groupSize >= 2;

  const matchPct = Math.max(0, Math.min(100, Math.round(match.total_score)));

  const handleRequest = async () => {
    if (!myRideId) return;
    setRequesting(true);
    try {
      await sendMatchRequest(myRideId, targetRideId);
      toast.success(isGroup ? "Request sent to the group" : `Request sent to ${match.first_name}`);
      onRequested();
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
      <DialogContent
        className="max-h-[90vh] max-w-lg p-0 gap-0"
        showCloseButton={true}
      >
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-lg">
              Match details
            </DialogTitle>
            <div className="flex items-center gap-2">
              {isGroup && (
                <Badge variant="secondary" className="rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
                  Already in a group of {item.groupSize}
                </Badge>
              )}
              <Badge className="rounded-full bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white">
                {matchPct}% Match
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-8rem)]">
          <div className="space-y-5 px-6 pb-6">
            {/* Profile section */}
            <Card className="border-zinc-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={match.photo_url || undefined} />
                    <AvatarFallback className="bg-blue-50 text-lg font-medium text-blue-600">
                      {match.first_name?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-zinc-900">
                        {match.first_name} {match.last_name?.[0] ? `${match.last_name[0]}.` : ""}
                      </p>
                      {match.origin_distance_miles != null && (
                        <span className="text-xs text-zinc-400">
                          {match.origin_distance_miles.toFixed(1)} mi
                        </span>
                      )}
                    </div>
                    {isGroup && item.allMatches.length > 1 && (
                      <p className="mt-1 text-xs text-zinc-500">
                        With: {item.allMatches.filter((m) => m.ride_id !== match.ride_id).map((m) => `${m.first_name}${m.last_name?.[0] ? ` ${m.last_name[0]}.` : ""}`).join(", ")}
                      </p>
                    )}
                    <div className="mt-1 flex items-center gap-3 text-sm text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        {match.rating.toFixed(1)}
                      </span>
                      <span>{match.total_rides} rides</span>
                    </div>
                    {match.bio && (
                      <p className="mt-2 text-sm text-zinc-600 line-clamp-3">
                        {match.bio}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {match.phone_verified && (
                        <Badge className="bg-green-50 text-green-700 border-0 text-[10px]">
                          <Phone className="h-2.5 w-2.5 mr-0.5" />
                          Phone
                        </Badge>
                      )}
                      {match.email_verified && (
                        <Badge className="bg-blue-50 text-blue-700 border-0 text-[10px]">
                          <Mail className="h-2.5 w-2.5 mr-0.5" />
                          Email
                        </Badge>
                      )}
                      {match.id_verified && (
                        <Badge className="bg-purple-50 text-purple-700 border-0 text-[10px]">
                          <CheckCircle className="h-2.5 w-2.5 mr-0.5" />
                          ID
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Trip details */}
            <Card className="border-zinc-200">
              <CardContent className="p-4 space-y-2.5 text-sm">
                <p className="text-xs font-semibold text-zinc-400 tracking-wide">TRIP DETAILS</p>
                <div className="flex items-start gap-2">
                  <Navigation className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                  <div>
                    <p className="text-xs text-zinc-400">From</p>
                    <p className="font-medium text-zinc-900">{match.origin_name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Navigation className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                  <div>
                    <p className="text-xs text-zinc-400">To</p>
                    <p className="font-medium text-zinc-900">{match.dest_name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                  <div>
                    <p className="text-xs text-zinc-400">Departure window</p>
                    <p className="font-medium text-zinc-900">
                      {formatTimeRange(match.departure_earliest, match.departure_latest)}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Users className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                  <div>
                    <p className="text-xs text-zinc-400">Party size</p>
                    <p className="font-medium text-zinc-900">
                      {match.seats_needed} {match.seats_needed === 1 ? "person" : "people"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {match.quiet_ride && (
                    <Badge variant="secondary" className="text-[10px] gap-0.5">
                      <VolumeX className="h-2.5 w-2.5" /> Quiet ride
                    </Badge>
                  )}
                  {match.music_ok && (
                    <Badge variant="secondary" className="text-[10px] gap-0.5">
                      <Music className="h-2.5 w-2.5" /> Music OK
                    </Badge>
                  )}
                  {match.gender_pref && match.gender_pref !== "any" && (
                    <Badge variant="secondary" className="text-[10px] gap-0.5">
                      {match.gender_pref} only
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
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

type SortKey = "best" | "earliest" | "closest" | "cheapest";

function SortChip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
        active
          ? "bg-blue-600 text-white shadow-sm"
          : "bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function formatTimeRange(earliest: string, latest: string) {
  return `${formatTime(earliest)} – ${formatTime(latest)}`;
}

function MatchCard({
  match,
  myRideId,
  onRequested,
  onShowInfo,
}: {
  match: PotentialMatch;
  myRideId: string;
  onRequested: () => void;
  onShowInfo: () => void;
}) {
  const [requesting, setRequesting] = useState(false);
  const [tripExpanded, setTripExpanded] = useState(false);
  const router = useRouter();

  const matchPct = Math.max(0, Math.min(100, Math.round(match.total_score)));
  const originTime = formatTime(match.departure_earliest);

  const handleRequest = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setRequesting(true);
    try {
      await sendMatchRequest(myRideId, match.ride_id);
      toast.success(`Request sent to ${match.first_name}`);
      onRequested();
    } catch (err) {
      console.error("Failed to send request:", err);
      toast.error("Failed to send request");
    } finally {
      setRequesting(false);
    }
  };

  const toggleTrip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTripExpanded((prev) => !prev);
  };

  return (
    <Card
      className="overflow-hidden border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md"
      onClick={onShowInfo}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={match.photo_url || undefined} />
            <AvatarFallback className="bg-blue-50 text-sm font-medium text-blue-600">
              {match.first_name?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <p className="truncate text-sm font-semibold text-zinc-900">
                  {match.first_name} {match.last_name?.[0] ? `${match.last_name[0]}.` : ""}
                </p>
                {match.origin_distance_miles != null && (
                  <span className="shrink-0 text-xs text-zinc-400">
                    {match.origin_distance_miles.toFixed(1)} mi
                  </span>
                )}
              </div>
              <Badge className="shrink-0 rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                {matchPct}%
              </Badge>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                {match.rating.toFixed(1)}
              </span>
              <span>•</span>
              <span>{match.total_rides} rides</span>
            </div>
          </div>
        </div>

        <div
          className="mt-3 cursor-pointer rounded-xl bg-zinc-50 p-3 text-xs transition-colors hover:bg-zinc-100"
          onClick={toggleTrip}
        >
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-zinc-900">
                  {match.origin_name}
                </p>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                <p className="truncate text-sm font-semibold text-zinc-900">
                  {match.dest_name}
                </p>
              </div>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                {originTime} · Party of {match.seats_needed}
              </p>
            </div>
            <div className="shrink-0 text-zinc-400">
              {tripExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </div>
          </div>

          {tripExpanded && (
            <div className="mt-3 space-y-2 border-t border-zinc-200 pt-3">
              <div className="flex items-start gap-2">
                <Navigation className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold tracking-wide text-zinc-400">FROM</p>
                  <p className="text-sm font-medium text-zinc-900">{match.origin_name}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Navigation className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold tracking-wide text-zinc-400">TO</p>
                  <p className="text-sm font-medium text-zinc-900">{match.dest_name}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold tracking-wide text-zinc-400">TIME WINDOW</p>
                  <p className="text-sm font-medium text-zinc-900">
                    {formatTimeRange(match.departure_earliest, match.departure_latest)}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold tracking-wide text-zinc-400">PARTY SIZE</p>
                  <p className="text-sm font-medium text-zinc-900">
                    {match.seats_needed} {match.seats_needed === 1 ? "person" : "people"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {match.quiet_ride && (
                  <Badge variant="secondary" className="text-[10px] gap-0.5 bg-zinc-200/60">
                    <VolumeX className="h-2.5 w-2.5" /> Quiet ride
                  </Badge>
                )}
                {match.music_ok && (
                  <Badge variant="secondary" className="text-[10px] gap-0.5 bg-zinc-200/60">
                    <Music className="h-2.5 w-2.5" /> Music OK
                  </Badge>
                )}
                {match.gender_pref && match.gender_pref !== "any" && (
                  <Badge variant="secondary" className="text-[10px] gap-0.5 bg-zinc-200/60">
                    {match.gender_pref} only
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between pt-1">
                <p className="text-[11px] font-semibold text-blue-600">
                  Est. savings ~${estimateSavingsDollars(match).toFixed(2)}
                </p>
                {match.time_overlap_minutes > 0 && (
                  <p className="text-[11px] text-zinc-400">
                    {match.time_overlap_minutes} min overlap
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            className="h-9 rounded-full text-xs font-semibold"
            onClick={() => router.push(`/profile/${match.user_id}`)}
          >
            View Profile
          </Button>
          <Button
            className="h-9 rounded-full bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700"
            onClick={handleRequest}
            disabled={requesting}
          >
            {requesting ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Sending...
              </>
            ) : (
              "Match Request"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function GroupMatchCard({
  item,
  myRideId,
  onRequested,
  onShowInfo,
}: {
  item: Extract<MatchItem, { kind: "group" }>;
  myRideId: string;
  onRequested: () => void;
  onShowInfo: () => void;
}) {
  const [requesting, setRequesting] = useState(false);
  const router = useRouter();
  const { primaryMatch, groupSize, groupHostRideId } = item;
  const matchPct = Math.max(0, Math.min(100, Math.round(primaryMatch.total_score)));
  const originTime = formatTime(primaryMatch.departure_earliest);

  const handleRequest = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setRequesting(true);
    try {
      await sendMatchRequest(myRideId, groupHostRideId);
      toast.success("Request sent to the group");
      onRequested();
    } catch (err) {
      console.error("Failed to send request:", err);
      toast.error("Failed to send request");
    } finally {
      setRequesting(false);
    }
  };

  return (
    <Card
      className="overflow-hidden border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md"
      onClick={onShowInfo}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={primaryMatch.photo_url || undefined} />
            <AvatarFallback className="bg-blue-50 text-sm font-medium text-blue-600">
              {primaryMatch.first_name?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <p className="truncate text-sm font-semibold text-zinc-900">
                  {primaryMatch.first_name} {primaryMatch.last_name?.[0] ? `${primaryMatch.last_name[0]}.` : ""}
                </p>
                {primaryMatch.origin_distance_miles != null && (
                  <span className="shrink-0 text-xs text-zinc-400">
                    {primaryMatch.origin_distance_miles.toFixed(1)} mi
                  </span>
                )}
              </div>
              <Badge className="shrink-0 rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                {matchPct}%
              </Badge>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs">
              <Badge variant="secondary" className="rounded-full bg-amber-100 px-2 py-0 text-[10px] font-semibold text-amber-800">
                Already in a group of {groupSize}
              </Badge>
              <span className="flex items-center gap-1 text-zinc-500">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                {primaryMatch.rating.toFixed(1)}
              </span>
              <span className="text-zinc-500">•</span>
              <span className="text-zinc-500">{primaryMatch.total_rides} rides</span>
            </div>
          </div>
        </div>

        <div className="mt-3 cursor-pointer rounded-xl bg-zinc-50 p-3 text-xs transition-colors hover:bg-zinc-100" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-zinc-900">
                  {primaryMatch.origin_name}
                </p>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                <p className="truncate text-sm font-semibold text-zinc-900">
                  {primaryMatch.dest_name}
                </p>
              </div>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                {originTime} · Party of {primaryMatch.seats_needed}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            className="h-9 rounded-full text-xs font-semibold"
            onClick={() => router.push(`/profile/${primaryMatch.user_id}`)}
          >
            View Profile
          </Button>
          <Button
            className="h-9 rounded-full bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700"
            onClick={handleRequest}
            disabled={requesting}
          >
            {requesting ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Sending...
              </>
            ) : (
              "Match Request"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MatchesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, loading: authLoading } = useAuth();
  const [matches, setMatches] = useState<PotentialMatch[]>([]);
  const [matchItems, setMatchItems] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<RideRequest[]>([]);
  const [rideId, setRideId] = useState<string | null>(null);
  const [rideSummary, setRideSummary] = useState<{
    origin: string;
    dest: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("best");
  const [detailItem, setDetailItem] = useState<MatchItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const loadMatches = useCallback(async () => {
    if (authLoading) return;
    setLoading(true);
    setError(null);
    try {
      let id = searchParams.get("ride");

      if (!id) {
        if (!profile) {
          setError("no_rides");
          setLoading(false);
          return;
        }

        const myRides = await getMyRides(profile.id);
        if (myRides.length > 0) {
          id = myRides[0].id;
          setRideSummary({
            origin: myRides[0].origin_name,
            dest: myRides[0].dest_name,
          });
        } else {
          setError("no_rides");
          setLoading(false);
          return;
        }
      } else if (profile) {
        const myRides = await getMyRides(profile.id);
        const selected = myRides.find((r: { id: string; origin_name: string; dest_name: string }) => r.id === id) ?? myRides[0];
        if (selected) {
          setRideSummary({ origin: selected.origin_name, dest: selected.dest_name });
        }
      }

      setRideId(id);
      if (profile) {
        const myRequests = await getMyRequests(profile.id);
        setRequests(myRequests);
      }
      const results = await findMatches(id!);

      const supabase = getSupabaseClientOrThrow();
      const { data: existingRequests } = await supabase
        .from("ride_requests")
        .select("ride_id, requester_ride_id, status")
        .or(`ride_id.eq.${id},requester_ride_id.eq.${id}`)
        .in("status", ["accepted", "pending"]);

      let filtered: PotentialMatch[];
      if (existingRequests && existingRequests.length > 0) {
        const matchedRideIds = new Set(
          existingRequests.map(
            (r: { ride_id: string; requester_ride_id: string }) =>
              r.ride_id === id ? r.requester_ride_id : r.ride_id,
          ),
        );
        filtered = results.filter(
          (m: PotentialMatch) => !matchedRideIds.has(m.ride_id),
        );
      } else {
        filtered = results;
      }
      setMatches(filtered);
      const items = await collapseMatchesIntoItems(filtered);
      setMatchItems(items);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message ??
            (err as { error_description?: string })?.error_description ??
            JSON.stringify(err);
      const code = (err as { code?: string })?.code;
      console.error("Failed to load matches:", code ? `[${code}] ${message}` : message, err);
      setError("load_failed");
    } finally {
      setLoading(false);
    }
  }, [searchParams, profile, authLoading]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const invitationsForRide = useMemo(
    () =>
      requests.filter(
        (r) =>
          r.direction === "incoming" &&
          r.status === "pending" &&
          r.ride_status !== "completed" &&
          (!!rideId && r.ride_id === rideId),
      ),
    [requests, rideId],
  );

  const getScoreMatch = (item: MatchItem): PotentialMatch =>
    item.kind === "single" ? item.match : item.primaryMatch;

  const sortedMatchItems = useMemo(() => {
    if (matchItems.length === 0) return [];
    const list = [...matchItems];
    const closestScore = (m: PotentialMatch) => {
      const a = m.origin_distance_miles ?? 9999;
      const b = m.dest_distance_miles ?? 9999;
      return a + b;
    };
    list.sort((a, b) => {
      const ma = getScoreMatch(a);
      const mb = getScoreMatch(b);
      switch (sortKey) {
        case "earliest":
          return (
            new Date(ma.departure_earliest).getTime() -
            new Date(mb.departure_earliest).getTime()
          );
        case "closest":
          return closestScore(ma) - closestScore(mb);
        case "cheapest":
          return estimateSavingsDollars(mb) - estimateSavingsDollars(ma);
        case "best":
        default:
          return mb.total_score - ma.total_score;
      }
    });
    return list;
  }, [matchItems, sortKey]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="mb-3 h-7 w-7 animate-spin text-blue-600" />
        <p className="text-sm text-zinc-500">Finding your best matches...</p>
      </div>
    );
  }

  if (error === "no_rides") {
    return (
      <div className="py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
          <Navigation className="h-8 w-8 text-zinc-400" />
        </div>
        <h2 className="text-sm font-semibold text-zinc-900">
          No active rides
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Post a ride to find people heading your way.
        </p>
        <Button
          className="mt-5 h-9 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700"
          onClick={() => router.push("/post")}
        >
          Post a ride
        </Button>
      </div>
    );
  }

  if (error === "load_failed") {
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-sm text-zinc-500">
          Something went wrong loading matches.
        </p>
        <Button variant="outline" size="sm" onClick={loadMatches}>
          Try again
        </Button>
      </div>
    );
  }

  if (matchItems.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
          <Users className="h-8 w-8 text-blue-400" />
        </div>
        <h2 className="text-sm font-semibold text-zinc-900">No matches yet</h2>
        <p className="mt-1 text-xs text-zinc-500">
          No one is heading your way at this time — check back soon.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={loadMatches}
          className="mt-4"
        >
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Suggested Matches
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {rideSummary
              ? `Showing rides from ${rideSummary.origin} to ${rideSummary.dest}`
              : "Showing rides for your trip"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SortChip active={sortKey === "best"} onClick={() => setSortKey("best")}>
            Best Match
          </SortChip>
          <SortChip
            active={sortKey === "earliest"}
            onClick={() => setSortKey("earliest")}
          >
            <Clock className="h-3.5 w-3.5" />
            Earliest
          </SortChip>
          <SortChip
            active={sortKey === "closest"}
            onClick={() => setSortKey("closest")}
          >
            Closest
          </SortChip>
          <SortChip
            active={sortKey === "cheapest"}
            onClick={() => setSortKey("cheapest")}
          >
            Cheapest
          </SortChip>
        </div>
      </div>

      {invitationsForRide.length > 0 && (
        <section className="rounded-lg border border-blue-100 bg-blue-50/60 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-zinc-900">
                Invitations
              </h2>
              <Badge className="border-0 bg-blue-600/90 text-xs font-medium text-white">
                {invitationsForRide.length} new
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-full border-blue-200 text-xs"
              onClick={() => router.push("/home")}
            >
              Manage on Home
            </Button>
          </div>
          <div className="space-y-2">
            {invitationsForRide.slice(0, 3).map((inv) => (
              <div
                key={inv.id}
                className="flex items-center gap-3 rounded-lg bg-white/80 px-3 py-2 text-xs text-zinc-700"
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={inv.requester_photo || undefined} />
                  <AvatarFallback className="bg-blue-50 text-xs font-medium text-blue-600">
                    {inv.requester_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900">
                    {inv.requester_name} invited you
                  </p>
                  <p className="truncate text-[11px] text-zinc-500">
                    {inv.requester_origin} → {inv.requester_dest}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedMatchItems.map((item) =>
          item.kind === "single" ? (
            <MatchCard
              key={item.match.ride_id}
              match={item.match}
              myRideId={rideId!}
              onRequested={loadMatches}
              onShowInfo={() => {
                setDetailItem(item);
                setDetailOpen(true);
              }}
            />
          ) : (
            <GroupMatchCard
              key={item.groupHostRideId}
              item={item}
              myRideId={rideId!}
              onRequested={loadMatches}
              onShowInfo={() => {
                setDetailItem(item);
                setDetailOpen(true);
              }}
            />
          ),
        )}
      </div>

      <MatchDetailDialog
        item={detailItem}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setDetailItem(null);
        }}
        myRideId={rideId}
        onRequested={loadMatches}
      />

      <div className="flex justify-center pt-2">
        <Button variant="outline" className="h-10 rounded-full px-5 text-sm">
          Load More Matches
        </Button>
      </div>
    </div>
  );
}

function MatchesInner() {
  return (
    <MatchesContent />
  );
}

export default function MatchesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
        </div>
      }
    >
      <MatchesInner />
    </Suspense>
  );
}

