import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    Animated,
    SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, borderRadius, shadows } from '../../design';
import type { RootStackParamList } from '../../types/navigation';
import { KnotLogo } from '../../components/common/KnotLogo';
import { BackButton } from '../../components/common/BackButton';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Match {
    id: string;
    name: string;
    age: number;
    photo: string;
    verified: boolean;
    partySize: number;
    luggage: string;
    luggageIcon: string;
    currentLocation: string;
    destination: string;
    leavingIn: string;
    ridePreference: string;
}

const mockMatches: Match[] = [
    {
        id: '1',
        name: 'Sarah',
        age: 26,
        photo: 'https://randomuser.me/api/portraits/women/44.jpg',
        verified: true,
        partySize: 1,
        currentLocation: 'Near Terminal 4',
        destination: 'Downtown SF Area',
        luggage: 'Carry-on only',
        luggageIcon: '💼',
        leavingIn: '15 min',
        ridePreference: 'UberXL preferred',
    },
    {
        id: '2',
        name: 'Mike',
        age: 32,
        photo: 'https://randomuser.me/api/portraits/men/32.jpg',
        verified: true,
        partySize: 1,
        currentLocation: 'Within 1-2 miles',
        destination: 'Downtown SF Area',
        luggage: '1 Suitcase',
        luggageIcon: '🧳',
        leavingIn: '30 min',
        ridePreference: 'Any',
    },
    {
        id: '3',
        name: 'Emily',
        age: 24,
        photo: 'https://randomuser.me/api/portraits/women/68.jpg',
        verified: true,
        partySize: 2,
        currentLocation: 'Terminal 1',
        destination: 'Santa Monica',
        luggage: '2+ Suitcases',
        luggageIcon: '🧳🧳',
        leavingIn: '20 min',
        ridePreference: 'UberXL',
    },
];

function RadarAnimation() {
    const pulseAnim = useRef(new Animated.Value(0.5)).current;
    const opacityAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.parallel([
                    Animated.timing(pulseAnim, {
                        toValue: 2,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(opacityAnim, {
                        toValue: 0,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(pulseAnim, {
                        toValue: 0.5,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                    Animated.timing(opacityAnim, {
                        toValue: 1,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                ]),
            ])
        ).start();
    }, []);

    return (
        <View style={styles.radarContainer}>
            <View style={styles.radarRingStatic1} />
            <View style={styles.radarRingStatic2} />
            <View style={styles.radarRingStatic3} />
            <Animated.View
                style={[
                    styles.radarRingAnimated,
                    {
                        transform: [{ scale: pulseAnim }],
                        opacity: opacityAnim,
                    },
                ]}
            />
            <View style={styles.radarCenter}>
                <KnotLogo size="small" color="#FFFFFF" />
            </View>
        </View>
    );
}

function MatchCard({
    match,
    onInterested,
    onPass,
}: {
    match: Match;
    onInterested: () => void;
    onPass: () => void;
}) {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.98,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
        }).start();
    };

    return (
        <Animated.View
            style={[styles.matchCard, { transform: [{ scale: scaleAnim }] }]}
        >
            {/* Header */}
            <View style={styles.cardHeader}>
                <Image source={{ uri: match.photo }} style={styles.avatar} />
                <View style={styles.headerInfo}>
                    <View style={styles.nameRow}>
                        <Text style={styles.name}>
                            {match.name}, {match.age}
                        </Text>
                        {match.verified && (
                            <View style={styles.verifiedBadge}>
                                <Text style={styles.verifiedIcon}>✓</Text>
                                <Text style={styles.verifiedText}>Verified</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.statsRow}>
                        <Text style={styles.stat}>👤 Party of {match.partySize}</Text>
                        <Text style={styles.stat}>
                            {match.luggageIcon} {match.luggage}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Time Indicator */}
            <View style={styles.timeIndicator}>
                <Text style={styles.timeIcon}>⏱</Text>
                <Text style={styles.timeText}>Leaving in {match.leavingIn}</Text>
            </View>

            {/* Destination */}
            <View style={styles.destinationRow}>
                <Text style={styles.destinationIcon}>📍</Text>
                <Text style={styles.destinationText}>Heading to {match.destination}</Text>
            </View>

            {/* Tags */}
            <View style={styles.tagsRow}>
                <View style={styles.tag}>
                    <Text style={styles.tagText}>{match.currentLocation}</Text>
                </View>
                <View style={styles.tag}>
                    <Text style={styles.tagText}>{match.ridePreference}</Text>
                </View>
            </View>

            {/* Action Buttons - Tinder Style */}
            <View style={styles.actionsRow}>
                <TouchableOpacity
                    style={styles.passButton}
                    onPress={onPass}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    activeOpacity={0.8}
                >
                    <Text style={styles.passIcon}>✕</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.interestedButton}
                    onPress={onInterested}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={[colors.primary, colors.primaryLight]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.interestedGradient}
                    >
                        <Text style={styles.interestedIcon}>✓</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
}

