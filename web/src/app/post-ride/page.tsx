"use client";

import { useState, useEffect, Suspense } from "react";
import { createRide } from "@/lib/services/rideService";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { format } from "date-fns";
import {
    MapPin,
    Calendar as CalendarIcon,
    Clock,
    Users,
    Loader2,
    CheckCircle,
    Volume2,
    VolumeX,
    Music,
    ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { AddressInput, geocodeText, type StructuredAddress } from "@/components/address-input";

const SPACE_OPTIONS = [
    { value: "0", label: "No extra space needed" },
    { value: "1", label: "Small bag (backpack/purse)" },
    { value: "2", label: "One suitcase" },
    { value: "3", label: "Multiple or bulky items" },
];

const STORAGE_KEY = "knot_pending_ride";

interface PendingRideData {
    origin: string;
    originAddress: StructuredAddress | null;
    destination: string;
    destAddress: StructuredAddress | null;
    date: string | null; // ISO string
    depHour: string;
    depMinute: string;
    depPeriod: string;
    tolerance: string;
    customFlexibilityHours: string;
    seatsNeeded: string;
    spaceCapacity: string;
    quietRide: boolean;
    musicOk: boolean;
    genderPref: "any" | "male" | "female";
    notes: string;
}

function PostRideForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { profile, isAuthenticated, loading: authLoading } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [autoSubmitting, setAutoSubmitting] = useState(false);

    const [origin, setOrigin] = useState(searchParams.get("from") ?? "");
    const [originAddress, setOriginAddress] =
        useState<StructuredAddress | null>(null);
    const [destination, setDestination] = useState(searchParams.get("to") ?? "");
    const [destAddress, setDestAddress] =
        useState<StructuredAddress | null>(null);

    const paramDate = searchParams.get("date");
    const [date, setDate] = useState<Date | undefined>(() => {
        if (paramDate) {
            const d = new Date(paramDate + "T12:00:00");
            return isNaN(d.getTime()) ? undefined : d;
        }
        return undefined;
    });

    const [depHour, setDepHour] = useState("");
    const [depMinute, setDepMinute] = useState("00");
    const [depPeriod, setDepPeriod] = useState("AM");
    const [tolerance, setTolerance] = useState<string>("15");
    const [customFlexibilityHours, setCustomFlexibilityHours] = useState<string>("1");

    const paramSeats = searchParams.get("seats");
    const [seatsNeeded, setSeatsNeeded] = useState(
        paramSeats && ["1", "2", "3", "4"].includes(paramSeats) ? paramSeats : "1"
    );
    const [spaceCapacity, setSpaceCapacity] = useState("1");

    const [quietRide, setQuietRide] = useState(false);
    const [musicOk, setMusicOk] = useState(false);
    const [genderPref, setGenderPref] =
        useState<"any" | "male" | "female">("any");
    const [notes, setNotes] = useState("");

    // On mount, check if we have pending ride data in localStorage (returning from signup)
    const resume = searchParams.get("resume");
    useEffect(() => {
        if (resume !== "true") return;
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) return;
            const data: PendingRideData = JSON.parse(stored);
            setOrigin(data.origin);
            setOriginAddress(data.originAddress);
            setDestination(data.destination);
            setDestAddress(data.destAddress);
            if (data.date) {
                const d = new Date(data.date);
                if (!isNaN(d.getTime())) setDate(d);
            }
            setDepHour(data.depHour);
            setDepMinute(data.depMinute);
            setDepPeriod(data.depPeriod);
            setTolerance(data.tolerance);
            setCustomFlexibilityHours(data.customFlexibilityHours);
            setSeatsNeeded(data.seatsNeeded);
            setSpaceCapacity(data.spaceCapacity);
            setQuietRide(data.quietRide);
            setMusicOk(data.musicOk);
            setGenderPref(data.genderPref);
            setNotes(data.notes);
        } catch {
            // ignore parse errors
        }
    }, [resume]);

    // After auth loads + we have pending data + user is authenticated → auto-submit
    useEffect(() => {
        if (resume !== "true" || authLoading || !isAuthenticated || !profile) return;
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return;

        // Small delay to let the form state populate
        const timer = setTimeout(() => {
            setAutoSubmitting(true);
            submitRide().finally(() => {
                localStorage.removeItem(STORAGE_KEY);
                setAutoSubmitting(false);
            });
        }, 500);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resume, authLoading, isAuthenticated, profile]);

    function buildTime(
        baseDate: Date,
        hour: string,
        minute: string,
        period: string,
    ): Date {
        const h =
            period === "AM"
                ? parseInt(hour) === 12
                    ? 0
                    : parseInt(hour)
                : parseInt(hour) === 12
                    ? 12
                    : parseInt(hour) + 12;
        const d = new Date(baseDate);
        d.setHours(h, parseInt(minute), 0, 0);
        return d;
    }

    function getFormData(): PendingRideData {
        return {
            origin,
            originAddress,
            destination,
            destAddress,
            date: date ? date.toISOString() : null,
            depHour,
            depMinute,
            depPeriod,
            tolerance,
            customFlexibilityHours,
            seatsNeeded,
            spaceCapacity,
            quietRide,
            musicOk,
            genderPref,
            notes,
        };
    }

    async function submitRide() {
        // Use the latest state from the form OR from localStorage if auto-submitting
        let formData = getFormData();

        // If auto-submitting after signup, read from localStorage since state may not be fully synced
        if (autoSubmitting || resume === "true") {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored) formData = JSON.parse(stored);
            } catch { /* use form state */ }
        }

        if (!formData.origin || !formData.destination || !formData.date || !formData.depHour) {
            toast.error("Please fill in all required fields");
            return;
        }

        const baseDate = new Date(formData.date);
        const departureTime = buildTime(baseDate, formData.depHour, formData.depMinute, formData.depPeriod);
        let departureEarliest: Date;
        let departureLatest: Date;
        if (formData.tolerance === "all_day") {
            const d = new Date(baseDate);
            d.setHours(0, 0, 0, 0);
            departureEarliest = d;
            const end = new Date(baseDate);
            end.setHours(23, 59, 59, 999);
            departureLatest = end;
        } else {
            const toleranceMin =
                formData.tolerance === "custom"
                    ? (parseInt(formData.customFlexibilityHours, 10) || 1) * 60
                    : parseInt(formData.tolerance, 10) || 15;
            departureEarliest = new Date(departureTime.getTime() - toleranceMin * 60 * 1000);
            departureLatest = new Date(departureTime.getTime() + toleranceMin * 60 * 1000);
        }

        if (departureLatest < new Date()) {
            toast.error("Departure time must be in the future");
            return;
        }

        setIsSubmitting(true);

        try {
            let effectiveOrigin = formData.originAddress;
            let effectiveDest = formData.destAddress;

            if (formData.origin && !effectiveOrigin?.lat) {
                const geocoded = await geocodeText(formData.origin);
                if (geocoded) effectiveOrigin = geocoded;
            }
            if (formData.destination && !effectiveDest?.lat) {
                const geocoded = await geocodeText(formData.destination);
                if (geocoded) effectiveDest = geocoded;
            }

            const ride = await createRide({
                originName: formData.origin,
                originLat: effectiveOrigin?.lat,
                originLng: effectiveOrigin?.lng,
                destName: formData.destination,
                destLat: effectiveDest?.lat,
                destLng: effectiveDest?.lng,
                departureEarliest,
                departureLatest,
                departurePreferred: departureTime,
                seatsAvailable: undefined,
                seatsNeeded: parseInt(formData.seatsNeeded),
                spaceCapacity: parseInt(formData.spaceCapacity),
                quietRide: formData.quietRide,
                musicOk: formData.musicOk,
                genderPref: formData.genderPref,
                notes: formData.notes.trim() || undefined,
            });

            localStorage.removeItem(STORAGE_KEY);
            toast.success("Ride posted! 🎉");
            fetch("/api/notify/suggested-matches-after-post", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rideId: ride.id }),
            }).catch(() => { });
            router.push(`/matches?ride=${ride.id}`);
        } catch (err) {
            console.error("Failed to post ride:", err);
            toast.error("Failed to post ride. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!origin || !destination || !date || !depHour) {
            toast.error("Please fill in all required fields");
            return;
        }

        // If user is not authenticated, save form data and redirect to signup
        if (!isAuthenticated) {
            const data = getFormData();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            toast.info("Create an account to post your ride!");
            router.push(`/signup?next=${encodeURIComponent("/post-ride?resume=true")}`);
            return;
        }

        await submitRide();
    };

    if (autoSubmitting) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-sm text-zinc-500">Posting your ride...</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Route */}
            <Card className="border-zinc-200">
                <CardHeader className="pb-0">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                        <MapPin className="h-4 w-4 text-blue-600" />
                        Route
                    </CardTitle>
                    <p className="mt-0.5 text-[11px] font-medium text-zinc-500">
                        Use a general area like UCLA or LAX. You can share the exact meetup spot later in chat.
                    </p>
                </CardHeader>
                <CardContent className="space-y-3 pt-1.5">
                    <div>
                        <Label className="text-xs text-zinc-600">Pickup location</Label>
                        <div className="mt-1.5">
                            <AddressInput
                                inputId="origin-address"
                                value={origin}
                                onChange={(val, addr) => {
                                    setOrigin(val);
                                    setOriginAddress(addr ?? null);
                                }}
                                placeholder="Where are you leaving from?"
                            />
                            {originAddress && (
                                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-600">
                                    <CheckCircle className="h-3.5 w-3.5" />
                                    <span>
                                        {originAddress.city || originAddress.formatted}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div>
                        <Label className="text-xs text-zinc-600">Destination</Label>
                        <div className="mt-1.5">
                            <AddressInput
                                inputId="destination-address"
                                value={destination}
                                onChange={(val, addr) => {
                                    setDestination(val);
                                    setDestAddress(addr ?? null);
                                }}
                                placeholder="Where are you heading?"
                            />
                            {destAddress && (
                                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-600">
                                    <CheckCircle className="h-3.5 w-3.5" />
                                    <span>{destAddress.city || destAddress.formatted}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Time */}
            <Card className="border-zinc-200">
                <CardHeader className="pb-1">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                        <Clock className="h-4 w-4 text-blue-600" />
                        When
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                    <div>
                        <Label className="text-xs text-zinc-600">Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="mt-1.5 flex h-11 w-full items-center justify-start bg-white text-left text-sm"
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4 text-zinc-400" />
                                    {date
                                        ? format(date, "EEE, MMM d, yyyy")
                                        : "Select date"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    disabled={(d) => d < new Date()}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <Separator />

                    <div>
                        <Label className="text-xs text-zinc-600">Departure time</Label>
                        <div className="mt-1.5 flex items-center gap-2">
                            <Select value={depHour} onValueChange={setDepHour}>
                                <SelectTrigger className="h-11 w-20">
                                    <SelectValue placeholder="Hr" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                                        <SelectItem key={h} value={h.toString()}>
                                            {h}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <span className="text-lg font-medium text-zinc-400">:</span>
                            <Select value={depMinute} onValueChange={setDepMinute}>
                                <SelectTrigger className="h-11 w-20">
                                    <SelectValue placeholder="Min" />
                                </SelectTrigger>
                                <SelectContent>
                                    {["00", "15", "30", "45"].map((m) => (
                                        <SelectItem key={m} value={m}>
                                            {m}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={depPeriod} onValueChange={setDepPeriod}>
                                <SelectTrigger className="h-11 w-20">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="AM">AM</SelectItem>
                                    <SelectItem value="PM">PM</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div>
                        <Label className="text-xs text-zinc-600">
                            Flexibility
                        </Label>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            {[
                                { value: "15", label: "15 min" },
                                { value: "30", label: "30 min" },
                                { value: "60", label: "1 hr" },
                                { value: "120", label: "2 hr" },
                                { value: "custom", label: "Custom (hr)" },
                                { value: "all_day", label: "All day" },
                            ].map(({ value, label }) => (
                                <Button
                                    key={value}
                                    type="button"
                                    variant={tolerance === value ? "default" : "outline"}
                                    className={[
                                        "h-9 text-xs",
                                        tolerance === value
                                            ? "bg-blue-600 text-white"
                                            : "bg-white text-zinc-700",
                                    ].join(" ")}
                                    onClick={() => setTolerance(value)}
                                >
                                    {label}
                                </Button>
                            ))}
                            {tolerance === "custom" && (
                                <Input
                                    type="number"
                                    min={1}
                                    max={24}
                                    value={customFlexibilityHours}
                                    onChange={(e) => setCustomFlexibilityHours(e.target.value.replace(/\D/g, "").slice(0, 2) || "1")}
                                    className="h-9 w-16 bg-white text-center text-xs tabular-nums"
                                    placeholder="hr"
                                />
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Travel details */}
            <Card className="border-zinc-200">
                <CardHeader className="pb-1">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                        <Users className="h-4 w-4 text-blue-600" />
                        Travel details
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                    <div>
                        <Label className="text-xs text-zinc-600">Seats needed</Label>
                        <Select value={seatsNeeded} onValueChange={setSeatsNeeded}>
                            <SelectTrigger className="mt-1.5 h-11">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {[1, 2, 3, 4].map((n) => (
                                    <SelectItem key={n} value={n.toString()}>
                                        {n} {n === 1 ? "person" : "people"}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Separator />

                    <div>
                        <Label className="text-xs text-zinc-600">
                            Luggage / space needed
                        </Label>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                            {SPACE_OPTIONS.map((opt) => (
                                <Button
                                    key={opt.value}
                                    type="button"
                                    variant={spaceCapacity === opt.value ? "default" : "outline"}
                                    className={[
                                        "h-auto justify-start py-3 text-left text-xs",
                                        spaceCapacity === opt.value
                                            ? "bg-blue-600 text-white"
                                            : "bg-white text-zinc-700",
                                    ].join(" ")}
                                    onClick={() => setSpaceCapacity(opt.value)}
                                >
                                    {opt.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Preferences */}
            <Card className="border-zinc-200">
                <CardHeader className="pb-1">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                        Ride preferences
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-3">
                    <div className="grid grid-cols-3 gap-2">
                        <Button
                            type="button"
                            variant={quietRide ? "default" : "outline"}
                            className={[
                                "h-14 flex-col gap-1 text-xs",
                                quietRide ? "bg-blue-600 text-white" : "bg-white text-zinc-700",
                            ].join(" ")}
                            onClick={() => setQuietRide(!quietRide)}
                        >
                            {quietRide ? (
                                <VolumeX className="h-4 w-4" />
                            ) : (
                                <Volume2 className="h-4 w-4" />
                            )}
                            Quiet ride
                        </Button>
                        <Button
                            type="button"
                            variant={musicOk ? "default" : "outline"}
                            className={[
                                "h-14 flex-col gap-1 text-xs",
                                musicOk ? "bg-blue-600 text-white" : "bg-white text-zinc-700",
                            ].join(" ")}
                            onClick={() => setMusicOk(!musicOk)}
                        >
                            <Music className="h-4 w-4" />
                            Music OK
                        </Button>
                        <Button
                            type="button"
                            variant={genderPref !== "any" ? "default" : "outline"}
                            className={[
                                "h-14 flex-col gap-1 text-xs",
                                genderPref !== "any"
                                    ? "bg-blue-600 text-white"
                                    : "bg-white text-zinc-700",
                            ].join(" ")}
                            onClick={() => {
                                const cycle = {
                                    any: "male" as const,
                                    male: "female" as const,
                                    female: "any" as const,
                                };
                                setGenderPref(cycle[genderPref]);
                            }}
                        >
                            <Users className="h-4 w-4" />
                            {genderPref === "any"
                                ? "Any gender"
                                : genderPref === "male"
                                    ? "Male only"
                                    : "Female only"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Notes */}
            <Card className="border-zinc-200">
                <CardContent className="space-y-3 p-4">
                    <Label className="text-sm font-medium text-zinc-900">
                        Special notes
                    </Label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Anything helpful for your ride buddy (e.g. large suitcase, meet at Terminal 3, etc.)"
                        className="h-24 w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                        maxLength={300}
                    />
                    <p className="text-right text-xs text-zinc-400">
                        {notes.length}/300
                    </p>
                </CardContent>
            </Card>

            <Button
                type="submit"
                size="lg"
                className="mt-2 h-12 w-full rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700"
                disabled={isSubmitting}
            >
                {isSubmitting ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Posting...
                    </>
                ) : isAuthenticated ? (
                    "Post ride request"
                ) : (
                    "Post ride request"
                )}
            </Button>

            {!isAuthenticated && (
                <p className="text-center text-xs text-zinc-400">
                    You&apos;ll be asked to create a free account to complete your post.
                </p>
            )}
        </form>
    );
}

export default function PublicPostRidePage() {
    return (
        <div className="min-h-screen bg-zinc-50">
            <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
                {/* Header */}
                <div className="space-y-1">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors mb-3"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to home
                    </Link>
                    <h1 className="text-xl font-bold text-zinc-900">Post a ride</h1>
                    <p className="text-sm text-zinc-500">
                        Share where you&apos;re heading and when. We&apos;ll match you with travelers going the same way.
                    </p>
                </div>

                <Suspense>
                    <PostRideForm />
                </Suspense>
            </div>
        </div>
    );
}
