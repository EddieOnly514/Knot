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
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ArrowRight } from 'lucide-react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../../design';
import type { AuthStackParamList } from '../../types/navigation';
import { KnotLogo } from '../../components/common/KnotLogo';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList>;

export function ProfileSetupScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, refreshProfile } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

  const handleContinue = async () => {
    if (!firstName.trim() || !lastName.trim()) return;
    if (!user) {
      Alert.alert('Error', 'Not logged in. Please restart the app.');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          email: email.trim() || user.email || null,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          photo_url: null, // photo upload can be added later
          is_verified: false,
          default_party_size: 1,
          default_luggage: 'none',
        });

      if (error) {
        console.error('[ProfileSetup] Error saving profile:', error);
        Alert.alert('Error', 'Failed to save your profile. Please try again.');
        return;
      }

      // Refresh profile in context — this flips hasProfile to true
      // AppNavigator will automatically route to Main once hasProfile is true
      await refreshProfile();
      // Navigate to WelcomeLoading for the animation, then state change takes over
      navigation.navigate('WelcomeLoading');
    } catch (err) {
      console.error('[ProfileSetup] Exception:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsSaving(false);
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
          <KnotLogo size="medium" color={colors.primary} />
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
              <Camera size={32} color={colors.text.muted} />
              <Text style={styles.photoText}>Add Photo</Text>
            </View>
          )}
          <View style={styles.photoEditBadge}>
            <Text style={styles.photoEditIcon}>+</Text>
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

          <View style={styles.inputCard}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>Email</Text>
              <Text style={styles.optionalLabel}>Optional</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor={colors.text.muted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          onPress={handleContinue}
          disabled={!isValid || isSaving}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={isValid && !isSaving ? [colors.primary, colors.primaryLight] : [colors.slate[300], colors.slate[300]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.continueButton}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.continueText}>Continue</Text>
                <ArrowRight size={20} color="#FFFFFF" />
              </>
            )}
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
    backgroundColor: colors.cardBlue,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.slate[200],
    borderStyle: 'dashed',
  },
  photoText: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 4,
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
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  inputsContainer: {
    gap: spacing.md,
  },
  inputCard: {
    backgroundColor: colors.cardBlue,
    borderRadius: borderRadius['2xl'],
    padding: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.muted,
    marginBottom: spacing.xs,
  },
  optionalLabel: {
    fontSize: 11,
    color: colors.text.muted,
    fontStyle: 'italic',
    marginBottom: spacing.xs,
  },
  input: {
    fontSize: 18,
    color: colors.text.main,
    paddingVertical: spacing.xs,
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
  },
  continueText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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