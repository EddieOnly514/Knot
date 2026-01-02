import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
    ChevronLeft,
    ChevronRight,
    Calendar,
    MapPin,
    Clock,
} from 'lucide-react-native';
import { colors } from '../../design';

// Mock Trips Data
const TRIPS = {
    upcoming: [
        {
            id: '1',
            date: 'Jan 5, 2026',
            time: '2:30 PM',
            mode: 'NOW',
            from: 'Irvine, CA',
            to: 'LAX Airport',
            status: 'Matched',
            matchName: 'Alex M.',
        },
    ],
    past: [
        {
            id: '2',
            date: 'Dec 28, 2025',
            time: '9:00 AM',
            mode: 'ARRIVAL',
            from: 'SNA Airport',
            to: 'Newport Beach',
            status: 'Completed',
            matchName: 'Jordan K.',
        },
        {
            id: '3',
            date: 'Dec 20, 2025',
            time: '4:15 PM',
            mode: 'NOW',
            from: 'Costa Mesa',
            to: 'LAX Airport',
            status: 'Completed',
            matchName: 'Taylor R.',
        },
    ],
};

export function TripsHistoryScreen() {
    const navigation = useNavigation();
    const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

    const trips = activeTab === 'upcoming' ? TRIPS.upcoming : TRIPS.past;

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <ChevronLeft size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Trips</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
                    onPress={() => setActiveTab('upcoming')}
                >
                    <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>
                        Upcoming
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'past' && styles.tabActive]}
                    onPress={() => setActiveTab('past')}
                >
                    <Text style={[styles.tabText, activeTab === 'past' && styles.tabTextActive]}>
                        Past
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {trips.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No {activeTab} trips</Text>
                    </View>
                ) : (
                    trips.map((trip) => (
                        <TouchableOpacity key={trip.id} style={styles.tripCard} activeOpacity={0.8}>
                            {/* Date & Mode */}
                            <View style={styles.tripHeader}>
                                <View style={styles.dateRow}>
                                    <Calendar size={14} color="#64748B" />
                                    <Text style={styles.dateText}>{trip.date}</Text>
                                    <Clock size={14} color="#64748B" style={{ marginLeft: 12 }} />
                                    <Text style={styles.dateText}>{trip.time}</Text>
                                </View>
                                <View style={[styles.modeBadge, trip.mode === 'NOW' ? styles.modeBadgeNow : styles.modeBadgeArrival]}>
                                    <Text style={styles.modeText}>{trip.mode}</Text>
                                </View>
                            </View>

                            {/* Route */}
                            <View style={styles.routeContainer}>
                                <View style={styles.routePoint}>
                                    <View style={styles.routeDot} />
                                    <Text style={styles.routeText}>{trip.from}</Text>
                                </View>
                                <View style={styles.routeLine} />
                                <View style={styles.routePoint}>
                                    <MapPin size={12} color={colors.primary} />
                                    <Text style={styles.routeText}>{trip.to}</Text>
                                </View>
                            </View>

                            {/* Footer */}
                            <View style={styles.tripFooter}>
                                <Text style={styles.matchText}>with {trip.matchName}</Text>
                                <View style={styles.statusContainer}>
                                    <Text style={[
                                        styles.statusText,
                                        trip.status === 'Completed' && styles.statusCompleted,
                                        trip.status === 'Matched' && styles.statusMatched,
                                    ]}>
                                        {trip.status}
                                    </Text>
                                    <ChevronRight size={16} color="#CBD5E1" />
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F8FBFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#0F172A',
    },
    tabsContainer: {
        flexDirection: 'row',
        marginHorizontal: 24,
        backgroundColor: '#F8FBFF',
        borderRadius: 12,
        padding: 4,
        marginBottom: 16,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    tabActive: {
        backgroundColor: colors.primary,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
    },
    tabTextActive: {
        color: '#FFFFFF',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 100,
    },
    emptyState: {
        alignItems: 'center',
        paddingTop: 60,
    },
    emptyText: {
        fontSize: 16,
        color: '#94A3B8',
    },
    tripCard: {
        backgroundColor: '#F8FBFF',
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 12,
        elevation: 2,
    },
    tripHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    dateText: {
        fontSize: 12,
        color: '#64748B',
    },
    modeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    modeBadgeNow: {
        backgroundColor: '#DCFCE7',
    },
    modeBadgeArrival: {
        backgroundColor: '#EFF6FF',
    },
    modeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#0F172A',
    },
    routeContainer: {
        marginBottom: 16,
    },
    routePoint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    routeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#94A3B8',
    },
    routeLine: {
        width: 1,
        height: 20,
        backgroundColor: '#E2E8F0',
        marginLeft: 3,
        marginVertical: 4,
    },
    routeText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#0F172A',
    },
    tripFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        paddingTop: 12,
    },
    matchText: {
        fontSize: 12,
        color: '#64748B',
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    statusCompleted: {
        color: '#22C55E',
    },
    statusMatched: {
        color: colors.primary,
    },
});
