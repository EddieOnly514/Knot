import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  Platform,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Clock, Calendar, X, Check, MapPin, Navigation, History } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { colors, typography, spacing, borderRadius, shadows } from '../../design';
import type { RootStackParamList } from '../../types/navigation';
import { KnotMap } from '../../components/common/KnotMap';
import { useAuth } from '../../contexts/AuthContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Mock recent searches
const recentSearches = [
  { id: '1', destination: 'Downtown SF', date: 'Yesterday' },
  { id: '2', destination: 'SFO Airport', date: 'Dec 28' },
  { id: '3', destination: 'Oakland', date: 'Dec 20' },
];

export function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { profile } = useAuth();
  const userName = profile?.first_name || 'Traveler';
  const [scheduleLater, setScheduleLater] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [currentLocation, setCurrentLocation] = useState('Getting location...');

  // Get user's actual location on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setCurrentLocation('Location unavailable');
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const [address] = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (address) {
          const city = address.city || address.subregion || '';
          const state = address.region || '';
          setCurrentLocation(`${city}, ${state}`);
        }
      } catch (err) {
        console.log('[Home] Location error:', err);
        setCurrentLocation('Location unavailable');
      }
    })();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleSearchPress = () => {
    navigation.navigate('PlanRide');
  };

  const handleRecentPress = (destination: string) => {
    navigation.navigate('PlanRide');
  };

  const handleLaterPress = () => {
    if (scheduleLater) {
      setScheduleLater(false);
      setSelectedDate(new Date());
    } else {
      setShowScheduleModal(true);
      setPickerMode('date');
    }
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleConfirmSchedule = () => {
    setScheduleLater(true);
    setShowScheduleModal(false);
  };

  const handleCancelSchedule = () => {
    setShowScheduleModal(false);
    setSelectedDate(new Date());
  };

  const formatScheduleDisplay = () => {
    const now = new Date();
    const isToday = selectedDate.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = selectedDate.toDateString() === tomorrow.toDateString();

    const dateStr = isToday
      ? 'Today'
      : isTomorrow
        ? 'Tomorrow'
        : selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    const timeStr = selectedDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    return `${dateStr}, ${timeStr}`;
  };

  return (
    <View style={styles.container}>
      {/* Gradient Background */}
      <LinearGradient
        colors={['#DBEAFE', '#E0F2FE', colors.background]}
        locations={[0, 0.35, 0.55]}
        style={styles.gradientBg}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>{userName}</Text>
          </View>
          <TouchableOpacity style={styles.avatarButton}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>A</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Main Search Card */}
        <View style={styles.searchSection}>
          <TouchableOpacity
            style={styles.searchCard}
            onPress={handleSearchPress}
            activeOpacity={0.95}
          >
            <View style={styles.searchRow}>
              <View style={styles.searchInputContainer}>
                <View style={styles.searchDot} />
                <Text style={styles.searchPlaceholder}>Where to?</Text>
              </View>

              <TouchableOpacity
                style={[styles.laterButton, scheduleLater && styles.laterButtonActive]}
                onPress={handleLaterPress}
              >
                <View style={styles.laterContent}>
                  <Clock size={16} color={scheduleLater ? colors.primary : colors.text.muted} />
                  <Text style={[styles.laterText, scheduleLater && styles.laterTextActive]}>
                    {scheduleLater ? formatScheduleDisplay() : 'Later'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>

          {/* Recent Searches */}
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <History size={14} color={colors.text.muted} />
              <Text style={styles.recentTitle}>Recent</Text>
            </View>
            {recentSearches.map((search, index) => (
              <TouchableOpacity
                key={search.id}
                style={[
                  styles.recentItem,
                  index < recentSearches.length - 1 && styles.recentItemBorder
                ]}
                onPress={() => handleRecentPress(search.destination)}
              >
                <MapPin size={16} color={colors.text.muted} />
                <View style={styles.recentInfo}>
                  <Text style={styles.recentDestination}>{search.destination}</Text>
                  <Text style={styles.recentDate}>{search.date}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* You Are Here - Takes 1/3 of screen */}
        <View style={styles.locationContainer}>
          <View style={styles.locationCard}>
            <View style={styles.locationHeader}>
              <Navigation size={14} color={colors.primary} />
              <Text style={styles.locationLabel}>You are here</Text>
            </View>
            <KnotMap style={styles.locationMapPlaceholder} showUserLocation interactive={false} />
            <View style={styles.locationInfo}>
              <MapPin size={14} color={colors.text.muted} />
              <Text style={styles.locationText}>{currentLocation}</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>

      {/* Schedule Modal */}
      <Modal
        visible={showScheduleModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCancelSchedule}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={handleCancelSchedule} style={styles.modalButton}>
                <X size={24} color={colors.text.muted} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Schedule Trip</Text>
              <TouchableOpacity onPress={handleConfirmSchedule} style={styles.modalButton}>
                <Check size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modeTabs}>
              <TouchableOpacity
                style={[styles.modeTab, pickerMode === 'date' && styles.modeTabActive]}
                onPress={() => setPickerMode('date')}
              >
                <Calendar size={18} color={pickerMode === 'date' ? colors.primary : colors.text.muted} />
                <Text style={[styles.modeTabText, pickerMode === 'date' && styles.modeTabTextActive]}>
                  Date
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeTab, pickerMode === 'time' && styles.modeTabActive]}
                onPress={() => setPickerMode('time')}
              >
                <Clock size={18} color={pickerMode === 'time' ? colors.primary : colors.text.muted} />
                <Text style={[styles.modeTabText, pickerMode === 'time' && styles.modeTabTextActive]}>
                  Time
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.selectedDisplay}>
              <Text style={styles.selectedLabel}>Scheduled for</Text>
              <Text style={styles.selectedValue}>{formatScheduleDisplay()}</Text>
            </View>

            <View style={styles.pickerContainer}>
              <DateTimePicker
                value={selectedDate}
                mode={pickerMode}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                minimumDate={new Date()}
                style={styles.picker}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gradientBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 400,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  greeting: {
    ...typography.styles.bodySmall,
    color: colors.text.muted,
  },
  userName: {
    ...typography.styles.h2,
    color: colors.text.main,
  },
  avatarButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    ...typography.styles.h3,
    color: colors.text.white,
  },
  searchSection: {
    paddingHorizontal: spacing.md,
  },
  searchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius['3xl'],
    padding: spacing.sm,
    ...shadows.card,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate[100],
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginRight: spacing.sm,
  },
  searchDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: spacing.sm,
  },
  searchPlaceholder: {
    ...typography.styles.body,
    color: colors.text.muted,
  },
  laterButton: {
    backgroundColor: colors.slate[100],
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  laterButtonActive: {
    backgroundColor: colors.primaryAlpha[10],
  },
  laterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  laterText: {
    ...typography.styles.bodySmall,
    color: colors.text.muted,
    fontWeight: '500',
  },
  laterTextActive: {
    color: colors.primary,
  },
  // Recent searches
  recentSection: {
    marginTop: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius['2xl'],
    ...shadows.card,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  recentTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.muted,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  recentItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  recentInfo: {
    flex: 1,
  },
  recentDestination: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.main,
  },
  recentDate: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 2,
  },
  // Location section - 1/3 of screen
  locationContainer: {
    flex: 1,
    marginTop: 24,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  locationCard: {
    height: SCREEN_HEIGHT * 0.35,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
    ...shadows.card,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  locationLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  locationMapPlaceholder: {
    flex: 1,
    backgroundColor: colors.slate[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 12,
  },
  locationText: {
    fontSize: 14,
    color: colors.text.main,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    ...typography.styles.h3,
    color: colors.text.main,
  },
  modeTabs: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    backgroundColor: colors.slate[100],
    borderRadius: borderRadius.lg,
    padding: 4,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: 6,
  },
  modeTabActive: {
    backgroundColor: '#FFFFFF',
    ...shadows.card,
  },
  modeTabText: {
    ...typography.styles.bodySmall,
    color: colors.text.muted,
    fontWeight: '500',
  },
  modeTabTextActive: {
    color: colors.primary,
  },
  selectedDisplay: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  selectedLabel: {
    ...typography.styles.caption,
    color: colors.text.muted,
  },
  selectedValue: {
    ...typography.styles.h2,
    color: colors.text.main,
    marginTop: spacing.xs,
  },
  pickerContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  picker: {
    width: '100%',
    height: 180,
  },
});