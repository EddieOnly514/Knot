"use client";

import { useEffect, useState, useCallback, useLayoutEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { getMyRides, cancelRide } from "@/lib/services/rideService";
import { getMyRequests, respondToRequest, withdrawRequest } from "@/lib/services/matchService";
import { findMatches, sendMatchRequest, collapseMatchesIntoItems } from "@/lib/services/matchService";
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
  X,
  XCircle,
  Send,
  History,
  TrendingUp,
  Car,
  Leaf,
  MoreVertical,
  Trash2,
  Pencil,
  Star,
  ArrowRight,
  Users,
  ChevronDown,
  ChevronUp,
  VolumeX,
  Music,
  MessageSquare,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import type { PotentialMatch, MatchItem } from "@/types";
import {
  getHomeCache,
  setHomeCache,
  HOME_CACHE_TTL_MS,
  type HomeCache,
} from "@/lib/homeCache";
import { estimateSavingsDollars as estimateSavings } from "@/lib/estimateSavings";

function toErrorDetails(err: unknown): string {
  if (!err) return "";
  if (err instanceof Error) return err.message;
  if (typeof err === "object") {
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }
  return String(err);
}

function formatMatchTime(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatMatchTimeRange(earliest: string, latest: string) {
  return `${formatMatchTime(earliest)} – ${formatMatchTime(latest)}`;
}

function estimateSavingsDollars(match: PotentialMatch) {
  return estimateSavings(match.origin_name, match.dest_name, match.total_score);
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

function SuggestedMatchCard({
  match,
  matchPct,
  groupSize,
  requesting,
  onConnect,
  onViewProfile,
}: {
  match: PotentialMatch;
  matchPct: number;
  groupSize?: number;
  requesting: boolean;
  onConnect: () => void;
  onViewProfile: () => void;
}) {
  const [tripExpanded, setTripExpanded] = useState(false);
  const originTime = formatMatchTime(match.departure_earliest);
  const isGroup = groupSize != null && groupSize >= 2;

  return (
    <Card className="overflow-hidden border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md">
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
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs">
              {isGroup && (
                <Badge variant="secondary" className="rounded-full bg-amber-100 px-2 py-0 text-[10px] font-semibold text-amber-800">
                  Already in a group of {groupSize}
                </Badge>
              )}
              <span className="flex items-center gap-1 text-zinc-500">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                {match.rating.toFixed(1)}
              </span>
              <span className="text-zinc-500">•</span>
              <span className="text-zinc-500">{match.total_rides} rides</span>
            </div>
          </div>
        </div>

        <div
          className="mt-3 cursor-pointer rounded-xl bg-zinc-50 p-3 text-xs transition-colors hover:bg-zinc-100"
          onClick={() => setTripExpanded((prev) => !prev)}
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
                <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold tracking-wide text-zinc-400">TIME WINDOW</p>
                  <p className="text-sm font-medium text-zinc-900">
                    {formatMatchTimeRange(match.departure_earliest, match.departure_latest)}
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
              {match.notes?.trim() && (
                <div className="flex items-start gap-2 pt-1 border-t border-zinc-100 mt-2 pt-2">
                  <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold tracking-wide text-zinc-400">SPECIAL NOTE</p>
                    <p className="text-sm text-zinc-700 whitespace-pre-wrap">{match.notes.trim()}</p>
                  </div>
                </div>
              )}
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

        <div className="mt-3 grid grid-cols-2 gap-2">
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
  const [suggestedMatches, setSuggestedMatches] = useState<MatchItem[]>(
    cacheIsValid ? (homeCache!.suggestedMatches as MatchItem[]) : [],
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
    setSuggestedMatches(cache.suggestedMatches as MatchItem[]);
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
          : { profileId: profile.id, fetchedAt: 0, rides: [] as Ride[], requests: [] as RideRequest[], suggestedMatches: [] as MatchItem[] };
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
        filtered = results.filter((m) => !matchedRideIds.has(m.ride_id));
      }
      const items = await collapseMatchesIntoItems(filtered);
      const nextMatches = items.slice(0, 3);
      setSuggestedMatches(nextMatches);
      persistCache({ suggestedMatches: nextMatches });
    } catch (err) {
      setSuggestedMatches([]);
      persistCache({ suggestedMatches: [] });
      const details = toErrorDetails(err);
      // Suggested matches are non-critical. Avoid noisy console errors when
      // backend RPC is unavailable or returns empty objects in dev.
      if (process.env.NODE_ENV === "development" && details && details !== "{}") {
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

  const handleCancel = async (rideId: string) => {
    setCancellingId(rideId);
    try {
      await cancelRide(rideId);
      setRides((prev) => prev.filter((r) => r.id !== rideId));
      fetchSuggestedMatches();
      toast.success("Ride request cancelled");
    } catch (err) {
      console.error("[HomePage] Cancel error:", err);
      toast.error("Failed to cancel ride");
    } finally {
      setCancellingId(null);
    }
  };

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
              You haven't requested any rides yet. Find a commuter headed your way!
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
        const match = item.kind === "single" ? item.match : item.primaryMatch;
        const targetRideId = item.kind === "single" ? item.match.ride_id : item.groupHostRideId;
        const matchPct = Math.max(0, Math.min(100, Math.round(match.total_score)));
        const key = item.kind === "single" ? item.match.ride_id : item.groupHostRideId;
        return (
          <SuggestedMatchCard
            key={key}
            match={match}
            matchPct={matchPct}
            groupSize={item.kind === "group" ? item.groupSize : undefined}
            requesting={requestingMatchRideId === targetRideId}
            onConnect={() => handleConnect(targetRideId)}
            onViewProfile={() => router.push(`/profile/${match.user_id}`)}
          />
        );
      })}
    </div>
  )
}
      </section >

  {/* Pending requests (sent) — requests I sent waiting for response */ }
{
  requests.filter((r) => r.direction === "outgoing" && r.status === "pending" && r.ride_status !== "completed").length > 0 && (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-zinc-900">
            Pending requests
          </h2>
          <Badge className="border-0 bg-amber-50 text-xs font-medium text-amber-700">
            {requests.filter((r) => r.direction === "outgoing" && r.status === "pending" && r.ride_status !== "completed").length} sent
          </Badge>
        </div>
      </div>
      {requests
        .filter((r) => r.direction === "outgoing" && r.status === "pending" && r.ride_status !== "completed")
        .map((req) => (
          <Card
            key={req.id}
            className="cursor-pointer border border-amber-200/80 bg-white transition-shadow hover:shadow-md"
            onClick={() => setRideRequestDetail(req)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Avatar
                  className="h-10 w-10 shrink-0 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/profile/${req.requester_profile_id}`);
                  }}
                >
                  <AvatarImage src={req.requester_photo || undefined} />
                  <AvatarFallback className="bg-amber-50 text-sm font-medium text-amber-600">
                    {req.requester_name[0]}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-zinc-900">
                      {req.requester_name}
                    </span>
                    {req.requester_school && (
                      <span className="text-xs text-zinc-500">
                        {req.requester_school}
                      </span>
                    )}
                    <Badge
                      variant="outline"
                      className="border-amber-200 text-xs text-amber-700"
                    >
                      <Clock className="mr-1 h-3 w-3" />
                      Pending
                    </Badge>
                  </div>
                  <p className="truncate text-xs text-zinc-500">
                    {req.requester_origin} → {req.requester_dest}
                  </p>
                </div>

                <div className="flex flex-shrink-0 items-center gap-2 sm:gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-10 min-h-[44px] rounded-lg px-3 border-zinc-200 text-xs text-zinc-600 hover:bg-zinc-50 touch-manipulation sm:h-8 sm:min-h-0"
                    onClick={() => handleWithdraw(req.id)}
                    disabled={withdrawingRequestId === req.id}
                  >
                    {withdrawingRequestId === req.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <XCircle className="mr-1 h-3 w-3" />
                        Withdraw
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
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
            Ride requests
          </h2>
          <Badge className="border-0 bg-blue-50 text-xs font-medium text-blue-700">
            {requests.filter((r) => r.direction === "incoming" && r.status === "pending" && r.ride_status !== "completed").length} pending
          </Badge>
        </div>
      </div>
      {requests
        .filter((r) => r.direction === "incoming" && r.status === "pending" && r.ride_status !== "completed")
        .map((req) => (
          <Card
            key={req.id}
            className="cursor-pointer border border-blue-200 bg-white transition-shadow hover:shadow-md"
            onClick={() => setRideRequestDetail(req)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Avatar
                  className="h-10 w-10 shrink-0 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/profile/${req.requester_profile_id}`);
                  }}
                >
                  <AvatarImage src={req.requester_photo || undefined} />
                  <AvatarFallback className="bg-blue-50 text-sm font-medium text-blue-600">
                    {req.requester_name[0]}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-zinc-900">
                      {req.requester_name}
                    </span>
                    {req.requester_school && (
                      <span className="text-xs text-zinc-500">
                        {req.requester_school}
                      </span>
                    )}
                    {req.direction === "outgoing" && (
                      <Badge
                        variant="outline"
                        className="border-zinc-200 text-xs"
                      >
                        <Send className="mr-1 h-3 w-3" />
                        Sent
                      </Badge>
                    )}
                  </div>
                  <p className="truncate text-xs text-zinc-500">
                    {req.requester_origin} → {req.requester_dest}
                  </p>
                </div>

                {/* Actions */}
                {req.direction === "incoming" && (
                  <div className="flex flex-shrink-0 items-center gap-2 sm:gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      className="h-10 min-h-[44px] flex-1 rounded-lg px-3 bg-blue-600 text-xs font-medium text-white hover:bg-blue-700 touch-manipulation sm:h-8 sm:min-h-0 sm:flex-initial"
                      onClick={() => handleRespond(req.id, "accepted")}
                      disabled={respondingId === req.id}
                    >
                      {respondingId === req.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <Check className="mr-1 h-3 w-3" />
                          Accept
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-10 min-h-[44px] flex-1 rounded-lg px-3 border-zinc-200 text-xs text-zinc-600 hover:bg-zinc-50 touch-manipulation sm:h-8 sm:min-h-0 sm:flex-initial"
                      onClick={() => handleRespond(req.id, "rejected")}
                      disabled={respondingId === req.id}
                    >
                      <XCircle className="mr-1 h-3 w-3" />
                      Decline
                    </Button>
                  </div>
                )}
                {req.direction === "outgoing" && (
                  <div className="flex flex-shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-10 min-h-[44px] rounded-lg px-3 border-zinc-200 text-xs text-zinc-600 hover:bg-zinc-50 touch-manipulation sm:h-8 sm:min-h-0"
                      onClick={() => handleWithdraw(req.id)}
                      disabled={withdrawingRequestId === req.id}
                    >
                      {withdrawingRequestId === req.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <XCircle className="mr-1 h-3 w-3" />
                          Remove
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
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
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={rideRequestDetail.requester_photo || undefined} />
              <AvatarFallback className="bg-blue-50 text-base font-medium text-blue-600">
                {rideRequestDetail.requester_name[0]}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-900">
                {rideRequestDetail.requester_name}
              </p>
              {rideRequestDetail.requester_school && (
                <p className="text-xs text-zinc-500">{rideRequestDetail.requester_school}</p>
              )}
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                {rideRequestDetail.requester_rating.toFixed(1)} rating
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Navigation className="h-4 w-4 shrink-0 text-blue-500" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Route</p>
                <p className="text-sm font-medium text-zinc-900">
                  {rideRequestDetail.requester_origin} → {rideRequestDetail.requester_dest}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 shrink-0 text-zinc-400" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Time</p>
                <p className="text-sm font-medium text-zinc-900">
                  {rideRequestDetail.requester_departure
                    ? formatMatchTime(rideRequestDetail.requester_departure)
                    : "—"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 shrink-0 text-zinc-400" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Party size</p>
                <p className="text-sm font-medium text-zinc-900">
                  {rideRequestDetail.requester_seats}{" "}
                  {rideRequestDetail.requester_seats === 1 ? "person" : "people"}
                </p>
              </div>
            </div>
          </div>
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

