import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

interface KnotLogoProps {
    size?: 'small' | 'medium' | 'large' | number;
    color?: string; // Kept for API compatibility but not used with image
}

/**
 * Knot Logo - Uses the new Knot icon image
 * 
 * The logo shows two interlinking rings/circles representing 
 * connection and ride-sharing.
 */
export function KnotLogo({ size = 'medium' }: KnotLogoProps) {
    // Calculate dimensions based on size
    const sizeValue = typeof size === 'number'
        ? size
        : size === 'small' ? 32 : size === 'medium' ? 48 : 64;

    return (
        <View style={[styles.container, { width: sizeValue, height: sizeValue }]}>
            <Image
                source={require('../../../assets/knot-logo.png')}
                style={{ width: sizeValue, height: sizeValue }}
                resizeMode="contain"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
});

// Export logo dimensions for reference
export const KNOT_LOGO_SIZES = {
    small: 32,
    medium: 48,
    large: 64,
};
