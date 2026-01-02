import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Clock, Calendar, X, Check } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, typography, spacing, borderRadius, shadows } from '../../design';
import type { RootStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const userName = 'Alex';
  const [scheduleLater, setScheduleLater] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleSearchPress = () => {
    navigation.navigate('TripSearch', { scheduleLater });
  };

  const handleLaterPress = () => {
    if (scheduleLater) {
      // Clear schedule
      setScheduleLater(false);
      setSelectedDate(new Date());
    } else {
      // Open schedule modal
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
    <SafeAreaView style={styles.container}>
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
      <TouchableOpacity
        style={styles.searchCard}
        onPress={handleSearchPress}
        activeOpacity={0.95}
      >
        <View style={styles.searchRow}>
          {/* Search Input */}
          <View style={styles.searchInputContainer}>
            <View style={styles.searchDot} />
            <Text style={styles.searchPlaceholder}>Where to?</Text>
          </View>

          {/* Later Button */}
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

      {/* Recent/Saved Places */}
      <View style={styles.placesSection}>
        <View style={styles.placeRow}>
          <View style={styles.placeIcon}>
            <View style={styles.placeIconDot} />
          </View>
          <View style={styles.placeInfo}>
            <Text style={styles.placeTitle}>Downtown SF</Text>
            <Text style={styles.placeSubtitle}>Recent destination</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.placeRow}>
          <View style={styles.placeIcon}>
            <View style={styles.placeIconDot} />
          </View>
          <View style={styles.placeInfo}>
            <Text style={styles.placeTitle}>SFO Airport</Text>
            <Text style={styles.placeSubtitle}>Recent destination</Text>
          </View>
        </View>
      </View>

      {/* Spacer */}
      <View style={styles.spacer} />

      {/* Schedule Modal */}
      <Modal
        visible={showScheduleModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCancelSchedule}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={handleCancelSchedule} style={styles.modalButton}>
                <X size={24} color={colors.text.muted} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Schedule Trip</Text>
              <TouchableOpacity onPress={handleConfirmSchedule} style={styles.modalButton}>
                <Check size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Mode Tabs */}
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

            {/* Selected Display */}
            <View style={styles.selectedDisplay}>
              <Text style={styles.selectedLabel}>Scheduled for</Text>
              <Text style={styles.selectedValue}>{formatScheduleDisplay()}</Text>
            </View>

            {/* Date/Time Picker */}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
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
  searchCard: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.cardBlue,
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
  placesSection: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.md,
    backgroundColor: colors.cardBlue,
    borderRadius: borderRadius['3xl'],
    padding: spacing.md,
    ...shadows.card,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  placeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.slate[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  placeIconDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.text.muted,
  },
  placeInfo: {
    flex: 1,
  },
  placeTitle: {
    ...typography.styles.bodyMedium,
    color: colors.text.main,
  },
  placeSubtitle: {
    ...typography.styles.caption,
    color: colors.text.muted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 56,
  },
  spacer: {
    flex: 1,
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