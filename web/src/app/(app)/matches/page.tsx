"use client";

import { useMemo, useState, useEffect, useCallback, Suspense } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Users, Loader2, Check, XCircle, Navigation, Clock } from "lucide-react";
import {
  DetailProfileCard,
  DetailTripCard,
  MatchDetailDialog,
} from "@/components/match-detail-dialog";
import {
  findMatches,
  sendMatchRequest,
  getMyRequests,
  respondToRequest,
  withdrawRequest,
  type RideRequest,
} from "@/lib/services/matchService";
import { getMyRides } from "@/lib/services/rideService";
import { getSupabaseClientOrThrow } from "@/lib/supabase/client";
import type { MatchCandidate } from "@/types";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { estimateSavingsDollars as estimateSavings } from "@/lib/estimateSavings";
import { TripCardMeta } from "@/components/match-trip-meta";

function formatTime(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  const fmt = (d: Date) =>
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return fmt(d);
}

function estimateSavingsDollars(match: MatchCandidate) {
  return estimateSavings(match.origin_name, match.dest_name);
}

async function fetchMatchesPageData(profileId: string, rideParam: string | null) {
  const supabase = getSupabaseClientOrThrow();
  const [myRides, myRequests] = await Promise.all([
    getMyRides(profileId),
    getMyRequests(profileId),
  ]);

  let id: string | null = rideParam;
  if (!id) {
    if (myRides.length === 0) {
      throw new Error("NO_RIDES");
    }
    id = myRides[0].id;
  }
  if (!id) {
    throw new Error("NO_RIDES");
  }

  const selected =
    myRides.find((r: { id: string }) => r.id === id) ?? myRides[0];
  const rideSummary = selected
    ? { origin: selected.origin_name, dest: selected.dest_name }
    : null;

  const [results, existingRes] = await Promise.all([
    findMatches(id),
    supabase
      .from("ride_requests")
      .select("ride_id, requester_ride_id, status")
      .or(`ride_id.eq.${id},requester_ride_id.eq.${id}`)
      .in("status", ["accepted", "pending"]),
  ]);

  const { data: existingRequests, error: existingError } = existingRes;
  if (existingError) throw existingError;

  let filtered: MatchCandidate[];
  if (existingRequests && existingRequests.length > 0) {
    const matchedRideIds = new Set(
      existingRequests.map(
        (r: { ride_id: string; requester_ride_id: string }) =>
          r.ride_id === id ? r.requester_ride_id : r.ride_id,
      ),
    );
    filtered = results.filter(
      (m: MatchCandidate) => !matchedRideIds.has(m.request_target_ride_id),
    );
  } else {
    filtered = results;
  }

  return {
    rideId: id,
    rideSummary,
    requests: myRequests,
    matchItems: filtered,
  };
}

function timeTierRank(tier: MatchCandidate["time_tier"]) {
  switch (tier) {
    case "STRONG":
      return 0;
    case "OKAY":
      return 1;
    case "WEAK":
      return 2;
    case "BORDERLINE":
      return 3;
    case "LAST_RESORT":
    default:
      return 4;
  }
}

