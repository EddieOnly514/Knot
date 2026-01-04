import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    FlatList,
    TouchableOpacity,
    Animated,
    Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Edit3, Check, Star } from 'lucide-react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../../design';
import type { RootStackParamList } from '../../types/navigation';
import { tripService, PotentialMatch } from '../../services/tripService';

import { BackButton } from '../../components/common/BackButton';
import { KnotLogo } from '../../components/common/KnotLogo';
import { SafetyBanner } from '../../components/match/SafetyBanner';
import { MatchProfileSheet } from '../../components/match/MatchProfileSheet';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ScreenRouteProp = RouteProp<RootStackParamList, 'FindingMatches'>;

// Loading Screen Component
function MatchingLoadingScreen({ onBack }: { onBack: () => void }) {
    const pulseAnim = useRef(new Animated.Value(0.8)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.2,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0.8,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }).start();
    }, []);

    return (
        <View style={styles.loadingContainer}>
            <SafeAreaView style={styles.loadingHeader}>
                <BackButton onPress={onBack} />
                <View style={{ width: 40 }} />
            </SafeAreaView>

            <View style={styles.loadingContent}>
                <Animated.View style={[styles.logoContainer, { transform: [{ scale: pulseAnim }] }]}>
                    <KnotLogo size="large" color={colors.primary} />
                </Animated.View>
                <Animated.Text style={[styles.loadingText, { opacity: fadeAnim }]}>
                    Finding matches...
                </Animated.Text>
            </View>
        </View>
    );
}

// Match Card Component
function MatchCard({
    match,
    onInterested,
    onPass,
    onProfilePress,
}: {
    match: PotentialMatch;
    onInterested: () => void;
    onPass: () => void;
    onProfilePress: () => void;
}) {
    const formatTimeDiff = (minutes: number) => {
        const absMin = Math.abs(Math.round(minutes));
        if (absMin < 60) return `${absMin} min`;
        return `${Math.round(absMin / 60)}h ${absMin % 60}m`;
    };

    const formatLuggage = (luggage: string) => {
        switch (luggage) {
            case 'none': return 'No luggage';
            case 'one': return '1 Luggage';
            case 'two': return '2+ Luggage';
            default: return luggage;
        }
    };

    const initials = `${match.first_name?.[0] || ''}${match.last_name?.[0] || ''}`;

    return (
        <View style={styles.matchCard}>
            {/* Profile Row */}
            <TouchableOpacity style={styles.profileRow} onPress={onProfilePress} activeOpacity={0.8}>
                {match.photo_url ? (
                    <Image source={{ uri: match.photo_url }} style={styles.avatar} />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarInitials}>{initials}</Text>
                    </View>
                )}
                <View style={styles.profileInfo}>
                    <Text style={styles.name}>{match.first_name}</Text>
                    <View style={styles.ratingRow}>
                        <Star size={14} color="#FFB800" fill="#FFB800" />
                        <Text style={styles.profileMeta}>
                            {match.rating.toFixed(1)} • {match.total_rides} rides
                        </Text>
                    </View>
                </View>
                <View style={styles.scoreContainer}>
                    <Text style={styles.scoreValue}>{match.match_score}%</Text>
                    <Text style={styles.scoreLabel}>match</Text>
                </View>
            </TouchableOpacity>

            {/* Logistics Chips */}
            <View style={styles.chipsRow}>
                <View style={styles.chip}>
                    <Text style={styles.chipText}>Party {match.party_size}</Text>
                </View>
                <View style={styles.chip}>
                    <Text style={styles.chipText}>{formatLuggage(match.luggage)}</Text>
                </View>
                <View style={styles.chip}>
                    <Text style={styles.chipText}>{formatTimeDiff(match.time_diff_minutes)}</Text>
                </View>
                {match.rough_location && (
                    <View style={styles.chip}>
                        <Text style={styles.chipText} numberOfLines={1}>{match.rough_location}</Text>
                    </View>
                )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.passButton} onPress={onPass}>
                    <Text style={styles.passText}>Pass</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.interestedButton} onPress={onInterested}>
                    <Check size={20} color="#FFFFFF" />
                    <Text style={styles.interestedText}>Interested</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

