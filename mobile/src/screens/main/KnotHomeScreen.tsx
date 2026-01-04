/**
 * Knot Home Screen
 * Unified map + search experience with 5-state machine
 * 
 * States:
 * - IDLE: Map + floating "Where to?" bar
 * - SEARCH_ACTIVE: Bottom sheet up, keyboard open
 * - SEARCH_TYPING: Suggestions updating
 * - DESTINATION_PREVIEW: Pin + camera fit
 * - DESTINATION_CONFIRMED: Navigate to TripSearch
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
    Animated,
    Dimensions,
    StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import {
    Search,
    Clock,
    MapPin,
    Home,
    Briefcase,
    Plane,
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

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const SHEET_ACTIVE_HEIGHT = SCREEN_HEIGHT * 0.55;
const SHEET_PREVIEW_HEIGHT = SCREEN_HEIGHT * 0.25;
const DEBOUNCE_MS = 200;

// Irvine, CA default
const DEFAULT_REGION = {
    latitude: 33.6461,
    longitude: -117.8420,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
};

type FlowState =
    | 'IDLE'
    | 'SEARCH_ACTIVE'
    | 'SEARCH_TYPING'
    | 'DESTINATION_PREVIEW'
    | 'DESTINATION_CONFIRMED';

export function KnotHomeScreen() {
    const navigation = useNavigation<NavigationProp>();
    const insets = useSafeAreaInsets();
    const mapRef = useRef<MapView>(null);
    const inputRef = useRef<TextInput>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    // State machine
    const [flowState, setFlowState] = useState<FlowState>('IDLE');

    // Location
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [previewDestination, setPreviewDestination] = useState<Destination | null>(null);

    // Search
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isResolving, setIsResolving] = useState(false);

    // Animations
    const sheetAnim = useRef(new Animated.Value(0)).current;
    const dimAnim = useRef(new Animated.Value(0)).current;

    // Initialize
    useEffect(() => {
        StatusBar.setBarStyle('dark-content');
        getLocation();
        loadRecents();
    }, []);

    // Animate sheet based on state
    useEffect(() => {
        let sheetValue = 0;
        let dimValue = 0;

        switch (flowState) {
            case 'IDLE':
                sheetValue = 0;
                dimValue = 0;
                break;
            case 'SEARCH_ACTIVE':
            case 'SEARCH_TYPING':
                sheetValue = 1;
                dimValue = 0.3;
                break;
            case 'DESTINATION_PREVIEW':
                sheetValue = 0.5;
                dimValue = 0;
                break;
            case 'DESTINATION_CONFIRMED':
                sheetValue = 0;
                dimValue = 0;
                break;
        }

        Animated.parallel([
            Animated.spring(sheetAnim, {
                toValue: sheetValue,
                useNativeDriver: true,
                friction: 10,
                tension: 50,
            }),
            Animated.timing(dimAnim, {
                toValue: dimValue,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start();
    }, [flowState]);

    const getLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                const loc = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });
                const coords = {
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                };
                setUserLocation(coords);

                // Center map on user
                mapRef.current?.animateToRegion({
                    ...coords,
                    latitudeDelta: 0.015,
                    longitudeDelta: 0.015,
                }, 500);
            }
        } catch (err) {
            console.log('[KnotHome] Location error:', err);
        }
    };

    const loadRecents = async () => {
        const recents = await getRecentDestinations();
        setSuggestions(recentsToSuggestions(recents));
    };

    // State transitions
    const activateSearch = () => {
        setFlowState('SEARCH_ACTIVE');
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const handleSearchChange = useCallback((text: string) => {
        setSearchQuery(text);
        setFlowState(text.length > 0 ? 'SEARCH_TYPING' : 'SEARCH_ACTIVE');

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

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

                setSuggestions(deduped.slice(0, 8));
            } catch (err) {
                console.error('[KnotHome] Search error:', err);
            } finally {
                setIsLoading(false);
            }
        }, DEBOUNCE_MS);
    }, [userLocation]);

    const handleSuggestionTap = async (suggestion: Suggestion) => {
        Keyboard.dismiss();
        setIsResolving(true);

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
                // Preview state
                setPreviewDestination(dest);
                setFlowState('DESTINATION_PREVIEW');

                // Animate map to fit user + destination
                if (userLocation && mapRef.current) {
                    mapRef.current.fitToCoordinates([
                        userLocation,
                        { latitude: dest.latitude, longitude: dest.longitude }
                    ], {
                        edgePadding: { top: 100, right: 50, bottom: SHEET_PREVIEW_HEIGHT + 50, left: 50 },
                        animated: true,
                    });
                }

                // Auto-confirm after preview (500ms)
                setTimeout(async () => {
                    setFlowState('DESTINATION_CONFIRMED');
                    await addToRecents(dest!);
                    navigation.navigate('TripSearch', { destination: dest! });
                }, 600);
            }
        } catch (err) {
            console.error('[KnotHome] Resolution error:', err);
            setFlowState('SEARCH_ACTIVE');
        } finally {
            setIsResolving(false);
        }
    };

    const handleClose = () => {
        Keyboard.dismiss();
        setSearchQuery('');
        setPreviewDestination(null);
        setFlowState('IDLE');
        loadRecents();

        // Return map to user
        if (userLocation) {
            mapRef.current?.animateToRegion({
                ...userLocation,
                latitudeDelta: 0.015,
                longitudeDelta: 0.015,
            }, 500);
        }
    };

    const sheetTranslateY = sheetAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [SCREEN_HEIGHT, SCREEN_HEIGHT - SHEET_PREVIEW_HEIGHT, SCREEN_HEIGHT - SHEET_ACTIVE_HEIGHT],
    });

    const getIconForCategory = (category: string) => {
        switch (category) {
            case 'home': return <Home size={18} color={colors.primary} />;
            case 'work': return <Briefcase size={18} color={colors.primary} />;
            case 'airport': return <Plane size={18} color={colors.primary} />;
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
                {getIconForCategory(item.category)}
            </View>
            <View style={styles.suggestionText}>
                <Text style={styles.suggestionPrimary} numberOfLines={1}>
                    {item.primaryText}
                </Text>
                <Text style={styles.suggestionSecondary} numberOfLines={1}>
                    {item.secondaryText}
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Full-screen Map */}
            <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_DEFAULT}
                initialRegion={userLocation ? {
                    ...userLocation,
                    latitudeDelta: 0.015,
                    longitudeDelta: 0.015,
                } : DEFAULT_REGION}
                showsUserLocation={true}
                showsMyLocationButton={false}
                followsUserLocation={flowState === 'IDLE'}
            >
                {/* Destination preview pin */}
                {previewDestination && flowState === 'DESTINATION_PREVIEW' && (
                    <Marker
                        coordinate={{
                            latitude: previewDestination.latitude,
                            longitude: previewDestination.longitude,
                        }}
                    >
                        <View style={styles.destPin}>
                            <MapPin size={32} color={colors.primary} fill={colors.primary} />
                        </View>
                    </Marker>
                )}
            </MapView>

            {/* Dim overlay when searching */}
            <Animated.View
                style={[
                    styles.dimOverlay,
                    { opacity: dimAnim }
                ]}
                pointerEvents={flowState === 'IDLE' ? 'none' : 'auto'}
            />

            {/* Floating "Where to?" bar (IDLE state) */}
            {flowState === 'IDLE' && (
                <View style={[styles.floatingBar, { top: insets.top + 16 }]}>
                    <TouchableOpacity
                        style={styles.searchBarIdle}
                        onPress={activateSearch}
                        activeOpacity={0.9}
                    >
                        <Search size={20} color={colors.text.muted} />
                        <Text style={styles.searchPlaceholder}>Where to?</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Bottom Sheet */}
            <Animated.View
                style={[
                    styles.sheet,
                    { transform: [{ translateY: sheetTranslateY }] }
                ]}
            >
                {/* Sheet handle */}
                <View style={styles.sheetHandle}>
                    <View style={styles.handleBar} />
                </View>

                {/* Search input (active states) */}
                {(flowState === 'SEARCH_ACTIVE' || flowState === 'SEARCH_TYPING') && (
                    <View style={styles.searchInputRow}>
                        <View style={styles.searchInputContainer}>
                            <Search size={18} color={colors.text.muted} />
                            <TextInput
                                ref={inputRef}
                                style={styles.searchInput}
                                placeholder="Where to?"
                                placeholderTextColor={colors.text.muted}
                                value={searchQuery}
                                onChangeText={handleSearchChange}
                                returnKeyType="search"
                                autoCorrect={false}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => handleSearchChange('')}>
                                    <X size={18} color={colors.text.muted} />
                                </TouchableOpacity>
                            )}
                            {isLoading && <ActivityIndicator size="small" color={colors.primary} />}
                        </View>
                        <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
                            <Text style={styles.closeBtnText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Preview state */}
                {flowState === 'DESTINATION_PREVIEW' && previewDestination && (
                    <View style={styles.previewContent}>
                        <View style={styles.previewRow}>
                            <MapPin size={20} color={colors.primary} />
                            <View style={styles.previewText}>
                                <Text style={styles.previewName}>{previewDestination.name}</Text>
                                <Text style={styles.previewAddress}>{previewDestination.address}</Text>
                            </View>
                        </View>
                        {isResolving && (
                            <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 12 }} />
                        )}
                    </View>
                )}

                {/* Suggestions list */}
                {(flowState === 'SEARCH_ACTIVE' || flowState === 'SEARCH_TYPING') && (
                    <>
                        {searchQuery.length === 0 && suggestions.length > 0 && (
                            <Text style={styles.sectionLabel}>Recent</Text>
                        )}
                        <FlatList
                            data={suggestions}
                            keyExtractor={(item) => item.id}
                            renderItem={renderSuggestion}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
                            ListEmptyComponent={
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyText}>
                                        {searchQuery ? 'No results found' : 'No recent trips'}
                                    </Text>
                                </View>
                            }
                        />
                    </>
                )}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    dimOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000',
    },
    // Floating search bar (IDLE)
    floatingBar: {
        position: 'absolute',
        left: 16,
        right: 16,
    },
    searchBarIdle: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderRadius: borderRadius.xl,
        gap: 12,
        ...shadows.card,
    },
    searchPlaceholder: {
        flex: 1,
        fontSize: 18,
        fontWeight: '500',
        color: colors.text.main,
    },
    // Bottom sheet
    sheet: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: SCREEN_HEIGHT,
        backgroundColor: '#fff',
        borderTopLeftRadius: borderRadius['2xl'],
        borderTopRightRadius: borderRadius['2xl'],
        ...shadows.card,
    },
    sheetHandle: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    handleBar: {
        width: 36,
        height: 4,
        backgroundColor: colors.slate[300],
        borderRadius: 2,
    },
    // Search input row
    searchInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 12,
        gap: 12,
    },
    searchInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.slate[100],
        borderRadius: borderRadius.lg,
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: colors.text.main,
        padding: 0,
    },
    closeBtn: {
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    closeBtnText: {
        fontSize: 15,
        color: colors.primary,
        fontWeight: '500',
    },
    // Suggestions
    sectionLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 12,
    },
    suggestionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
    },
    suggestionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.slate[100],
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
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
    // Preview state
    previewContent: {
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    previewRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    previewText: {
        flex: 1,
        marginLeft: 12,
    },
    previewName: {
        fontSize: 17,
        fontWeight: '600',
        color: colors.text.main,
        marginBottom: 2,
    },
    previewAddress: {
        fontSize: 14,
        color: colors.text.muted,
    },
    // Destination pin
    destPin: {
        alignItems: 'center',
    },
    // Empty state
    emptyState: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 15,
        color: colors.text.muted,
    },
});