function distanceBucket(match: MatchCandidate) {
  const origin = match.d_origin_tier === "CLOSE" ? 0 : match.d_origin_tier === "NEAR" ? 1 : 2;
  const destination =
    match.d_destination_tier === "SAME_AREA"
      ? 0
      : match.d_destination_tier === "VERY_CLOSE"
        ? 1
        : 2;
  return {
    maxBucket: Math.max(origin, destination),
    totalBucket: origin + destination,
  };
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

function compactRoute(origin: string, dest: string) {
  return `${origin} → ${dest}`;
}

interface RequestRideSnapshot {
  id: string;
  origin_name: string;
  dest_name: string;
  departure_earliest: string;
  departure_latest: string;
  departure_preferred: string | null;
  seats_needed: number;
  space_capacity: number;
  quiet_ride: boolean;
  music_ok: boolean;
  gender_pref: string;
  notes: string | null;
}

function RequestCard({
  request,
  variant,
  busy,
  onPrimary,
  onSecondary,
  onOpenDetails,
}: {
  request: RideRequest;
  variant: "incoming" | "outgoing";
  busy: boolean;
  onPrimary: () => void;
  onSecondary?: () => void;
  onOpenDetails: () => void;
}) {
  const isIncoming = variant === "incoming";

  return (
    <Card
      className={`cursor-pointer border bg-white shadow-sm transition-shadow hover:shadow-md ${
        isIncoming ? "border-blue-200" : "border-amber-200/80"
      }`}
      onClick={onOpenDetails}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-2.5">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={request.requester_photo || undefined} />
            <AvatarFallback
              className={`text-sm font-medium ${
                isIncoming
                  ? "bg-blue-50 text-blue-600"
                  : "bg-amber-50 text-amber-600"
              }`}
            >
              {request.requester_name[0]}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-[15px] font-semibold leading-none text-zinc-900">
                {request.requester_name}
              </p>
              {request.requester_school && (
                <span className="text-[11px] text-zinc-500">
                  {request.requester_school}
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-sm leading-tight text-zinc-700">
              {request.requester_origin} → {request.requester_dest}
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-zinc-500">
              <span>
                {request.requester_departure
                  ? formatTime(request.requester_departure)
                  : "—"}
              </span>
              <span>Party of {request.requester_seats}</span>
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {isIncoming ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-full px-3 text-xs border-zinc-300 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  onClick={onSecondary}
                  disabled={busy}
                >
                  <XCircle className="mr-1 h-3 w-3" />
                  Decline
                </Button>
                <Button
                  size="sm"
                  className="h-8 rounded-full px-3 bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700"
                  onClick={onPrimary}
                  disabled={busy}
                >
                  {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <>
                    <Check className="mr-1 h-3 w-3" />
                    Accept
                  </>}
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-full px-3 text-xs border-zinc-300 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                onClick={onPrimary}
                disabled={busy}
              >
                {busy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                Withdraw
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MatchCard({
  match,
  myRideId,
  onRequested,
  onShowInfo,
}: {
  match: MatchCandidate;
  myRideId: string;
  onRequested: () => void;
  onShowInfo: () => void;
}) {
  const [requesting, setRequesting] = useState(false);
  const router = useRouter();

  const handleRequest = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setRequesting(true);
    try {
      await sendMatchRequest(myRideId, match.request_target_ride_id);
      toast.success(`Request sent to ${match.first_name}`);
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
                {match.d_origin_miles != null && (
                  <span className="shrink-0 text-xs text-zinc-400">
                    {match.d_origin_miles.toFixed(1)} mi
                  </span>
                )}
              </div>
              <Badge className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${matchBadgeClasses(match.match_label)}`}>
                {match.match_label}
              </Badge>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
              {match.school && <span>{match.school}</span>}
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-zinc-100 bg-zinc-50 p-3.5">
          <p className="truncate text-base font-semibold text-zinc-950">
            {compactRoute(match.origin_name, match.dest_name)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-600">
            <span>{formatTime(match.departure_preferred ?? match.departure_earliest)}</span>
            <span>Party of {match.seats_needed}</span>
            <span>{match.d_origin_miles?.toFixed(1) ?? "?"} mi away</span>
          </div>
          <TripCardMeta
            spaceCapacity={match.space_capacity}
            needsXl={match.needs_xl}
            savingsDollars={estimateSavingsDollars(match)}
          />
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
  item: MatchCandidate;
  myRideId: string;
  onRequested: () => void;
  onShowInfo: () => void;
}) {
  const [requesting, setRequesting] = useState(false);
  const router = useRouter();
  const primaryMatch = item;
  const groupSize = item.group_size_before_join;
  const groupHostRideId = item.request_target_ride_id;

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
                {primaryMatch.d_origin_miles != null && (
                  <span className="shrink-0 text-xs text-zinc-400">
                    {primaryMatch.d_origin_miles.toFixed(1)} mi
                  </span>
                )}
              </div>
              <Badge className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${matchBadgeClasses(primaryMatch.match_label)}`}>
                {primaryMatch.match_label}
              </Badge>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs">
              <Badge variant="secondary" className="rounded-full bg-amber-100 px-2 py-0 text-[10px] font-semibold text-amber-800">
                Group of {groupSize}
              </Badge>
              {primaryMatch.school && <span className="text-zinc-500">{primaryMatch.school}</span>}
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-zinc-100 bg-zinc-50 p-3.5">
          <p className="truncate text-base font-semibold text-zinc-950">
            {compactRoute(primaryMatch.origin_name, primaryMatch.dest_name)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-600">
            <span>{formatTime(primaryMatch.departure_preferred ?? primaryMatch.departure_earliest)}</span>
            <span>{groupSize} riders</span>
            <span>{primaryMatch.d_origin_miles?.toFixed(1) ?? "?"} mi away</span>
          </div>
          <TripCardMeta
            spaceCapacity={primaryMatch.space_capacity}
            needsXl={primaryMatch.needs_xl}
            savingsDollars={estimateSavingsDollars(primaryMatch)}
          />
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
  const queryClient = useQueryClient();
  const { profile, loading: authLoading } = useAuth();
  const rideParam = searchParams.get("ride");

  const {
    data,
    error: queryError,
    isPending: matchesPending,
    refetch,
  } = useQuery({
    queryKey: ["matches", profile?.id ?? "", rideParam ?? ""],
    queryFn: () => fetchMatchesPageData(profile!.id, rideParam),
    enabled: !authLoading && !!profile,
    staleTime: 45_000,
  });
  const [sortKey, setSortKey] = useState<SortKey>("best");
  const [detailItem, setDetailItem] = useState<MatchCandidate | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [rideRequestDetail, setRideRequestDetail] = useState<RideRequest | null>(null);
  const [rideRequestTrips, setRideRequestTrips] = useState<{
    myRide: RequestRideSnapshot | null;
    otherRide: RequestRideSnapshot | null;
  }>({ myRide: null, otherRide: null });
  const [rideRequestTripsLoading, setRideRequestTripsLoading] = useState(false);
  const [rideRequestTripsError, setRideRequestTripsError] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

  useEffect(() => {
    const loadRequestTrips = async () => {
      if (!rideRequestDetail) {
        setRideRequestTrips({ myRide: null, otherRide: null });
        setRideRequestTripsLoading(false);
        setRideRequestTripsError(false);
        return;
      }

      setRideRequestTripsLoading(true);
      setRideRequestTripsError(false);

      const myRideId =
        rideRequestDetail.direction === "incoming"
          ? rideRequestDetail.ride_id
          : rideRequestDetail.requester_ride_id;
      const otherRideId =
        rideRequestDetail.direction === "incoming"
          ? rideRequestDetail.requester_ride_id
          : rideRequestDetail.ride_id;

      const supabase = getSupabaseClientOrThrow();
      const { data } = await supabase
        .from("rides")
        .select(
          "id, origin_name, dest_name, departure_earliest, departure_latest, departure_preferred, seats_needed, space_capacity, quiet_ride, music_ok, gender_pref, notes"
        )
        .in("id", [myRideId, otherRideId]);

      const rides = (data ?? []) as RequestRideSnapshot[];
      setRideRequestTrips({
        myRide: rides.find((ride) => ride.id === myRideId) ?? null,
        otherRide: rides.find((ride) => ride.id === otherRideId) ?? null,
      });
      setRideRequestTripsLoading(false);
    };

    loadRequestTrips().catch((err) => {
      console.error("Failed to load request trip detail", err);
      setRideRequestTrips({ myRide: null, otherRide: null });
      setRideRequestTripsLoading(false);
      setRideRequestTripsError(true);
    });
  }, [rideRequestDetail]);

  const matchItems = useMemo(() => data?.matchItems ?? [], [data]);
  const requests = useMemo(() => data?.requests ?? [], [data]);
  const rideId = data?.rideId ?? null;
  const rideSummary = data?.rideSummary ?? null;
  const error =
    queryError instanceof Error && queryError.message === "NO_RIDES"
      ? "no_rides"
      : queryError
        ? "load_failed"
        : null;

  const reloadMatches = useCallback(() => {
    void refetch();
  }, [refetch]);

  // All incoming ride requests (any of my rides) — show in matches section so they're visible beyond home
  const allIncomingRequests = useMemo(
    () =>
      requests.filter(
        (r) =>
          r.direction === "incoming" &&
          r.status === "pending" &&
          r.ride_status !== "completed",
      ),
    [requests],
  );

  // Outgoing requests that are still pending
  const allOutgoingRequests = useMemo(
    () =>
      requests.filter(
        (r) =>
          r.direction === "outgoing" &&
          r.status === "pending" &&
          r.ride_status !== "completed",
      ),
    [requests],
  );

  const handleRespond = async (
    requestId: string,
    response: "accepted" | "rejected",
  ) => {
    setRespondingId(requestId);
    try {
      await respondToRequest(requestId, response);
      if (response === "accepted") {
        toast.success("Request accepted! Starting chat...");
        // Fire email notification (best-effort)
        fetch("/api/notify/match-accepted", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId }),
        }).catch(() => { });
        router.push("/messages?refresh=1");
      } else {
        toast.success("Request declined");
      }
      if (profile) {
        await queryClient.invalidateQueries({ queryKey: ["matches", profile.id] });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to respond";
      console.error("Respond error:", message, err);
      const friendlyMessage =
        typeof message === "string" && message.includes("ride_match_cap_exceeded")
          ? "Reached max ride limit. Group can have at most 4 people."
          : message || "Failed to respond to request";
      toast.error(friendlyMessage);
    } finally {
      setRespondingId(null);
    }
  };

  const handleWithdraw = async (requestId: string) => {
    setWithdrawingId(requestId);
    try {
      await withdrawRequest(requestId);
      toast.success("Request withdrawn");
      if (profile) {
        await queryClient.invalidateQueries({ queryKey: ["matches", profile.id] });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to withdraw";
      console.error("Withdraw error:", message, err);
      toast.error(message || "Failed to withdraw request");
    } finally {
      setWithdrawingId(null);
    }
  };

  const sortedMatchItems = useMemo(() => {
    if (matchItems.length === 0) return [];
    const list = [...matchItems];
    const closestScore = (m: MatchCandidate) => {
      const a = m.d_origin_miles ?? 9999;
      const b = m.d_destination_miles ?? 9999;
      return a + b;
    };
    list.sort((a, b) => {
      const ma = a;
      const mb = b;
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
          return (
            timeTierRank(ma.time_tier) - timeTierRank(mb.time_tier)
            || distanceBucket(ma).maxBucket - distanceBucket(mb).maxBucket
            || distanceBucket(ma).totalBucket - distanceBucket(mb).totalBucket
            || Number(mb.gender_compatible) - Number(ma.gender_compatible)
            || mb.pref_overall - ma.pref_overall
            || closestScore(ma) - closestScore(mb)
          );
      }
    });
    return list;
  }, [matchItems, sortKey]);

  if (authLoading || (profile && matchesPending)) {
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
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  if (matchItems.length === 0 && allIncomingRequests.length === 0 && allOutgoingRequests.length === 0) {
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
          onClick={() => refetch()}
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

      {/* Incoming Requests */}
      {allIncomingRequests.length > 0 && (
        <section className="rounded-lg border border-blue-100 bg-blue-50/60 p-3">
          <div className="mb-2 flex items-center gap-2">
            <h2 className="text-sm font-semibold text-zinc-900">
              Incoming Requests
            </h2>
            <Badge className="border-0 bg-blue-600/90 text-xs font-medium text-white">
              {allIncomingRequests.length} pending
            </Badge>
          </div>
          <div className="space-y-1.5">
            {allIncomingRequests.map((inv) => (
              <RequestCard
                key={inv.id}
                request={inv}
                variant="incoming"
                busy={respondingId === inv.id}
                onPrimary={() => handleRespond(inv.id, "accepted")}
                onSecondary={() => handleRespond(inv.id, "rejected")}
                onOpenDetails={() => setRideRequestDetail(inv)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Pending Requests */}
      {allOutgoingRequests.length > 0 && (
        <section className="rounded-lg border border-amber-100 bg-amber-50/60 p-3">
          <div className="mb-2 flex items-center gap-2">
            <h2 className="text-sm font-semibold text-zinc-900">
              Pending Requests
            </h2>
            <Badge className="border-0 bg-amber-600/90 text-xs font-medium text-white">
              {allOutgoingRequests.length} sent
            </Badge>
          </div>
          <div className="space-y-1.5">
            {allOutgoingRequests.map((req) => (
              <RequestCard
                key={req.id}
                request={req}
                variant="outgoing"
                busy={withdrawingId === req.id}
                onPrimary={() => handleWithdraw(req.id)}
                onOpenDetails={() => setRideRequestDetail(req)}
              />
            ))}
          </div>
        </section>
      )}

      {matchItems.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-zinc-500">No suggested matches for this ride yet — check back soon.</p>
          <Button variant="outline" size="sm" onClick={reloadMatches} className="mt-3">
            Refresh
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedMatchItems.map((item) =>
            item.candidate_type === "solo" ? (
              <MatchCard
                key={item.candidate_id}
                match={item}
                myRideId={rideId!}
                onRequested={reloadMatches}
                onShowInfo={() => {
                  setDetailItem(item);
                  setDetailOpen(true);
                }}
              />
            ) : (
              <GroupMatchCard
                key={item.candidate_id}
                item={item}
                myRideId={rideId!}
                onRequested={reloadMatches}
                onShowInfo={() => {
                  setDetailItem(item);
                  setDetailOpen(true);
                }}
              />
            ),
          )}
        </div>
      )}

      <MatchDetailDialog
        item={detailItem}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setDetailItem(null);
        }}
        myRideId={rideId}
        onRequested={reloadMatches}
      />

      <Dialog open={!!rideRequestDetail} onOpenChange={(open) => !open && setRideRequestDetail(null)}>
        <DialogContent showCloseButton={true} className="max-w-md">
          {rideRequestDetail && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {rideRequestDetail.direction === "outgoing"
                    ? "Request sent"
                    : "Incoming request"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <DetailProfileCard
                  photoUrl={rideRequestDetail.requester_photo}
                  fallback={rideRequestDetail.requester_name[0]}
                  name={rideRequestDetail.requester_name}
                  school={rideRequestDetail.requester_school}
                  secondaryLine={`${rideRequestDetail.requester_rating.toFixed(1)} rating`}
                />
                {rideRequestTripsLoading && (
                  <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500">
                    Loading full trip details...
                  </div>
                )}
                {!rideRequestTripsLoading && rideRequestTrips.otherRide && (
                  <DetailTripCard
                    origin={rideRequestTrips.otherRide.origin_name}
                    destination={rideRequestTrips.otherRide.dest_name}
                    departureEarliest={rideRequestTrips.otherRide.departure_earliest}
                    departureLatest={rideRequestTrips.otherRide.departure_latest}
                    seatsNeeded={rideRequestTrips.otherRide.seats_needed}
                    spaceCapacity={rideRequestTrips.otherRide.space_capacity}
                    quietRide={rideRequestTrips.otherRide.quiet_ride}
                    musicOk={rideRequestTrips.otherRide.music_ok}
                    genderPref={rideRequestTrips.otherRide.gender_pref}
                  />
                )}
                {!rideRequestTripsLoading &&
                  !rideRequestTrips.otherRide &&
                  rideRequestTripsError && (
                    <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500">
                      Full trip details could not be loaded right now.
                    </div>
                  )}
              </div>
              <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setRideRequestDetail(null);
                    router.push(`/profile/${rideRequestDetail.requester_profile_id}`);
                  }}
                >
                  View full profile
                </Button>
                {rideRequestDetail.direction === "incoming" ? (
                  <>
                    <Button
                      variant="outline"
                      className="border-zinc-200 text-zinc-600"
                      onClick={() => {
                        handleRespond(rideRequestDetail.id, "rejected");
                        setRideRequestDetail(null);
                      }}
                      disabled={respondingId === rideRequestDetail.id}
                    >
                      <XCircle className="mr-1 h-3 w-3" />
                      Decline
                    </Button>
                    <Button
                      className="bg-blue-600 text-white hover:bg-blue-700"
                      onClick={() => {
                        handleRespond(rideRequestDetail.id, "accepted");
                        setRideRequestDetail(null);
                      }}
                      disabled={respondingId === rideRequestDetail.id}
                    >
                      {respondingId === rideRequestDetail.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <Check className="mr-1 h-3 w-3" />
                          Accept
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    className="border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                    onClick={() => {
                      handleWithdraw(rideRequestDetail.id);
                      setRideRequestDetail(null);
                    }}
                    disabled={withdrawingId === rideRequestDetail.id}
                  >
                    {withdrawingId === rideRequestDetail.id ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <XCircle className="mr-1 h-3 w-3" />
                    )}
                    Withdraw request
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

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
