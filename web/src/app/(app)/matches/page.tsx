"use client";

import { useMemo, useState, useEffect, useCallback, Suspense } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
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
  getMyRequests,
  respondToRequest,
  withdrawRequest,
  type RideRequest,
} from "@/lib/services/matchService";
import { getMyRides } from "@/lib/services/rideService";
import { getSupabaseClientOrThrow } from "@/lib/supabase/client";
import type { MatchCandidate } from "@/types";
import { compareBestMatches } from "@/lib/matching/ranking";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { MatchCandidateCard, RideRequestCard } from "@/components/match-cards";

async function fetchMatchesPageData(profileId: string, rideParam: string | null) {
  const supabase = getSupabaseClientOrThrow();

  const [ridesResult, requestsResult] = await Promise.allSettled([
    getMyRides(profileId),
    getMyRequests(profileId),
  ]);

  if (ridesResult.status === "rejected") {
    console.error("[matches] Failed loading rides:", ridesResult.reason);
    throw ridesResult.reason;
  }
  const myRides = ridesResult.value;
  let myRequests: Awaited<ReturnType<typeof getMyRequests>> = [];
  if (requestsResult.status === "rejected") {
    console.error(
      "[matches] getMyRequests failed (showing matches without request list):",
      requestsResult.reason,
    );
  } else {
    myRequests = requestsResult.value;
  }

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

  let results: MatchCandidate[];
  try {
    results = await findMatches(id);
  } catch (err) {
    console.error("[matches] findMatches failed for ride", id, err);
    throw err;
  }

  const { data: existingRequests, error: existingError } = await supabase
    .from("ride_requests")
    .select("ride_id, requester_ride_id, status")
    .or(`ride_id.eq.${id},requester_ride_id.eq.${id}`)
    .in("status", ["accepted", "pending"]);

  if (existingError) {
    console.error("[matches] ride_requests query failed:", existingError);
    throw existingError;
  }

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

type SortKey = "best" | "earliest" | "closest";

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
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all",
        active
          ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
          : "border border-zinc-200 bg-white text-zinc-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700",
      ].join(" ")}
    >
      {children}
    </button>
  );
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
  const [hiddenCandidateIds, setHiddenCandidateIds] = useState<Set<string>>(new Set());
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

  const matchItems = useMemo(
    () => (data?.matchItems ?? []).filter((m) => !hiddenCandidateIds.has(m.candidate_id)),
    [data, hiddenCandidateIds],
  );
  const requests = useMemo(() => data?.requests ?? [], [data]);
  const rideId = data?.rideId ?? null;
  const rideSummary = data?.rideSummary ?? null;
  const error =
    queryError instanceof Error && queryError.message === "NO_RIDES"
      ? "no_rides"
      : queryError
        ? "load_failed"
        : null;

  const reloadMatches = useCallback((hideCandidateId?: string) => {
    if (hideCandidateId) {
      setHiddenCandidateIds((prev) => new Set(prev).add(hideCandidateId));
    }
    refetch().then(() => setHiddenCandidateIds(new Set()));
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

  const hideRequestedRide = useCallback((requestId: string) => {
    const req = requests.find((r) => r.id === requestId);
    if (!req) return;
    const otherRideId = req.direction === "incoming" ? req.requester_ride_id : req.ride_id;
    const candidate = matchItems.find((m) => m.request_target_ride_id === otherRideId);
    if (candidate) {
      setHiddenCandidateIds((prev) => new Set(prev).add(candidate.candidate_id));
    }
  }, [requests, matchItems]);

  const handleRespond = async (
    requestId: string,
    response: "accepted" | "rejected",
  ) => {
    setRespondingId(requestId);
    try {
      await respondToRequest(requestId, response);
      hideRequestedRide(requestId);
      if (response === "accepted") {
        toast.success("Request accepted! Starting chat...");
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
          ? "Reached max ride limit. Group can have at most 6 people."
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
      hideRequestedRide(requestId);
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
        case "best":
        default:
          return compareBestMatches(ma, mb);
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
    const errMsg =
      queryError instanceof Error
        ? queryError.message
        : typeof queryError === "object" && queryError !== null && "message" in queryError
          ? String((queryError as { message: unknown }).message)
          : String(queryError);
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-sm text-zinc-500">
          Something went wrong loading matches.
        </p>
        {process.env.NODE_ENV === "development" && (
          <p className="mx-auto mb-4 max-w-md break-words font-mono text-xs text-red-400">
            {errMsg}
          </p>
        )}
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
      <div className="flex flex-col gap-3 rounded-[1.75rem] border border-blue-100/80 bg-gradient-to-br from-blue-50 via-white to-sky-50/70 p-5 sm:p-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">Your ride network</p>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
            Suggested Matches
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
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
        </div>
      </div>

      {/* Incoming Requests */}
      {allIncomingRequests.length > 0 && (
        <section className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 sm:p-4">
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
              <RideRequestCard
                key={inv.id}
                request={inv}
                variant="incoming"
                busy={respondingId === inv.id}
                onPrimary={() => handleRespond(inv.id, "accepted")}
                onSecondary={() => handleRespond(inv.id, "rejected")}
                onOpenDetails={() => setRideRequestDetail(inv)}
                onOpenProfile={() => router.push(`/profile/${inv.requester_profile_id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Pending Requests */}
      {allOutgoingRequests.length > 0 && (
        <section className="rounded-2xl border border-amber-100 bg-amber-50/60 p-3 sm:p-4">
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
              <RideRequestCard
                key={req.id}
                request={req}
                variant="outgoing"
                busy={withdrawingId === req.id}
                onPrimary={() => handleWithdraw(req.id)}
                onOpenDetails={() => setRideRequestDetail(req)}
                onOpenProfile={() => router.push(`/profile/${req.requester_profile_id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {matchItems.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-zinc-500">No suggested matches for this ride yet — check back soon.</p>
          <Button variant="outline" size="sm" onClick={() => reloadMatches()} className="mt-3">
            Refresh
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedMatchItems.map((item) => (
            <MatchCandidateCard
              key={item.candidate_id}
              match={item}
              myRideId={rideId!}
              onRequested={reloadMatches}
              onShowInfo={() => {
                setDetailItem(item);
                setDetailOpen(true);
              }}
            />
          ))}
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
