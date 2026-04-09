"use client";

import { useEffect, useState, useCallback, useLayoutEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { getMyRides, cancelRide } from "@/lib/services/rideService";
import { getMyRequests, respondToRequest, withdrawRequest } from "@/lib/services/matchService";
import { findMatches, sendMatchRequest } from "@/lib/services/matchService";
import type { RideRequest } from "@/lib/services/matchService";
import { getSupabaseClientOrThrow } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DetailProfileCard,
  DetailTripCard,
  MatchDetailDialog,
} from "@/components/match-detail-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Clock,
  Navigation,
  Loader2,
  CalendarDays,
  Check,
  XCircle,
  TrendingUp,
  Car,
  Leaf,
  MoreVertical,
  Trash2,
  Pencil,
  ArrowRight,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import type { MatchCandidate } from "@/types";
import {
  getHomeCache,
  setHomeCache,
  HOME_CACHE_TTL_MS,
  type HomeCache,
} from "@/lib/homeCache";
import { estimateSavingsDollars as estimateSavings } from "@/lib/estimateSavings";
import { TripCardMeta } from "@/components/match-trip-meta";

function toErrorDetails(err: unknown): string {
  if (!err) return "";
  if (err instanceof Error) return err.message || String(err);
  if (typeof err === "object" && err !== null) {
    const o = err as Record<string, unknown>;
    const message = typeof o.message === "string" ? o.message : "";
    const code = typeof o.code === "string" ? o.code : "";
    const details = typeof o.details === "string" ? o.details : "";
    const hint = typeof o.hint === "string" ? o.hint : "";
    if (message || code || details || hint) {
      return [code && `[${code}]`, message, details, hint].filter(Boolean).join(" ");
    }
    try {
      const s = JSON.stringify(err);
      if (s !== "{}") return s;
    } catch {
      /* fall through */
    }
    return "Unknown error";
  }
  return String(err);
}

