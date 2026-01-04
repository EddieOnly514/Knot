import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Check, SlidersHorizontal, Clock, MapPin } from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../../design';

interface FilterChipsRowProps {
    verifiedOnly: boolean;
    onVerifiedToggle: () => void;
    sortBy: 'best' | 'closest' | 'soonest';
    onSortChange: (sort: 'best' | 'closest' | 'soonest') => void;
    timeWindow: number;
    onExpandTime: () => void;
    maxDistance?: number;
    onDistanceChange?: () => void;
}

export function FilterChipsRow({
    verifiedOnly,
    onVerifiedToggle,
    sortBy,
    onSortChange,
    timeWindow,
    onExpandTime,
    maxDistance = 2,
    onDistanceChange,
}: FilterChipsRowProps) {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.container}
        >
            {/* Verified Only Toggle */}
            <TouchableOpacity
                style={[styles.chip, verifiedOnly && styles.chipActive]}
                onPress={onVerifiedToggle}
            >
                {verifiedOnly && <Check size={14} color={colors.primary} />}
                <Text style={[styles.chipText, verifiedOnly && styles.chipTextActive]}>
                    Verified only
                </Text>
            </TouchableOpacity>

            {/* Sort Options */}
            <View style={styles.sortGroup}>
                <TouchableOpacity
                    style={[styles.sortChip, sortBy === 'best' && styles.sortChipActive]}
                    onPress={() => onSortChange('best')}
                >
                    <Text style={[styles.sortText, sortBy === 'best' && styles.sortTextActive]}>
                        Best match
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.sortChip, sortBy === 'closest' && styles.sortChipActive]}
                    onPress={() => onSortChange('closest')}
                >
                    <Text style={[styles.sortText, sortBy === 'closest' && styles.sortTextActive]}>
                        Closest
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.sortChip, sortBy === 'soonest' && styles.sortChipActive]}
                    onPress={() => onSortChange('soonest')}
                >
                    <Text style={[styles.sortText, sortBy === 'soonest' && styles.sortTextActive]}>
                        Soonest
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Time Window */}
            <TouchableOpacity style={styles.chip} onPress={onExpandTime}>
                <Clock size={14} color={colors.text.muted} />
                <Text style={styles.chipText}>{timeWindow} min</Text>
            </TouchableOpacity>

            {/* Distance */}
            {onDistanceChange && (
                <TouchableOpacity style={styles.chip} onPress={onDistanceChange}>
                    <MapPin size={14} color={colors.text.muted} />
                    <Text style={styles.chipText}>≤ {maxDistance} mi</Text>
                </TouchableOpacity>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.slate[100],
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 100,
        gap: 6,
    },
    chipActive: {
        backgroundColor: colors.primaryAlpha[10],
        borderWidth: 1,
        borderColor: colors.primary,
    },
    chipText: {
        fontSize: 13,
        fontWeight: '500',
        color: colors.text.muted,
    },
    chipTextActive: {
        color: colors.primary,
    },
    sortGroup: {
        flexDirection: 'row',
        backgroundColor: colors.slate[100],
        borderRadius: 100,
        padding: 2,
    },
    sortChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 100,
    },
    sortChipActive: {
        backgroundColor: '#FFFFFF',
    },
    sortText: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.text.muted,
    },
    sortTextActive: {
        color: colors.text.main,
    },
});
