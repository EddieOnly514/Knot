import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    TextInput,
    ScrollView,
    Animated,
    Dimensions,
    Modal,
    Platform,
    Alert,
    ActivityIndicator,
} from 'react-native';
import Mapbox from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
    Users,
    Briefcase,
    Clock,
    Car,
    MapPin,
    ChevronUp,
    ChevronDown,
    Search,
} from 'lucide-react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../../design';
import type { RootStackParamList } from '../../types/navigation';
import { BackButton } from '../../components/common/BackButton';
import { tripService } from '../../services/tripService';
import { useAuth } from '../../contexts/AuthContext';
import { KnotMap } from '../../components/common/KnotMap';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const COLLAPSED_HEIGHT = 180;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.7;

const PARTY_SIZES = ['1', '2', '3', '4+'];
const LUGGAGE_OPTIONS = [
    { id: 'none', label: 'None / Backpack' },
    { id: 'one', label: '1 Luggage' },
    { id: 'two', label: '2+ Luggage' },
];
const RIDE_OPTIONS = [
    { id: 'standard', label: 'Standard', subtitle: 'Up to 4 passengers' },
    { id: 'xl', label: 'XL', subtitle: 'Up to 6 passengers' },
];

export function TripSearchScreen() {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute<RouteProp<RootStackParamList, 'TripSearch'>>();
    const { profile } = useAuth();

    // Get destination from navigation params if passed from DestinationSearchScreen
    const passedDestination = route.params?.destination;
    // @ts-ignore - origin might not be typed yet in navigation params but passed from PlanRide
    const passedOrigin = route.params?.origin;

    const [destination, setDestination] = useState(passedDestination?.name || '');
    const [destinationData, setDestinationData] = useState(passedDestination || null);
    const [partySize, setPartySize] = useState('1');
    const [luggage, setLuggage] = useState('none');
    const [rideType, setRideType] = useState<'standard' | 'xl'>('standard');
    const [isExpanded, setIsExpanded] = useState(true); // Start expanded
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [leaveNow, setLeaveNow] = useState(true);
    const [selectedTime, setSelectedTime] = useState(new Date());
    const [isCreating, setIsCreating] = useState(false);
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [mapDimensions, setMapDimensions] = useState<{ width: number; height: number } | null>(null);

    const sheetHeight = useRef(new Animated.Value(EXPANDED_HEIGHT)).current;
    const cameraRef = useRef<Mapbox.Camera>(null);

    // Get user location on mount
    useEffect(() => {
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
                    setUserLocation({
                        latitude: loc.coords.latitude,
                        longitude: loc.coords.longitude,
                    });
                }
            } catch (err) {
                console.log('[TripSearch] Location error:', err);
            }
        })();
    }, []);

    // Fit map to show route when destination loads
    useEffect(() => {
        // Wait for map to be ready (dimensions set) and have both origin and destination
        if (!passedDestination || !cameraRef.current || !mapDimensions) {
            return;
        }

        const originLoc = passedOrigin
            ? [passedOrigin.longitude, passedOrigin.latitude]
            : userLocation ? [userLocation.longitude, userLocation.latitude] : null;

        const destLoc = [passedDestination.longitude, passedDestination.latitude];

        if (originLoc) {
            // Calculate center point between origin and destination
            const centerLng = (originLoc[0] + destLoc[0]) / 2;
            const centerLat = (originLoc[1] + destLoc[1]) / 2;

            // Calculate the distance to determine zoom level
            const latDiff = Math.abs(originLoc[1] - destLoc[1]);
            const lngDiff = Math.abs(originLoc[0] - destLoc[0]);
            const maxDiff = Math.max(latDiff, lngDiff);

            // Rough zoom calculation based on distance
            // Larger diff = more zoomed out (zoom out one extra level for padding)
            let zoomLevel = 11;
            if (maxDiff > 6) zoomLevel = 4;
            else if (maxDiff > 4) zoomLevel = 5;
            else if (maxDiff > 2) zoomLevel = 6;
            else if (maxDiff > 1) zoomLevel = 7;
            else if (maxDiff > 0.5) zoomLevel = 8;
            else if (maxDiff > 0.2) zoomLevel = 9;
            else if (maxDiff > 0.1) zoomLevel = 10;

            console.log('[TripSearch] Fitting bounds:', {
                originLoc,
                destLoc,
                centerLng,
                centerLat,
                maxDiff,
                zoomLevel
            });

            // Longer delay to ensure map is fully ready
            setTimeout(() => {
                console.log('[TripSearch] Setting camera now');
                cameraRef.current?.setCamera({
                    centerCoordinate: [centerLng, centerLat],
                    zoomLevel: zoomLevel,
                    animationDuration: 1500,
                    padding: { paddingTop: 80, paddingRight: 60, paddingBottom: 350, paddingLeft: 60 },
                });
            }, 800);
        }
    }, [passedDestination, passedOrigin, userLocation, mapDimensions]);

    const toggleSheet = () => {
        const toValue = isExpanded ? COLLAPSED_HEIGHT : EXPANDED_HEIGHT;
        Animated.spring(sheetHeight, {
            toValue,
            useNativeDriver: false,
            friction: 8,
        }).start();
        setIsExpanded(!isExpanded);
    };

    const handleFindMatch = async () => {
        if (!destination || isCreating) return;

        setIsCreating(true);
        try {
            // Create trip intent in database
            const { data, error } = await tripService.createTripIntent({
                destination,
                departure_time: leaveNow ? new Date() : selectedTime,
                party_size: parseInt(partySize) || 1,
                luggage,
                ride_type: rideType,
                // Pass coordinates if available
                latitude: passedDestination?.latitude,
                longitude: passedDestination?.longitude,
            });

            if (error) {
                Alert.alert('Error', 'Failed to create trip. Please try again.');
                console.error('Trip creation error:', error);
                return;
            }

            if (data) {
                navigation.navigate('FindingMatches', {
                    tripIntentId: data.id,
                    ...data
                });
            }
        } catch (err) {
            Alert.alert('Error', 'Something went wrong. Please try again.');
            console.error('Trip creation error:', err);
        } finally {
            setIsCreating(false);
        }
    };

    const handleTimeChange = (event: any, date?: Date) => {
        if (Platform.OS === 'android') {
            setShowTimePicker(false);
        }
        if (date) {
            setSelectedTime(date);
            setLeaveNow(false);
        }
    };

    const formatTime = () => {
        if (leaveNow) return 'Now';
        return selectedTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    };

    const canFindMatch = destination.length > 0;

    // Route GeoJSON
    const getRouteFeature = () => {
        if (!passedDestination) return null;

        const origin = passedOrigin
            ? [passedOrigin.longitude, passedOrigin.latitude]
            : userLocation ? [userLocation.longitude, userLocation.latitude] : null;

        if (!origin) return null;

        return {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'LineString',
                        coordinates: [
                            origin,
                            [passedDestination.longitude, passedDestination.latitude]
                        ]
                    }
                }
            ]
        };
    };

    return (
        <View style={styles.container}>
            {/* Map Background */}
            <View style={styles.mapContainer} onLayout={(e) => {
                const { width, height } = e.nativeEvent.layout;
                if (width > 0 && height > 0 && !mapDimensions) {
                    setMapDimensions({ width, height });
                }
            }}>
                {mapDimensions && (
                    <Mapbox.MapView
                        style={{ width: mapDimensions.width, height: mapDimensions.height }}
                        styleURL={Mapbox.StyleURL.Street}
                        scaleBarEnabled={false}
                        rotateEnabled={false}
                        pitchEnabled={false}
                        attributionEnabled={false}
                        logoEnabled={false}
                    >
                        <Mapbox.Camera
                            ref={cameraRef}
                            zoomLevel={12}
                            animationMode="flyTo"
                            animationDuration={1000}
                        />

                        {/* User Location Puck */}
                        {!passedOrigin && (
                            <Mapbox.LocationPuck
                                pulsing={{
                                    isEnabled: true,
                                    color: colors.primary,
                                    radius: 20.0
                                }}
                            />
                        )}

                        {/* Route Line */}
                        {getRouteFeature() && (
                            <Mapbox.ShapeSource id="routeSource" shape={getRouteFeature() as any}>
                                <Mapbox.LineLayer
                                    id="routeLine"
                                    style={{
                                        lineColor: colors.primary,
                                        lineWidth: 4,
                                        lineCap: 'round',
                                        lineJoin: 'round',
                                        lineDasharray: [1, 1]
                                    }}
                                />
                            </Mapbox.ShapeSource>
                        )}

                        {/* Origin Marker */}
                        {(passedOrigin || userLocation) && (
                            <Mapbox.PointAnnotation
                                id="origin"
                                coordinate={passedOrigin ? [passedOrigin.longitude, passedOrigin.latitude] : [userLocation!.longitude, userLocation!.latitude]}
                            >
                                <View style={styles.originMarker} />
                            </Mapbox.PointAnnotation>
                        )}

                        {/* Destination Marker */}
                        {passedDestination && (
                            <Mapbox.PointAnnotation
                                id="destination"
                                coordinate={[passedDestination.longitude, passedDestination.latitude]}
                            >
                                <View style={styles.destMarker} />
                            </Mapbox.PointAnnotation>
                        )}
                    </Mapbox.MapView>
                )}
            </View>

            {/* Top Route Display - Tappable to edit */}
            <SafeAreaView style={styles.topBar}>
                <View style={styles.routeHeader}>
                    <BackButton onPress={() => navigation.navigate('Main')} />
                    <TouchableOpacity
                        style={styles.routeCard}
                        onPress={() => navigation.navigate('PlanRide')}
                        activeOpacity={0.8}
                    >
                        <View style={styles.routeRow}>
                            <View style={styles.fromDot} />
                            <Text style={styles.routeText} numberOfLines={1}>
                                {passedOrigin?.name || 'Current location'}
                            </Text>
                        </View>
                        <View style={styles.routeDivider} />
                        <View style={styles.routeRow}>
                            <View style={styles.toDot} />
                            <Text style={styles.routeText} numberOfLines={1}>
                                {destination || 'Destination'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            {/* Bottom Sheet */}
            <Animated.View style={[styles.bottomSheet, { height: sheetHeight }]}>
                {/* Handle */}
                <TouchableOpacity style={styles.handleContainer} onPress={toggleSheet}>
                    <View style={styles.handle} />
                    <View style={styles.handleRow}>
                        <Text style={styles.handleText}>Trip options</Text>
                        {isExpanded ? (
                            <ChevronDown size={20} color={colors.text.muted} />
                        ) : (
                            <ChevronUp size={20} color={colors.text.muted} />
                        )}
                    </View>
                </TouchableOpacity>

                <ScrollView
                    style={styles.sheetContent}
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={isExpanded}
                >
                    {/* Party Size */}
                    <View style={styles.optionSection}>
                        <View style={styles.optionHeader}>
                            <Users size={18} color={colors.primary} />
                            <Text style={styles.optionLabel}>Party size</Text>
                        </View>
                        <View style={styles.chipsRow}>
                            {PARTY_SIZES.map(size => (
                                <TouchableOpacity
                                    key={size}
                                    style={[styles.chip, partySize === size && styles.chipActive]}
                                    onPress={() => setPartySize(size)}
                                >
                                    <Text style={[styles.chipText, partySize === size && styles.chipTextActive]}>
                                        {size}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Luggage */}
                    <View style={styles.optionSection}>
                        <View style={styles.optionHeader}>
                            <Briefcase size={18} color={colors.primary} />
                            <Text style={styles.optionLabel}>Luggage</Text>
                        </View>
                        <View style={styles.chipsRow}>
                            {LUGGAGE_OPTIONS.map(option => (
                                <TouchableOpacity
                                    key={option.id}
                                    style={[styles.chip, luggage === option.id && styles.chipActive]}
                                    onPress={() => setLuggage(option.id)}
                                >
                                    <Text style={[styles.chipText, luggage === option.id && styles.chipTextActive]}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Leaving Time */}
                    <View style={styles.optionSection}>
                        <View style={styles.optionHeader}>
                            <Clock size={18} color={colors.primary} />
                            <Text style={styles.optionLabel}>Leaving</Text>
                        </View>
                        <View style={styles.chipsRow}>
                            <TouchableOpacity
                                style={[styles.chip, leaveNow && styles.chipActive]}
                                onPress={() => setLeaveNow(true)}
                            >
                                <Text style={[styles.chipText, leaveNow && styles.chipTextActive]}>
                                    Now
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.timeChip, !leaveNow && styles.chipActive]}
                                onPress={() => setShowTimePicker(true)}
                            >
                                <Clock size={14} color={!leaveNow ? '#FFFFFF' : colors.text.muted} />
                                <Text style={[styles.chipText, !leaveNow && styles.chipTextActive]}>
                                    {leaveNow ? 'Choose time' : formatTime()}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Ride Type */}
                    <View style={styles.optionSection}>
                        <View style={styles.optionHeader}>
                            <Car size={18} color={colors.primary} />
                            <Text style={styles.optionLabel}>Ride type</Text>
                        </View>
                        <View style={styles.rideOptionsRow}>
                            {RIDE_OPTIONS.map(option => (
                                <TouchableOpacity
                                    key={option.id}
                                    style={[styles.rideOption, rideType === option.id && styles.rideOptionActive]}
                                    onPress={() => setRideType(option.id as 'standard' | 'xl')}
                                >
                                    <Text style={[styles.rideOptionLabel, rideType === option.id && styles.rideOptionLabelActive]}>
                                        {option.label}
                                    </Text>
                                    <Text style={[styles.rideOptionSubtitle, rideType === option.id && styles.rideOptionSubtitleActive]}>
                                        {option.subtitle}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={{ height: 20 }} />
                </ScrollView>

                {/* Find Match Button */}
                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        onPress={handleFindMatch}
                        disabled={!canFindMatch}
                        activeOpacity={0.9}
                    >
                        <LinearGradient
                            colors={canFindMatch ? [colors.primary, colors.primaryLight] : [colors.slate[300], colors.slate[300]]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.findMatchButton}
                        >
                            <Text style={styles.findMatchText}>Find Match</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </Animated.View>

            {/* Time Picker Modal */}
            {showTimePicker && (
                <Modal transparent animationType="slide">
                    <View style={styles.pickerOverlay}>
                        <View style={styles.pickerContainer}>
                            <View style={styles.pickerHeader}>
                                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                                    <Text style={styles.pickerCancel}>Cancel</Text>
                                </TouchableOpacity>
                                <Text style={styles.pickerTitle}>Select time</Text>
                                <TouchableOpacity onPress={() => {
                                    setLeaveNow(false);
                                    setShowTimePicker(false);
                                }}>
                                    <Text style={styles.pickerDone}>Done</Text>
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker
                                value={selectedTime}
                                mode="datetime"
                                display="spinner"
                                onChange={handleTimeChange}
                                minimumDate={new Date()}
                                style={styles.picker}
                            />
                        </View>
                    </View>
                </Modal>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    mapContainer: {
        flex: 1,
        backgroundColor: colors.slate[100],
    },
    map: {
        flex: 1,
    },
    topBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
    },
    routeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    routeCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        ...shadows.card,
    },
    routeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
    },
    fromDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.primary,
        marginRight: 12,
    },
    toDot: {
        width: 8,
        height: 8,
        borderRadius: 2,
        backgroundColor: colors.slate[400],
        marginRight: 12,
    },
    routeText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        color: colors.text.main,
    },
    routeDivider: {
        height: 1,
        backgroundColor: colors.slate[100],
        marginLeft: 20,
    },
    bottomSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        ...shadows.float,
    },
    handleContainer: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: colors.slate[300],
        borderRadius: 2,
        marginBottom: 8,
    },
    handleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    handleText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text.muted,
    },
    sheetContent: {
        flex: 1,
        paddingHorizontal: 16,
    },
    optionSection: {
        marginBottom: 20,
    },
    optionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    optionLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text.main,
    },
    chipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        backgroundColor: colors.cardBlue,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 100,
    },
    chipActive: {
        backgroundColor: 'rgba(0, 82, 255, 0.15)',
        borderWidth: 1.5,
        borderColor: colors.primary,
    },
    chipText: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.text.main,
    },
    chipTextActive: {
        color: colors.primary,
    },
    timeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.cardBlue,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 100,
        gap: 6,
    },
    rideOptionsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    rideOption: {
        flex: 1,
        backgroundColor: colors.cardBlue,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    rideOptionActive: {
        backgroundColor: 'rgba(0, 82, 255, 0.15)',
        borderWidth: 1.5,
        borderColor: colors.primary,
    },
    rideOptionLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text.main,
        marginBottom: 4,
    },
    rideOptionLabelActive: {
        color: colors.primary,
    },
    rideOptionSubtitle: {
        fontSize: 12,
        color: colors.text.muted,
    },
    rideOptionSubtitleActive: {
        color: colors.primary,
    },
    buttonContainer: {
        paddingHorizontal: 16,
        paddingBottom: 32,
        paddingTop: 8,
    },
    findMatchButton: {
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    findMatchText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    pickerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    pickerContainer: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: 32,
    },
    pickerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.slate[100],
    },
    pickerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text.main,
    },
    pickerCancel: {
        fontSize: 15,
        color: colors.text.muted,
    },
    pickerDone: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.primary,
    },
    picker: {
        height: 200,
    },
    originMarker: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: colors.primary,
        borderWidth: 3,
        borderColor: '#fff',
    },
    destMarker: {
        width: 24,
        height: 24,
        borderRadius: 4,
        backgroundColor: colors.primary,
        borderWidth: 3,
        borderColor: '#fff',
    },
});
