"use client";

import { useState, useRef, useEffect } from "react";
import { createRide, getRideById, updateRide } from "@/lib/services/rideService";
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
} from "lucide-react";
import { PageHeader } from "@/components/page-header";

const SPACE_OPTIONS = [
  { value: "0", label: "No extra space needed" },
  { value: "1", label: "Small bag (backpack/purse)" },
  { value: "2", label: "One suitcase" },
  { value: "3", label: "Multiple or bulky items" },
];

interface StructuredAddress {
  formatted: string;
  city?: string;
  lat?: number;
  lng?: number;
}

function FallbackAddressInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (val: string, addr?: StructuredAddress) => void;
  placeholder: string;
}) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-11 bg-white"
    />
  );
}

function GooglePlacesInput({
  value,
  onChange,
  placeholder,
  inputId,
}: {
  value: string;
  onChange: (val: string, addr?: StructuredAddress) => void;
  placeholder: string;
  inputId?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [isLoaded, setIsLoaded] = useState(() => {
    if (typeof window === "undefined") return false;
    return !!window.google?.maps?.places;
  });
  const [scriptRequested, setScriptRequested] = useState(false);
  const [focused, setFocused] = useState(false);

  // Load Google Maps Places script, but only after the user interacts
  useEffect(() => {
    if (!scriptRequested) return;
    if (typeof window === "undefined") return;
    if (window.google?.maps?.places) {
      setIsLoaded(true);
      return;
    }
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src*="maps.googleapis.com"]',
    );
    if (existing) {
      if (existing.dataset.loaded === "true") {
        queueMicrotask(() => setIsLoaded(true));
      } else {
        existing.addEventListener("load", () => setIsLoaded(true), {
          once: true,
        });
      }
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.dataset.loaded = "false";
    script.onload = () => {
      script.dataset.loaded = "true";
      setIsLoaded(true);
    };
    document.head.appendChild(script);
  }, [scriptRequested]);

  // Initialize autocomplete when this input is focused and script is ready
  // (lazy per-field so destination gets its own dropdown when focused)
  useEffect(() => {
    if (
      !isLoaded ||
      !focused ||
      !inputRef.current ||
      autocompleteRef.current ||
      !window.google?.maps?.places
    ) {
      return;
    }

    const autocomplete = new window.google.maps.places.Autocomplete(
      inputRef.current,
      {
        types: ["geocode", "establishment"],
        fields: [
          "formatted_address",
          "geometry",
          "address_components",
          "name",
          "types",
        ],
      },
    );

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place.formatted_address) return;

      const city = place.address_components?.find((c) =>
        c.types.includes("locality"),
      )?.long_name;

      const isEstablishment = place.types?.some((t) =>
        [
          "airport",
          "university",
          "transit_station",
          "establishment",
          "point_of_interest",
        ].includes(t),
      );
      const displayName =
        isEstablishment && place.name ? place.name : place.formatted_address;

      onChangeRef.current(displayName, {
        formatted: place.formatted_address,
        city,
        lat: place.geometry?.location?.lat(),
        lng: place.geometry?.location?.lng(),
      });
    });

    autocompleteRef.current = autocomplete;
  }, [isLoaded, focused]);

  return (
    <Input
      ref={inputRef}
      id={inputId}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => {
        setFocused(true);
        if (!scriptRequested) {
          setScriptRequested(true);
        }
      }}
      placeholder={placeholder}
      className="h-11 bg-white"
    />
  );
}

