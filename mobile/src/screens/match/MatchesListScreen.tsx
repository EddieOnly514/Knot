import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    SectionList,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Plus, MapPin, Calendar, ChevronRight, Search } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, borderRadius, shadows } from '../../design';
import type { RootStackParamList } from '../../types/navigation';
import { KnotLogo } from '../../components/common/KnotLogo';
import { matchService, MatchWithProfile } from '../../services/matchService';
import { tripService, TripIntent } from '../../services/tripService';
import { useAuth } from '../../contexts/AuthContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Unified item for the list: either a match (active/mutual) or a trip intent (searching/completed)
interface ListItem {
    id: string;
    dateLabel: string;
    destination: string;
    status: 'active' | 'upcoming' | 'completed' | 'searching';
    matchName?: string;
    matchId?: string;
}

const statusConfig = {
    active: { bg: '#DCFCE7', text: '#16A34A', label: 'In Progress' },
    upcoming: { bg: colors.primaryAlpha[10], text: colors.primary, label: 'Scheduled' },
    searching: { bg: '#FEF9C3', text: '#B45309', label: 'Searching' },
    completed: { bg: colors.slate[100], text: colors.text.muted, label: 'Completed' },
} as const;

function formatDeparture(isoString: string): string {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / 60000);

    if (Math.abs(diffMins) < 60) {
        if (diffMins <= 0) return 'Now';
        return `In ${diffMins}m`;
    }
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export function MatchesListScreen() {
    const navigation = useNavigation<NavigationProp>();
    const { profile } = useAuth();

    const [items, setItems] = useState<ListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadData = async (isRefresh = false) => {
        if (isRefresh) setIsRefreshing(true);
        else setIsLoading(true);
        setError(null);

        try {
            // Fetch matches + trip intents in parallel
            const [matchesRes, tripsRes] = await Promise.all([
                matchService.getMyMatches(),
                tripService.getMyTripIntents(),
            ]);

            const allItems: ListItem[] = [];

            // Active/mutual matches → "In Progress"
            if (matchesRes.data) {
                for (const match of matchesRes.data) {
                    const otherName = match.other_user
                        ? `${match.other_user.first_name} ${match.other_user.last_name}`
                        : 'Your match';
                    const departure = match.other_trip?.departure_time
                        ? formatDeparture(match.other_trip.departure_time)
                        : '';
                    allItems.push({
                        id: match.id,
                        matchId: match.id,
                        dateLabel: departure,
                        destination: match.other_trip
                            ? (match as any).trip_1?.destination ?? (match as any).trip_2?.destination ?? '—'
                            : '—',
                        status: match.status === 'completed' ? 'completed' : 'active',
                        matchName: otherName,
                    });
                }
            }

            // Trip intents not yet matched → "Searching" or "Completed"
            if (tripsRes.data) {
                for (const trip of tripsRes.data) {
                    // Skip if already in matches (status matched/confirmed)
                    if (trip.status === 'cancelled') continue;
                    const inMatch = matchesRes.data?.some(
                        (m: any) =>
                            m.trip_intent_1 === trip.id || m.trip_intent_2 === trip.id
                    );
                    if (inMatch) continue;

                    allItems.push({
                        id: trip.id,
                        dateLabel: formatDeparture(trip.departure_time),
                        destination: trip.destination,
                        status: trip.status === 'completed' ? 'completed' : 'searching',
                    });
                }
            }

            // Sort: active first, then searching, then completed by departure time
            allItems.sort((a, b) => {
                const order = { active: 0, searching: 1, upcoming: 2, completed: 3 };
                return order[a.status] - order[b.status];
            });

            setItems(allItems);
        } catch (err) {
            setError('Failed to load trips. Pull to refresh.');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    // Reload whenever screen comes into focus
    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const handleTripPress = (item: ListItem) => {
        if (item.matchId) {
            navigation.navigate('Chat', { matchId: item.matchId });
        }
    };

    const handlePlanTrip = () => {
        navigation.navigate('TripSearch', {});
    };

    // Group into sections
    const sections: { title: string; data: ListItem[] }[] = [];
    const active = items.filter(i => i.status === 'active');
    const searching = items.filter(i => i.status === 'searching');
    const completed = items.filter(i => i.status === 'completed');
    if (active.length > 0) sections.push({ title: 'Active', data: active });
    if (searching.length > 0) sections.push({ title: 'Searching', data: searching });
    if (completed.length > 0) sections.push({ title: 'Past Trips', data: completed });

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <KnotLogo size="small" />
                    <Text style={styles.headerTitle}>Your Trips</Text>
                    <View style={{ width: 32 }} />
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    if (items.length === 0) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <KnotLogo size="small" />
                    <Text style={styles.headerTitle}>Your Trips</Text>
                    <View style={{ width: 32 }} />
                </View>
                <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconContainer}>
                        <MapPin size={48} color={colors.slate[300]} />
                    </View>
                    <Text style={styles.emptyTitle}>No trips yet</Text>
                    <Text style={styles.emptySubtitle}>
                        {error ?? 'Find travelers heading your way and save on your next ride'}
                    </Text>
                    <TouchableOpacity onPress={handlePlanTrip} activeOpacity={0.9}>
                        <LinearGradient
                            colors={[colors.primary, colors.primaryLight]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.planTripButton}
                        >
                            <Search size={20} color="#FFFFFF" />
                            <Text style={styles.planTripText}>Plan your next trip</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <KnotLogo size="small" />
                <Text style={styles.headerTitle}>Your Trips</Text>
                <TouchableOpacity onPress={handlePlanTrip} style={styles.addButton}>
                    <Plus size={20} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <SectionList
                sections={sections}
                keyExtractor={item => item.id}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={() => loadData(true)}
                        tintColor={colors.primary}
                    />
                }
                renderSectionHeader={({ section }) => (
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>{section.title}</Text>
                    </View>
                )}
                renderItem={({ item }) => {
                    const config = statusConfig[item.status];
                    return (
                        <TouchableOpacity
                            style={styles.tripCard}
                            onPress={() => handleTripPress(item)}
                            activeOpacity={item.matchId ? 0.8 : 1}
                        >
                            <View style={styles.tripContent}>
                                <View style={styles.tripDateContainer}>
                                    <Calendar size={14} color={colors.text.muted} />
                                    <Text style={styles.tripDate}>{item.dateLabel}</Text>
                                </View>
                                <View style={styles.tripDestination}>
                                    <MapPin size={16} color={colors.primary} />
                                    <Text style={styles.tripDestinationText}>{item.destination}</Text>
                                </View>
                                {item.matchName && (
                                    <Text style={styles.tripMatch}>with {item.matchName}</Text>
                                )}
                            </View>
                            <View style={styles.tripRight}>
                                <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
                                    <Text style={[styles.statusText, { color: config.text }]}>
                                        {config.label}
                                    </Text>
                                </View>
                                {item.matchId && <ChevronRight size={20} color={colors.slate[300]} />}
                            </View>
                        </TouchableOpacity>
                    );
                }}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                stickySectionHeadersEnabled={false}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.slate[100],
        backgroundColor: '#FFFFFF',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text.main,
    },
    addButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.primaryAlpha[10],
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingBottom: 100,
    },
    sectionHeader: {
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 8,
        backgroundColor: colors.background,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    tripCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginBottom: 8,
        padding: 16,
        borderRadius: 16,
        ...shadows.card,
    },
    tripContent: {
        flex: 1,
    },
    tripDateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 6,
    },
    tripDate: {
        fontSize: 12,
        color: colors.text.muted,
    },
    tripDestination: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    tripDestinationText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text.main,
    },
    tripMatch: {
        fontSize: 13,
        color: colors.text.muted,
        marginLeft: 22,
    },
    tripRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 100,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.cardBlue,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: '600',
        color: colors.text.main,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 15,
        color: colors.text.muted,
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 22,
    },
    planTripButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 28,
        paddingVertical: 16,
        borderRadius: 100,
        gap: 10,
    },
    planTripText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});
