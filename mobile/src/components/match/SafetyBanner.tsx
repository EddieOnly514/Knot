import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Shield } from 'lucide-react-native';
import { colors, typography, spacing } from '../../design';

interface SafetyBannerProps {
    onLearnPress?: () => void;
}

export function SafetyBanner({ onLearnPress }: SafetyBannerProps) {
    return (
        <View style={styles.container}>
            <Shield size={14} color={colors.primary} />
            <Text style={styles.text}>
                Meet in public pickup zones. Never share private info.
            </Text>
            {onLearnPress && (
                <TouchableOpacity onPress={onLearnPress}>
                    <Text style={styles.link}>Learn</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.cardBlue,
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
    },
    text: {
        flex: 1,
        fontSize: 12,
        color: colors.text.muted,
    },
    link: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.primary,
    },
});