function formatMatchTime(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function compactRoute(origin: string, dest: string) {
  return `${origin} → ${dest}`;
}

function RequestCard({
  request,
  variant,
  busy,
  onPrimary,
  onSecondary,
  onOpenProfile,
  onOpenDetails,
}: {
  request: RideRequest;
  variant: "incoming" | "outgoing";
  busy: boolean;
  onPrimary: () => void;
  onSecondary?: () => void;
  onOpenProfile: () => void;
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
          <Avatar
            className="h-8 w-8 shrink-0 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onOpenProfile();
            }}
          >
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
              <span className="truncate text-[15px] font-semibold leading-none text-zinc-900">
                {request.requester_name}
              </span>
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
                  ? formatMatchTime(request.requester_departure)
                  : "—"}
              </span>
              <span>Party of {request.requester_seats}</span>
            </div>
          </div>

          <div
            className="flex flex-shrink-0 items-center gap-2 sm:gap-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            {isIncoming ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 min-h-[36px] flex-1 rounded-lg px-3 border-zinc-200 text-xs text-zinc-600 hover:bg-zinc-50 touch-manipulation sm:h-8 sm:min-h-0 sm:flex-initial"
                  onClick={onSecondary}
                  disabled={busy}
                >
                  <XCircle className="mr-1 h-3 w-3" />
                  Decline
                </Button>
                <Button
                  size="sm"
                  className="h-8 min-h-[36px] flex-1 rounded-lg px-3 bg-blue-600 text-xs font-medium text-white hover:bg-blue-700 touch-manipulation sm:h-8 sm:min-h-0 sm:flex-initial"
                  onClick={onPrimary}
                  disabled={busy}
                >
                  {busy ? (
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
                size="sm"
                variant="outline"
                className="h-8 min-h-[36px] rounded-lg px-3 border-zinc-200 text-xs text-zinc-600 hover:bg-zinc-50 touch-manipulation sm:h-8 sm:min-h-0"
                onClick={onPrimary}
                disabled={busy}
              >
                {busy ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <XCircle className="mr-1 h-3 w-3" />
                    Withdraw
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function estimateSavingsDollars(match: MatchCandidate) {
  return estimateSavings(match.origin_name, match.dest_name);
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

interface Ride {
  id: string;
  ride_type: string;
  origin_name: string;
  dest_name: string;
  departure_earliest: string;
  departure_latest: string;
  seats_needed: number;
  status: string;
  created_at: string;
  quiet_ride: boolean;
  music_ok: boolean;
  gender_pref: string;
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

function SuggestedMatchCard({
  match,
  groupSize,
  requesting,
  onConnect,
  onViewProfile,
  onShowInfo,
}: {
  match: MatchCandidate;
  groupSize?: number;
  requesting: boolean;
  onConnect: () => void;
  onViewProfile: () => void;
  onShowInfo: () => void;
}) {
  const isGroup = groupSize != null && groupSize >= 2;

  return (
    <Card
      className="cursor-pointer overflow-hidden border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md"
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
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs">
              {isGroup && (
                <Badge variant="secondary" className="rounded-full bg-amber-100 px-2 py-0 text-[10px] font-semibold text-amber-800">
                  Group of {groupSize}
                </Badge>
              )}
              {match.school && <span className="text-zinc-500">{match.school}</span>}
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-zinc-100 bg-zinc-50 p-3.5">
          <p className="truncate text-base font-semibold text-zinc-950">
            {compactRoute(match.origin_name, match.dest_name)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-600">
            <span>{formatMatchTime(match.departure_preferred ?? match.departure_earliest)}</span>
            <span>{isGroup ? `${groupSize} riders` : `Party of ${match.seats_needed}`}</span>
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
            onClick={onViewProfile}
          >
            View Profile
          </Button>
          <Button
            className="h-9 rounded-full bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700"
            onClick={onConnect}
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

export default function HomePage() {
  const { profile, loading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const homeCache = getHomeCache();
  const cacheIsValid =
    !!profile &&
    !!homeCache &&
    homeCache.profileId === profile.id &&
    Date.now() - homeCache.fetchedAt < HOME_CACHE_TTL_MS;

  const [rides, setRides] = useState<Ride[]>(
    cacheIsValid ? (homeCache!.rides as Ride[]) : [],
  );
  const [requests, setRequests] = useState<RideRequest[]>(
    cacheIsValid ? (homeCache!.requests as RideRequest[]) : [],
  );
  const [suggestedMatches, setSuggestedMatches] = useState<MatchCandidate[]>(
    cacheIsValid ? (homeCache!.suggestedMatches as MatchCandidate[]) : [],
  );
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [requestingMatchRideId, setRequestingMatchRideId] = useState<string | null>(
    null,
  );
  const [loadingRides, setLoadingRides] = useState(!cacheIsValid);
  const [loadingRequests, setLoadingRequests] = useState(!cacheIsValid);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [withdrawingRequestId, setWithdrawingRequestId] = useState<string | null>(null);
  const [removeConfirmRideId, setRemoveConfirmRideId] = useState<string | null>(null);
  const [rideRequestDetail, setRideRequestDetail] = useState<RideRequest | null>(null);
  const [detailItem, setDetailItem] = useState<MatchCandidate | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [rideRequestTrips, setRideRequestTrips] = useState<{
    myRide: RequestRideSnapshot | null;
    otherRide: RequestRideSnapshot | null;
  }>({ myRide: null, otherRide: null });
  const [rideRequestTripsLoading, setRideRequestTripsLoading] = useState(false);
  const [rideRequestTripsError, setRideRequestTripsError] = useState(false);

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
      console.error("[HomePage] Failed to load request trip detail", err);
      setRideRequestTrips({ myRide: null, otherRide: null });
      setRideRequestTripsLoading(false);
      setRideRequestTripsError(true);
    });
  }, [rideRequestDetail]);

  // Note: isNewUser redirect is handled by the (app) layout guard

  useLayoutEffect(() => {
    if (pathname !== "/home") return;
    if (!cacheIsValid) {
      setLoadingRides(true);
      setLoadingRequests(true);
    }
  }, [pathname, cacheIsValid]);

  useEffect(() => {
    const cache = getHomeCache();
    if (!cacheIsValid || !cache) return;
    setRides(cache.rides as Ride[]);
    setRequests(cache.requests as RideRequest[]);
    setSuggestedMatches(cache.suggestedMatches as MatchCandidate[]);
    setLoadingRides(false);
    setLoadingRequests(false);
  }, [cacheIsValid]);

  const persistCache = useCallback(
    (next: Partial<Pick<HomeCache, "rides" | "requests" | "suggestedMatches">>) => {
      if (!profile) return;
      const current = getHomeCache();
      const base =
        current && current.profileId === profile.id
          ? current
          : { profileId: profile.id, fetchedAt: 0, rides: [] as Ride[], requests: [] as RideRequest[], suggestedMatches: [] as MatchCandidate[] };
      setHomeCache({
        profileId: profile.id,
        fetchedAt: Date.now(),
        rides: next.rides ?? base.rides,
        requests: next.requests ?? base.requests,
        suggestedMatches: next.suggestedMatches ?? base.suggestedMatches,
      });
    },
    [profile],
  );

  // Fetch active rides
  const fetchRides = useCallback(async (silent = false) => {
    if (!user || !profile) return;
    if (!silent) setLoadingRides(true);
    try {
      const data = await getMyRides(profile.id);
      const nextRides = data as Ride[];
      setRides(nextRides);
      persistCache({ rides: nextRides });
    } catch (err) {
      // Keep home usable even if rides fetch fails transiently.
      setRides([]);
      persistCache({ rides: [] });
      const details = toErrorDetails(err);
      if (process.env.NODE_ENV === "development" && details && details !== "{}") {
        console.warn("[HomePage] Rides unavailable:", details);
      }
    } finally {
      if (!silent) setLoadingRides(false);
    }
  }, [user, profile, persistCache]);

  const fetchRequests = useCallback(async (silent = false) => {
    if (!user || !profile) return;
    if (!silent) setLoadingRequests(true);
    try {
      const data = await getMyRequests(profile.id);
      setRequests(data);
      persistCache({ requests: data });
    } catch (err) {
      // Requests are non-blocking for initial render; fail softly.
      setRequests([]);
      persistCache({ requests: [] });
      const details = toErrorDetails(err);
      if (process.env.NODE_ENV === "development" && details && details !== "{}") {
        console.warn("[HomePage] Requests unavailable:", details);
      }
    } finally {
      if (!silent) setLoadingRequests(false);
    }
  }, [user, profile, persistCache]);

  useEffect(() => {
    if (!loading && user) {
      fetchRides(cacheIsValid);
      fetchRequests(cacheIsValid);
    }
  }, [loading, user, fetchRides, fetchRequests, cacheIsValid]);

  // Use same ride as matches page default (first ride) so home and /matches show same pool
  const suggestedMatchRideId = useMemo(() => rides[0]?.id ?? null, [rides]);

  const fetchSuggestedMatches = useCallback(async () => {
    if (!user || !profile || !suggestedMatchRideId) {
      setSuggestedMatches([]);
      persistCache({ suggestedMatches: [] });
      return;
    }
    setLoadingMatches(true);
    try {
      // Same options as matches page: default maxResults (10), minScore (30)
      const results = await findMatches(suggestedMatchRideId);
      const supabase = getSupabaseClientOrThrow();
      const { data: existingRequests } = await supabase
        .from("ride_requests")
        .select("ride_id, requester_ride_id, status")
        .or(`ride_id.eq.${suggestedMatchRideId},requester_ride_id.eq.${suggestedMatchRideId}`)
        .in("status", ["accepted", "pending"]);

      let filtered = results;
      if (existingRequests && existingRequests.length > 0) {
        const matchedRideIds = new Set(
          existingRequests.map(
            (r: { ride_id: string; requester_ride_id: string }) =>
              r.ride_id === suggestedMatchRideId ? r.requester_ride_id : r.ride_id,
          ),
        );
        filtered = results.filter((m) => !matchedRideIds.has(m.request_target_ride_id));
      }
      const nextMatches = filtered.slice(0, 3);
      setSuggestedMatches(nextMatches);
      persistCache({ suggestedMatches: nextMatches });
    } catch (err) {
      setSuggestedMatches([]);
      persistCache({ suggestedMatches: [] });
      const details = toErrorDetails(err);
      if (process.env.NODE_ENV === "development" && details) {
        console.warn("[HomePage] Suggested matches unavailable:", details);
      }
    } finally {
      setLoadingMatches(false);
    }
  }, [user, profile, suggestedMatchRideId, persistCache]);

  useEffect(() => {
    if (!loadingRides) {
      fetchSuggestedMatches();
    }
  }, [loadingRides, fetchSuggestedMatches]);

  const handleRespond = async (
    requestId: string,
    response: "accepted" | "rejected",
  ) => {
    setRespondingId(requestId);
    try {
      await respondToRequest(requestId, response);
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
      fetchRequests();
      fetchSuggestedMatches();
    } catch (err) {
      const message = toErrorDetails(err);
      console.error("[HomePage] Respond error:", message, err);
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
    setWithdrawingRequestId(requestId);
    try {
      await withdrawRequest(requestId);
      toast.success("Request removed");
      setRideRequestDetail((prev) => (prev?.id === requestId ? null : prev));
      fetchRequests();
      fetchSuggestedMatches();
    } catch (err) {
      const message = toErrorDetails(err);
      console.error("[HomePage] Withdraw error:", message, err);
      toast.error(message || "Failed to remove request");
    } finally {
      setWithdrawingRequestId(null);
    }
  };

  // Rides that are involved in an accepted/confirmed/completed request
  // should not appear in "Your requested rides" — they're already matched
  const matchedRideIds = new Set(
    requests
      .filter(
        (r) =>
          r.status === "accepted" ||
          r.ride_status === "confirmed" ||
          r.ride_status === "completed",
      )
      .flatMap((r) => [r.ride_id, r.requester_ride_id]),
  );
  const activeRides = rides.filter((r) => !matchedRideIds.has(r.id));
  const firstActiveRideId = activeRides[0]?.id ?? null;

  const activeRideCount = activeRides.length;
  // Only count completed rides for stats (Total Saved, Rides Shared, CO2 Reduced)
  const ridesShared = requests.filter(
    (r) => r.ride_status === "completed",
  ).length;

  // Rough estimates for stats (no per-ride distance data yet)
  const ESTIMATE = {
    // Avg trip length (miles) for carpool — typical airport/commute range
    avgMilesPerTrip: 35,
    // USD per mile not driven (gas + wear/tear, ~IRS rate); saving = not driving your car
    costPerMileSaved: 0.22,
    // kg CO2 per mile for average passenger vehicle (EPA ~404 g/mi)
    co2KgPerMile: 0.404,
  };
  const totalSaved =
    ridesShared * ESTIMATE.avgMilesPerTrip * ESTIMATE.costPerMileSaved;
  const co2ReducedKg =
    ridesShared * ESTIMATE.avgMilesPerTrip * ESTIMATE.co2KgPerMile;
  // PPM = parts per million by volume. 1 kg CO2 ≈ 509 L at STP; in 1000 m³ air (1e6 L), that's 509 ppm per kg.
  const co2ReducedPpm = co2ReducedKg * 509;

  const formatTimeWindow = (earliest: string, latest: string) => {
    const e = new Date(earliest);
    const l = new Date(latest);
    const mid = new Date((e.getTime() + l.getTime()) / 2);
    const dateStr = format(mid, "EEE, MMM d");
    const timeStr = format(mid, "h:mm a");
    const diffMin = Math.round((l.getTime() - e.getTime()) / (2 * 60 * 1000));
    return { dateStr, timeStr, tolerance: `±${diffMin} min` };
  };

  const handleConnect = async (targetRideId: string) => {
    if (!firstActiveRideId) {
      toast.error("Post a ride first to connect with matches");
      return;
    }
    setRequestingMatchRideId(targetRideId);
    try {
      await sendMatchRequest(firstActiveRideId, targetRideId);
      toast.success("Request sent");
      fetchRequests();
      fetchSuggestedMatches();
    } catch (err) {
      const message = err instanceof Error ? err.message : toErrorDetails(err);
      console.error("[HomePage] Failed to send match request:", message, err);
      toast.error(message || "Failed to send request");
    } finally {
      setRequestingMatchRideId(null);
    }
  };

  const hour = typeof window !== "undefined" ? new Date().getHours() : 12;
  const timeGreeting =
    hour >= 5 && hour < 12
      ? "Good morning"
      : hour >= 12 && hour < 18
        ? "Good afternoon"
        : "Good evening";

  return (
    <div className="space-y-8">
      {/* ── Header with avatar greeting  ── */}
      <section className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-11 w-11 shrink-0">
            <AvatarImage src={profile?.photo_url || undefined} />
            <AvatarFallback className="bg-blue-50 text-sm font-medium text-blue-600">
              {profile?.first_name?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
              {timeGreeting}{profile?.first_name ? `, ${profile.first_name}` : ""}
            </h1>
            <p className="text-sm text-zinc-500">
              Ready for your next shared journey?
            </p>
          </div>
        </div>
        <Button
          className="h-11 min-h-[44px] shrink-0 rounded-full bg-[#0052FF] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#0045DD] touch-manipulation"
          onClick={() => router.push("/post")}
        >
          <Plus className="mr-2 h-4 w-4" />
          Post New Ride
        </Button>
      </section>

      {/* Stats */}
      <section className="grid gap-3 md:grid-cols-3">
        <Card className="border-zinc-200/80 bg-white">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-medium text-zinc-500">Total Saved</p>
              <p className="mt-1 text-xl font-bold text-zinc-900">
                ${totalSaved.toFixed(2)}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-200/80 bg-white">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-medium text-zinc-500">Rides Shared</p>
              <p className="mt-1 text-xl font-bold text-zinc-900">
                {ridesShared} {ridesShared === 1 ? "Trip" : "Trips"}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Car className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-200/80 bg-white">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-medium text-zinc-500">CO2 Reduced</p>
              <p className="mt-1 text-xl font-bold text-zinc-900">
                {co2ReducedPpm.toFixed(0)} ppm
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
              <Leaf className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Requested ride(s) — active rides still searching for matches */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900">
            {activeRideCount === 1 ? "Requested ride" : "Requested rides"}
          </h2>
          <Button
            variant="ghost"
            className="h-9 px-3 text-sm text-blue-600 hover:bg-blue-50 hover:text-blue-700"
            onClick={() => router.push("/history")}
          >
            View History
          </Button>
        </div>

        {(loadingRides || loadingRequests) && user && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
          </div>
        )}

        {!loadingRides && !loadingRequests && activeRideCount === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50/30 p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100">
              <Navigation className="h-6 w-6 text-zinc-400" />
            </div>
            <p className="text-sm font-semibold text-zinc-900">
              No active requests
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              You haven&apos;t requested any rides yet. Find a commuter headed your way!
            </p>
            <Button
              variant="outline"
              className="mt-4 h-9 rounded-full border-zinc-300 px-5 text-xs font-semibold"
              onClick={() => router.push("/matches")}
            >
              Browse Rides
            </Button>
          </div>
        )}

        {!loadingRides && !loadingRequests && activeRides.length > 0 && (
          <div className="space-y-3">
            {activeRides.map((ride) => {
              const { dateStr, timeStr, tolerance } = formatTimeWindow(
                ride.departure_earliest,
                ride.departure_latest,
              );
              return (
                <Card
                  key={ride.id}
                  className="cursor-pointer border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                  onClick={() => router.push(`/post?edit=${ride.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-3 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge className="border-0 bg-amber-50 text-xs text-amber-700">
                            Finding matches
                          </Badge>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            <span className="truncate text-sm font-medium text-zinc-900">
                              {ride.origin_name}
                            </span>
                          </div>
                          <div className="ml-[3px]">
                            <div className="ml-[3px] h-3 w-0.5 bg-zinc-200" />
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                            <span className="truncate text-sm font-medium text-zinc-900">
                              {ride.dest_name}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="border-0 bg-zinc-100 text-xs font-normal text-zinc-600"
                          >
                            <CalendarDays className="mr-1 h-3 w-3" />
                            {dateStr}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className="border-0 bg-zinc-100 text-xs font-normal text-zinc-600"
                          >
                            <Clock className="mr-1 h-3 w-3" />
                            {timeStr} {tolerance}
                          </Badge>
                        </div>
                      </div>
                      <div
                        className="flex shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 min-h-[44px] min-w-[44px] text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 touch-manipulation md:h-8 md:w-8 md:min-h-0 md:min-w-0"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() => router.push(`/post?edit=${ride.id}`)}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit ride
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setRemoveConfirmRideId(ride.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove ride
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Remove ride confirmation dialog */}
      <Dialog open={!!removeConfirmRideId} onOpenChange={(open) => !open && setRemoveConfirmRideId(null)}>
        <DialogContent showCloseButton={true}>
          <DialogHeader>
            <DialogTitle>Remove ride?</DialogTitle>
            <DialogDescription>
              This will cancel your ride request and stop searching for matches. You can post a new ride anytime.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemoveConfirmRideId(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!removeConfirmRideId) return;
                setCancellingId(removeConfirmRideId);
                try {
                  await cancelRide(removeConfirmRideId);
                  setRides((prev) => prev.filter((r) => r.id !== removeConfirmRideId));
                  fetchSuggestedMatches();
                  setRemoveConfirmRideId(null);
                  toast.success("Ride request removed");
                } catch (err) {
                  console.error("[HomePage] Cancel error:", err);
                  toast.error("Failed to remove ride");
                } finally {
                  setCancellingId(null);
                }
              }}
              disabled={cancellingId === removeConfirmRideId}
            >
              {cancellingId === removeConfirmRideId ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Remove ride
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suggested Matches */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900">
            Suggested Matches
          </h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-zinc-500 hover:text-zinc-900"
            onClick={() => router.push(suggestedMatchRideId ? `/matches?ride=${suggestedMatchRideId}` : "/matches")}
          >
            Show more
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>

        {loadingMatches && (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
          </div>
        )}

        {!loadingMatches && suggestedMatches.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50/30 p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100">
              <Users className="h-6 w-6 text-zinc-400" />
            </div>
            <p className="text-sm font-semibold text-zinc-900">
              Looking for matches…
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Update your preferences or post a new route to see community members near you.
            </p>
            <Button
              variant="outline"
              className="mt-4 h-9 rounded-full border-zinc-300 px-5 text-xs font-semibold"
              onClick={() => router.push("/post")}
            >
              Edit Preferences
            </Button>
          </div>
        )}

        {!loadingMatches && suggestedMatches.length > 0 && (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {suggestedMatches.map((item) => {
        const match = item;
        const targetRideId = item.request_target_ride_id;
        const key = item.candidate_id;
        return (
          <SuggestedMatchCard
            key={key}
            match={match}
            groupSize={item.candidate_type === "group" ? item.group_size_before_join : undefined}
            requesting={requestingMatchRideId === targetRideId}
            onConnect={() => handleConnect(targetRideId)}
            onViewProfile={() => router.push(`/profile/${match.user_id}`)}
            onShowInfo={() => {
              setDetailItem(item);
              setDetailOpen(true);
            }}
          />
        );
      })}
    </div>
  )
}
      </section >

      <MatchDetailDialog
        item={detailItem}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setDetailItem(null);
        }}
        myRideId={firstActiveRideId}
        onRequested={fetchSuggestedMatches}
      />

  {/* Pending requests (sent) — requests I sent waiting for response */ }
{
  requests.filter((r) => r.direction === "outgoing" && r.status === "pending" && r.ride_status !== "completed").length > 0 && (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-zinc-900">
            Pending Requests
          </h2>
          <Badge className="border-0 bg-amber-50 text-xs font-medium text-amber-700">
            {requests.filter((r) => r.direction === "outgoing" && r.status === "pending" && r.ride_status !== "completed").length} sent
          </Badge>
        </div>
      </div>
      {requests
        .filter((r) => r.direction === "outgoing" && r.status === "pending" && r.ride_status !== "completed")
        .map((req) => (
          <RequestCard
            key={req.id}
            request={req}
            variant="outgoing"
            busy={withdrawingRequestId === req.id}
            onPrimary={() => handleWithdraw(req.id)}
            onOpenProfile={() => router.push(`/profile/${req.requester_profile_id}`)}
            onOpenDetails={() => setRideRequestDetail(req)}
          />
        ))}
    </section>
  )
}

{/* Ride requests — incoming pending (others requested me) */ }
{
  requests.filter((r) => r.direction === "incoming" && r.status === "pending" && r.ride_status !== "completed").length > 0 && (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-zinc-900">
            Incoming Requests
          </h2>
          <Badge className="border-0 bg-blue-50 text-xs font-medium text-blue-700">
            {requests.filter((r) => r.direction === "incoming" && r.status === "pending" && r.ride_status !== "completed").length} pending
          </Badge>
        </div>
      </div>
      {requests
        .filter((r) => r.direction === "incoming" && r.status === "pending" && r.ride_status !== "completed")
        .map((req) => (
          <RequestCard
            key={req.id}
            request={req}
            variant="incoming"
            busy={respondingId === req.id}
            onPrimary={() => handleRespond(req.id, "accepted")}
            onSecondary={() => handleRespond(req.id, "rejected")}
            onOpenProfile={() => router.push(`/profile/${req.requester_profile_id}`)}
            onOpenDetails={() => setRideRequestDetail(req)}
          />
        ))}
    </section>
  )
}

{/* Ride request detail dialog — view ride preference, time, etc. */ }
<Dialog open={!!rideRequestDetail} onOpenChange={(open) => !open && setRideRequestDetail(null)}>
  <DialogContent showCloseButton={true} className="max-w-md">
    {rideRequestDetail && (
      <>
        <DialogHeader>
          <DialogTitle>
            {rideRequestDetail.direction === "outgoing"
              ? "Request sent"
              : "Ride request"}
          </DialogTitle>
          <DialogDescription>
            {rideRequestDetail.direction === "outgoing"
              ? "Details of the ride you requested to match with"
              : "Details of the incoming request"}
          </DialogDescription>
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
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => {
              setRideRequestDetail(null);
              router.push(`/profile/${rideRequestDetail.requester_profile_id}`);
            }}
          >
            View full profile
          </Button>
          {rideRequestDetail.direction === "incoming" && (
            <>
              <Button
                variant="outline"
                className="w-full sm:w-auto border-zinc-200 text-zinc-600"
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
                className="w-full sm:w-auto bg-blue-600 text-white hover:bg-blue-700"
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
          )}
          {rideRequestDetail.direction === "outgoing" && (
            <Button
              variant="outline"
              className="w-full sm:w-auto border-zinc-200 text-zinc-600 hover:bg-zinc-50"
              onClick={() => {
                handleWithdraw(rideRequestDetail.id);
                setRideRequestDetail(null);
              }}
              disabled={withdrawingRequestId === rideRequestDetail.id}
            >
              {withdrawingRequestId === rideRequestDetail.id ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <XCircle className="mr-1 h-3 w-3" />
              )}
              Remove request
            </Button>
          )}
        </DialogFooter>
      </>
    )}
  </DialogContent>
</Dialog>

{/* How Knot works */ }
<section className="mt-4 rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-700">
  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
    How Knot works
  </h3>
  <ol className="space-y-1.5 text-xs leading-relaxed text-zinc-600">
    <li>
      <span className="font-medium text-zinc-800">1. Post a ride</span>{" "}
      — share where you&apos;re going and your time window.
    </li>
    <li>
      <span className="font-medium text-zinc-800">2. Get matches</span>{" "}
      — we score people by route, timing, trust, and preferences.
    </li>
    <li>
      <span className="font-medium text-zinc-800">3. Send a request</span>{" "}
      — if they accept, you&apos;ll get a chat to coordinate details.
    </li>
  </ol>
</section>
    </div >
  );
}
