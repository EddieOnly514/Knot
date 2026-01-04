import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
} from 'react-native';
import {
    ShieldCheck,
    Star,
    Users,
    Briefcase,
    Clock,
    MapPin,
    Check,
    X,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, borderRadius, shadows } from '../../design';

export interface MatchData {
    id: string;
    name: string;
    photo: string | null;
    initials: string;
    verified: boolean;
    rating: number;
    partySize: number;
    luggage: string;
    leavingIn: string;
    mode: 'NOW' | 'ARRIVAL';
    arrivalTime?: string;
    proximityLabel: string;
    destinationArea: string;
    pickupArea?: string;
    compatibility: {
        rideFits: boolean;
        sameDirection: boolean;
        timingQuality: 'good' | 'tight' | 'perfect';
        xlLikely?: boolean;
    };
}

interface MatchCardProps {
    match: MatchData;
    onInterested: () => void;
    onPass: () => void;
    onMore?: () => void;
}

export function MatchCard({ match, onInterested, onPass, onMore }: MatchCardProps) {
    const getTimingLabel = () => {
        switch (match.compatibility.timingQuality) {
            case 'perfect': return 'Perfect timing';
            case 'tight': return 'Tight timing';
            default: return 'Good overlap';
        }
    };

    const getTimingVariant = () => {
        switch (match.compatibility.timingQuality) {
            case 'perfect': return styles.chipSuccess;
            case 'tight': return styles.chipWarning;
            default: return styles.chipDefault;
        }
    };

    return (
        <View style={styles.card}>
            {/* Row 1: Identity + Trust */}
            <View style={styles.identityRow}>
                {/* Avatar */}
                {match.photo ? (
                    <Image source={{ uri: match.photo }} style={styles.avatar} />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarInitials}>{match.initials}</Text>
                    </View>
                )}

                {/* Name + Info */}
                <View style={styles.identityInfo}>
                    <Text style={styles.name}>{match.name}</Text>
                </View>

                {/* Trust Badges */}
                <View style={styles.trustBadges}>
                    {match.verified && (
                        <View style={styles.verifiedBadge}>
                            <ShieldCheck size={12} color={colors.primary} />
                            <Text style={styles.verifiedText}>Phone</Text>
                        </View>
                    )}
                    {match.rating > 0 && (
                        <View style={styles.ratingBadge}>
                            <Star size={12} color="#F59E0B" fill="#F59E0B" />
                            <Text style={styles.ratingText}>{match.rating.toFixed(1)}</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Row 2: Core Logistics (Primary Chips) */}
            <View style={styles.chipsRow}>
                <View style={styles.chip}>
                    <Users size={14} color={colors.text.muted} />
                    <Text style={styles.chipText}>Party {match.partySize}</Text>
                </View>
                <View style={styles.chip}>
                    <Briefcase size={14} color={colors.text.muted} />
                    <Text style={styles.chipText}>{match.luggage}</Text>
                </View>
                <View style={styles.chip}>
                    <Clock size={14} color={colors.text.muted} />
                    <Text style={styles.chipText}>
                        {match.mode === 'NOW' ? `Leaving ${match.leavingIn}` : `Arrives ${match.arrivalTime}`}
                    </Text>
                </View>
                <View style={styles.chip}>
                    <MapPin size={14} color={colors.text.muted} />
                    <Text style={styles.chipText}>{match.proximityLabel}</Text>
                </View>
            </View>

            {/* Row 3: Compatibility (Secondary Chips) */}
            <View style={styles.compatibilityRow}>
                {match.compatibility.rideFits && (
                    <View style={[styles.chipSmall, styles.chipSuccess]}>
                        <Text style={styles.chipSmallTextSuccess}>Ride fits</Text>
                    </View>
                )}
                {match.compatibility.sameDirection && (
                    <View style={[styles.chipSmall, styles.chipSuccess]}>
                        <Text style={styles.chipSmallTextSuccess}>Same direction</Text>
                    </View>
                )}
                <View style={[styles.chipSmall, getTimingVariant()]}>
                    <Text style={[
                        styles.chipSmallText,
                        match.compatibility.timingQuality === 'tight' && styles.chipSmallTextWarning,
                        match.compatibility.timingQuality !== 'tight' && styles.chipSmallTextSuccess,
                    ]}>
                        {getTimingLabel()}
                    </Text>
                </View>
                {match.compatibility.xlLikely && (
                    <View style={[styles.chipSmall, styles.chipDefault]}>
                        <Text style={styles.chipSmallText}>XL likely</Text>
                    </View>
                )}
            </View>

            {/* Row 4: Destination */}
            <View style={styles.destinationRow}>
                <MapPin size={14} color={colors.primary} />
                <Text style={styles.destinationText}>To: {match.destinationArea}</Text>
            </View>

            {/* Row 5: Actions */}
            <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.passButton} onPress={onPass}>
                    <X size={24} color={colors.slate[400]} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.interestedButton} onPress={onInterested}>
                    <LinearGradient
                        colors={[colors.primary, colors.primaryLight]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.interestedGradient}
                    >
                        <Check size={24} color="#FFFFFF" />
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 16,
        marginBottom: 12,
        ...shadows.card,
    },
    identityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    avatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primaryAlpha[10],
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitials: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.primary,
    },
    identityInfo: {
        flex: 1,
        marginLeft: 12,
    },
    name: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text.main,
    },
    trustBadges: {
        flexDirection: 'row',
        gap: 6,
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primaryAlpha[10],
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 100,
        gap: 4,
    },
    verifiedText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.primary,
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 100,
        gap: 4,
    },
    ratingText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#D97706',
    },
    chipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.cardBlue,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 100,
        gap: 4,
    },
    chipText: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.text.main,
    },
    compatibilityRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 12,
    },
    chipSmall: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 100,
    },
    chipDefault: {
        backgroundColor: colors.slate[100],
    },
    chipSuccess: {
        backgroundColor: '#DCFCE7',
    },
    chipWarning: {
        backgroundColor: '#FEF3C7',
    },
    chipSmallText: {
        fontSize: 11,
        fontWeight: '500',
        color: colors.text.muted,
    },
    chipSmallTextSuccess: {
        fontSize: 11,
        fontWeight: '500',
        color: '#16A34A',
    },
    chipSmallTextWarning: {
        fontSize: 11,
        fontWeight: '500',
        color: '#D97706',
    },
    destinationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.slate[100],
    },
    destinationText: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.text.main,
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 24,
    },
    passButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 2,
        borderColor: colors.slate[200],
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    interestedButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        overflow: 'hidden',
        ...shadows.button,
    },
    interestedGradient: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
