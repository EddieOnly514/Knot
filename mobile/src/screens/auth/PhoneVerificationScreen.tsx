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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, ArrowRight } from 'lucide-react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../../design';
import type { AuthStackParamList } from '../../types/navigation';
import { KnotLogo } from '../../components/common/KnotLogo';
import { supabase } from '../../lib/supabase';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList>;

export function PhoneVerificationScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const getE164Phone = () => {
    const cleaned = phoneNumber.replace(/\D/g, '');
    return `+1${cleaned}`;
  };

  const handleContinue = async () => {
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length < 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid phone number');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: getE164Phone(),
      });

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        navigation.navigate('OTPVerification', { phone: getE164Phone() });
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to send code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleAppleLogin = () => {
    // TODO: Implement Apple Sign In
    console.log('Apple login');
  };

  const handleGoogleLogin = () => {
    // TODO: Implement Google Sign In
    console.log('Google login');
  };

  const handleEmailLogin = () => {
    // TODO: Implement email login
    console.log('Email login');
  };

  const isValid = phoneNumber.replace(/\D/g, '').length >= 10;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* DEV BYPASS - Remove for production */}
        {__DEV__ && (
          <TouchableOpacity
            style={styles.devButton}
            onPress={() => navigation.navigate('ProfileSetup')}
          >
            <Text style={styles.devButtonText}>DEV Skip</Text>
          </TouchableOpacity>
        )}

        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ChevronLeft size={24} color={colors.text.main} />
        </TouchableOpacity>

        {/* Logo */}
        <View style={styles.logoSection}>
          <KnotLogo size="medium" color={colors.primary} />
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
          </TouchableOpacity>

          <TextInput
            style={styles.phoneInput}
            placeholder="555 000 0000"
            placeholderTextColor={colors.text.muted}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            autoFocus
            textAlign="left"
          />
        </View>

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
              <ArrowRight size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social Login Options */}
        <View style={styles.socialContainer}>
          <TouchableOpacity style={styles.socialButton} onPress={handleAppleLogin}>
            <Text style={styles.socialText}>Apple</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.socialButton} onPress={handleGoogleLogin}>
            <Text style={styles.socialText}>Google</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.socialButton} onPress={handleEmailLogin}>
            <Text style={styles.socialText}>Email</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={styles.footerText}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
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
    backgroundColor: colors.cardBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  logoSection: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.main,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    color: colors.text.muted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  inputCard: {
    flexDirection: 'row',
    backgroundColor: colors.cardBlue,
    borderRadius: borderRadius['2xl'],
    padding: spacing.sm,
  },
  countryPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
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
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.main,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 18,
    color: colors.text.main,
  },
  buttonContainer: {
    marginTop: spacing.lg,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  continueText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  spacer: {
    flex: 1,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.slate[200],
  },
  dividerText: {
    fontSize: 13,
    color: colors.text.muted,
    marginHorizontal: 12,
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: spacing.lg,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBlue,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    gap: 6,
  },
  socialIcon: {
    fontSize: 18,
  },
  socialText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.main,
  },
  footerText: {
    fontSize: 12,
    color: colors.text.muted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  devButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.md,
    backgroundColor: colors.slate[500],
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: borderRadius.sm,
    zIndex: 100,
  },
  devButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
});
