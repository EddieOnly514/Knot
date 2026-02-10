"use client";

import { useState, useEffect, useRef } from "react";
import { createTripIntent } from "@/lib/services/tripService";
import { useRouter } from "next/navigation";
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
    ArrowLeft,
    MapPin,
    Calendar as CalendarIcon,
    Clock,
    Users,
    Loader2,
    CheckCircle,
    Navigation,
    Car,
} from "lucide-react";


const LUGGAGE_OPTIONS = [
    { value: "none", label: "No, just me" },
    { value: "small", label: "Small bag (backpack/purse)" },
    { value: "one_large", label: "One larger item" },
    { value: "multiple", label: "Multiple or bulky items" },
];

// Structured address from Google Places
interface StructuredAddress {
    formatted: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    lat: number;
    lng: number;
}

// Load Google Maps script once
let googleMapsLoaded = false;
let googleMapsLoadPromise: Promise<void> | null = null;

function loadGoogleMaps(): Promise<void> {
    if (googleMapsLoaded) return Promise.resolve();
    if (googleMapsLoadPromise) return googleMapsLoadPromise;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === "your_google_maps_api_key_here") {
        return Promise.reject(new Error("No Google Maps API key"));
    }

    googleMapsLoadPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.onload = () => {
            googleMapsLoaded = true;
            resolve();
        };
        script.onerror = () => reject(new Error("Failed to load Google Maps"));
        document.head.appendChild(script);
    });

    return googleMapsLoadPromise;
}

function parsePlace(place: google.maps.places.PlaceResult): StructuredAddress {
    const components = place.address_components || [];
    const get = (type: string) =>
        components.find((c) => c.types.includes(type))?.long_name || "";

    return {
        formatted: place.formatted_address || "",
        street: [get("street_number"), get("route")].filter(Boolean).join(" "),
        city: get("locality") || get("sublocality") || get("administrative_area_level_2"),
        state: get("administrative_area_level_1"),
        zip: get("postal_code"),
        country: get("country"),
        lat: place.geometry?.location?.lat() || 0,
        lng: place.geometry?.location?.lng() || 0,
    };
}

// Google Places Autocomplete input component
function GoogleAddressInput({
    placeholder,
    icon: Icon,
    value,
    onChange,
    onSelect,
    validated,
}: {
    placeholder: string;
    icon: React.ComponentType<{ className?: string }>;
    value: string;
    onChange: (v: string) => void;
    onSelect: (address: StructuredAddress) => void;
    validated: boolean;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        loadGoogleMaps()
            .then(() => setReady(true))
            .catch(() => setReady(false));
    }, []);

    useEffect(() => {
        if (!ready || !inputRef.current || autocompleteRef.current) return;

        const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
            types: ["geocode", "establishment"],
            fields: ["formatted_address", "geometry", "address_components"],
        });

        autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            if (place.formatted_address) {
                const structured = parsePlace(place);
                onChange(structured.formatted);
                onSelect(structured);
            }
        });

        autocompleteRef.current = autocomplete;
    }, [ready, onChange, onSelect]);

    return (
        <div className="relative">
            <Input
                ref={inputRef}
                placeholder={ready ? placeholder : "Loading address search..."}
                className="h-12 pr-10"
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                }}
                disabled={!ready}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {!ready ? (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                ) : validated ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                    <Icon className="w-4 h-4 text-slate-400" />
                )}
            </div>
        </div>
    );
}

