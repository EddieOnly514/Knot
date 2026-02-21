import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, borderRadius, shadows } from '../../design';
import type { AuthStackParamList, RootStackParamList } from '../../types/navigation';
import { supabase } from '../../lib/supabase';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList>;
type OTPRouteProp = RouteProp<AuthStackParamList, 'OTPVerification'>;

export function OTPVerificationScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<OTPRouteProp>();
  const phone = route.params?.phone || '';

  const [code, setCode] = useState(['', '', '', '', '', '']); // 6 digits
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const maskedPhone = phone.length > 4
    ? `(***) ***-${phone.slice(-4)}`
    : phone;

  const handleCodeChange = (index: number, value: string) => {
    if (value.length <= 1) {
      const newCode = [...code];
      newCode[index] = value;
      setCode(newCode);

      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token: fullCode,
        type: 'sms',
      });

      if (error) {
        Alert.alert('Verification Failed', error.message);
      }
      // On success: onAuthStateChange in AuthContext fires automatically,
      // fetchProfile runs, and AppNavigator routes based on hasProfile:
      //   - New user (no profile)  → ProfileSetupNavigator → ProfileSetup screen
      //   - Existing user          → Main app
    } catch (err) {
      Alert.alert('Error', 'Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleResend = async () => {
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Code Sent', 'A new code has been sent to your phone');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to resend code');
    }
  };

  const isComplete = code.every(digit => digit !== '');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
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
        <Text style={styles.title}>Enter your code</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit code to {maskedPhone}
        </Text>

        {/* Code Input - 6 digits */}
        <View style={styles.codeContainer}>
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <TextInput
              key={index}
              ref={(ref) => { inputRefs.current[index] = ref; }}
              style={[styles.codeInput, code[index] && styles.codeInputFilled]}
              value={code[index]}
              onChangeText={(value) => handleCodeChange(index, value)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
              keyboardType="number-pad"
              maxLength={1}
              autoFocus={index === 0}
            />
          ))}
        </View>

        {/* Resend Link */}
        <TouchableOpacity style={styles.resendButton} onPress={handleResend}>
          <Text style={styles.resendText}>Didn't receive a code? </Text>
          <Text style={styles.resendLink}>Resend</Text>
        </TouchableOpacity>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Verify Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            onPress={handleVerify}
            disabled={!isComplete}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={isComplete ? [colors.primary, colors.primaryLight] : [colors.slate[300], colors.slate[300]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.verifyButton}
            >
              <Text style={styles.verifyText}>Verify</Text>
              <Text style={styles.verifyArrow}>→</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
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
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  codeInput: {
    width: 48,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
    color: colors.text.main,
    ...shadows.card,
  },
  codeInputFilled: {
    backgroundColor: colors.primaryAlpha[10],
    borderWidth: 2,
    borderColor: colors.primary,
  },
  resendButton: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  resendText: {
    ...typography.styles.body,
    color: colors.text.muted,
  },
  resendLink: {
    ...typography.styles.body,
    color: colors.primary,
    fontWeight: '600',
  },
  spacer: {
    flex: 1,
  },
  buttonContainer: {
    paddingBottom: spacing.xl,
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    ...shadows.button,
  },
  verifyText: {
    ...typography.styles.button,
    color: colors.text.white,
  },
  verifyArrow: {
    fontSize: 20,
    color: colors.text.white,
  },
});