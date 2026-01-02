import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
    ChevronLeft,
    ShieldCheck,
    MapPin,
    Clock,
    Users,
    Car,
    Briefcase,
} from 'lucide-react-native';
import { colors } from '../../design';

const DISTANCE_OPTIONS = ['1 mi', '2 mi', '5 mi', '10 mi'];
const TIME_OPTIONS = ['15 min', '30 min', '60 min'];
const RIDE_OPTIONS = ['Any', 'UberX', 'Comfort', 'XL'];
const LUGGAGE_OPTIONS = ['None', 'Carry-on', '1 Suitcase', '2+'];
const PARTY_OPTIONS = ['1', '2'];

export function PreferencesScreen() {
    const navigation = useNavigation();

    const [verifiedOnly, setVerifiedOnly] = useState(true);
    const [maxDistance, setMaxDistance] = useState('2 mi');
    const [timeWindow, setTimeWindow] = useState('30 min');
    const [rideType, setRideType] = useState('Any');
    const [luggage, setLuggage] = useState('Carry-on');
    const [partySize, setPartySize] = useState('1');

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <ChevronLeft size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Preferences</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {/* Matching Preferences */}
                <Text style={styles.sectionTitle}>Matching</Text>
                <View style={styles.card}>
                    <View style={styles.row}>
                        <View style={[styles.iconBox, styles.iconBoxBlue]}>
                            <ShieldCheck size={20} color={colors.primary} />
                        </View>
                        <View style={styles.rowContent}>
                            <Text style={styles.rowLabel}>Verified Users Only</Text>
                            <Text style={styles.rowSubtitle}>Only match with verified users</Text>
                        </View>
                        <Switch
                            value={verifiedOnly}
                            onValueChange={setVerifiedOnly}
                            trackColor={{ false: '#E2E8F0', true: colors.primary }}
                            thumbColor="#FFFFFF"
                        />
                    </View>

                    <View style={styles.rowWithOptions}>
                        <View style={styles.rowHeader}>
                            <MapPin size={18} color="#64748B" />
                            <Text style={styles.rowLabel}>Max Pickup Distance</Text>
                        </View>
                        <View style={styles.optionsRow}>
                            {DISTANCE_OPTIONS.map((option) => (
                                <TouchableOpacity
                                    key={option}
                                    style={[styles.optionChip, maxDistance === option && styles.optionChipActive]}
                                    onPress={() => setMaxDistance(option)}
                                >
                                    <Text style={[styles.optionText, maxDistance === option && styles.optionTextActive]}>
                                        {option}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={[styles.rowWithOptions, styles.rowLast]}>
                        <View style={styles.rowHeader}>
                            <Clock size={18} color="#64748B" />
                            <Text style={styles.rowLabel}>Time Window</Text>
                        </View>
                        <View style={styles.optionsRow}>
                            {TIME_OPTIONS.map((option) => (
                                <TouchableOpacity
                                    key={option}
                                    style={[styles.optionChip, timeWindow === option && styles.optionChipActive]}
                                    onPress={() => setTimeWindow(option)}
                                >
                                    <Text style={[styles.optionText, timeWindow === option && styles.optionTextActive]}>
                                        {option}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>

                {/* Ride Preferences */}
                <Text style={styles.sectionTitle}>Ride Defaults</Text>
                <View style={styles.card}>
                    <View style={styles.rowWithOptions}>
                        <View style={styles.rowHeader}>
                            <Car size={18} color="#64748B" />
                            <Text style={styles.rowLabel}>Preferred Ride Type</Text>
                        </View>
                        <View style={styles.optionsRow}>
                            {RIDE_OPTIONS.map((option) => (
                                <TouchableOpacity
                                    key={option}
                                    style={[styles.optionChip, rideType === option && styles.optionChipActive]}
                                    onPress={() => setRideType(option)}
                                >
                                    <Text style={[styles.optionText, rideType === option && styles.optionTextActive]}>
                                        {option}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.rowWithOptions}>
                        <View style={styles.rowHeader}>
                            <Briefcase size={18} color="#64748B" />
                            <Text style={styles.rowLabel}>Default Luggage</Text>
                        </View>
                        <View style={styles.optionsRow}>
                            {LUGGAGE_OPTIONS.map((option) => (
                                <TouchableOpacity
                                    key={option}
                                    style={[styles.optionChip, luggage === option && styles.optionChipActive]}
                                    onPress={() => setLuggage(option)}
                                >
                                    <Text style={[styles.optionText, luggage === option && styles.optionTextActive]}>
                                        {option}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={[styles.rowWithOptions, styles.rowLast]}>
                        <View style={styles.rowHeader}>
                            <Users size={18} color="#64748B" />
                            <Text style={styles.rowLabel}>Default Party Size</Text>
                        </View>
                        <View style={styles.optionsRow}>
                            {PARTY_OPTIONS.map((option) => (
                                <TouchableOpacity
                                    key={option}
                                    style={[styles.optionChip, partySize === option && styles.optionChipActive]}
                                    onPress={() => setPartySize(option)}
                                >
                                    <Text style={[styles.optionText, partySize === option && styles.optionTextActive]}>
                                        {option}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F8FBFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#0F172A',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 100,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 12,
        marginTop: 8,
    },
    card: {
        backgroundColor: '#F8FBFF',
        borderRadius: 20,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 12,
        elevation: 2,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F8FAFC',
    },
    rowWithOptions: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F8FAFC',
    },
    rowLast: {
        borderBottomWidth: 0,
    },
    rowHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    iconBoxBlue: {
        backgroundColor: '#EFF6FF',
    },
    rowContent: {
        flex: 1,
    },
    rowLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: '#0F172A',
    },
    rowSubtitle: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 2,
    },
    optionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    optionChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 100,
        backgroundColor: '#F1F5F9',
    },
    optionChipActive: {
        backgroundColor: '#EFF6FF',
        borderWidth: 1,
        borderColor: colors.primary,
    },
    optionText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#64748B',
    },
    optionTextActive: {
        color: colors.primary,
    },
});
