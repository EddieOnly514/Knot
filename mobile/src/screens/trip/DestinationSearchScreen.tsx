/**
 * Destination Search Screen
 * Full-screen search with map background (Uber-style)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    Text,
    TextInput,
    FlatList,
    Keyboard,
    ActivityIndicator,
    Animated,
    Dimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { ChevronLeft, Search, X, MapPin, Clock, Plane, Building2 } from 'lucide-react-native';
import { colors, spacing, borderRadius, shadows } from '../../design';
import type { RootStackParamList } from '../../types/navigation';
import type { Destination, Suggestion, SuggestionCategory } from '../../types/destination';
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
type DestinationSearchRouteProp = RouteProp<RootStackParamList, 'DestinationSearchScreen'>;

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DEBOUNCE_MS = 200;
const MIN_QUERY_LENGTH = 2;

// Default to Irvine, CA
const DEFAULT_REGION = {
    latitude: 33.6461,
    longitude: -117.8420,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
};

export function DestinationSearchScreen() {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute<DestinationSearchRouteProp>();
    const mapRef = useRef<MapView>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);
    const inputRef = useRef<TextInput>(null);

    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isResolving, setIsResolving] = useState(false);
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [previewDestination, setPreviewDestination] = useState<Destination | null>(null);
    const [mapReady, setMapReady] = useState(false);

    // Get user location on mount
    useEffect(() => {
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    const loc = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.Balanced,
                    });
                    const newLocation = {
                        latitude: loc.coords.latitude,
                        longitude: loc.coords.longitude,
                    };
                    setUserLocation(newLocation);

                    // Center map on user
                    mapRef.current?.animateToRegion({
                        ...newLocation,
                        latitudeDelta: 0.02,
                        longitudeDelta: 0.02,
                    }, 500);
                }
            } catch (err) {
                console.log('[Search] Location not available');
            }
        })();

        // Load recents on mount
        loadRecents();
    }, []);

    const loadRecents = async () => {
        const recents = await getRecentDestinations();
        setSuggestions(recentsToSuggestions(recents));
    };

    // Debounced search
    const handleSearch = (text: string) => {
        setQuery(text);

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        if (text.length < MIN_QUERY_LENGTH) {
            cancelAllRequests();
            loadRecents();
            setPreviewDestination(null);
            return;
        }

        debounceRef.current = setTimeout(async () => {
            setIsLoading(true);
            try {
                const liveSuggestions = await getAutocompleteSuggestions({
                    query: text,
                    userLocation: userLocation || undefined,
                    biasRadius: 50000,
                });

                const allRecents = await getRecentDestinations();
                const matchingRecents = filterRecents(allRecents, text);
                const recentSuggestions = recentsToSuggestions(matchingRecents);

                const combined = [...recentSuggestions, ...liveSuggestions];
                const seen = new Set<string>();
                const deduped = combined.filter(s => {
                    if (seen.has(s.placeId)) return false;
                    seen.add(s.placeId);
                    return true;
                });

                setSuggestions(deduped.slice(0, 10));
            } catch (err) {
                console.error('[Search] Error:', err);
            } finally {
                setIsLoading(false);
            }
        }, DEBOUNCE_MS);
    };

    // Handle suggestion tap - show preview on map
    const handleSuggestionTap = async (suggestion: Suggestion) => {
        Keyboard.dismiss();
        setIsResolving(true);

        try {
            // If recent, get from storage
            if (suggestion.source === 'recent') {
                const recents = await getRecentDestinations();
                const found = recents.find(r => r.destination.id === suggestion.placeId);
                if (found) {
                    showDestinationPreview(found.destination);
                    return;
                }
            }

            // Resolve place details
            const destination = await resolvePlaceDetails(suggestion.placeId);
            if (destination) {
                showDestinationPreview(destination);
            }
        } catch (err) {
            console.error('[Search] Resolution error:', err);
        } finally {
            setIsResolving(false);
        }
    };

    // Show destination on map and auto-confirm after delay
    const showDestinationPreview = async (destination: Destination) => {
        setPreviewDestination(destination);

        // Animate map to fit user + destination
        if (userLocation && mapRef.current) {
            mapRef.current.fitToCoordinates([
                userLocation,
                { latitude: destination.latitude, longitude: destination.longitude }
            ], {
                edgePadding: { top: 150, right: 50, bottom: 300, left: 50 },
                animated: true,
            });
        }

        // Auto-confirm after short delay
        setTimeout(async () => {
            await addToRecents(destination);
            navigation.navigate('TripSearch', {
                scheduleLater: route.params?.scheduleLater,
                destination: destination,
            });
        }, 800);
    };

    const handleBack = () => {
        navigation.goBack();
    };

    const handleClear = () => {
        setQuery('');
        setPreviewDestination(null);
        loadRecents();
        inputRef.current?.focus();
    };

    // Get icon for category
    const getCategoryIcon = (category: SuggestionCategory) => {
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
                <Text style={styles.primaryText} numberOfLines={1}>
                    {item.primaryText}
                </Text>
                <Text style={styles.secondaryText} numberOfLines={1}>
                    {item.secondaryText}
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Map Background */}
            <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_DEFAULT}
                initialRegion={userLocation ? {
                    ...userLocation,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                } : DEFAULT_REGION}
                showsUserLocation={true}
                showsMyLocationButton={false}
                onMapReady={() => setMapReady(true)}
            >
                {/* User marker */}
                {userLocation && (
                    <Marker coordinate={userLocation}>
                        <View style={styles.userMarker}>
                            <View style={styles.userMarkerInner} />
                        </View>
                    </Marker>
                )}

                {/* Destination preview marker */}
                {previewDestination && (
                    <Marker
                        coordinate={{
                            latitude: previewDestination.latitude,
                            longitude: previewDestination.longitude,
                        }}
                    >
                        <View style={styles.destMarker}>
                            <MapPin size={24} color="#fff" fill={colors.primary} />
                        </View>
                    </Marker>
                )}
            </MapView>

            {/* Search UI Overlay */}
            <SafeAreaView style={styles.overlay}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                        <ChevronLeft size={24} color={colors.text.main} />
                    </TouchableOpacity>

                    {/* Search Bar */}
                    <View style={styles.searchBar}>
                        <Search size={18} color={colors.text.muted} />
                        <TextInput
                            ref={inputRef}
                            style={styles.input}
                            placeholder="Where are you going?"
                            placeholderTextColor={colors.text.muted}
                            value={query}
                            onChangeText={handleSearch}
                            autoFocus
                            returnKeyType="search"
                            autoCorrect={false}
                        />
                        {query.length > 0 && (
                            <TouchableOpacity onPress={handleClear}>
                                <X size={18} color={colors.text.muted} />
                            </TouchableOpacity>
                        )}
                        {isLoading && <ActivityIndicator size="small" color={colors.primary} />}
                    </View>
                </View>

                {/* Suggestions List */}
                <View style={styles.suggestionsContainer}>
                    {query.length === 0 && suggestions.length > 0 && (
                        <Text style={styles.sectionHeader}>Recent</Text>
                    )}
                    <FlatList
                        data={suggestions}
                        keyExtractor={(item) => item.id}
                        renderItem={renderSuggestion}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        style={styles.suggestionsList}
                    />
                </View>
            </SafeAreaView>

            {/* Resolving overlay */}
            {isResolving && (
                <View style={styles.resolvingOverlay}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.resolvingText}>Getting location...</Text>
                </View>
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
    overlay: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.sm,
        gap: spacing.sm,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        ...shadows.card,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        gap: spacing.sm,
        ...shadows.card,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: colors.text.main,
        paddingVertical: spacing.xs,
    },
    suggestionsContainer: {
        flex: 1,
        backgroundColor: '#fff',
        marginTop: spacing.sm,
        borderTopLeftRadius: borderRadius['2xl'],
        borderTopRightRadius: borderRadius['2xl'],
        ...shadows.card,
    },
    sectionHeader: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.sm,
    },
    suggestionsList: {
        flex: 1,
    },
    suggestionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
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
    primaryText: {
        fontSize: 15,
        fontWeight: '500',
        color: colors.text.main,
        marginBottom: 2,
    },
    secondaryText: {
        fontSize: 13,
        color: colors.text.muted,
    },
    userMarker: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(0, 82, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    userMarkerInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: colors.primary,
        borderWidth: 2,
        borderColor: '#fff',
    },
    destMarker: {
        alignItems: 'center',
    },
    resolvingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    resolvingText: {
        marginTop: spacing.md,
        fontSize: 16,
        color: colors.text.muted,
    },
});
