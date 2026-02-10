/**
 * Destination Search Component
 * Uber-style search with autocomplete, recents, and resolution
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Keyboard,
} from 'react-native';
import { Search, X, MapPin, Clock, Plane, Train, Building2, Navigation } from 'lucide-react-native';
import * as Location from 'expo-location';
import { colors, spacing, borderRadius, shadows, typography } from '../../design';
import { Destination, Suggestion, SuggestionCategory } from '../../types/destination';
import {
    getAutocompleteSuggestions,
    resolvePlaceDetails,
    cancelAllRequests
} from '../../services/placesService';
import {
    getRecentDestinations,
    addToRecents,
    recentsToSuggestions,
    filterRecents,
} from '../../services/recentsService';

// Calculate distance in miles using Haversine formula
const calculateDistanceMiles = (
    lat1: number,
    lon1: number,
    lat2: number | undefined,
    lon2: number | undefined
): number | null => {
    if (lat2 === undefined || lon2 === undefined) return null;

    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// Format distance for display (converts meters to miles if present)
const formatDistance = (meters: number | undefined): string | null => {
    if (meters === undefined) return null;
    const miles = meters / 1609.34;
    if (miles < 0.1) return 'Nearby';
    if (miles < 10) return `${miles.toFixed(1)} mi`;
    return `${Math.round(miles)} mi`;
};

interface DestinationSearchProps {
    placeholder?: string;
    onDestinationSelected: (destination: Destination) => void;
    onCancel?: () => void;
    autoFocus?: boolean;
}

const DEBOUNCE_MS = 200;
const MIN_QUERY_LENGTH = 2;

export function DestinationSearch({
    placeholder = 'Where to?',
    onDestinationSelected,
    onCancel,
    autoFocus = true,
}: DestinationSearchProps) {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isResolving, setIsResolving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

    const debounceRef = useRef<NodeJS.Timeout | null>(null);
    const inputRef = useRef<TextInput>(null);

    // Get user location on mount
    useEffect(() => {
        (async () => {
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
                }
            } catch (err) {
                console.log('[Search] Location not available');
            }
        })();
    }, []);

    // Load recents when query is empty
    useEffect(() => {
        if (query.length === 0) {
            loadRecents();
        }
    }, [query]);

    const loadRecents = async () => {
        const recents = await getRecentDestinations();
        const recentSuggestions = recentsToSuggestions(recents);
        setSuggestions(recentSuggestions);
    };

    // Debounced search
    const handleSearch = useCallback((text: string) => {
        setQuery(text);
        setError(null);

        // Clear previous debounce
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        // If query too short, show recents
        if (text.length < MIN_QUERY_LENGTH) {
            cancelAllRequests();
            loadRecents();
            return;
        }

        // Debounce the search
        debounceRef.current = setTimeout(async () => {
            setIsLoading(true);
            try {
                // Get live suggestions
                const liveSuggestions = await getAutocompleteSuggestions({
                    query: text,
                    userLocation: userLocation || undefined,
                    biasRadius: 50000,
                });

                // Get matching recents
                const allRecents = await getRecentDestinations();
                const matchingRecents = filterRecents(allRecents, text);
                const recentSuggestions = recentsToSuggestions(matchingRecents);

                // Combine: recents first, then live
                const combined = [...recentSuggestions, ...liveSuggestions];

                // Deduplicate by placeId
                const seen = new Set<string>();
                const deduped = combined.filter(s => {
                    if (seen.has(s.placeId)) return false;
                    seen.add(s.placeId);
                    return true;
                });

                setSuggestions(deduped.slice(0, 10));
            } catch (err) {
                console.error('[Search] Error:', err);
                setError('Search failed. Please try again.');
            } finally {
                setIsLoading(false);
            }
        }, DEBOUNCE_MS);
    }, [userLocation]);

    // Handle suggestion selection
    const handleSelect = async (suggestion: Suggestion) => {
        Keyboard.dismiss();
        setIsResolving(true);
        setError(null);

        try {
            // If it's a recent, we already have the destination
            if (suggestion.source === 'recent') {
                const recents = await getRecentDestinations();
                const found = recents.find(r => r.destination.id === suggestion.placeId);
                if (found) {
                    await addToRecents(found.destination); // Move to top
                    onDestinationSelected(found.destination);
                    return;
                }
            }

            // Resolve place details
            const destination = await resolvePlaceDetails(suggestion.placeId);
            if (destination) {
                await addToRecents(destination);
                onDestinationSelected(destination);
            } else {
                setError('Could not get location details. Please try again.');
            }
        } catch (err) {
            console.error('[Search] Resolution error:', err);
            setError('Failed to get location. Please try again.');
        } finally {
            setIsResolving(false);
        }
    };

    // Clear search
    const handleClear = () => {
        setQuery('');
        setSuggestions([]);
        loadRecents();
        inputRef.current?.focus();
    };

    // Get icon for category
    const getCategoryIcon = (category: SuggestionCategory) => {
        switch (category) {
            case 'airport': return <Plane size={20} color={colors.primary} />;
            case 'transit': return <Train size={20} color={colors.accent} />;
            case 'city': return <Building2 size={20} color={colors.text.muted} />;
            case 'recent': return <Clock size={20} color={colors.text.muted} />;
            default: return <MapPin size={20} color={colors.text.muted} />;
        }
    };

    // Render suggestion row
    const renderSuggestion = ({ item }: { item: Suggestion }) => {
        // Use the distance field from the suggestion (in meters)
        const distanceText = formatDistance(item.distance);

        return (
            <TouchableOpacity
                style={styles.suggestionRow}
                onPress={() => handleSelect(item)}
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
                {distanceText && (
                    <View style={styles.distanceBadge}>
                        <Navigation size={12} color={colors.text.muted} />
                        <Text style={styles.distanceText}>{distanceText}</Text>
                    </View>
                )}
                {item.source === 'recent' && !distanceText && (
                    <View style={styles.recentBadge}>
                        <Text style={styles.recentBadgeText}>Recent</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Search Bar */}
            <View style={styles.searchBar}>
                <Search size={20} color={colors.text.muted} />
                <TextInput
                    ref={inputRef}
                    style={styles.input}
                    placeholder={placeholder}
                    placeholderTextColor={colors.text.muted}
                    value={query}
                    onChangeText={handleSearch}
                    autoFocus={autoFocus}
                    returnKeyType="search"
                    autoCorrect={false}
                    autoCapitalize="none"
                />
                {query.length > 0 && (
                    <TouchableOpacity onPress={handleClear} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <X size={20} color={colors.text.muted} />
                    </TouchableOpacity>
                )}
                {isLoading && <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />}
            </View>

            {/* Resolving overlay */}
            {isResolving && (
                <View style={styles.resolvingOverlay}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.resolvingText}>Getting location...</Text>
                </View>
            )}

            {/* Error message */}
            {error && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            {/* Section header */}
            {query.length === 0 && suggestions.length > 0 && (
                <Text style={styles.sectionHeader}>Recent</Text>
            )}

            {/* Suggestions list */}
            <FlatList
                data={suggestions}
                keyExtractor={(item) => item.id}
                renderItem={renderSuggestion}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    !isLoading && query.length >= MIN_QUERY_LENGTH ? (
                        <View style={styles.emptyContainer}>
                            <MapPin size={40} color={colors.text.muted} />
                            <Text style={styles.emptyText}>No results found</Text>
                        </View>
                    ) : null
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        marginHorizontal: spacing.md,
        marginVertical: spacing.sm,
        gap: spacing.sm,
        ...shadows.card,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: colors.text.main,
        paddingVertical: spacing.sm,
    },
    loader: {
        marginLeft: spacing.sm,
    },
    sectionHeader: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
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
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.slate[100],
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    suggestionText: {
        flex: 1,
    },
    primaryText: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.text.main,
        marginBottom: 2,
    },
    secondaryText: {
        fontSize: 14,
        color: colors.text.muted,
    },
    recentBadge: {
        backgroundColor: colors.slate[100],
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
    },
    recentBadgeText: {
        fontSize: 11,
        color: colors.text.muted,
        fontWeight: '500',
    },
    distanceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.slate[100],
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: borderRadius.sm,
        gap: 4,
    },
    distanceText: {
        fontSize: 12,
        color: colors.text.muted,
        fontWeight: '500',
    },
    resolvingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    resolvingText: {
        marginTop: spacing.md,
        fontSize: 16,
        color: colors.text.muted,
    },
    errorContainer: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
    },
    errorText: {
        fontSize: 14,
        color: colors.error,
        textAlign: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: spacing.xl * 2,
    },
    emptyText: {
        marginTop: spacing.md,
        fontSize: 16,
        color: colors.text.muted,
    },
});
