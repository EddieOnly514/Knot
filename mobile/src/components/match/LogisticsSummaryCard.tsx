import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
    Users,
    Briefcase,
    Clock,
    Car,
    Lock,
    Unlock,
} from 'lucide-react-native';
import { colors, spacing, borderRadius, shadows } from '../../design';

interface LogisticsSummaryCardProps {
    totalParty: number;
    totalLuggage: string;
    timeLabel: string;
    rideType: string;
    meetupConfirmed: boolean;
    otherName?: string;
}

export function LogisticsSummaryCard({
    totalParty,
    totalLuggage,
    timeLabel,
    rideType,
    meetupConfirmed,
    otherName,
}: LogisticsSummaryCardProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Trip compatibility</Text>

            {/* Chips Row */}
            <View style={styles.chipsRow}>
                <View style={styles.chip}>
                    <Users size={14} color={colors.text.muted} />
                    <Text style={styles.chipText}>Total {totalParty}</Text>
                </View>
                <View style={styles.chip}>
                    <Briefcase size={14} color={colors.text.muted} />
                    <Text style={styles.chipText}>{totalLuggage}</Text>
                </View>
                <View style={styles.chip}>
                    <Clock size={14} color={colors.text.muted} />
                    <Text style={styles.chipText}>{timeLabel}</Text>
                </View>
                <View style={[styles.chip, rideType.includes('XL') && styles.chipWarning]}>
                    <Car size={14} color={rideType.includes('XL') ? '#D97706' : colors.text.muted} />
                    <Text style={[styles.chipText, rideType.includes('XL') && styles.chipTextWarning]}>
                        {rideType}
                    </Text>
                </View>
            </View>

            {/* Meetup Status */}
            <View style={[styles.statusRow, meetupConfirmed && styles.statusRowConfirmed]}>
                {meetupConfirmed ? (
                    <>
                        <Unlock size={14} color="#16A34A" />
                        <Text style={styles.statusTextConfirmed}>
                            Meetup confirmed — destination unlocked
                        </Text>
                    </>
                ) : (
                    <>
                        <Lock size={14} color={colors.text.muted} />
                        <Text style={styles.statusText}>
                            Meetup not confirmed — destination hidden
                        </Text>
                    </>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.cardBlue,
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 12,
    },
    title: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 12,
    },
    chipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 100,
        gap: 4,
    },
    chipWarning: {
        backgroundColor: '#FEF3C7',
    },
    chipText: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.text.main,
    },
    chipTextWarning: {
        color: '#D97706',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.slate[100],
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 8,
    },
    statusRowConfirmed: {
        backgroundColor: '#DCFCE7',
    },
    statusText: {
        fontSize: 12,
        color: colors.text.muted,
    },
    statusTextConfirmed: {
        fontSize: 12,
        color: '#16A34A',
        fontWeight: '500',
    },
});
