"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";

export interface StructuredAddress {
    formatted: string;
    city?: string;
    lat?: number;
    lng?: number;
}

function FallbackAddressInput({
    value,
    onChange,
    placeholder,
    className,
}: {
    value: string;
    onChange: (val: string, addr?: StructuredAddress) => void;
    placeholder: string;
    className?: string;
}) {
    return (
        <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={className ?? "h-11 bg-white"}
        />
    );
}

function GooglePlacesInput({
    value,
    onChange,
    placeholder,
    inputId,
    className,
}: {
    value: string;
    onChange: (val: string, addr?: StructuredAddress) => void;
    placeholder: string;
    inputId?: string;
    className?: string;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
    const onChangeRef = useRef(onChange);

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

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
            queueMicrotask(() => setIsLoaded(true));
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
            className={className ?? "h-11 bg-white"}
        />
    );
}

export function AddressInput(props: {
    value: string;
    onChange: (val: string, addr?: StructuredAddress) => void;
    placeholder: string;
    inputId?: string;
    className?: string;
}) {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (apiKey && apiKey !== "your-google-maps-api-key-here") {
        return <GooglePlacesInput {...props} />;
    }
    return <FallbackAddressInput {...props} />;
}

export async function geocodeText(text: string): Promise<StructuredAddress | null> {
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
