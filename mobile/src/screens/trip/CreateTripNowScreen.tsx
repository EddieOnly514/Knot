import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker, Circle } from 'react-native-maps';
import { CreateTripNowScreenProps } from '../../types/navigation';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { colors, typography, spacing, borderRadius } from '../../design';
import { LuggageLevel } from '../../types/models';

const LEAVE_WINDOWS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
];

const DESTINATION_OPTIONS = [
  { id: 'airport', label: 'Airport', icon: '✈️' },
  { id: 'neighborhood', label: 'Neighborhood/Area', icon: '🏘️' },
  { id: 'custom', label: 'Custom Location', icon: '📍' },
];

const AIRPORTS = [
  { code: 'LAX', name: 'Los Angeles International', lat: 33.9425, lng: -118.4081 },
  { code: 'JFK', name: 'John F. Kennedy International', lat: 40.6413, lng: -73.7781 },
  { code: 'SFO', name: 'San Francisco International', lat: 37.6213, lng: -122.3790 },
  { code: 'ORD', name: "Chicago O'Hare International", lat: 41.9742, lng: -87.9073 },
];

export const CreateTripNowScreen: React.FC<CreateTripNowScreenProps> = ({ navigation }) => {
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [destinationType, setDestinationType] = useState<string>('');
  const [selectedAirport, setSelectedAirport] = useState<string>('');
  const [destinationArea, setDestinationArea] = useState<{
    label: string;
    lat: number;
    lng: number;
    radius: number;
  } | null>(null);
  const [leaveWindow, setLeaveWindow] = useState(30);
  const [partySize, setPartySize] = useState(1);
  const [luggage, setLuggage] = useState<LuggageLevel>('carry_on');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant location permissions to use NOW mode');
      navigation.goBack();
      return;
    }

    try {
      const location = await Location.getCurrentPositionAsync({});
      setCurrentLocation({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to get current location');
    }
  };

  const handleDestinationSelect = (type: string) => {
    setDestinationType(type);
    if (type === 'neighborhood') {
      // For demo, set a default area
      setDestinationArea({
        label: 'Downtown',
        lat: currentLocation?.lat || 0,
        lng: currentLocation?.lng || 0,
        radius: 2000, // 2km radius
      });
    }
  };

  const handleCreateTrip = async () => {
    if (!currentLocation) {
      Alert.alert('Error', 'Unable to get current location');
      return;
    }

    if (!destinationType) {
      Alert.alert('Required', 'Please select a destination');
      return;
    }

    if (destinationType === 'airport' && !selectedAirport) {
      Alert.alert('Required', 'Please select an airport');
      return;
    }

    setLoading(true);

    try {
      // TODO: Create trip intent in Supabase
      const tripData = {
        mode: 'now' as const,
        origin_lat: currentLocation.lat,
        origin_lng: currentLocation.lng,
        destination_label: destinationType === 'airport' ? selectedAirport : destinationArea?.label || 'Custom',
        destination_lat: destinationType === 'airport'
          ? AIRPORTS.find(a => a.code === selectedAirport)?.lat || 0
          : destinationArea?.lat || 0,
        destination_lng: destinationType === 'airport'
          ? AIRPORTS.find(a => a.code === selectedAirport)?.lng || 0
          : destinationArea?.lng || 0,
        destination_radius_m: destinationType === 'airport' ? 1000 : (destinationArea?.radius || 2000),
        time_start: new Date().toISOString(),
        time_end: new Date(Date.now() + leaveWindow * 60000).toISOString(),
        party_size: partySize,
        luggage: luggage,
      };

      // Navigate to Match Feed
      // navigation.navigate('MatchFeed', { tripIntentId: createdTrip.id });
      Alert.alert('Success', 'Trip created! (Demo mode)');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to create trip');
    } finally {
      setLoading(false);
    }
  };

  const luggageOptions: { value: LuggageLevel; label: string; icon: string }[] = [
    { value: 'none', label: 'None', icon: '🎒' },
    { value: 'carry_on', label: 'Carry-on', icon: '💼' },
    { value: 'one_suitcase', label: '1 bag', icon: '🧳' },
    { value: 'two_plus', label: '2+', icon: '🧳' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.title}>Create NOW Trip</Text>
          <Text style={styles.subtitle}>Leave from current location</Text>

          {/* Current Location */}
          <Card style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>📍</Text>
              <Text style={styles.sectionTitle}>Your Location</Text>
            </View>
            <Text style={styles.locationText}>
              {currentLocation ? 'Current location (GPS)' : 'Getting location...'}
            </Text>
          </Card>

          {/* Destination Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Where to?</Text>
            <View style={styles.destinationOptions}>
              {DESTINATION_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  onPress={() => handleDestinationSelect(option.id)}
                  style={[
                    styles.destinationCard,
                    destinationType === option.id && styles.destinationCardSelected,
                  ]}
                >
                  <Text style={styles.destinationIcon}>{option.icon}</Text>
                  <Text style={[
                    styles.destinationLabel,
                    destinationType === option.id && styles.destinationLabelSelected,
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Airport Selection */}
            {destinationType === 'airport' && (
              <View style={styles.airportSelection}>
                <Text style={styles.subsectionLabel}>Select Airport</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.airportOptions}>
                    {AIRPORTS.map((airport) => (
                      <TouchableOpacity
                        key={airport.code}
                        onPress={() => setSelectedAirport(airport.code)}
                        style={[
                          styles.airportCard,
                          selectedAirport === airport.code && styles.airportCardSelected,
                        ]}
                      >
                        <Text style={[
                          styles.airportCode,
                          selectedAirport === airport.code && styles.airportCodeSelected,
                        ]}>
                          {airport.code}
                        </Text>
                        <Text style={styles.airportName} numberOfLines={1}>
                          {airport.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}
          </View>

          {/* Leave Window */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Leaving within</Text>
            <View style={styles.timeOptions}>
              {LEAVE_WINDOWS.map((window) => (
                <TouchableOpacity
                  key={window.value}
                  onPress={() => setLeaveWindow(window.value)}
                  style={[
                    styles.timeCard,
                    leaveWindow === window.value && styles.timeCardSelected,
                  ]}
                >
                  <Text style={[
                    styles.timeText,
                    leaveWindow === window.value && styles.timeTextSelected,
                  ]}>
                    {window.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Party Size */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Party size</Text>
            <View style={styles.partySizeOptions}>
              {[1, 2].map((size) => (
                <TouchableOpacity
                  key={size}
                  onPress={() => setPartySize(size)}
                  style={[
                    styles.partySizeCard,
                    partySize === size && styles.partySizeCardSelected,
                  ]}
                >
                  <Text style={[
                    styles.partySizeText,
                    partySize === size && styles.partySizeTextSelected,
                  ]}>
                    {size} {size === 1 ? 'person' : 'people'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Luggage */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Luggage</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.luggageOptions}>
                {luggageOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => setLuggage(option.value)}
                    style={[
                      styles.luggageCard,
                      luggage === option.value && styles.luggageCardSelected,
                    ]}
                  >
                    <Text style={styles.luggageIcon}>{option.icon}</Text>
                    <Text style={[
                      styles.luggageText,
                      luggage === option.value && styles.luggageTextSelected,
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Create Button */}
          <Button
            title="Find Matches"
            onPress={handleCreateTrip}
            variant="primary"
            size="large"
            fullWidth
            loading={loading}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.pure,
  },
  content: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing['3xl'],
    paddingBottom: spacing['4xl'],
  },
  title: {
    ...typography.styles.h2,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.styles.body,
    color: colors.text.secondary,
    marginBottom: spacing['3xl'],
  },
  section: {
    marginBottom: spacing['3xl'],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  sectionTitle: {
    ...typography.styles.h4,
    color: colors.text.primary,
  },
  sectionLabel: {
    ...typography.styles.label,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  locationText: {
    ...typography.styles.body,
    color: colors.text.secondary,
  },
  destinationOptions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  destinationCard: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.background.subtle,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.ui.border,
  },
  destinationCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.background.pure,
  },
  destinationIcon: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  destinationLabel: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  destinationLabelSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  airportSelection: {
    marginTop: spacing.xl,
  },
  subsectionLabel: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  airportOptions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  airportCard: {
    padding: spacing.md,
    backgroundColor: colors.background.subtle,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.ui.border,
    minWidth: 100,
  },
  airportCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.background.pure,
  },
  airportCode: {
    ...typography.styles.h4,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  airportCodeSelected: {
    color: colors.primary,
  },
  airportName: {
    ...typography.styles.caption,
    color: colors.text.secondary,
  },
  timeOptions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timeCard: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.background.subtle,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.ui.border,
  },
  timeCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.background.pure,
  },
  timeText: {
    ...typography.styles.bodySmall,
    color: colors.text.secondary,
  },
  timeTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  partySizeOptions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  partySizeCard: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.background.subtle,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.ui.border,
  },
  partySizeCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.background.pure,
  },
  partySizeText: {
    ...typography.styles.body,
    color: colors.text.secondary,
  },
  partySizeTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  luggageOptions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  luggageCard: {
    padding: spacing.md,
    backgroundColor: colors.background.subtle,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.ui.border,
    minWidth: 80,
  },
  luggageCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.background.pure,
  },
  luggageIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  luggageText: {
    ...typography.styles.caption,
    color: colors.text.secondary,
  },
  luggageTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
});