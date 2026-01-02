import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, borderRadius, shadows } from '../../design';
import type { RootStackParamList } from '../../types/navigation';
import { BackButton } from '../../components/common/BackButton';
import { KnotLogo } from '../../components/common/KnotLogo';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Location {
    id: string;
    name: string;
    address: string;
    type: 'recent' | 'suggested';
}

const suggestedLocations: Location[] = [
    { id: '1', name: 'Downtown SF', address: 'Financial District, San Francisco', type: 'recent' },
    { id: '2', name: 'SFO Airport', address: 'San Francisco International Airport', type: 'recent' },
    { id: '3', name: 'Oakland', address: 'Oakland, CA', type: 'suggested' },
    { id: '4', name: 'Berkeley', address: 'Berkeley, CA', type: 'suggested' },
    { id: '5', name: 'Palo Alto', address: 'Palo Alto, CA', type: 'suggested' },
];

export function TripSearchScreen() {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute();

    const [currentLocation, setCurrentLocation] = useState('Current Location');
    const [destination, setDestination] = useState('');
    const [focusedInput, setFocusedInput] = useState<'current' | 'destination'>('destination');

    const filteredLocations = destination
        ? suggestedLocations.filter(loc =>
            loc.name.toLowerCase().includes(destination.toLowerCase()) ||
            loc.address.toLowerCase().includes(destination.toLowerCase())
        )
        : suggestedLocations;

    const handleLocationSelect = (location: Location) => {
        setDestination(location.name);
    };

    const handleFindMatch = () => {
        if (!destination) return;
        navigation.navigate('MatchFeed', {});
    };

    const canFindMatch = destination.length > 0;

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Header with Back */}
                <View style={styles.header}>
                    <BackButton />
                    <KnotLogo size="small" />
                    <View style={{ width: 40 }} />
                </View>

                {/* Location Inputs */}
                <View style={styles.locationCard}>
                    {/* Current Location */}
                    <View style={styles.inputRow}>
                        <View style={styles.inputDot}>
                            <View style={styles.dotFilled} />
                        </View>
                        <TextInput
                            style={styles.locationInput}
                            value={currentLocation}
                            onChangeText={setCurrentLocation}
                            placeholder="Current location"
                            placeholderTextColor={colors.text.muted}
                            onFocus={() => setFocusedInput('current')}
                        />
                    </View>

                    {/* Connector Line */}
                    <View style={styles.connectorLine} />

                    {/* Destination */}
                    <View style={styles.inputRow}>
                        <View style={styles.inputDot}>
                            <View style={styles.dotOutline} />
                        </View>
                        <TextInput
                            style={styles.locationInput}
                            value={destination}
                            onChangeText={setDestination}
                            placeholder="Where to?"
                            placeholderTextColor={colors.text.muted}
                            onFocus={() => setFocusedInput('destination')}
                            autoFocus
                        />
                        {destination.length > 0 && (
                            <TouchableOpacity
                                style={styles.clearButton}
                                onPress={() => setDestination('')}
                            >
                                <Text style={styles.clearIcon}>×</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Map Placeholder */}
                <View style={styles.mapContainer}>
                    <View style={styles.mapPlaceholder}>
                        <View style={styles.mapPin}>
                            <View style={styles.pinHead} />
                            <View style={styles.pinTail} />
                        </View>
                        <Text style={styles.mapText}>Map</Text>
                    </View>
                </View>

                {/* Suggested Locations */}
                <View style={styles.suggestionsContainer}>
                    <ScrollView
                        style={styles.suggestionsList}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {filteredLocations.map((location, index) => (
                            <TouchableOpacity
                                key={location.id}
                                style={styles.suggestionRow}
                                onPress={() => handleLocationSelect(location)}
                            >
                                <View style={styles.suggestionIcon}>
                                    <View style={styles.suggestionDot} />
                                </View>
                                <View style={styles.suggestionInfo}>
                                    <Text style={styles.suggestionName}>{location.name}</Text>
                                    <Text style={styles.suggestionAddress}>{location.address}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Find Match Button */}
                <View style={styles.bottomContainer}>
                    <TouchableOpacity
                        onPress={handleFindMatch}
                        disabled={!canFindMatch}
                        activeOpacity={0.9}
                    >
                        <LinearGradient
                            colors={canFindMatch ? [colors.primary, colors.primaryLight] : [colors.slate[300], colors.slate[300]]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.findMatchButton}
                        >
                            <Text style={styles.findMatchText}>Find Match</Text>
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
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.cardBlue,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadows.card,
    },
    backIcon: {
        fontSize: 20,
        color: colors.text.main,
    },
    headerTitle: {
        ...typography.styles.bodyMedium,
        color: colors.text.main,
    },
    locationCard: {
        marginHorizontal: spacing.md,
        backgroundColor: colors.cardBlue,
        borderRadius: borderRadius['3xl'],
        padding: spacing.md,
        ...shadows.card,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    inputDot: {
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.sm,
    },
    dotFilled: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.primary,
    },
    dotOutline: {
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 2,
        borderColor: colors.primary,
    },
    connectorLine: {
        width: 2,
        height: 24,
        backgroundColor: colors.slate[200],
        marginLeft: 11,
        marginVertical: 4,
    },
    locationInput: {
        flex: 1,
        ...typography.styles.body,
        color: colors.text.main,
        paddingVertical: spacing.sm,
    },
    clearButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.slate[200],
        justifyContent: 'center',
        alignItems: 'center',
    },
    clearIcon: {
        fontSize: 16,
        color: colors.text.muted,
        fontWeight: '600',
    },
    mapContainer: {
        flex: 1,
        marginHorizontal: spacing.md,
        marginTop: spacing.md,
        borderRadius: borderRadius['3xl'],
        overflow: 'hidden',
        minHeight: 150,
    },
    mapPlaceholder: {
        flex: 1,
        backgroundColor: colors.slate[100],
        justifyContent: 'center',
        alignItems: 'center',
    },
    mapPin: {
        alignItems: 'center',
    },
    pinHead: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.primary,
    },
    pinTail: {
        width: 4,
        height: 10,
        backgroundColor: colors.primary,
        marginTop: -2,
    },
    mapText: {
        ...typography.styles.caption,
        color: colors.text.muted,
        marginTop: spacing.sm,
    },
    suggestionsContainer: {
        maxHeight: 200,
        marginHorizontal: spacing.md,
        marginTop: spacing.md,
        backgroundColor: colors.cardBlue,
        borderRadius: borderRadius['3xl'],
        ...shadows.card,
    },
    suggestionsList: {
        padding: spacing.sm,
    },
    suggestionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
    },
    suggestionIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.slate[100],
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    suggestionDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.text.muted,
    },
    suggestionInfo: {
        flex: 1,
    },
    suggestionName: {
        ...typography.styles.bodyMedium,
        color: colors.text.main,
    },
    suggestionAddress: {
        ...typography.styles.caption,
        color: colors.text.muted,
        marginTop: 2,
    },
    bottomContainer: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        paddingBottom: spacing.xl,
    },
    findMatchButton: {
        height: 56,
        borderRadius: borderRadius.lg,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadows.button,
    },
    findMatchText: {
        ...typography.styles.button,
        color: colors.text.white,
    },
});
