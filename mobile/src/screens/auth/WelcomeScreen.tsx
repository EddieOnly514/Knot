import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Circle } from 'react-native-svg';
import { colors, typography, spacing, borderRadius, shadows } from '../../design';
import { LinearGradient } from 'expo-linear-gradient';
import type { AuthStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList>;

function KnotLogo() {
  return (
    <Svg width={80} height={80} viewBox="0 0 80 80">
      <Circle cx={28} cy={40} r={20} stroke={colors.primary} strokeWidth={4} fill="none" />
      <Circle cx={52} cy={40} r={20} stroke={colors.primaryLight} strokeWidth={4} fill="none" />
    </Svg>
  );
}

export function WelcomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const buttonFadeAnim = useRef(new Animated.Value(0)).current;
  const buttonSlideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Animate content in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate button with delay
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(buttonFadeAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(buttonSlideAnim, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ]).start();
    }, 300);
  }, []);

  const handleContinue = () => {
    navigation.navigate('PhoneVerification');
  };

  const handleBypass = () => {
    // Navigate to main app directly
    navigation.getParent()?.reset({
      index: 0,
      routes: [{ name: 'Main' as never }],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top spacer */}
      <View style={styles.spacer} />

      {/* Center content */}
      <Animated.View
        style={[
          styles.centerContent,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <KnotLogo />
        <View style={styles.textContainer}>
          <Text style={styles.title}>Knot</Text>
          <Text style={styles.tagline}>Get moving together.</Text>
        </View>
      </Animated.View>

      {/* Bottom spacer */}
      <View style={styles.spacer} />

      {/* Bottom buttons */}
      <Animated.View
        style={[
          styles.bottomButtons,
          {
            opacity: buttonFadeAnim,
            transform: [{ translateY: buttonSlideAnim }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleContinue}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientButton}
          >
            <Text style={styles.buttonIcon}>📱</Text>
            <Text style={styles.buttonText}>Continue with Phone</Text>
            <Text style={styles.buttonArrow}>→</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.bypassButton} onPress={handleBypass}>
          <Text style={styles.bypassText}>Skip for now (Dev Mode)</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
  },
  spacer: {
    flex: 1,
  },
  centerContent: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    ...typography.styles.h1,
    color: colors.text.main,
    fontSize: 32,
  },
  tagline: {
    ...typography.styles.body,
    color: colors.text.muted,
    fontSize: 18,
    marginTop: spacing.sm,
  },
  bottomButtons: {
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  primaryButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.button,
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  buttonIcon: {
    fontSize: 20,
  },
  buttonText: {
    ...typography.styles.button,
    color: colors.text.white,
  },
  buttonArrow: {
    fontSize: 20,
    color: colors.text.white,
    marginLeft: spacing.sm,
  },
  bypassButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  bypassText: {
    ...typography.styles.bodySmall,
    color: colors.text.muted,
  },
});