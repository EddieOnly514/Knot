/**
 * Plan Ride Screen
 * Map background (20%) + draggable search menu (80%)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    FlatList,
    Keyboard,
    ActivityIndicator,
    Dimensions,
    StatusBar,
    PanResponder,
    Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import {
    ChevronLeft,
    MapPin,
    Clock,
    Plane,
    Building2,
    X,
} from 'lucide-react-native';
import { colors, spacing, borderRadius, shadows } from '../../design';
import type { RootStackParamList } from '../../types/navigation';
import type { Destination, Suggestion } from '../../types/destination';
import {
    getAutocompleteSuggestions,
    resolvePlaceDetails,
    cancelAllRequests,
} from '../../services/placesService';
import {
    getRecentDestinations,
    addToRecents,
    recentsToSuggestions,
    filterRecents,
} from '../../services/recentsService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_HEIGHT = SCREEN_HEIGHT * 0.2; // 20% for map
const DEBOUNCE_MS = 200;

const DEFAULT_REGION = {
    latitude: 33.6461,
    longitude: -117.8420,
    latitudeDelta: 0.03,
    longitudeDelta: 0.03,
};

type ActiveInput = 'from' | 'to';

export function PlanRideScreen() {
    const navigation = useNavigation<NavigationProp>();
    const insets = useSafeAreaInsets();
    const mapRef = useRef<MapView>(null);
    const fromInputRef = useRef<TextInput>(null);
    const toInputRef = useRef<TextInput>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    // State
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [activeInput, setActiveInput] = useState<ActiveInput>('to');
    const [fromQuery, setFromQuery] = useState('');
    const [toQuery, setToQuery] = useState('');
    const [fromLocation, setFromLocation] = useState<Destination | null>(null);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Drag state
    const menuOffset = useRef(new Animated.Value(0)).current;
    const lastOffset = useRef(0);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderMove: (_, gestureState) => {
                const newOffset = Math.max(0, lastOffset.current + gestureState.dy);
                menuOffset.setValue(newOffset);
            },
            onPanResponderRelease: (_, gestureState) => {
                const maxDrag = SCREEN_HEIGHT * 0.4;
                const threshold = 100;

                if (gestureState.dy > threshold) {
                    // Dismiss
                    navigation.goBack();
                } else {
                    // Snap back
                    Animated.spring(menuOffset, {
                        toValue: 0,
                        useNativeDriver: true,
                        friction: 8,
                    }).start();
                    lastOffset.current = 0;
                }
            },
        })
    ).current;

    useEffect(() => {
        StatusBar.setBarStyle('dark-content');
        getLocation();
        loadRecents();
        setTimeout(() => toInputRef.current?.focus(), 300);
    }, []);

    const getLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                const loc = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });
                setUserLocation({
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                });
                setFromQuery('Current location');
            }
        } catch (err) {
            console.log('[PlanRide] Location error:', err);
            setFromQuery('Current location');
        }
    };

    const loadRecents = async () => {
        const recents = await getRecentDestinations();
        setSuggestions(recentsToSuggestions(recents));
    };

    const handleSearch = useCallback((text: string) => {
        if (activeInput === 'from') setFromQuery(text);
        else setToQuery(text);

        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (text.length < 2) {
            cancelAllRequests();
            loadRecents();
            return;
        }

        debounceRef.current = setTimeout(async () => {
            setIsLoading(true);
            try {
                const results = await getAutocompleteSuggestions({
                    query: text,
                    userLocation: userLocation || undefined,
                    biasRadius: 50000,
                });

                const recents = await getRecentDestinations();
                const matchingRecents = filterRecents(recents, text);
                const recentSuggestions = recentsToSuggestions(matchingRecents);

                const combined = [...recentSuggestions, ...results];
                const seen = new Set<string>();
                const deduped = combined.filter(s => {
                    if (seen.has(s.placeId)) return false;
                    seen.add(s.placeId);
                    return true;
                });

                setSuggestions(deduped.slice(0, 10));
            } catch (err) {
                console.error('[PlanRide] Search error:', err);
            } finally {
                setIsLoading(false);
            }
        }, DEBOUNCE_MS);
    }, [userLocation, activeInput]);

    const handleSuggestionTap = async (suggestion: Suggestion) => {
        Keyboard.dismiss();

        try {
            let dest: Destination | null = null;

            if (suggestion.source === 'recent') {
                const recents = await getRecentDestinations();
                const found = recents.find(r => r.destination.id === suggestion.placeId);
                if (found) dest = found.destination;
            }

            if (!dest) {
                dest = await resolvePlaceDetails(suggestion.placeId);
            }

            if (dest) {
                if (activeInput === 'from') {
                    setFromLocation(dest);
                    setFromQuery(dest.name);
                    setActiveInput('to');
                    toInputRef.current?.focus();
                } else {
                    setToQuery(dest.name);
                    await addToRecents(dest);
                    navigation.navigate('TripSearch', {
                        destination: dest,
                        origin: fromLocation || undefined
                    });
                }
            }
        } catch (err) {
            console.error('[PlanRide] Resolution error:', err);
        }
    };

    const getDistanceString = (item: Suggestion): string => {
        if (item.distance) {
            const miles = item.distance / 1609.34;
            return miles < 10 ? `${miles.toFixed(1)} mi` : `${Math.round(miles)} mi`;
        }
        return '';
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'airport': return <Plane size={18} color={colors.primary} />;
            case 'city': return <Building2 size={18} color={colors.text.muted} />;
            case 'recent': return <Clock size={18} color={colors.text.muted} />;
            default: return <MapPin size={18} color={colors.text.muted} />;
        }
    };

    const renderSuggestion = ({ item }: { item: Suggestion }) => (
        <TouchableOpacity
            style={styles.suggestionRow}
            onPress={() => handleSuggestionTap(item)}
            activeOpacity={0.7}
        >
            <View style={styles.suggestionIcon}>
                {getCategoryIcon(item.category)}
            </View>
            <View style={styles.suggestionText}>
                <Text style={styles.suggestionPrimary} numberOfLines={1}>
                    {item.primaryText}
                </Text>
                <Text style={styles.suggestionSecondary} numberOfLines={1}>
                    {item.secondaryText}
                </Text>
            </View>
            {getDistanceString(item) !== '' && (
                <Text style={styles.suggestionDistance}>
                    {getDistanceString(item)}
                </Text>
            )}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Map Section (Top 20%) */}
            <View style={[styles.mapSection, { paddingTop: insets.top }]}>
                <MapView
                    ref={mapRef}
                    style={styles.map}
                    provider={PROVIDER_DEFAULT}
                    initialRegion={userLocation ? {
                        ...userLocation,
                        latitudeDelta: 0.02,
                        longitudeDelta: 0.02,
                    } : DEFAULT_REGION}
                    showsUserLocation={false}
                    showsMyLocationButton={false}
                >
                    {/* User location marker */}
                    {userLocation && (
                        <Marker
                            coordinate={userLocation}
                            title="Your location"
                        >
                            <View style={styles.userMarker}>
                                <View style={styles.userMarkerInner} />
                            </View>
                        </Marker>
                    )}
                </MapView>

                {/* Back Button */}
                <TouchableOpacity
                    style={[styles.backBtn, { top: insets.top + 8 }]}
                    onPress={() => navigation.navigate('Main')}
                >
                    <ChevronLeft size={24} color={colors.text.main} />
                </TouchableOpacity>
            </View>

            {/* Menu Section (Bottom 80%) */}
            <Animated.View
                style={[
                    styles.menu,
                    { transform: [{ translateY: menuOffset }] }
                ]}
            >
                {/* Draggable Handle */}
                <View {...panResponder.panHandlers} style={styles.handleArea}>
                    <View style={styles.handleBar} />
                </View>

                {/* From/To Inputs */}
                <View style={styles.inputContainer}>
                    {/* From */}
                    <View style={styles.inputRow}>
                        <View style={styles.sideColumn}>
                            <View style={styles.fromDot} />
                            <View style={styles.connectLine} />
                        </View>
                        <TouchableOpacity
                            style={[
                                styles.inputWrapper,
                                activeInput === 'from' && styles.inputWrapperActive
                            ]}
                            onPress={() => {
                                setActiveInput('from');
                                fromInputRef.current?.focus();
                            }}
                            activeOpacity={0.9}
                        >
                            <Text style={styles.label}>From</Text>
                            <View style={styles.inputInner}>
                                <TextInput
                                    ref={fromInputRef}
                                    style={styles.textInput}
                                    value={fromQuery}
                                    onChangeText={handleSearch}
                                    onFocus={() => {
                                        setActiveInput('from');
                                        if (fromQuery === 'Current location') setFromQuery('');
                                    }}
                                    placeholder="Current location"
                                    placeholderTextColor={colors.text.muted}
                                />
                                {activeInput === 'from' && fromQuery.length > 0 && (
                                    <TouchableOpacity onPress={() => {
                                        setFromQuery('');
                                        setFromLocation(null);
                                    }}>
                                        <X size={16} color={colors.text.muted} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* To */}
                    <View style={styles.inputRow}>
                        <View style={styles.sideColumn}>
                            <View style={styles.toDot} />
                        </View>
                        <TouchableOpacity
                            style={[
                                styles.inputWrapper,
                                activeInput === 'to' && styles.inputWrapperActive
                            ]}
                            onPress={() => {
                                setActiveInput('to');
                                toInputRef.current?.focus();
                            }}
                            activeOpacity={0.9}
                        >
                            <Text style={styles.label}>To</Text>
                            <View style={styles.inputInner}>
                                <TextInput
                                    ref={toInputRef}
                                    style={styles.textInput}
                                    value={toQuery}
                                    onChangeText={handleSearch}
                                    onFocus={() => setActiveInput('to')}
                                    placeholder="Where to?"
                                    placeholderTextColor={colors.text.muted}
                                />
                                {activeInput === 'to' && toQuery.length > 0 && (
                                    <TouchableOpacity onPress={() => setToQuery('')}>
                                        <X size={16} color={colors.text.muted} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Loading */}
                {isLoading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color={colors.primary} />
                    </View>
                )}

                {/* Suggestions */}
                <FlatList
                    data={suggestions}
                    keyExtractor={(item) => item.id}
                    renderItem={renderSuggestion}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
                    ListEmptyComponent={
                        !isLoading ? (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>
                                    {activeInput === 'to' ? 'Where are you going?' : 'Where are you starting from?'}
                                </Text>
                            </View>
                        ) : null
                    }
                />
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    mapSection: {
        height: MAP_HEIGHT,
        backgroundColor: colors.slate[100],
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    backBtn: {
        position: 'absolute',
        left: 16,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        ...shadows.card,
    },
    menu: {
        flex: 1,
        backgroundColor: '#fff',
        borderTopLeftRadius: borderRadius['2xl'],
        borderTopRightRadius: borderRadius['2xl'],
        marginTop: -20,
        ...shadows.card,
    },
    handleArea: {
        alignItems: 'center',
        paddingVertical: 14,
    },
    handleBar: {
        width: 40,
        height: 5,
        backgroundColor: colors.slate[300],
        borderRadius: 3,
    },
    inputContainer: {
        paddingHorizontal: spacing.md,
        marginBottom: spacing.sm,
    },
    inputRow: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    sideColumn: {
        width: 24,
        alignItems: 'center',
        paddingTop: 18,
    },
    fromDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.primary,
    },
    connectLine: {
        width: 2,
        flex: 1,
        backgroundColor: colors.slate[200],
        marginVertical: 4,
    },
    toDot: {
        width: 10,
        height: 10,
        borderRadius: 2,
        backgroundColor: colors.slate[400],
    },
    inputWrapper: {
        flex: 1,
        marginLeft: spacing.xs,
        backgroundColor: colors.slate[50],
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    inputWrapperActive: {
        backgroundColor: '#fff',
        borderColor: colors.primary,
    },
    label: {
        fontSize: 11,
        color: colors.text.muted,
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    inputInner: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        color: colors.text.main,
        paddingVertical: 2,
    },
    suggestionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
    },
    suggestionIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.slate[100],
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    suggestionText: {
        flex: 1,
    },
    suggestionPrimary: {
        fontSize: 15,
        fontWeight: '500',
        color: colors.text.main,
        marginBottom: 2,
    },
    suggestionSecondary: {
        fontSize: 13,
        color: colors.text.muted,
    },
    suggestionDistance: {
        fontSize: 13,
        color: colors.text.muted,
        marginLeft: spacing.sm,
    },
    loadingContainer: {
        padding: spacing.md,
        alignItems: 'center',
    },
    emptyState: {
        padding: spacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        color: colors.text.muted,
    },
    userMarker: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(0, 82, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    userMarkerInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: colors.primary,
        borderWidth: 2,
        borderColor: '#fff',
    },
});