export function FindingMatchesScreen() {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute<ScreenRouteProp>();

    const tripIntentId = route.params?.tripIntentId;

    const [isSearching, setIsSearching] = useState(true);
    const [matches, setMatches] = useState<PotentialMatch[]>([]);
    const [selectedMatch, setSelectedMatch] = useState<PotentialMatch | null>(null);
    const [showProfile, setShowProfile] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch matches
    useEffect(() => {
        const fetchMatches = async () => {
            if (!tripIntentId) {
                // No trip intent, simulate search
                setTimeout(() => {
                    setIsSearching(false);
                    setMatches([]);
                }, 2000);
                return;
            }

            try {
                const { data, error } = await tripService.findPotentialMatches(tripIntentId);

                if (error) {
                    console.error('Error fetching matches:', error);
                    setError('Failed to find matches');
                }

                setMatches(data || []);
            } catch (err) {
                console.error('Error:', err);
                setError('Something went wrong');
            } finally {
                setIsSearching(false);
            }
        };

        // Small delay for loading animation
        const timer = setTimeout(fetchMatches, 1500);
        return () => clearTimeout(timer);
    }, [tripIntentId]);

    const handleInterested = async (match: PotentialMatch) => {
        if (!tripIntentId) {
            // Dev mode - just navigate
            navigation.navigate('Chat', { matchId: match.trip_intent_id });
            return;
        }

        try {
            const { matchId, error } = await tripService.expressInterest(
                tripIntentId,
                match.trip_intent_id
            );

            if (error) {
                console.error('Error expressing interest:', error);
                return;
            }

            // Navigate to chat with the new match ID
            navigation.navigate('Chat', { matchId: matchId || match.trip_intent_id });
        } catch (err) {
            console.error('Error:', err);
        }
    };

    const handlePass = (tripIntentId: string) => {
        setMatches(prev => prev.filter(m => m.trip_intent_id !== tripIntentId));
    };

    const handleProfilePress = (match: PotentialMatch) => {
        setSelectedMatch(match);
        setShowProfile(true);
    };

    if (isSearching) {
        return <MatchingLoadingScreen onBack={() => navigation.goBack()} />;
    }

    // Convert PotentialMatch to format expected by MatchProfileSheet
    const profileSheetMatch = selectedMatch ? {
        id: selectedMatch.trip_intent_id,
        name: selectedMatch.first_name,
        photo: selectedMatch.photo_url,
        initials: `${selectedMatch.first_name?.[0] || ''}${selectedMatch.last_name?.[0] || ''}`,
        verified: true,
        rating: selectedMatch.rating,
        ridesCompleted: selectedMatch.total_rides,
        wouldRideAgain: 95,
        memberSince: 'Member',
        roughLocation: selectedMatch.rough_location || '',
        partySize: selectedMatch.party_size,
        luggage: selectedMatch.luggage,
        leavingIn: `${Math.abs(Math.round(selectedMatch.time_diff_minutes))} min`,
        distance: selectedMatch.distance_meters
            ? `${(selectedMatch.distance_meters / 1000).toFixed(1)} km`
            : 'Nearby',
        ridePreference: selectedMatch.ride_type,
    } : null;

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <BackButton />
                <Text style={styles.headerTitle}>Matches</Text>
                <TouchableOpacity style={styles.editButton} onPress={() => navigation.goBack()}>
                    <Edit3 size={20} color={colors.text.muted} />
                </TouchableOpacity>
            </View>

            {/* Error State */}
            {error && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            {/* Matches List */}
            {matches.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <KnotLogo size="large" color={colors.slate[300]} />
                    <Text style={styles.emptyTitle}>No matches found</Text>
                    <Text style={styles.emptySubtitle}>Try adjusting your trip preferences</Text>
                    <TouchableOpacity style={styles.editTripButton} onPress={() => navigation.goBack()}>
                        <Text style={styles.editTripText}>Edit trip</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={matches}
                    keyExtractor={item => item.trip_intent_id}
                    renderItem={({ item }) => (
                        <MatchCard
                            match={item}
                            onInterested={() => handleInterested(item)}
                            onPass={() => handlePass(item.trip_intent_id)}
                            onProfilePress={() => handleProfilePress(item)}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* Safety Banner */}
            <SafetyBanner onLearnPress={() => { }} />

            {/* Profile Sheet */}
            <MatchProfileSheet
                visible={showProfile}
                onClose={() => setShowProfile(false)}
                match={profileSheetMatch}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: colors.cardBlue,
    },
    loadingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    loadingContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        ...shadows.card,
    },
    loadingText: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.text.main,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text.main,
    },
    editButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.cardBlue,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContent: {
        padding: 16,
        paddingBottom: 100,
    },
    matchCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        ...shadows.card,
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
    },
    avatarPlaceholder: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: colors.primaryAlpha[10],
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitials: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.primary,
    },
    profileInfo: {
        flex: 1,
        marginLeft: 12,
    },
    name: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text.main,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    profileMeta: {
        fontSize: 13,
        color: colors.text.muted,
    },
    scoreContainer: {
        alignItems: 'center',
    },
    scoreValue: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.primary,
    },
    scoreLabel: {
        fontSize: 11,
        color: colors.text.muted,
    },
    chipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    chip: {
        backgroundColor: colors.cardBlue,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 100,
    },
    chipText: {
        fontSize: 13,
        fontWeight: '500',
        color: colors.text.main,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    passButton: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.slate[200],
        alignItems: 'center',
        justifyContent: 'center',
    },
    passText: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text.muted,
    },
    interestedButton: {
        flex: 2,
        height: 48,
        borderRadius: 12,
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    interestedText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.text.main,
        marginTop: 24,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: colors.text.muted,
        marginBottom: 24,
    },
    editTripButton: {
        backgroundColor: colors.primaryAlpha[10],
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 100,
    },
    editTripText: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.primary,
    },
    errorContainer: {
        padding: 16,
        margin: 16,
        backgroundColor: '#FFEBEE',
        borderRadius: 12,
    },
    errorText: {
        color: '#C62828',
        textAlign: 'center',
    },
});