export function MatchFeedScreen() {
    const navigation = useNavigation<NavigationProp>();
    const [matches, setMatches] = useState<Match[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [verifiedOnly, setVerifiedOnly] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setMatches(mockMatches);
            setIsLoading(false);
        }, 2000);
        return () => clearTimeout(timer);
    }, []);

    const handleInterested = (match: Match) => {
        navigation.navigate('Chat', { matchId: match.id });
    };

    const handlePass = (matchId: string) => {
        setMatches((prev) => prev.filter((m) => m.id !== matchId));
    };

    const filteredMatches = verifiedOnly
        ? matches.filter((m) => m.verified)
        : matches;

    if (isLoading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                {/* Back Button */}
                <View style={styles.headerBar}>
                    <BackButton />
                    <View style={styles.headerCenter}>
                        <KnotLogo size="small" />
                    </View>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.loadingContent}>
                    <RadarAnimation />
                    <Text style={styles.loadingText}>Finding matches nearby...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.headerBar}>
                <BackButton />
                <View style={styles.headerCenter}>
                    <KnotLogo size="small" />
                </View>
                <View style={{ width: 40 }} />
            </View>

            {/* Filter Toggle */}
            <View style={styles.filterRow}>
                <TouchableOpacity
                    style={[styles.filterButton, verifiedOnly && styles.filterButtonActive]}
                    onPress={() => setVerifiedOnly(!verifiedOnly)}
                >
                    <Text
                        style={[styles.filterText, verifiedOnly && styles.filterTextActive]}
                    >
                        ✓ Verified only
                    </Text>
                </TouchableOpacity>
            </View>

            {filteredMatches.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <RadarAnimation />
                    <Text style={styles.emptyTitle}>No matches found yet</Text>
                    <Text style={styles.emptySubtitle}>Check back in a few minutes</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredMatches}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <MatchCard
                            match={item}
                            onInterested={() => handleInterested(item)}
                            onPass={() => handlePass(item.id)}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}
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
        backgroundColor: colors.background,
    },
    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    headerCenter: {
        alignItems: 'center',
    },
    loadingContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        ...typography.styles.body,
        color: colors.text.muted,
        marginTop: spacing.lg,
    },
    filterRow: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    filterButton: {
        alignSelf: 'flex-start',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        backgroundColor: colors.slate[100],
    },
    filterButtonActive: {
        backgroundColor: colors.primary,
    },
    filterText: {
        ...typography.styles.bodySmall,
        color: colors.text.muted,
        fontWeight: '500',
    },
    filterTextActive: {
        color: colors.text.white,
    },
    listContent: {
        padding: spacing.md,
        paddingBottom: spacing.xl,
    },
    matchCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius['3xl'],
        padding: spacing.lg,
        marginBottom: spacing.md,
        ...shadows.card,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        ...shadows.card,
    },
    headerInfo: {
        flex: 1,
        marginLeft: spacing.md,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    name: {
        ...typography.styles.h3,
        color: colors.text.main,
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E0F2FE',
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.full,
        gap: 2,
    },
    verifiedIcon: {
        color: colors.primary,
        fontSize: 10,
        fontWeight: '700',
    },
    verifiedText: {
        ...typography.styles.caption,
        color: colors.primary,
        fontWeight: '600',
    },
    statsRow: {
        flexDirection: 'row',
        marginTop: spacing.xs,
        gap: spacing.md,
    },
    stat: {
        ...typography.styles.caption,
        color: colors.text.muted,
    },
    timeIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primaryAlpha[5],
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.md,
        gap: spacing.sm,
    },
    timeIcon: {
        fontSize: 14,
    },
    timeText: {
        ...typography.styles.bodySmall,
        color: colors.primary,
        fontWeight: '600',
    },
    destinationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
        gap: spacing.sm,
    },
    destinationIcon: {
        fontSize: 18,
    },
    destinationText: {
        ...typography.styles.bodyMedium,
        color: colors.text.main,
    },
    tagsRow: {
        flexDirection: 'row',
        marginBottom: spacing.lg,
        gap: spacing.sm,
    },
    tag: {
        backgroundColor: colors.slate[100],
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
    },
    tagText: {
        ...typography.styles.caption,
        color: colors.text.muted,
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.xl,
    },
    passButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: 2,
        borderColor: colors.slate[200],
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    passIcon: {
        fontSize: 28,
        color: colors.slate[400],
    },
    interestedButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        overflow: 'hidden',
        ...shadows.float,
    },
    interestedGradient: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    interestedIcon: {
        fontSize: 28,
        color: colors.text.white,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyTitle: {
        ...typography.styles.h3,
        color: colors.text.main,
        marginTop: spacing.lg,
    },
    emptySubtitle: {
        ...typography.styles.body,
        color: colors.text.muted,
        marginTop: spacing.xs,
    },
    radarContainer: {
        width: 128,
        height: 128,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radarRingStatic1: {
        position: 'absolute',
        width: 128,
        height: 128,
        borderRadius: 64,
        borderWidth: 2,
        borderColor: colors.primaryAlpha[20],
    },
    radarRingStatic2: {
        position: 'absolute',
        width: 96,
        height: 96,
        borderRadius: 48,
        borderWidth: 2,
        borderColor: colors.primaryAlpha[20],
    },
    radarRingStatic3: {
        position: 'absolute',
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: 2,
        borderColor: colors.primaryAlpha[20],
    },
    radarRingAnimated: {
        position: 'absolute',
        width: 128,
        height: 128,
        borderRadius: 64,
        borderWidth: 2,
        borderColor: colors.primary,
    },
    radarCenter: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radarEmoji: {
        fontSize: 24,
    },
});
