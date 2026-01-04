/**
 * Map Context
 * Global state machine for map + search synchronization
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import * as Location from 'expo-location';
import { Destination } from '../types/destination';

// Map states
export type MapState =
    | 'IDLE'                    // Camera follows user
    | 'SEARCHING'               // Camera frozen, search active
    | 'PREVIEWING_DESTINATION'  // Preview pin shown
    | 'DESTINATION_SELECTED';   // Destination confirmed

export interface UserLocation {
    latitude: number;
    longitude: number;
    heading?: number;
    accuracy?: number;
}

interface MapContextType {
    // State
    mapState: MapState;
    userLocation: UserLocation | null;
    previewDestination: Destination | null;
    selectedDestination: Destination | null;

    // Actions
    setSearching: () => void;
    setPreviewDestination: (destination: Destination) => void;
    setSelectedDestination: (destination: Destination) => void;
    clearDestination: () => void;
    returnToIdle: () => void;

    // Callbacks for external listeners
    onDestinationPreview?: (destination: Destination) => void;
    onDestinationSelected?: (destination: Destination) => void;
}

const MapContext = createContext<MapContextType | undefined>(undefined);

// Default location (San Francisco)
const DEFAULT_LOCATION: UserLocation = {
    latitude: 37.7749,
    longitude: -122.4194,
};

interface MapProviderProps {
    children: ReactNode;
    onDestinationPreview?: (destination: Destination) => void;
    onDestinationSelected?: (destination: Destination) => void;
}

export function MapProvider({
    children,
    onDestinationPreview,
    onDestinationSelected,
}: MapProviderProps) {
    // State machine
    const [mapState, setMapState] = useState<MapState>('IDLE');
    const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
    const [previewDest, setPreviewDest] = useState<Destination | null>(null);
    const [selectedDest, setSelectedDest] = useState<Destination | null>(null);

    // Location subscription
    const locationSubscription = useRef<Location.LocationSubscription | null>(null);

    // Start location tracking on mount
    useEffect(() => {
        startLocationTracking();
        return () => {
            if (locationSubscription.current) {
                locationSubscription.current.remove();
            }
        };
    }, []);

    const startLocationTracking = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                console.log('[MapContext] Location permission denied');
                setUserLocation(DEFAULT_LOCATION);
                return;
            }

            // Get initial location
            const initialLocation = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            setUserLocation({
                latitude: initialLocation.coords.latitude,
                longitude: initialLocation.coords.longitude,
                heading: initialLocation.coords.heading ?? undefined,
                accuracy: initialLocation.coords.accuracy ?? undefined,
            });

            // Start watching location (throttled to every 3 seconds)
            locationSubscription.current = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.Balanced,
                    timeInterval: 3000,
                    distanceInterval: 10, // meters
                },
                (location) => {
                    setUserLocation({
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        heading: location.coords.heading ?? undefined,
                        accuracy: location.coords.accuracy ?? undefined,
                    });
                }
            );
        } catch (error) {
            console.error('[MapContext] Error starting location tracking:', error);
            setUserLocation(DEFAULT_LOCATION);
        }
    };

    // Actions
    const setSearching = useCallback(() => {
        console.log('[MapContext] → SEARCHING');
        setMapState('SEARCHING');
    }, []);

    const handlePreviewDestination = useCallback((destination: Destination) => {
        console.log('[MapContext] → PREVIEWING_DESTINATION:', destination.name);
        setPreviewDest(destination);
        setMapState('PREVIEWING_DESTINATION');
        onDestinationPreview?.(destination);
    }, [onDestinationPreview]);

    const handleSelectDestination = useCallback((destination: Destination) => {
        console.log('[MapContext] → DESTINATION_SELECTED:', destination.name);
        setSelectedDest(destination);
        setPreviewDest(null);
        setMapState('DESTINATION_SELECTED');
        onDestinationSelected?.(destination);
    }, [onDestinationSelected]);

    const clearDestination = useCallback(() => {
        console.log('[MapContext] → Clearing destination');
        setSelectedDest(null);
        setPreviewDest(null);
        setMapState('IDLE');
    }, []);

    const returnToIdle = useCallback(() => {
        console.log('[MapContext] → IDLE');
        setPreviewDest(null);
        setMapState('IDLE');
    }, []);

    const value: MapContextType = {
        mapState,
        userLocation,
        previewDestination: previewDest,
        selectedDestination: selectedDest,
        setSearching,
        setPreviewDestination: handlePreviewDestination,
        setSelectedDestination: handleSelectDestination,
        clearDestination,
        returnToIdle,
        onDestinationPreview,
        onDestinationSelected,
    };

    return (
        <MapContext.Provider value={value}>
            {children}
        </MapContext.Provider>
    );
}

export function useMap() {
    const context = useContext(MapContext);
    if (context === undefined) {
        throw new Error('useMap must be used within a MapProvider');
    }
    return context;
}
