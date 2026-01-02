import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, borderRadius, shadows } from '../../design';
import type { AuthStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList>;

export function PhoneVerificationScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [phoneNumber, setPhoneNumber] = useState('');

  const handleContinue = () => {
    if (phoneNumber.length >= 10) {
      navigation.navigate('OTPVerification', { phone: phoneNumber });
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const isValid = phoneNumber.length >= 10;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        {/* Logo */}
        <View style={styles.logoSection}>
          <View style={styles.ringsContainer}>
            <View style={[styles.ring, styles.ring1]} />
            <View style={[styles.ring, styles.ring2]} />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>What's your number?</Text>
        <Text style={styles.subtitle}>
          We'll send you a code to verify your phone
        </Text>

        {/* Phone Input */}
        <View style={styles.inputCard}>
          <TouchableOpacity style={styles.countryPicker}>
            <Text style={styles.countryFlag}>🇺🇸</Text>
            <Text style={styles.countryCode}>+1</Text>
            <Text style={styles.countryArrow}>▼</Text>
          </TouchableOpacity>

          <TextInput
            style={styles.phoneInput}
            placeholder="(555) 000-0000"
            placeholderTextColor={colors.text.muted}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            autoFocus
          />
        </View>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Footer */}
        <Text style={styles.footerText}>
          By continuing, you agree to receive SMS messages from Knot
        </Text>

        {/* Continue Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            onPress={handleContinue}
            disabled={!isValid}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={isValid ? [colors.primary, colors.primaryLight] : [colors.slate[300], colors.slate[300]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueButton}
            >
              <Text style={styles.continueText}>Continue</Text>
              <Text style={styles.continueArrow}>→</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
    ...shadows.card,
  },
  backIcon: {
    fontSize: 20,
    color: colors.text.main,
  },
  logoSection: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  ringsContainer: {
    width: 48,
    height: 48,
    position: 'relative',
  },
  ring: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
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
  title: {
    ...typography.styles.h1,
    color: colors.text.main,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.styles.body,
    color: colors.text.muted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  inputCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius['3xl'],
    padding: spacing.sm,
    ...shadows.card,
  },
  countryPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate[100],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    marginRight: spacing.sm,
    gap: spacing.xs,
  },
  countryFlag: {
    fontSize: 20,
  },
  countryCode: {
    ...typography.styles.bodyMedium,
    color: colors.text.main,
  },
  countryArrow: {
    fontSize: 10,
    color: colors.text.muted,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: colors.slate[100],
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.styles.body,
    color: colors.text.main,
    fontSize: 18,
  },
  spacer: {
    flex: 1,
  },
  footerText: {
    ...typography.styles.caption,
    color: colors.text.muted,
    textAlign: 'center',
    marginBottom: spacing.md,
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