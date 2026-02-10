/**
 * SmartMap Component
 * State-aware map with camera control based on MapContext state
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { useMap, MapState } from '../../contexts/MapContext';
import { colors } from '../../design';

interface SmartMapProps {
    style?: object;
}

// Camera padding for fitting bounds
// [top, right, bottom, left]
const EDGE_PADDING = [100, 50, 300, 50];

// Default delta/zoom
const DEFAULT_ZOOM = 14;

export function SmartMap({ style }: SmartMapProps) {
    const cameraRef = useRef<Mapbox.Camera>(null);
    const {
        mapState,
        userLocation,
        previewDestination,
        selectedDestination
    } = useMap();

    const [mapReady, setMapReady] = useState(false);
    const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
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

    const onLayout = (event: any) => {
        const { width, height } = event.nativeEvent.layout;
        if (width > 0 && height > 0) {
            setDimensions({ width, height });
        }
    };

    // Handle camera changes based on state
    useEffect(() => {
        if (!mapReady || !cameraRef.current || !userLocation) return;

        console.log('[SmartMap] State changed to:', mapState);

        switch (mapState) {
            case 'IDLE':
                // Center on user
                cameraRef.current.setCamera({
                    centerCoordinate: [userLocation.longitude, userLocation.latitude],
                    zoomLevel: DEFAULT_ZOOM,
                    animationDuration: 1000,
                });
                break;

            case 'SEARCHING':
                // Camera stays frozen - do nothing
                break;

            case 'PREVIEWING_DESTINATION':
                // Fit user + preview destination
                if (previewDestination && userLocation) {
                    fitToCoordinates([
                        [userLocation.longitude, userLocation.latitude],
                        [previewDestination.longitude, previewDestination.latitude]
                    ]);
                }
                break;

            case 'DESTINATION_SELECTED':
                // Fit user + selected destination
                if (selectedDestination && userLocation) {
                    fitToCoordinates([
                        [userLocation.longitude, userLocation.latitude],
                        [selectedDestination.longitude, selectedDestination.latitude]
                    ]);
                }
                break;
        }
    }, [mapState, mapReady, previewDestination, selectedDestination, userLocation]);

    // Follow user in IDLE state
    useEffect(() => {
        if (mapState === 'IDLE' && mapReady && cameraRef.current && userLocation) {
            cameraRef.current.setCamera({
                centerCoordinate: [userLocation.longitude, userLocation.latitude],
                animationDuration: 1000,
            });
        }
    }, [userLocation, mapState, mapReady]);

    const fitToCoordinates = (coordinates: number[][]) => {
        if (!cameraRef.current) return;

        // Calculate bounds
        const lngs = coordinates.map(c => c[0]);
        const lats = coordinates.map(c => c[1]);
        const sw = [Math.min(...lngs), Math.min(...lats)];
        const ne = [Math.max(...lngs), Math.max(...lats)];

        cameraRef.current?.fitBounds(
            sw,
            ne,
            EDGE_PADDING,
            1000 // duration
        );
    };

    const handleMapReady = () => {
        console.log('[SmartMap] Map ready');
        setMapReady(true);
    };

    // Determine which destination to show
    const destinationToShow = selectedDestination || previewDestination;
    const isPreview = !!previewDestination && !selectedDestination;

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
                    attributionEnabled={false}
                    logoEnabled={false}
                >
                    <Mapbox.Camera
                        ref={cameraRef}
                        zoomLevel={DEFAULT_ZOOM}
                        centerCoordinate={userLocation ? [userLocation.longitude, userLocation.latitude] : [-122.4194, 37.7749]}
                    />

                    {/* User Location - use built-in LocationPuck */}
                    {userLocation && (
                        <Mapbox.LocationPuck
                            pulsing={{
                                isEnabled: true,
                                color: colors.primary,
                                radius: 20.0
                            }}
                        />
                    )}

                    {/* Destination Marker (Preview or Selected) */}
                    {destinationToShow && (
                        <Mapbox.PointAnnotation
                            id="destination"
                            coordinate={[destinationToShow.longitude, destinationToShow.latitude]}
                            anchor={{ x: 0.5, y: 1 }}
                        >
                            <View style={[styles.destinationPin, isPreview ? styles.previewPin : styles.selectedPin]} />
                        </Mapbox.PointAnnotation>
                    )}
                </Mapbox.MapView>
            )}

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
    destinationPin: {
        width: 24,
        height: 24,
        borderRadius: 4,
        backgroundColor: colors.primary,
        borderWidth: 3,
        borderColor: '#fff',
    },
    previewPin: {
        opacity: 0.7,
        backgroundColor: '#fff',
        borderColor: colors.primary,
    },
    selectedPin: {
        opacity: 1,
        backgroundColor: colors.primary,
        borderColor: '#fff',
    },
});
