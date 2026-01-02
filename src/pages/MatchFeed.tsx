import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ElevatedCard } from "@/components/ui/elevated-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { ActionButton } from "@/components/ui/action-button";
import { Briefcase, Users, CarFront, ArrowLeft, X, Check, Clock, MapPin } from "lucide-react";

interface Match {
    id: string;
    name: string;
    age: number;
    photo: string;
    verified: boolean;
    partySize: number;
    luggage: string;
    luggageIcon: string;
    currentLocation: string;
    destination: string;
    leavingIn: string;
    ridePreference: string;
}

const mockMatches: Match[] = [
    {
        id: "1",
        name: "Sarah",
        age: 26,
        photo: "/profiles/sarah.png",
        verified: true,
        partySize: 1,
        currentLocation: "Near Terminal 4",
        destination: "Downtown SF Area",
        luggage: "Carry-on only",
        luggageIcon: "💼",
        leavingIn: "15 min",
        ridePreference: "UberXL preferred",
    },
    {
        id: "2",
        name: "Mike",
        age: 32,
        photo: "/profiles/mike.png",
        verified: true,
        partySize: 1,
        currentLocation: "Within 1-2 miles",
        destination: "Downtown SF Area",
        luggage: "1 Suitcase",
        luggageIcon: "🧳",
        leavingIn: "30 min",
        ridePreference: "Any",
    },
    {
        id: "3",
        name: "Emily",
        age: 24,
        photo: "/profiles/emily.png",
        verified: true,
        partySize: 2,
        currentLocation: "Terminal 1",
        destination: "Santa Monica",
        luggage: "2+ Suitcases",
        luggageIcon: "🧳🧳",
        leavingIn: "20 min",
        ridePreference: "UberXL",
    },
];

const RadarAnimation = () => (
    <div className="relative w-32 h-32 mx-auto">
        <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
        <div className="absolute inset-4 rounded-full border-2 border-primary/30" />
        <div className="absolute inset-8 rounded-full border-2 border-primary/40" />
        <div className="absolute inset-0 rounded-full border-2 border-primary animate-radar" />
        <div className="absolute inset-0 flex items-center justify-center">
            <CarFront className="w-8 h-8 text-primary" />
        </div>
    </div>
);

const SkeletonCard = () => (
    <ElevatedCard className="p-4 mb-4">
        <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-full skeleton" />
            <div className="flex-1 space-y-2">
                <div className="h-5 w-24 skeleton rounded" />
                <div className="h-4 w-16 skeleton rounded" />
            </div>
        </div>
        <div className="h-20 skeleton rounded-xl mb-4" />
        <div className="flex gap-2">
            <div className="h-8 flex-1 skeleton rounded-full" />
            <div className="h-8 flex-1 skeleton rounded-full" />
        </div>
    </ElevatedCard>
);

const MatchCard = ({
    match,
    onInterested,
    onPass
}: {
    match: Match;
    onInterested: () => void;
    onPass: () => void;
}) => (
    <ElevatedCard className="p-5 mb-4 animate-scale-in">
        {/* Header with photo and info */}
        <div className="flex items-start gap-4 mb-4">
            <img
                src={match.photo}
                alt={match.name}
                className="w-16 h-16 rounded-full object-cover shadow-card"
            />
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <span className="font-headline font-bold text-text-main text-lg">
                        {match.name}, {match.age}
                    </span>
                    {match.verified && <StatusBadge variant="verified" />}
                </div>
                <div className="flex items-center gap-3 mt-1 text-sm text-text-muted">
                    <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        Party of {match.partySize}
                    </span>
                    <span>{match.luggageIcon} {match.luggage}</span>
                </div>
            </div>
        </div>

        {/* Time indicator */}
        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-primary/5 rounded-xl">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">
                Leaving in {match.leavingIn}
            </span>
        </div>

        {/* Destination - coarse only */}
        <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-primary" />
            <span className="font-medium text-text-main">
                Heading to {match.destination}
            </span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-5">
            <span className="px-3 py-1.5 rounded-full bg-slate-100 text-text-muted text-xs font-medium">
                {match.currentLocation}
            </span>
            <span className="px-3 py-1.5 rounded-full bg-slate-100 text-text-muted text-xs font-medium">
                {match.ridePreference}
            </span>
        </div>

        {/* Action buttons - Tinder-style */}
        <div className="flex gap-4 justify-center">
            <button
                onClick={onPass}
                className="w-16 h-16 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:border-red-300 hover:text-red-400 hover:bg-red-50 transition-all active:scale-95"
            >
                <X className="w-7 h-7" />
            </button>
            <button
                onClick={onInterested}
                className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-white shadow-float hover:shadow-lg transition-all active:scale-95"
            >
                <Check className="w-7 h-7" />
            </button>
        </div>
    </ElevatedCard>
);

const MatchFeed = () => {
    const navigate = useNavigate();
    const [matches, setMatches] = useState<Match[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [verifiedOnly, setVerifiedOnly] = useState(true);

    useEffect(() => {
        // Simulate loading
        const timer = setTimeout(() => {
            setMatches(mockMatches);
            setIsLoading(false);
        }, 2000);
        return () => clearTimeout(timer);
    }, []);

    const handleInterested = (matchId: string) => {
        // TODO: Send swipe to Supabase, check for mutual match
        navigate(`/chat/${matchId}`);
    };

    const handlePass = (matchId: string) => {
        // Remove from local list for now
        setMatches((prev) => prev.filter((m) => m.id !== matchId));
    };

    const filteredMatches = verifiedOnly
        ? matches.filter((m) => m.verified)
        : matches;

    return (
        <div className="min-h-screen bg-background px-4 pt-6 pb-safe">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 rounded-xl bg-white shadow-card flex items-center justify-center"
                    >
                        <ArrowLeft className="w-5 h-5 text-text-main" />
                    </button>
                    <h1 className="font-headline text-xl font-bold text-text-main">
                        Suggested Matches
                    </h1>
                </div>
            </div>

            {/* Filter toggle */}
            <div className="mb-4">
                <button
                    onClick={() => setVerifiedOnly(!verifiedOnly)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${verifiedOnly
                            ? "bg-primary text-white"
                            : "bg-slate-100 text-text-muted"
                        }`}
                >
                    ✓ Verified only
                </button>
            </div>

            {/* Content */}
            {isLoading ? (
                <div>
                    <div className="flex flex-col items-center justify-center py-12">
                        <RadarAnimation />
                        <p className="text-text-muted mt-6 animate-pulse-slow">
                            Finding matches nearby...
                        </p>
                    </div>
                    <SkeletonCard />
                    <SkeletonCard />
                </div>
            ) : filteredMatches.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[50vh]">
                    <RadarAnimation />
                    <p className="text-text-muted mt-6 font-medium">No matches found yet</p>
                    <p className="text-text-muted text-sm mt-1">Check back in a few minutes</p>
                    <button
                        onClick={() => setIsLoading(true)}
                        className="mt-6 px-6 py-3 rounded-xl bg-slate-100 text-text-muted font-medium"
                    >
                        Refresh
                    </button>
                </div>
            ) : (
                <div>
                    {filteredMatches.map((match) => (
                        <MatchCard
                            key={match.id}
                            match={match}
                            onInterested={() => handleInterested(match.id)}
                            onPass={() => handlePass(match.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default MatchFeed;
