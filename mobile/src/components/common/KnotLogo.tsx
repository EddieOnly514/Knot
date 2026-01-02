import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../design';

interface KnotLogoProps {
    size?: 'small' | 'medium' | 'large';
    color?: string;
}

const SIZES = {
    small: { container: 32, ring: 20, border: 2 },
    medium: { container: 48, ring: 32, border: 3 },
    large: { container: 64, ring: 40, border: 3 },
};

export function KnotLogo({ size = 'medium', color = colors.primary }: KnotLogoProps) {
    const dimensions = SIZES[size];

    return (
        <View style={[styles.container, { width: dimensions.container, height: dimensions.container }]}>
            <View
                style={[
                    styles.ring,
                    styles.ring1,
                    {
                        width: dimensions.ring,
                        height: dimensions.ring,
                        borderRadius: dimensions.ring / 2,
                        borderWidth: dimensions.border,
                        borderColor: color,
                    },
                ]}
            />
            <View
                style={[
                    styles.ring,
                    styles.ring2,
                    {
                        width: dimensions.ring,
                        height: dimensions.ring,
                        borderRadius: dimensions.ring / 2,
                        borderWidth: dimensions.border,
                        borderColor: color,
                    },
                ]}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
    },
    ring: {
        position: 'absolute',
    },
    ring1: {
        top: 0,
        left: 0,
    },
    ring2: {
        bottom: 0,
        right: 0,
    },
});
