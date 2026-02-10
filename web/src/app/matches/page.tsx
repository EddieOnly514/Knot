"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    ArrowLeft,
    Star,
    Clock,
    MapPin,
    Users,
    Briefcase,
    CheckCircle,
    Loader2,
    Navigation,
    Car,
    DollarSign,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import { findMatches, expressInterest } from "@/lib/services/matchService";
import { getMyTripIntents } from "@/lib/services/tripService";
import type { PotentialMatch } from "@/types";
import { toast } from "sonner";

function formatDistance(meters: number | null): string {
    if (meters === null) return "—";
    const miles = meters / 1609.34;
    if (miles < 0.1) return "< 0.1 mi";
    return `${miles.toFixed(1)} mi`;
}

function formatTimeDiff(minutes: number): string {
    if (minutes === 0) return "Same time";
    if (minutes < 60) return `${minutes} min apart`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m apart` : `${h}h apart`;
}

function formatSavings(cents: number | null): string {
    if (cents === null) return "—";
    return `~$${(cents / 100).toFixed(0)} saved`;
}

function ScoreBadge({ label }: { label: string }) {
    const colors: Record<string, string> = {
        "Excellent Match": "bg-green-100 text-green-800 border-green-200",
        "Good Match": "bg-blue-100 text-blue-800 border-blue-200",
        "Fair Match": "bg-amber-100 text-amber-800 border-amber-200",
        "Possible Match": "bg-slate-100 text-slate-700 border-slate-200",
    };
    return (
        <Badge variant="outline" className={`${colors[label] || colors["Possible Match"]} font-medium`}>
            {label}
        </Badge>
    );
}

function MatchCard({
    match,
    myTripId,
    onRequested,
}: {
    match: PotentialMatch;
    myTripId: string;
    onRequested: () => void;
}) {
    const [requesting, setRequesting] = useState(false);
    const [showBreakdown, setShowBreakdown] = useState(false);

    const departureTime = new Date(match.departure_time);
    const timeString = departureTime.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
    });
    const dateString = departureTime.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
    });

    const handleRequest = async () => {
        setRequesting(true);
        try {
            await expressInterest(myTripId, match.trip_intent_id);
            toast.success(`Match request sent to ${match.first_name}!`);
            onRequested();
        } catch (err) {
            console.error("Failed to express interest:", err);
            toast.error("Failed to send match request");
        } finally {
            setRequesting(false);
        }
    };

    return (
        <Card className="hover:shadow-md transition-shadow overflow-hidden">
            <CardContent className="p-0">
                <div className="flex">
                    {/* Left: Profile */}
                    <div className="flex-shrink-0 p-4 flex flex-col items-center border-r border-slate-100 w-28">
                        <Avatar className="w-16 h-16 mb-2">
                            <AvatarImage src={match.photo_url || undefined} />
                            <AvatarFallback className="bg-blue-100 text-blue-600 text-lg">
                                {match.first_name[0]}
                            </AvatarFallback>
                        </Avatar>
                        <h3 className="font-semibold text-slate-900 text-sm">{match.first_name}</h3>
                        <div className="flex items-center gap-1 text-sm text-slate-600">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            {match.rating.toFixed(1)}
                        </div>
                        <p className="text-xs text-slate-500">{match.total_rides} rides</p>
                        {match.is_verified && (
                            <Badge
                                variant="secondary"
                                className="mt-2 bg-green-50 text-green-700 text-xs"
                            >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Verified
                            </Badge>
                        )}
                    </div>

                    {/* Right: Trip Details */}
                    <div className="flex-1 p-4">
                        <div className="flex items-center justify-between mb-2">
                            <ScoreBadge label={match.match_label} />
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${match.match_score >= 90
                                    ? "bg-green-100 text-green-700"
                                    : match.match_score >= 75
                                        ? "bg-blue-100 text-blue-700"
                                        : match.match_score >= 55
                                            ? "bg-amber-100 text-amber-700"
                                            : "bg-slate-100 text-slate-700"
                                    }`}
                            >
                                {match.match_score}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                <span className="font-medium text-slate-900 text-sm">
                                    {match.destination_city || match.destination}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <Navigation className="w-4 h-4 text-green-600 flex-shrink-0" />
                                <span className="text-sm text-slate-500">
                                    From: {match.departure_city || match.departure_address || "—"}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-purple-600 flex-shrink-0" />
                                <span className="text-sm text-slate-600">
                                    {dateString} at {timeString}
                                </span>
                                <span className="text-xs text-slate-400">
                                    ({formatTimeDiff(match.time_diff_minutes)})
                                </span>
                            </div>

                            <div className="flex items-center gap-3 text-sm text-slate-600">
                                <div className="flex items-center gap-1">
                                    <Users className="w-4 h-4" />
                                    {match.party_size} ({match.combined_party_size} total)
                                </div>
                                <div className="flex items-center gap-1">
                                    <Briefcase className="w-4 h-4" />
                                    {match.luggage.replace(/_/g, " ")}
                                </div>
                                <div className="flex items-center gap-1">
                                    <Car className="w-4 h-4" />
                                    {match.car_preference}
                                </div>
                            </div>

                            {match.estimated_savings_cents && (
                                <div className="flex items-center gap-1 text-sm text-green-700">
                                    <DollarSign className="w-4 h-4" />
                                    {formatSavings(match.estimated_savings_cents)}
                                </div>
                            )}
                        </div>

                        {/* Score Breakdown Toggle */}
                        <button
                            type="button"
                            className="text-xs text-slate-400 hover:text-slate-600 mt-2 flex items-center gap-1"
                            onClick={() => setShowBreakdown(!showBreakdown)}
                        >
                            {showBreakdown ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            Score breakdown
                        </button>
                        {showBreakdown && (
                            <div className="mt-2 p-2 bg-slate-50 rounded text-xs text-slate-600 space-y-1">
                                <div className="flex justify-between">
                                    <span>Origin proximity</span>
                                    <span>{match.score_origin}/20 — {formatDistance(match.origin_distance_meters)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Destination proximity</span>
                                    <span>{match.score_destination}/30 — {formatDistance(match.dest_distance_meters)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Time proximity</span>
                                    <span>{match.score_time}/20</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Party size</span>
                                    <span>{match.score_party}/15</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Luggage</span>
                                    <span>{match.score_luggage}/10</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Car preference</span>
                                    <span>{match.score_car_pref}/5</span>
                                </div>
                            </div>
                        )}

                        {/* Action */}
                        <div className="flex items-center justify-end mt-3 pt-3 border-t border-slate-100">
                            <Button
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700"
                                onClick={handleRequest}
                                disabled={requesting}
                            >
                                {requesting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    "Request Match"
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function MatchesContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [matches, setMatches] = useState<PotentialMatch[]>([]);
    const [loading, setLoading] = useState(true);
    const [tripId, setTripId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadMatches = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Get trip ID from URL or most recent intent
            let id = searchParams.get("trip");

            if (!id) {
                const myTrips = await getMyTripIntents();
                if (myTrips.length > 0) {
                    id = myTrips[0].id;
                } else {
                    setError("no_trips");
                    setLoading(false);
                    return;
                }
            }

            setTripId(id);
            const results = await findMatches(id!);
            setMatches(results);
        } catch (err) {
            console.error("Failed to load matches:", err);
            setError("load_failed");
        } finally {
            setLoading(false);
        }
    }, [searchParams]);

    useEffect(() => {
        loadMatches();
    }, [loadMatches]);

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push("/home")}
                        className="p-2"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="text-lg font-semibold text-slate-900">
                        Your Matches
                    </h1>
                </div>
            </header>

            {/* Match List */}
            <main className="max-w-4xl mx-auto px-4 py-6">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
                        <p className="text-slate-500">Finding your best matches...</p>
                    </div>
                ) : error === "no_trips" ? (
                    <div className="text-center py-16">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Navigation className="w-8 h-8 text-slate-400" />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-900 mb-2">No Active Ride Requests</h2>
                        <p className="text-slate-500 mb-6">Post a ride request to find people heading your way.</p>
                        <Button
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => router.push("/post")}
                        >
                            Post a Ride Request
                        </Button>
                    </div>
                ) : error === "load_failed" ? (
                    <div className="text-center py-16">
                        <p className="text-slate-500 mb-4">Something went wrong loading matches.</p>
                        <Button variant="outline" onClick={loadMatches}>
                            Try Again
                        </Button>
                    </div>
                ) : matches.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Users className="w-8 h-8 text-blue-400" />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-900 mb-2">No Matches Yet</h2>
                        <p className="text-slate-500 mb-2">
                            No one is heading your way at this time — check back soon!
                        </p>
                        <p className="text-xs text-slate-400 mb-6">
                            We&apos;ll keep searching. Matches appear automatically.
                        </p>
                        <Button variant="outline" onClick={loadMatches}>
                            Refresh
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-sm text-slate-500">
                            {matches.length} {matches.length === 1 ? "traveler" : "travelers"} heading your way
                        </p>
                        {matches.map((match) => (
                            <MatchCard
                                key={match.trip_intent_id}
                                match={match}
                                myTripId={tripId!}
                                onRequested={loadMatches}
                            />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

export default function MatchesPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        }>
            <MatchesContent />
        </Suspense>
    );
}
