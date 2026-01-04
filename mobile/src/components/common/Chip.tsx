import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../../design';

interface ChipProps {
    label: string;
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'secondary';
    size?: 'small' | 'medium';
    icon?: React.ReactNode;
}

export function Chip({ label, variant = 'default', size = 'medium', icon }: ChipProps) {
    const getVariantStyles = () => {
        switch (variant) {
            case 'primary':
                return { bg: colors.primaryAlpha[10], text: colors.primary };
            case 'success':
                return { bg: '#DCFCE7', text: '#16A34A' };
            case 'warning':
                return { bg: '#FEF3C7', text: '#D97706' };
            case 'secondary':
                return { bg: colors.slate[100], text: colors.text.muted };
            default:
                return { bg: colors.cardBlue, text: colors.text.main };
        }
    };

    const variantStyles = getVariantStyles();
    const isSmall = size === 'small';

    return (
        <View style={[
            styles.chip,
            { backgroundColor: variantStyles.bg },
            isSmall && styles.chipSmall
        ]}>
            {icon && <View style={styles.iconContainer}>{icon}</View>}
            <Text style={[
                styles.label,
                { color: variantStyles.text },
                isSmall && styles.labelSmall
            ]}>
                {label}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 100,
        gap: 4,
    },
    chipSmall: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    iconContainer: {
        width: 16,
        height: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        fontSize: 13,
        fontWeight: '500',
    },
    labelSmall: {
        fontSize: 11,
    },
});
