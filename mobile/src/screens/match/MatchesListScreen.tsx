import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    FlatList,
    TouchableOpacity,
    SectionList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Plus, MapPin, Calendar, ChevronRight, Search } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, borderRadius, shadows } from '../../design';
import type { RootStackParamList } from '../../types/navigation';

import { KnotLogo } from '../../components/common/KnotLogo';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Trip {
    id: string;
    date: string;
    dateLabel: string;
    destination: string;
    status: 'upcoming' | 'active' | 'completed';
    matchName?: string;
    matchPhoto?: string;
}

// Mock trip data organized by date
const mockTrips: Trip[] = [
    {
        id: '1',
        date: '2026-01-05',
        dateLabel: 'Sun, Jan 5',
        destination: 'Downtown SF',
        status: 'upcoming',
        matchName: 'Sarah',
    },
    {
        id: '2',
        date: '2026-01-02',
        dateLabel: 'Today',
        destination: 'SFO Airport',
        status: 'active',
        matchName: 'Mike',
    },
    {
        id: '3',
        date: '2025-12-28',
        dateLabel: 'Sat, Dec 28',
        destination: 'Oakland',
        status: 'completed',
        matchName: 'Emily',
    },
    {
        id: '4',
        date: '2025-12-20',
        dateLabel: 'Fri, Dec 20',
        destination: 'Berkeley',
        status: 'completed',
        matchName: 'Alex',
    },
];

// Group trips by status
const groupTrips = (trips: Trip[]) => {
    const active = trips.filter(t => t.status === 'active');
    const upcoming = trips.filter(t => t.status === 'upcoming');
    const completed = trips.filter(t => t.status === 'completed');

    const sections = [];
    if (active.length > 0) sections.push({ title: 'Active', data: active });
    if (upcoming.length > 0) sections.push({ title: 'Upcoming', data: upcoming });
    if (completed.length > 0) sections.push({ title: 'Past Trips', data: completed });

    return sections;
};

export function MatchesListScreen() {
    const navigation = useNavigation<NavigationProp>();
    const [trips] = useState<Trip[]>(mockTrips);

    const sections = groupTrips(trips);

    const handleTripPress = (trip: Trip) => {
        if (trip.status === 'active') {
            navigation.navigate('Chat', { matchId: trip.id });
        }
    };

    const handlePlanTrip = () => {
        navigation.navigate('TripSearch', {});
    };

    const getStatusColor = (status: Trip['status']) => {
        switch (status) {
            case 'active':
                return { bg: '#DCFCE7', text: '#16A34A' };
            case 'upcoming':
                return { bg: colors.primaryAlpha[10], text: colors.primary };
            default:
                return { bg: colors.slate[100], text: colors.text.muted };
        }
    };

    const getStatusLabel = (status: Trip['status']) => {
        switch (status) {
            case 'active':
                return 'In Progress';
            case 'upcoming':
                return 'Scheduled';
            default:
                return 'Completed';
        }
    };

    // Empty state
    if (trips.length === 0) {
        return (
            <SafeAreaView style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <KnotLogo size="small" />
                    <Text style={styles.headerTitle}>Your Trips</Text>
                    <View style={{ width: 32 }} />
                </View>

                {/* Empty State */}
                <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconContainer}>
                        <MapPin size={48} color={colors.slate[300]} />
                    </View>
                    <Text style={styles.emptyTitle}>No trips yet</Text>
                    <Text style={styles.emptySubtitle}>
                        Find travelers heading your way and save on your next ride
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
            {/* Header */}
            <View style={styles.header}>
                <KnotLogo size="small" />
                <Text style={styles.headerTitle}>Your Trips</Text>
                <TouchableOpacity onPress={handlePlanTrip} style={styles.addButton}>
                    <Plus size={20} color={colors.primary} />
                </TouchableOpacity>
            </View>

            {/* Trips List */}
            <SectionList
                sections={sections}
                keyExtractor={item => item.id}
                renderSectionHeader={({ section }) => (
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>{section.title}</Text>
                    </View>
                )}
                renderItem={({ item }) => {
                    const statusColors = getStatusColor(item.status);
                    return (
                        <TouchableOpacity
                            style={styles.tripCard}
                            onPress={() => handleTripPress(item)}
                            activeOpacity={0.8}
                        >
                            <View style={styles.tripContent}>
                                {/* Date */}
                                <View style={styles.tripDateContainer}>
                                    <Calendar size={14} color={colors.text.muted} />
                                    <Text style={styles.tripDate}>{item.dateLabel}</Text>
                                </View>

                                {/* Destination */}
                                <View style={styles.tripDestination}>
                                    <MapPin size={16} color={colors.primary} />
                                    <Text style={styles.tripDestinationText}>{item.destination}</Text>
                                </View>

                                {/* Match info if available */}
                                {item.matchName && (
                                    <Text style={styles.tripMatch}>with {item.matchName}</Text>
                                )}
                            </View>

                            <View style={styles.tripRight}>
                                <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                                    <Text style={[styles.statusText, { color: statusColors.text }]}>
                                        {getStatusLabel(item.status)}
                                    </Text>
                                </View>
                                <ChevronRight size={20} color={colors.slate[300]} />
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
    // Empty state
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
