import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Search, Clock, MapPin, Shield } from 'lucide-react-native';
import { colors, spacing, borderRadius, shadows } from '../../design';
import { KnotLogo } from '../common/KnotLogo';

const STATUS_MESSAGES = [
    'Scanning nearby travelers...',
    'Checking time overlap...',
    'Verifying ride compatibility...',
];

export function SearchStatusCard() {
    const [statusIndex, setStatusIndex] = useState(0);
    const pulseAnim = useRef(new Animated.Value(0.8)).current;
    const fadeAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Pulse animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.2,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0.8,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Rotate status messages
        const interval = setInterval(() => {
            Animated.sequence([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();

            setStatusIndex((prev) => (prev + 1) % STATUS_MESSAGES.length);
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    return (
        <View style={styles.container}>
            {/* Animated Logo */}
            <View style={styles.animationContainer}>
                <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]} />
                <View style={styles.logoContainer}>
                    <KnotLogo size="medium" color={colors.primary} />
                </View>
            </View>

            {/* Status Text */}
            <Animated.Text style={[styles.statusText, { opacity: fadeAnim }]}>
                {STATUS_MESSAGES[statusIndex]}
            </Animated.Text>

            {/* Privacy Note */}
            <View style={styles.privacyNote}>
                <Shield size={12} color={colors.text.muted} />
                <Text style={styles.privacyText}>
                    We only show coarse location until both confirm meetup.
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.cardBlue,
        borderRadius: borderRadius['3xl'],
        padding: 24,
        marginHorizontal: 16,
        marginTop: 16,
        alignItems: 'center',
        ...shadows.card,
    },
    animationContainer: {
        width: 80,
        height: 80,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    pulseRing: {
        position: 'absolute',
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 2,
        borderColor: colors.primaryAlpha[20],
    },
    logoContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.card,
    },
    statusText: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.text.main,
        marginBottom: 12,
    },
    privacyNote: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    privacyText: {
        fontSize: 12,
        color: colors.text.muted,
    },
});
