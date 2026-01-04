import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, Platform, TouchableOpacity } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { MapPin, Navigation } from 'lucide-react-native';
import { colors } from '../../design';

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
}

// Default to Irvine, CA (24210 Arroyo Drive area)
const DEFAULT_REGION = {
    latitude: 33.6461,
    longitude: -117.8420,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
};

export function KnotMap({
    style,
    showUserLocation = true,
    interactive = false,
    showLocateButton = true,
    initialRegion,
    onLocationChange,
}: KnotMapProps) {
    const mapRef = useRef<MapView>(null);
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [mapReady, setMapReady] = useState(false);

    useEffect(() => {
        requestLocationPermission();
    }, [showUserLocation]);

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
                accuracy: Location.Accuracy.Balanced,
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
                accuracy: Location.Accuracy.Balanced,
            });
            setLocation(loc);
            mapRef.current?.animateToRegion({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            }, 500);
        } catch (err) {
            console.log('[KnotMap] Error centering:', err);
        }
    };

    const region = {
        latitude: initialRegion?.latitude ?? location?.coords.latitude ?? DEFAULT_REGION.latitude,
        longitude: initialRegion?.longitude ?? location?.coords.longitude ?? DEFAULT_REGION.longitude,
        latitudeDelta: initialRegion?.latitudeDelta ?? DEFAULT_REGION.latitudeDelta,
        longitudeDelta: initialRegion?.longitudeDelta ?? DEFAULT_REGION.longitudeDelta,
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

    return (
        <View style={[styles.container, style]}>
            <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_DEFAULT}
                initialRegion={region}
                showsUserLocation={true}
                showsMyLocationButton={false}
                scrollEnabled={interactive}
                zoomEnabled={interactive}
                rotateEnabled={false}
                pitchEnabled={false}
                onMapReady={handleMapReady}
            >
                {location && (
                    <Marker
                        coordinate={{
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                        }}
                        title="You are here"
                    >
                        <View style={styles.markerContainer}>
                            <View style={styles.markerOuter}>
                                <View style={styles.markerInner} />
                            </View>
                        </View>
                    </Marker>
                )}
            </MapView>

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

            {!mapReady && (
                <View style={styles.mapLoadingOverlay}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading map...</Text>
                </View>
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
    mapLoadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(248, 250, 252, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
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
    markerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    markerOuter: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0, 82, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    markerInner: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: colors.primary,
        borderWidth: 2,
        borderColor: '#fff',
    },
});