// Fallback input when Google Maps key isn't set
function FallbackAddressInput({
    placeholder,
    icon: Icon,
    value,
    onChange,
    onSelect,
    validated,
}: {
    placeholder: string;
    icon: React.ComponentType<{ className?: string }>;
    value: string;
    onChange: (v: string) => void;
    onSelect: (address: StructuredAddress) => void;
    validated: boolean;
}) {
    const [suggestions, setSuggestions] = useState<{ display_name: string; lat: string; lon: string; place_id: number }[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [loading, setLoading] = useState(false);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const searchAddress = async (query: string) => {
        if (query.length < 3) { setSuggestions([]); return; }
        setLoading(true);
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
                { headers: { "Accept-Language": "en" } }
            );
            const data = await res.json();
            setSuggestions(data);
            setShowSuggestions(data.length > 0);
        } catch {
            setSuggestions([]);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (val: string) => {
        onChange(val);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => searchAddress(val), 300);
    };

    return (
        <div ref={containerRef} className="relative">
            <div className="relative">
                <Input
                    placeholder={placeholder}
                    className="h-12 pr-10"
                    value={value}
                    onChange={(e) => handleChange(e.target.value)}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    ) : validated ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                        <Icon className="w-4 h-4 text-slate-400" />
                    )}
                </div>
            </div>
            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white rounded-lg border border-slate-200 shadow-lg overflow-hidden">
                    {suggestions.map((s) => (
                        <button
                            key={s.place_id}
                            type="button"
                            className="w-full px-4 py-3 text-left text-sm hover:bg-blue-50 transition-colors flex items-start gap-2 border-b border-slate-100 last:border-0"
                            onClick={() => {
                                onChange(s.display_name);
                                onSelect({
                                    formatted: s.display_name,
                                    street: "",
                                    city: "",
                                    state: "",
                                    zip: "",
                                    country: "",
                                    lat: parseFloat(s.lat),
                                    lng: parseFloat(s.lon),
                                });
                                setShowSuggestions(false);
                            }}
                        >
                            <MapPin className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <span className="text-slate-700 line-clamp-2">{s.display_name}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// Unified address input — uses Google if key is set, falls back to Nominatim
function AddressInput(props: {
    placeholder: string;
    icon: React.ComponentType<{ className?: string }>;
    value: string;
    onChange: (v: string) => void;
    onSelect: (address: StructuredAddress) => void;
    validated: boolean;
}) {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const hasGoogleKey = apiKey && apiKey !== "your_google_maps_api_key_here";

    if (hasGoogleKey) {
        return <GoogleAddressInput {...props} />;
    }
    return <FallbackAddressInput {...props} />;
}

export default function PostTripPage() {
    const router = useRouter();
    const { profile } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [departure, setDeparture] = useState("");
    const [departureAddress, setDepartureAddress] = useState<StructuredAddress | null>(null);
    const [destination, setDestination] = useState("");
    const [destinationAddress, setDestinationAddress] = useState<StructuredAddress | null>(null);
    const [date, setDate] = useState<Date | undefined>(undefined);
    const [rideHour, setRideHour] = useState("");
    const [rideMinute, setRideMinute] = useState("00");
    const [ridePeriod, setRidePeriod] = useState("AM");
    const [partySize, setPartySize] = useState("1");
    const [luggage, setLuggage] = useState("none");
    const [carPreference, setCarPreference] = useState<"standard" | "premium">("standard");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!departure || !destination || !date || !rideHour) {
            toast.error("Please fill in all required fields");
            return;
        }

        // Build departure time from date + hour + minute + period
        const hour24 = ridePeriod === "AM"
            ? (parseInt(rideHour) === 12 ? 0 : parseInt(rideHour))
            : (parseInt(rideHour) === 12 ? 12 : parseInt(rideHour) + 12);
        const departureTime = new Date(date);
        departureTime.setHours(hour24, parseInt(rideMinute), 0, 0);

        setIsSubmitting(true);

        try {
            const trip = await createTripIntent({
                departureAddress: departure,
                departureCity: departureAddress?.city,
                departureLat: departureAddress?.lat,
                departureLng: departureAddress?.lng,
                destination: destination,
                destinationAddress: destinationAddress?.formatted || destination,
                destinationCity: destinationAddress?.city,
                destinationLat: destinationAddress?.lat,
                destinationLng: destinationAddress?.lng,
                departureTime,
                partySize: parseInt(partySize),
                luggage,
                carPreference,
            });
            toast.success("Ride request posted!");
            router.push(`/matches?trip=${trip.id}`);
        } catch (err) {
            console.error("Failed to post trip:", err);
            toast.error("Failed to post ride request. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.back()}
                        className="p-2"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="text-lg font-semibold text-slate-900">
                        Post Ride Request
                    </h1>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 py-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Departure Address */}
                    <Card>
                        <CardHeader className="pb-0">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Navigation className="w-5 h-5 text-blue-600" />
                                Where are you departing from?
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <AddressInput
                                icon={Navigation}
                                placeholder="Enter your pickup address"
                                value={departure}
                                onChange={(v) => {
                                    setDeparture(v);
                                    setDepartureAddress(null);
                                }}
                                onSelect={(addr) => {
                                    setDepartureAddress(addr);
                                    setDeparture(addr.formatted);
                                }}
                                validated={!!departureAddress}
                            />
                            {departureAddress && (
                                <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" />
                                    {[departureAddress.city, departureAddress.state].filter(Boolean).join(", ") || "Address verified"}
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Destination Address */}
                    <Card>
                        <CardHeader className="pb-0">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <MapPin className="w-5 h-5 text-blue-600" />
                                Where are you heading?
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <AddressInput
                                icon={MapPin}
                                placeholder="Enter your destination address"
                                value={destination}
                                onChange={(v) => {
                                    setDestination(v);
                                    setDestinationAddress(null);
                                }}
                                onSelect={(addr) => {
                                    setDestinationAddress(addr);
                                    setDestination(addr.formatted);
                                }}
                                validated={!!destinationAddress}
                            />
                            {destinationAddress && (
                                <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" />
                                    {[destinationAddress.city, destinationAddress.state].filter(Boolean).join(", ") || "Address verified"}
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Date & Time */}
                    <Card>
                        <CardHeader className="pb-0">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <CalendarIcon className="w-5 h-5 text-blue-600" />
                                When do you need the ride?
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label className="text-sm text-slate-600">Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="w-full h-12 justify-start text-left font-normal mt-1"
                                        >
                                            <CalendarIcon className="w-4 h-4 mr-2" />
                                            {date ? format(date, "EEEE, MMMM d, yyyy") : "Select date"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={date}
                                            onSelect={setDate}
                                            disabled={(d) => d < new Date()}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div>
                                <Label className="text-sm text-slate-600">Departure Time</Label>
                                <div className="flex items-center gap-2 mt-1">
                                    <Select value={rideHour} onValueChange={setRideHour}>
                                        <SelectTrigger className="h-12 w-24">
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
                                    <span className="text-lg font-medium text-slate-400">:</span>
                                    <Select value={rideMinute} onValueChange={setRideMinute}>
                                        <SelectTrigger className="h-12 w-24">
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
                                    <Select value={ridePeriod} onValueChange={setRidePeriod}>
                                        <SelectTrigger className="h-12 w-24">
                                            <SelectValue placeholder="AM" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="AM">AM</SelectItem>
                                            <SelectItem value="PM">PM</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Party Size & Luggage */}
                    <Card>
                        <CardHeader className="pb-0">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Users className="w-5 h-5 text-blue-600" />
                                Travel Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label className="text-sm text-slate-600">Party Size</Label>
                                <Select value={partySize} onValueChange={setPartySize}>
                                    <SelectTrigger className="h-12 mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[1, 2, 3, 4].map((num) => (
                                            <SelectItem key={num} value={num.toString()}>
                                                {num} {num === 1 ? "person" : "people"}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Separator />

                            <div>
                                <Label className="text-sm text-slate-600">Luggage</Label>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    {LUGGAGE_OPTIONS.map((opt) => (
                                        <Button
                                            key={opt.value}
                                            type="button"
                                            variant={luggage === opt.value ? "default" : "outline"}
                                            className={`h-auto py-3 justify-start ${luggage === opt.value
                                                ? "bg-blue-600 text-white"
                                                : "bg-white"
                                                }`}
                                            onClick={() => setLuggage(opt.value)}
                                        >
                                            <span className="text-sm">{opt.label}</span>
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <Separator />

                            {/* Car Preference */}
                            <div>
                                <Label className="text-sm text-slate-600">Car Preference</Label>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <Button
                                        type="button"
                                        variant={carPreference === "standard" ? "default" : "outline"}
                                        className={`h-auto py-3 justify-start ${carPreference === "standard" ? "bg-blue-600 text-white" : "bg-white"}`}
                                        onClick={() => setCarPreference("standard")}
                                    >
                                        <Car className="w-4 h-4 mr-2" />
                                        <div className="text-left">
                                            <div className="text-sm font-medium">Standard</div>
                                            <div className="text-xs opacity-70">Up to 4 riders</div>
                                        </div>
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={carPreference === "premium" ? "default" : "outline"}
                                        className={`h-auto py-3 justify-start ${carPreference === "premium" ? "bg-blue-600 text-white" : "bg-white"}`}
                                        onClick={() => setCarPreference("premium")}
                                    >
                                        <Car className="w-4 h-4 mr-2" />
                                        <div className="text-left">
                                            <div className="text-sm font-medium">Premium</div>
                                            <div className="text-xs opacity-70">Up to 6 riders</div>
                                        </div>
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Submit */}
                    <Button
                        type="submit"
                        size="lg"
                        className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-lg font-semibold"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Posting...
                            </>
                        ) : (
                            "Post Ride Request"
                        )}
                    </Button>
                </form>
            </main>
        </div>
    );
}
