import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    Linking,
    Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
    ChevronLeft,
    ChevronRight,
    Phone,
    Share2,
    MapPin,
    ShieldBan,
    FileText,
    ShieldCheck,
    AlertTriangle,
} from 'lucide-react-native';
import { colors } from '../../design';

export function SafetyCenterScreen() {
    const navigation = useNavigation();
    const [isLocationSharing, setLocationSharing] = useState(false);

    const handleEmergency = () => {
        Alert.alert(
            'Emergency Services',
            'Call 911?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Call 911', style: 'destructive', onPress: () => Linking.openURL('tel:911') },
            ]
        );
    };

    const handleShareTrip = () => {
        // TODO: Share trip info
        Alert.alert('Share Trip', 'Trip info shared with your contacts');
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <ChevronLeft size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Safety Center</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {/* Emergency Section */}
                <Text style={styles.sectionTitle}>Emergency</Text>
                <View style={styles.card}>
                    <TouchableOpacity style={styles.emergencyButton} onPress={handleEmergency}>
                        <Phone size={24} color="#FFFFFF" />
                        <Text style={styles.emergencyText}>Emergency Call (911)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.row} onPress={handleShareTrip}>
                        <View style={styles.rowIconBox}>
                            <Share2 size={20} color="#64748B" />
                        </View>
                        <View style={styles.rowContent}>
                            <Text style={styles.rowLabel}>Share Trip Info</Text>
                            <Text style={styles.rowSubtitle}>Send meetup details to contacts</Text>
                        </View>
                        <ChevronRight size={20} color="#CBD5E1" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.row, styles.rowLast]}
                        onPress={() => setLocationSharing(!isLocationSharing)}
                    >
                        <View style={styles.rowIconBox}>
                            <MapPin size={20} color="#64748B" />
                        </View>
                        <View style={styles.rowContent}>
                            <Text style={styles.rowLabel}>Share Live Location</Text>
                            <Text style={styles.rowSubtitle}>Temporarily share with trusted contacts</Text>
                        </View>
                        <View style={[styles.toggle, isLocationSharing && styles.toggleActive]}>
                            <View style={[styles.toggleKnob, isLocationSharing && styles.toggleKnobActive]} />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Controls Section */}
                <Text style={styles.sectionTitle}>Controls</Text>
                <View style={styles.card}>
                    <TouchableOpacity style={styles.row}>
                        <View style={styles.rowIconBox}>
                            <ShieldBan size={20} color="#64748B" />
                        </View>
                        <View style={styles.rowContent}>
                            <Text style={styles.rowLabel}>Blocked Users</Text>
                            <Text style={styles.rowSubtitle}>Manage blocked accounts</Text>
                        </View>
                        <ChevronRight size={20} color="#CBD5E1" />
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.row, styles.rowLast]}>
                        <View style={styles.rowIconBox}>
                            <FileText size={20} color="#64748B" />
                        </View>
                        <View style={styles.rowContent}>
                            <Text style={styles.rowLabel}>Safety Rules</Text>
                            <Text style={styles.rowSubtitle}>Read our safety guidelines</Text>
                        </View>
                        <ChevronRight size={20} color="#CBD5E1" />
                    </TouchableOpacity>
                </View>

                {/* Verification Section */}
                <Text style={styles.sectionTitle}>Trust & Verification</Text>
                <View style={styles.card}>
                    <View style={styles.row}>
                        <View style={[styles.rowIconBox, styles.rowIconBoxVerified]}>
                            <ShieldCheck size={20} color={colors.primary} />
                        </View>
                        <View style={styles.rowContent}>
                            <Text style={styles.rowLabel}>Phone Verified</Text>
                            <Text style={styles.rowSubtitle}>Your phone number is verified</Text>
                        </View>
                        <View style={styles.verifiedBadge}>
                            <Text style={styles.verifiedText}>✓</Text>
                        </View>
                    </View>

                    <TouchableOpacity style={[styles.row, styles.rowLast]}>
                        <View style={styles.rowIconBox}>
                            <AlertTriangle size={20} color="#F59E0B" />
                        </View>
                        <View style={styles.rowContent}>
                            <Text style={styles.rowLabel}>ID Verification</Text>
                            <Text style={styles.rowSubtitle}>Coming soon</Text>
                        </View>
                        <View style={styles.comingSoonBadge}>
                            <Text style={styles.comingSoonText}>Soon</Text>
                        </View>
                    </TouchableOpacity>
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
    emergencyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EF4444',
        margin: 12,
        padding: 16,
        borderRadius: 12,
        gap: 10,
    },
    emergencyText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F8FAFC',
    },
    rowLast: {
        borderBottomWidth: 0,
    },
    rowIconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    rowIconBoxVerified: {
        backgroundColor: '#EFF6FF',
    },
    rowContent: {
        flex: 1,
    },
    rowLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0F172A',
    },
    rowSubtitle: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 2,
    },
    toggle: {
        width: 44,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#E2E8F0',
        padding: 2,
    },
    toggleActive: {
        backgroundColor: colors.primary,
    },
    toggleKnob: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#F8FBFF',
    },
    toggleKnobActive: {
        marginLeft: 20,
    },
    verifiedBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#22C55E',
        alignItems: 'center',
        justifyContent: 'center',
    },
    verifiedText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 12,
    },
    comingSoonBadge: {
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    comingSoonText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#D97706',
    },
});
