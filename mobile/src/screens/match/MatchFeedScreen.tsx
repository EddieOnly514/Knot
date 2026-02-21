import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    Animated,
    SafeAreaView,
    ActivityIndicator,
    RefreshControl,
    Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, borderRadius, shadows } from '../../design';
import type { RootStackParamList } from '../../types/navigation';
import { KnotLogo } from '../../components/common/KnotLogo';
import { BackButton } from '../../components/common/BackButton';
import { tripService, PotentialMatch } from '../../services/tripService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ScreenRouteProp = RouteProp<RootStackParamList, 'MatchFeed'>;

function luggageLabel(luggage: string): string {
    switch (luggage) {
        case 'none': return 'No luggage';
        case 'one': return '1 Suitcase';
        case 'two': return '2 Suitcases';
        default: return luggage;
    }
}

function luggageIcon(luggage: string): string {
    switch (luggage) {
        case 'none': return '🎒';
        case 'one': return '🧳';
        case 'two': return '🧳🧳';
        default: return '💼';
    }
}

function timeDiffLabel(mins: number): string {
    const abs = Math.abs(Math.round(mins));
    if (abs < 1) return 'Same time';
    if (mins > 0) return `+${abs}m later`;
    return `${abs}m earlier`;
}

function RadarAnimation() {
    const pulseAnim = useRef(new Animated.Value(0.5)).current;
    const opacityAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.parallel([
                    Animated.timing(pulseAnim, { toValue: 2, duration: 1500, useNativeDriver: true }),
                    Animated.timing(opacityAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
                ]),
                Animated.parallel([
                    Animated.timing(pulseAnim, { toValue: 0.5, duration: 0, useNativeDriver: true }),
                    Animated.timing(opacityAnim, { toValue: 1, duration: 0, useNativeDriver: true }),
                ]),
            ])
        ).start();
    }, []);

    return (
        <View style={styles.radarContainer}>
            <View style={styles.radarRingStatic1} />
            <View style={styles.radarRingStatic2} />
            <View style={styles.radarRingStatic3} />
            <Animated.View style={[styles.radarRingAnimated, { transform: [{ scale: pulseAnim }], opacity: opacityAnim }]} />
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
    isActing,
}: {
    match: PotentialMatch;
    onInterested: () => void;
    onPass: () => void;
    isActing: boolean;
}) {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const handlePressIn = () => Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true }).start();
    const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();

    return (
        <Animated.View style={[styles.matchCard, { transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.cardHeader}>
                {match.photo_url ? (
                    <Image source={{ uri: match.photo_url }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                        <Text style={styles.avatarInitial}>{match.first_name[0]}</Text>
                    </View>
                )}
                <View style={styles.headerInfo}>
                    <View style={styles.nameRow}>
                        <Text style={styles.name}>{match.first_name}</Text>
                        {match.rating >= 4.5 && (
                            <View style={styles.verifiedBadge}>
                                <Text style={styles.verifiedIcon}>✓</Text>
                                <Text style={styles.verifiedText}>Verified</Text>
                            </View>
                        )}
                        <View style={styles.scoreBadge}>
                            <Text style={styles.scoreText}>{match.match_score}%</Text>
                        </View>
                    </View>
                    <View style={styles.statsRow}>
                        <Text style={styles.stat}>👤 Party of {match.party_size}</Text>
                        <Text style={styles.stat}>{luggageIcon(match.luggage)} {luggageLabel(match.luggage)}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.timeIndicator}>
                <Text style={styles.timeIcon}>⏱</Text>
                <Text style={styles.timeText}>{timeDiffLabel(match.time_diff_minutes)}</Text>
                {match.distance_meters != null && (
                    <Text style={styles.timeSub}> · {Math.round(match.distance_meters)}m away</Text>
                )}
            </View>

            <View style={styles.destinationRow}>
                <Text style={styles.destinationIcon}>📍</Text>
                <Text style={styles.destinationText}>Heading to {match.destination}</Text>
            </View>

            <View style={styles.tagsRow}>
                {match.rough_location && (
                    <View style={styles.tag}>
                        <Text style={styles.tagText}>{match.rough_location}</Text>
                    </View>
                )}
                <View style={styles.tag}>
                    <Text style={styles.tagText}>{match.ride_type === 'xl' ? 'UberXL / Lyft XL' : 'Standard ride'}</Text>
                </View>
            </View>

            <View style={styles.actionsRow}>
                <TouchableOpacity
                    style={styles.passButton}
                    onPress={onPass}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    activeOpacity={0.8}
                    disabled={isActing}
                >
                    <Text style={styles.passIcon}>✕</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.interestedButton}
                    onPress={onInterested}
                    activeOpacity={0.8}
                    disabled={isActing}
                >
                    <LinearGradient
                        colors={[colors.primary, colors.primaryLight]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.interestedGradient}
                    >
                        {isActing ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Text style={styles.interestedIcon}>✓</Text>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
}

export function MatchFeedScreen() {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute<ScreenRouteProp>();
    const tripIntentId = route.params?.tripIntentId;

    const [matches, setMatches] = useState<PotentialMatch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [actingOn, setActingOn] = useState<string | null>(null);
    const [verifiedOnly, setVerifiedOnly] = useState(false);

    const loadMatches = useCallback(async (isRefresh = false) => {
        if (!tripIntentId) {
            setIsLoading(false);
            return;
        }
        if (isRefresh) setIsRefreshing(true);
        else setIsLoading(true);

        const { data, error } = await tripService.findPotentialMatches(tripIntentId);
        if (data) setMatches(data);
        if (error) console.warn('[MatchFeed] load error:', error);

        setIsLoading(false);
        setIsRefreshing(false);
    }, [tripIntentId]);

    useEffect(() => { loadMatches(); }, [loadMatches]);

    const handleInterested = async (match: PotentialMatch) => {
        if (!tripIntentId || actingOn) return;
        setActingOn(match.trip_intent_id);

        const { matchId, error } = await tripService.expressInterest(tripIntentId, match.trip_intent_id);

        if (error) {
            Alert.alert('Error', 'Could not express interest. Please try again.');
            setActingOn(null);
            return;
        }

        // Remove from list immediately
        setMatches(prev => prev.filter(m => m.trip_intent_id !== match.trip_intent_id));
        setActingOn(null);

        if (matchId) {
            // Navigate to chat — either mutual already or pending
            Alert.alert(
                '🎉 Interest Sent!',
                `We let ${match.first_name} know you're interested. You'll be connected when they match back.`,
                [{ text: 'OK' }]
            );
        }
    };

    const handlePass = (tripIntentId: string) => {
        setMatches(prev => prev.filter(m => m.trip_intent_id !== tripIntentId));
    };

    const filteredMatches = verifiedOnly
        ? matches.filter(m => m.rating >= 4.5)
        : matches;

    if (isLoading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <View style={styles.headerBar}>
                    <BackButton />
                    <View style={styles.headerCenter}><KnotLogo size="small" /></View>
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
            <View style={styles.headerBar}>
                <BackButton />
                <View style={styles.headerCenter}><KnotLogo size="small" /></View>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.filterRow}>
                <TouchableOpacity
                    style={[styles.filterButton, verifiedOnly && styles.filterButtonActive]}
                    onPress={() => setVerifiedOnly(!verifiedOnly)}
                >
                    <Text style={[styles.filterText, verifiedOnly && styles.filterTextActive]}>
                        ✓ Verified only
                    </Text>
                </TouchableOpacity>
                {matches.length > 0 && (
                    <Text style={styles.countText}>{filteredMatches.length} match{filteredMatches.length !== 1 ? 'es' : ''}</Text>
                )}
            </View>

            {filteredMatches.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <RadarAnimation />
                    <Text style={styles.emptyTitle}>No matches found yet</Text>
                    <Text style={styles.emptySubtitle}>Check back in a few minutes</Text>
                    <TouchableOpacity
                        style={styles.refreshButton}
                        onPress={() => loadMatches(true)}
                    >
                        <Text style={styles.refreshButtonText}>Refresh</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={filteredMatches}
                    keyExtractor={(item) => item.trip_intent_id}
                    renderItem={({ item }) => (
                        <MatchCard
                            match={item}
                            onInterested={() => handleInterested(item)}
                            onPass={() => handlePass(item.trip_intent_id)}
                            isActing={actingOn === item.trip_intent_id}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={() => loadMatches(true)}
                            tintColor={colors.primary}
                        />
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loadingContainer: { flex: 1, backgroundColor: colors.background },
    headerBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    },
    headerCenter: { alignItems: 'center' },
    loadingContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { ...typography.styles.body, color: colors.text.muted, marginTop: spacing.lg },
    filterRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    },
    filterButton: {
        alignSelf: 'flex-start', paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm, borderRadius: borderRadius.full,
        backgroundColor: colors.slate[100],
    },
    filterButtonActive: { backgroundColor: colors.primary },
    filterText: { ...typography.styles.bodySmall, color: colors.text.muted, fontWeight: '500' },
    filterTextActive: { color: colors.text.white },
    countText: { ...typography.styles.caption, color: colors.text.muted },
    listContent: { padding: spacing.md, paddingBottom: spacing.xl },
    matchCard: {
        backgroundColor: colors.surface, borderRadius: borderRadius['3xl'],
        padding: spacing.lg, marginBottom: spacing.md, ...shadows.card,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
    avatar: { width: 64, height: 64, borderRadius: 32, ...shadows.card },
    avatarPlaceholder: { backgroundColor: colors.primaryAlpha[20], justifyContent: 'center', alignItems: 'center' },
    avatarInitial: { fontSize: 24, fontWeight: '700', color: colors.primary },
    headerInfo: { flex: 1, marginLeft: spacing.md },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    name: { ...typography.styles.h3, color: colors.text.main },
    verifiedBadge: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#E0F2FE', paddingHorizontal: spacing.sm,
        paddingVertical: 2, borderRadius: borderRadius.full, gap: 2,
    },
    verifiedIcon: { color: colors.primary, fontSize: 10, fontWeight: '700' },
    verifiedText: { ...typography.styles.caption, color: colors.primary, fontWeight: '600' },
    scoreBadge: {
        backgroundColor: colors.primaryAlpha[10], paddingHorizontal: 6,
        paddingVertical: 2, borderRadius: borderRadius.full,
    },
    scoreText: { ...typography.styles.caption, color: colors.primary, fontWeight: '700' },
    statsRow: { flexDirection: 'row', marginTop: spacing.xs, gap: spacing.md },
    stat: { ...typography.styles.caption, color: colors.text.muted },
    timeIndicator: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.primaryAlpha[5], paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm, borderRadius: borderRadius.lg,
        marginBottom: spacing.md, gap: spacing.sm,
    },
    timeIcon: { fontSize: 14 },
    timeText: { ...typography.styles.bodySmall, color: colors.primary, fontWeight: '600' },
    timeSub: { ...typography.styles.bodySmall, color: colors.text.muted },
    destinationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, gap: spacing.sm },
    destinationIcon: { fontSize: 18 },
    destinationText: { ...typography.styles.bodyMedium, color: colors.text.main },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.lg, gap: spacing.sm },
    tag: { backgroundColor: colors.slate[100], paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full },
    tagText: { ...typography.styles.caption, color: colors.text.muted },
    actionsRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xl },
    passButton: {
        width: 64, height: 64, borderRadius: 32,
        borderWidth: 2, borderColor: colors.slate[200],
        backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center',
    },
    passIcon: { fontSize: 28, color: colors.slate[400] },
    interestedButton: { width: 64, height: 64, borderRadius: 32, overflow: 'hidden', ...shadows.float },
    interestedGradient: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
    interestedIcon: { fontSize: 28, color: colors.text.white },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
    emptyTitle: { ...typography.styles.h3, color: colors.text.main, marginTop: spacing.lg },
    emptySubtitle: { ...typography.styles.body, color: colors.text.muted, marginTop: spacing.xs },
    refreshButton: {
        marginTop: spacing.md, paddingHorizontal: spacing.xl,
        paddingVertical: spacing.sm, borderRadius: borderRadius.full,
        backgroundColor: colors.primaryAlpha[10],
    },
    refreshButtonText: { ...typography.styles.bodySmall, color: colors.primary, fontWeight: '600' },
    radarContainer: { width: 128, height: 128, justifyContent: 'center', alignItems: 'center' },
    radarRingStatic1: { position: 'absolute', width: 128, height: 128, borderRadius: 64, borderWidth: 2, borderColor: colors.primaryAlpha[20] },
    radarRingStatic2: { position: 'absolute', width: 96, height: 96, borderRadius: 48, borderWidth: 2, borderColor: colors.primaryAlpha[20] },
    radarRingStatic3: { position: 'absolute', width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: colors.primaryAlpha[20] },
    radarRingAnimated: { position: 'absolute', width: 128, height: 128, borderRadius: 64, borderWidth: 2, borderColor: colors.primary },
    radarCenter: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
});
