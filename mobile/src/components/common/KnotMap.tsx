import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, Platform, TouchableOpacity } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { Navigation } from 'lucide-react-native';
import { colors } from '../../design';

// Access Token is now initialized in App.tsx

interface KnotMapProps {
    style?: object;
    showUserLocation?: boolean;
    interactive?: boolean;
    showLocateButton?: boolean;
    initialRegion?: {
        latitude: number;
        longitude: number;
        latitudeDelta?: number;
        longitudeDelta?: number;
    };
    onLocationChange?: (location: { latitude: number; longitude: number }) => void;
    children?: React.ReactNode;
}

// Default to Irvine, CA
const DEFAULT_COORDINATES = [-117.8420, 33.6461]; // Longitude, Latitude

export function KnotMap({
    style,
    showUserLocation = true,
    interactive = false,
    showLocateButton = true,
    initialRegion,
    onLocationChange,
    children
}: KnotMapProps) {
    const cameraRef = useRef<Mapbox.Camera>(null);
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [mapReady, setMapReady] = useState(false);
    const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

    useEffect(() => {
        requestLocationPermission();
    }, [showUserLocation]);

    const onLayout = (event: any) => {
        const { width, height } = event.nativeEvent.layout;
        if (width > 0 && height > 0) {
            setDimensions({ width, height });
        }
    };

    const requestLocationPermission = async () => {
        if (!showUserLocation) {
            setLoading(false);
            return;
        }

        try {
            console.log('[KnotMap] Requesting location permission...');
            const { status } = await Location.requestForegroundPermissionsAsync();

            if (status !== 'granted') {
                console.log('[KnotMap] Permission denied');
                setErrorMsg('Allow location access in Settings');
                setLoading(false);
                return;
            }

            console.log('[KnotMap] Permission granted, getting location...');
            const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Highest,
            });

            console.log('[KnotMap] Got location:', loc.coords.latitude, loc.coords.longitude);
            setLocation(loc);

            if (onLocationChange) {
                onLocationChange({
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                });
            }
        } catch (err) {
            console.log('[KnotMap] Error:', err);
            setErrorMsg('Could not get location');
        } finally {
            setLoading(false);
        }
    };

    const centerOnUser = async () => {
        try {
            console.log('[KnotMap] Centering on user...');
            const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Highest,
            });
            setLocation(loc);

            if (cameraRef.current) {
                cameraRef.current.setCamera({
                    centerCoordinate: [loc.coords.longitude, loc.coords.latitude],
                    zoomLevel: 15,
                    animationDuration: 1000,
                });
            }
        } catch (err) {
            console.log('[KnotMap] Error centering:', err);
        }
    };

    const handleMapReady = () => {
        console.log('[KnotMap] Map ready');
        setMapReady(true);
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.loading, style]}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Getting location...</Text>
            </View>
        );
    }

    // Determine center coordinate
    const centerCoordinate = location
        ? [location.coords.longitude, location.coords.latitude]
        : initialRegion
            ? [initialRegion.longitude, initialRegion.latitude]
            : DEFAULT_COORDINATES;

    return (
        <View style={[styles.container, style]} onLayout={onLayout}>
            {dimensions && dimensions.width > 0 && dimensions.height > 0 && (
                <Mapbox.MapView
                    style={{ width: dimensions.width, height: dimensions.height }}
                    styleURL={Mapbox.StyleURL.Street}
                    onDidFinishLoadingMap={handleMapReady}
                    scaleBarEnabled={false}
                    rotateEnabled={false}
                    pitchEnabled={false}
                    scrollEnabled={interactive}
                    zoomEnabled={interactive}
                    attributionEnabled={false}
                    logoEnabled={false}
                >
                    <Mapbox.Camera
                        ref={cameraRef}
                        zoomLevel={14}
                        centerCoordinate={centerCoordinate}
                    />

                    {/* Show user location puck if authorized */}
                    {showUserLocation && (
                        <Mapbox.LocationPuck
                            pulsing={{
                                isEnabled: true,
                                color: colors.primary,
                                radius: 20.0
                            }}
                        />
                    )}

                    {/* Render children (Markers, Lines, etc.) */}
                    {children}

                </Mapbox.MapView>
            )}

            {/* Locate Me Button */}
            {showLocateButton && mapReady && (
                <TouchableOpacity
                    style={styles.locateButton}
                    onPress={centerOnUser}
                    activeOpacity={0.8}
                >
                    <Navigation size={20} color={colors.primary} />
                </TouchableOpacity>
            )}

            {errorMsg && (
                <View style={styles.errorOverlay}>
                    <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        borderRadius: 16,
        overflow: 'hidden',
        minHeight: 200,
        backgroundColor: colors.slate[100],
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    loading: {
        backgroundColor: colors.slate[100],
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 8,
        fontSize: 13,
        color: colors.text.muted,
    },
    errorOverlay: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 8,
        borderRadius: 8,
    },
    errorText: {
        fontSize: 12,
        color: '#fff',
        textAlign: 'center',
    },
    locateButton: {
        position: 'absolute',
        bottom: 16,
        right: 16,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
});
