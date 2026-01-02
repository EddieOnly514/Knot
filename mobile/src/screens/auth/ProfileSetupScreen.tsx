import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { colors, typography, spacing, borderRadius, shadows } from '../../design';
import type { RootStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function ProfileSetupScreen() {
  const navigation = useNavigation<NavigationProp>();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photos to add a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleContinue = () => {
    if (firstName.trim() && lastName.trim()) {
      // TODO: Save profile to Supabase
      // Navigate to WelcomeLoading animation
      (navigation as any).navigate('WelcomeLoading');
    }
  };

  const isValid = firstName.trim().length > 0 && lastName.trim().length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoSection}>
          <View style={styles.ringsContainer}>
            <View style={[styles.ring, styles.ring1]} />
            <View style={[styles.ring, styles.ring2]} />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Set up your profile</Text>
        <Text style={styles.subtitle}>
          Let others know who you are
        </Text>

        {/* Photo Upload */}
        <TouchableOpacity style={styles.photoContainer} onPress={handlePickPhoto}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoIcon}>📷</Text>
              <Text style={styles.photoText}>Add Photo</Text>
            </View>
          )}
          <View style={styles.photoEditBadge}>
            <Text style={styles.photoEditIcon}>✎</Text>
          </View>
        </TouchableOpacity>

        {/* Name Inputs */}
        <View style={styles.inputsContainer}>
          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>First name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your first name"
              placeholderTextColor={colors.text.muted}
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>Last name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your last name"
              placeholderTextColor={colors.text.muted}
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
            />
          </View>
        </View>

        {/* Info Note */}
        <View style={styles.infoNote}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            Your name will be shown to other riders when you match
          </Text>
        </View>
      </ScrollView>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
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
  photoContainer: {
    alignSelf: 'center',
    marginBottom: spacing.xl,
    position: 'relative',
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.slate[100],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  photoIcon: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  photoText: {
    ...typography.styles.caption,
    color: colors.text.muted,
  },
  photoEditBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.card,
  },
  photoEditIcon: {
    fontSize: 14,
    color: colors.text.white,
  },
  inputsContainer: {
    gap: spacing.md,
  },
  inputCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius['3xl'],
    padding: spacing.md,
    ...shadows.card,
  },
  inputLabel: {
    ...typography.styles.caption,
    color: colors.text.muted,
    marginBottom: spacing.xs,
  },
  input: {
    ...typography.styles.body,
    color: colors.text.main,
    fontSize: 18,
    paddingVertical: spacing.xs,
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryAlpha[5],
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  infoIcon: {
    fontSize: 16,
  },
  infoText: {
    ...typography.styles.caption,
    color: colors.text.muted,
    flex: 1,
  },
  buttonContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xl,
    backgroundColor: colors.background,
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