function AddressInput(props: {
  value: string;
  onChange: (val: string, addr?: StructuredAddress) => void;
  placeholder: string;
  inputId?: string;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (apiKey && apiKey !== "your-google-maps-api-key-here") {
    return <GooglePlacesInput {...props} />;
  }
  return <FallbackAddressInput {...props} />;
}

async function geocodeText(text: string): Promise<StructuredAddress | null> {
  if (!text.trim() || !window.google?.maps) return null;
  try {
    const geocoder = new google.maps.Geocoder();
    const { results } = await geocoder.geocode({ address: text });
    if (results.length > 0) {
      const place = results[0];
      const city = place.address_components?.find((c) =>
        c.types.includes("locality"),
      )?.long_name;
      return {
        formatted: place.formatted_address,
        city,
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      };
    }
  } catch {
    // Geocoding failed; coords will be null
  }
  return null;
}

export default function PostRidePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editRideId = searchParams.get("edit");
  const { profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(!!editRideId);

  const rideType = "seeking";
  const [origin, setOrigin] = useState("");
  const [originAddress, setOriginAddress] =
    useState<StructuredAddress | null>(null);
  const [destination, setDestination] = useState("");
  const [destAddress, setDestAddress] =
    useState<StructuredAddress | null>(null);
  const [date, setDate] = useState<Date | undefined>(undefined);

  const [depHour, setDepHour] = useState("");
  const [depMinute, setDepMinute] = useState("00");
  const [depPeriod, setDepPeriod] = useState("AM");
  // Flexibility: 15, 30, 60 (1 hr), 120 (2 hr), or "all_day"
  const [tolerance, setTolerance] = useState<string>("15");

  const [seatsNeeded, setSeatsNeeded] = useState("1");
  const [spaceCapacity, setSpaceCapacity] = useState("1");

  const [quietRide, setQuietRide] = useState(false);
  const [musicOk, setMusicOk] = useState(false);
  const [genderPref, setGenderPref] =
    useState<"any" | "male" | "female">("any");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!editRideId || !profile) return;
    getRideById(editRideId)
      .then((ride) => {
        setOrigin(ride.origin_name);
        if (ride.origin_lat != null && ride.origin_lng != null) {
          setOriginAddress({ formatted: ride.origin_name, lat: ride.origin_lat, lng: ride.origin_lng });
        }
        setDestination(ride.dest_name);
        if (ride.dest_lat != null && ride.dest_lng != null) {
          setDestAddress({ formatted: ride.dest_name, lat: ride.dest_lat, lng: ride.dest_lng });
        }
        const e = new Date(ride.departure_earliest);
        const l = new Date(ride.departure_latest);
        const mid = new Date((e.getTime() + l.getTime()) / 2);
        setDate(mid);
        const h = mid.getHours();
        const m = mid.getMinutes();
        setDepPeriod(h >= 12 ? "PM" : "AM");
        setDepHour(String(h % 12 || 12));
        setDepMinute(m <= 15 ? "00" : m <= 45 ? "30" : "00");
        const diffMin = Math.round((l.getTime() - e.getTime()) / (2 * 60 * 1000));
        const dayMs = 24 * 60 * 60 * 1000;
        const spanMs = l.getTime() - e.getTime();
        if (spanMs >= dayMs * 0.9) {
          setTolerance("all_day");
        } else {
          const options = [15, 30, 60, 120];
          const closest = options.reduce((a, b) => (Math.abs(a - diffMin) <= Math.abs(b - diffMin) ? a : b));
          setTolerance(String(closest));
        }
        setSeatsNeeded(String(ride.seats_needed));
        setSpaceCapacity(String(ride.space_capacity));
        setQuietRide(ride.quiet_ride);
        setMusicOk(ride.music_ok);
        setGenderPref((ride.gender_pref as "any" | "male" | "female") || "any");
        setNotes(ride.notes || "");
      })
      .catch((err) => {
        console.error("Failed to load ride for edit:", err);
        toast.error("Could not load ride");
      })
      .finally(() => setLoadingEdit(false));
  }, [editRideId, profile]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!origin || !destination || !date || !depHour) {
      toast.error("Please fill in all required fields");
      return;
    }

    const departureTime = buildTime(date, depHour, depMinute, depPeriod);
    let departureEarliest: Date;
    let departureLatest: Date;
    if (tolerance === "all_day") {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      departureEarliest = d;
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      departureLatest = end;
    } else {
      const toleranceMin = parseInt(tolerance, 10) || 15;
      departureEarliest = new Date(
        departureTime.getTime() - toleranceMin * 60 * 1000,
      );
      departureLatest = new Date(
        departureTime.getTime() + toleranceMin * 60 * 1000,
      );
    }

    setIsSubmitting(true);

    try {
      let effectiveOrigin = originAddress;
      let effectiveDest = destAddress;

      if (origin && !effectiveOrigin?.lat) {
        const geocoded = await geocodeText(origin);
        if (geocoded) {
          effectiveOrigin = geocoded;
          setOriginAddress(geocoded);
        }
      }
      if (destination && !effectiveDest?.lat) {
        const geocoded = await geocodeText(destination);
        if (geocoded) {
          effectiveDest = geocoded;
          setDestAddress(geocoded);
        }
      }

      if (editRideId) {
        await updateRide(editRideId, {
          originName: origin,
          originLat: effectiveOrigin?.lat,
          originLng: effectiveOrigin?.lng,
          destName: destination,
          destLat: effectiveDest?.lat,
          destLng: effectiveDest?.lng,
          departureEarliest,
          departureLatest,
          departurePreferred: departureTime,
          seatsNeeded: rideType === "seeking" ? parseInt(seatsNeeded) : undefined,
          spaceCapacity: parseInt(spaceCapacity),
          quietRide,
          musicOk,
          genderPref,
          notes: notes.trim() || undefined,
        });
        toast.success("Ride updated");
        router.push("/home");
      } else {
        const ride = await createRide({
          rideType,
          originName: origin,
          originLat: effectiveOrigin?.lat,
          originLng: effectiveOrigin?.lng,
          destName: destination,
          destLat: effectiveDest?.lat,
          destLng: effectiveDest?.lng,
          departureEarliest,
          departureLatest,
          departurePreferred: departureTime,
          seatsAvailable: undefined,
          seatsNeeded: rideType === "seeking" ? parseInt(seatsNeeded) : undefined,
          spaceCapacity: parseInt(spaceCapacity),
          quietRide,
          musicOk,
          genderPref,
          notes: notes.trim() || undefined,
        });
        toast.success("Ride posted");
        router.push(`/matches?ride=${ride.id}`);
      }
    } catch (err) {
      console.error("Failed to post ride:", err);
      toast.error("Failed to post ride. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={editRideId ? "Edit ride" : "Post a ride"}
        subtitle={editRideId ? "Update your ride details." : "Share where you're heading and when."}
        backHref="/home"
      />

      {!profile && (
        <Card className="border-amber-200 bg-amber-50/80">
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div className="text-sm text-amber-900">
              You need to be logged in to post a ride.
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-amber-300 text-xs font-medium text-amber-900 hover:bg-amber-100"
              onClick={() => router.push("/login")}
            >
              Log in
            </Button>
          </CardContent>
        </Card>
      )}

      {loadingEdit && editRideId ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        </div>
      ) : (
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
              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  { value: "15", label: "15 min" },
                  { value: "30", label: "30 min" },
                  { value: "60", label: "1 hr" },
                  { value: "120", label: "2 hr" },
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
              {editRideId ? "Updating..." : "Posting..."}
            </>
          ) : editRideId ? (
            "Update ride"
          ) : (
            "Post ride request"
          )}
        </Button>
      </form>
      )}
    </div>
  );
}

