import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Image,
} from 'react-native';
import {
    X,
    ShieldCheck,
    Star,
    MapPin,
    Users,
    Briefcase,
    Clock,
    Car,
    ThumbsUp,
} from 'lucide-react-native';
import { colors, spacing, borderRadius, shadows } from '../../design';

interface MatchProfileData {
    id: string;
    name: string;
    photo: string | null;
    initials: string;
    verified: boolean;
    rating: number;
    ridesCompleted: number;
    wouldRideAgain: number;
    memberSince: string;
    roughLocation: string;
    partySize: number;
    luggage: string;
    leavingIn: string;
    ridePreference: string;
}

interface MatchProfileSheetProps {
    visible: boolean;
    onClose: () => void;
    match: MatchProfileData | null;
}

export function MatchProfileSheet({ visible, onClose, match }: MatchProfileSheetProps) {
    if (!match) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={24} color={colors.text.muted} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Profile</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    {/* Profile Info */}
                    <View style={styles.profileSection}>
                        {match.photo ? (
                            <Image source={{ uri: match.photo }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarInitials}>{match.initials}</Text>
                            </View>
                        )}
                        <Text style={styles.name}>{match.name}</Text>

                        {/* Trust Badges */}
                        <View style={styles.badgesRow}>
                            {match.verified && (
                                <View style={styles.badge}>
                                    <ShieldCheck size={14} color={colors.primary} />
                                    <Text style={styles.badgeText}>Verified</Text>
                                </View>
                            )}
                            <View style={styles.badge}>
                                <Star size={14} color="#F59E0B" fill="#F59E0B" />
                                <Text style={styles.badgeText}>{match.rating.toFixed(1)}</Text>
                            </View>
                        </View>
                        <Text style={styles.memberSince}>Member since {match.memberSince}</Text>
                    </View>

                    {/* Stats */}
                    <View style={styles.statsRow}>
                        <View style={styles.stat}>
                            <Text style={styles.statValue}>{match.ridesCompleted}</Text>
                            <Text style={styles.statLabel}>Rides</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.stat}>
                            <Text style={styles.statValue}>{match.rating}</Text>
                            <Text style={styles.statLabel}>Rating</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.stat}>
                            <Text style={styles.statValue}>{match.wouldRideAgain}%</Text>
                            <Text style={styles.statLabel}>Would ride again</Text>
                        </View>
                    </View>

                    {/* Location */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <MapPin size={18} color={colors.primary} />
                            <Text style={styles.sectionTitle}>Approximate location</Text>
                        </View>
                        <View style={styles.locationCard}>
                            <View style={styles.locationMapPlaceholder}>
                                <MapPin size={24} color={colors.primary} />
                            </View>
                            <Text style={styles.locationText}>{match.roughLocation}</Text>
                        </View>
                    </View>

                    {/* Trip Details */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Trip details</Text>
                        <View style={styles.detailsGrid}>
                            <View style={styles.detailItem}>
                                <Users size={16} color={colors.text.muted} />
                                <Text style={styles.detailText}>Party of {match.partySize}</Text>
                            </View>
                            <View style={styles.detailItem}>
                                <Briefcase size={16} color={colors.text.muted} />
                                <Text style={styles.detailText}>{match.luggage}</Text>
                            </View>
                            <View style={styles.detailItem}>
                                <Clock size={16} color={colors.text.muted} />
                                <Text style={styles.detailText}>Leaving {match.leavingIn}</Text>
                            </View>
                            <View style={styles.detailItem}>
                                <Car size={16} color={colors.text.muted} />
                                <Text style={styles.detailText}>{match.ridePreference}</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: 40,
        maxHeight: '90%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.slate[100],
    },
    closeButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text.main,
    },
    profileSection: {
        alignItems: 'center',
        paddingVertical: 24,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginBottom: 12,
    },
    avatarPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.primaryAlpha[10],
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    avatarInitials: {
        fontSize: 28,
        fontWeight: '600',
        color: colors.primary,
    },
    name: {
        fontSize: 24,
        fontWeight: '600',
        color: colors.text.main,
        marginBottom: 8,
    },
    badgesRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.cardBlue,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 100,
        gap: 4,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.text.main,
    },
    memberSince: {
        fontSize: 13,
        color: colors.text.muted,
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: colors.cardBlue,
        marginHorizontal: 16,
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
    },
    stat: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text.main,
    },
    statLabel: {
        fontSize: 12,
        color: colors.text.muted,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        backgroundColor: colors.slate[200],
    },
    section: {
        paddingHorizontal: 16,
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text.main,
        marginBottom: 12,
    },
    locationCard: {
        backgroundColor: colors.cardBlue,
        borderRadius: 16,
        overflow: 'hidden',
    },
    locationMapPlaceholder: {
        height: 100,
        backgroundColor: colors.slate[100],
        alignItems: 'center',
        justifyContent: 'center',
    },
    locationText: {
        fontSize: 14,
        color: colors.text.main,
        padding: 12,
        textAlign: 'center',
    },
    detailsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.cardBlue,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 100,
        gap: 6,
    },
    detailText: {
        fontSize: 13,
        color: colors.text.main,
    },
});
