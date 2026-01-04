import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight } from 'lucide-react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../../design';
import type { AuthStackParamList } from '../../types/navigation';
import { KnotLogo } from '../../components/common/KnotLogo';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList>;

export function OnboardingScreen() {
    const navigation = useNavigation<NavigationProp>();

    const handleContinue = () => {
        navigation.navigate('PhoneVerification');
    };

    return (
        <LinearGradient
            colors={['#DBEAFE', '#E0F2FE', '#F8FAFC']}
            locations={[0, 0.4, 0.7]}
            style={styles.container}
        >
            {/* Logo Section */}
            <View style={styles.logoSection}>
                <View style={styles.logoCircle}>
                    <KnotLogo size="large" color={colors.primary} />
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
                <TouchableOpacity
                    style={styles.continueButton}
                    onPress={handleContinue}
                    activeOpacity={0.9}
                >
                    <Text style={styles.continueText}>Get Started</Text>
                    <ArrowRight size={20} color={colors.primary} />
                </TouchableOpacity>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: spacing.lg,
        paddingTop: 80,
        paddingBottom: 40,
    },
    logoSection: {
        alignItems: 'center',
        paddingTop: spacing.xl,
        paddingBottom: spacing.xl,
    },
    logoCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
        ...shadows.card,
    },
    logoText: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.text.main,
        letterSpacing: -0.5,
    },
    tagline: {
        fontSize: 38,
        fontWeight: '700',
        color: colors.text.main,
        lineHeight: 48,
        textAlign: 'center',
        marginTop: spacing['2xl'],
    },
    spacer: {
        flex: 1,
    },
    buttonContainer: {
        paddingBottom: spacing.md,
    },
    continueButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        backgroundColor: '#FFFFFF',
        borderRadius: borderRadius.lg,
        gap: spacing.sm,
        ...shadows.card,
    },
    continueText: {
        fontSize: 17,
        fontWeight: '600',
        color: colors.primary,
    },
});
