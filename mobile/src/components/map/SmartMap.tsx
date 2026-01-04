/**
 * SmartMap Component
 * State-aware map with camera control based on MapContext state
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform, Animated } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, Region, LatLng } from 'react-native-maps';
import { useMap, MapState } from '../../contexts/MapContext';
import { colors } from '../../design';

interface SmartMapProps {
    style?: object;
}

// Camera padding for fitting bounds
const EDGE_PADDING = { top: 100, right: 50, bottom: 300, left: 50 };

// Default delta for single point view
const DEFAULT_DELTA = 0.01;

export function SmartMap({ style }: SmartMapProps) {
    const mapRef = useRef<MapView>(null);
    const {
        mapState,
        userLocation,
        previewDestination,
        selectedDestination
    } = useMap();

    const [mapReady, setMapReady] = useState(false);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Pulse animation for user marker
    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.3,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, []);

    // Handle camera changes based on state
    useEffect(() => {
        if (!mapReady || !mapRef.current || !userLocation) return;

        console.log('[SmartMap] State changed to:', mapState);

        switch (mapState) {
            case 'IDLE':
                // Center on user with smooth animation
                animateToCordinates([{
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude,
                }]);
                break;

            case 'SEARCHING':
                // Camera stays frozen - do nothing
                break;

            case 'PREVIEWING_DESTINATION':
                // Fit user + preview destination
                if (previewDestination && userLocation) {
                    animateToCordinates([
                        { latitude: userLocation.latitude, longitude: userLocation.longitude },
                        { latitude: previewDestination.latitude, longitude: previewDestination.longitude },
                    ]);
                }
                break;

            case 'DESTINATION_SELECTED':
                // Fit user + selected destination
                if (selectedDestination && userLocation) {
                    animateToCordinates([
                        { latitude: userLocation.latitude, longitude: userLocation.longitude },
                        { latitude: selectedDestination.latitude, longitude: selectedDestination.longitude },
                    ]);
                }
                break;
        }
    }, [mapState, mapReady, previewDestination, selectedDestination]);

    // Follow user in IDLE state
    useEffect(() => {
        if (mapState === 'IDLE' && mapReady && mapRef.current && userLocation) {
            mapRef.current.animateToRegion({
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                latitudeDelta: DEFAULT_DELTA,
                longitudeDelta: DEFAULT_DELTA,
            }, 500);
        }
    }, [userLocation, mapState, mapReady]);

    const animateToCordinates = (coordinates: LatLng[]) => {
        if (!mapRef.current) return;

        if (coordinates.length === 1) {
            mapRef.current.animateToRegion({
                ...coordinates[0],
                latitudeDelta: DEFAULT_DELTA,
                longitudeDelta: DEFAULT_DELTA,
            }, 500);
        } else {
            mapRef.current.fitToCoordinates(coordinates, {
                edgePadding: EDGE_PADDING,
                animated: true,
            });
        }
    };

    const handleMapReady = () => {
        console.log('[SmartMap] Map ready');
        setMapReady(true);
    };

    // Determine which destination to show
    const destinationToShow = selectedDestination || previewDestination;
    const isPreview = !!previewDestination && !selectedDestination;

    return (
        <View style={[styles.container, style]}>
            <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_DEFAULT}
                showsUserLocation={false} // We'll render our own marker
                showsMyLocationButton={false}
                showsCompass={false}
                showsScale={false}
                showsIndoors={false}
                showsBuildings={false}
                showsPointsOfInterest={false}
                showsTraffic={false}
                mapPadding={EDGE_PADDING}
                onMapReady={handleMapReady}
                initialRegion={{
                    latitude: userLocation?.latitude || 37.7749,
                    longitude: userLocation?.longitude || -122.4194,
                    latitudeDelta: DEFAULT_DELTA,
                    longitudeDelta: DEFAULT_DELTA,
                }}
            >
                {/* User Location Marker */}
                {userLocation && (
                    <Marker
                        coordinate={{
                            latitude: userLocation.latitude,
                            longitude: userLocation.longitude,
                        }}
                        anchor={{ x: 0.5, y: 0.5 }}
                    >
                        <View style={styles.userMarkerContainer}>
                            <Animated.View
                                style={[
                                    styles.userMarkerPulse,
                                    { transform: [{ scale: pulseAnim }] }
                                ]}
                            />
                            <View style={styles.userMarkerDot}>
                                {userLocation.heading && (
                                    <View
                                        style={[
                                            styles.headingCone,
                                            { transform: [{ rotate: `${userLocation.heading}deg` }] }
                                        ]}
                                    />
                                )}
                            </View>
                        </View>
                    </Marker>
                )}

                {/* Destination Marker (Preview or Selected) */}
                {destinationToShow && (
                    <Marker
                        coordinate={{
                            latitude: destinationToShow.latitude,
                            longitude: destinationToShow.longitude,
                        }}
                        anchor={{ x: 0.5, y: 1 }}
                    >
                        <View style={styles.destinationMarkerContainer}>
                            <View style={[
                                styles.destinationPin,
                                isPreview ? styles.previewPin : styles.selectedPin
                            ]}>
                                <View style={[
                                    styles.pinInner,
                                    isPreview ? styles.previewPinInner : styles.selectedPinInner
                                ]} />
                            </View>
                            <View style={[
                                styles.pinShadow,
                                isPreview && styles.previewPinShadow
                            ]} />
                        </View>
                    </Marker>
                )}
            </MapView>

            {/* Dim overlay during search */}
            {mapState === 'SEARCHING' && (
                <View style={styles.dimOverlay} pointerEvents="none" />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    dimOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    // User marker styles
    userMarkerContainer: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    userMarkerPulse: {
        position: 'absolute',
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0, 82, 255, 0.15)',
    },
    userMarkerDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: colors.primary,
        borderWidth: 3,
        borderColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    headingCone: {
        position: 'absolute',
        top: -8,
        left: 3,
        width: 0,
        height: 0,
        borderLeftWidth: 5,
        borderRightWidth: 5,
        borderBottomWidth: 10,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: colors.primary,
    },
    // Destination marker styles
    destinationMarkerContainer: {
        alignItems: 'center',
    },
    destinationPin: {
        width: 32,
        height: 40,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 6,
    },
    previewPin: {
        opacity: 0.7,
    },
    selectedPin: {
        opacity: 1,
    },
    pinInner: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 3,
    },
    previewPinInner: {
        backgroundColor: '#fff',
        borderColor: colors.primary,
    },
    selectedPinInner: {
        backgroundColor: colors.primary,
        borderColor: '#fff',
    },
    pinShadow: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(0,0,0,0.2)',
        marginTop: 2,
    },
    previewPinShadow: {
        opacity: 0.5,
    },
});
