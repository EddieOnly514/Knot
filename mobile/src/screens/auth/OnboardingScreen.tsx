import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, borderRadius, shadows } from '../../design';
import type { AuthStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList>;

export function OnboardingScreen() {
    const navigation = useNavigation<NavigationProp>();

    const handleContinue = () => {
        navigation.navigate('PhoneVerification');
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Logo Section */}
            <View style={styles.logoSection}>
                <View style={styles.ringsContainer}>
                    <View style={[styles.ring, styles.ring1]} />
                    <View style={[styles.ring, styles.ring2]} />
                </View>
                <Text style={styles.logoText}>Knot</Text>
            </View>

            {/* Tagline */}
            <Text style={styles.tagline}>
                Split rides.{'\n'}Stay safe.{'\n'}Save money.
            </Text>

            {/* Spacer */}
            <View style={styles.spacer} />

            {/* Continue Button */}
            <View style={styles.buttonContainer}>
                <TouchableOpacity onPress={handleContinue} activeOpacity={0.9}>
                    <LinearGradient
                        colors={[colors.primary, colors.primaryLight]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.continueButton}
                    >
                        <Text style={styles.continueText}>Get Started</Text>
                        <Text style={styles.continueArrow}>→</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        paddingHorizontal: spacing.lg,
    },
    logoSection: {
        alignItems: 'center',
        paddingTop: spacing['3xl'],
        paddingBottom: spacing.xl,
    },
    ringsContainer: {
        width: 64,
        height: 64,
        position: 'relative',
        marginBottom: spacing.md,
    },
    ring: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 3,
        borderColor: colors.primary,
    },
    ring1: {
        top: 0,
        left: 0,
    },
    ring2: {
        bottom: 0,
        right: 0,
    },
    logoText: {
        ...typography.styles.h2,
        color: colors.text.main,
        letterSpacing: -0.5,
    },
    tagline: {
        ...typography.styles.h1,
        color: colors.text.main,
        fontSize: 36,
        lineHeight: 44,
        textAlign: 'center',
        marginTop: spacing['2xl'],
    },
    spacer: {
        flex: 1,
    },
    buttonContainer: {
        paddingBottom: spacing.xl,
    },
    continueButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        borderRadius: borderRadius.lg,
        gap: spacing.sm,
        ...shadows.button,
    },
    continueText: {
        ...typography.styles.button,
        color: colors.text.white,
    },
    continueArrow: {
        fontSize: 20,
        color: colors.text.white,
    },
});
