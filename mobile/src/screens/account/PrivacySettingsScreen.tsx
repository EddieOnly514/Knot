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
    ChevronRight,
    MapPin,
    Eye,
    Database,
    Download,
    Trash2,
} from 'lucide-react-native';
import { colors } from '../../design';

export function PrivacySettingsScreen() {
    const navigation = useNavigation();

    const [locationWhileUsing, setLocationWhileUsing] = useState(true);
    const [showInFeed, setShowInFeed] = useState(true);
    const [appearOffline, setAppearOffline] = useState(false);
    const [hideDestination, setHideDestination] = useState(true);

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <ChevronLeft size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Privacy</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {/* Location */}
                <Text style={styles.sectionTitle}>Location</Text>
                <View style={styles.card}>
                    <View style={styles.row}>
                        <View style={styles.iconBox}>
                            <MapPin size={20} color="#64748B" />
                        </View>
                        <View style={styles.rowContent}>
                            <Text style={styles.rowLabel}>Location While Using</Text>
                            <Text style={styles.rowSubtitle}>Only access location when app is open</Text>
                        </View>
                        <Switch
                            value={locationWhileUsing}
                            onValueChange={setLocationWhileUsing}
                            trackColor={{ false: '#E2E8F0', true: colors.primary }}
                            thumbColor="#FFFFFF"
                        />
                    </View>

                    <View style={styles.infoBox}>
                        <Text style={styles.infoText}>
                            We only use your location to find nearby matches and meetup points.
                        </Text>
                    </View>
                </View>

                {/* Visibility */}
                <Text style={styles.sectionTitle}>Visibility</Text>
                <View style={styles.card}>
                    <View style={styles.row}>
                        <View style={styles.iconBox}>
                            <Eye size={20} color="#64748B" />
                        </View>
                        <View style={styles.rowContent}>
                            <Text style={styles.rowLabel}>Show in Match Feed</Text>
                            <Text style={styles.rowSubtitle}>Let others discover you</Text>
                        </View>
                        <Switch
                            value={showInFeed}
                            onValueChange={setShowInFeed}
                            trackColor={{ false: '#E2E8F0', true: colors.primary }}
                            thumbColor="#FFFFFF"
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={styles.iconBox}>
                            <Eye size={20} color="#64748B" />
                        </View>
                        <View style={styles.rowContent}>
                            <Text style={styles.rowLabel}>Appear Offline</Text>
                            <Text style={styles.rowSubtitle}>Hide your online status</Text>
                        </View>
                        <Switch
                            value={appearOffline}
                            onValueChange={setAppearOffline}
                            trackColor={{ false: '#E2E8F0', true: colors.primary }}
                            thumbColor="#FFFFFF"
                        />
                    </View>

                    <View style={[styles.row, styles.rowLast]}>
                        <View style={[styles.iconBox, styles.iconBoxBlue]}>
                            <MapPin size={20} color={colors.primary} />
                        </View>
                        <View style={styles.rowContent}>
                            <Text style={styles.rowLabel}>Hide Precise Destination</Text>
                            <Text style={styles.rowSubtitle}>Only reveal after meetup confirmed</Text>
                        </View>
                        <Switch
                            value={hideDestination}
                            onValueChange={setHideDestination}
                            trackColor={{ false: '#E2E8F0', true: colors.primary }}
                            thumbColor="#FFFFFF"
                        />
                    </View>
                </View>

                {/* Data Controls */}
                <Text style={styles.sectionTitle}>Data Controls</Text>
                <View style={styles.card}>
                    <TouchableOpacity style={styles.row}>
                        <View style={styles.iconBox}>
                            <Download size={20} color="#64748B" />
                        </View>
                        <View style={styles.rowContent}>
                            <Text style={styles.rowLabel}>Download My Data</Text>
                            <Text style={styles.rowSubtitle}>Get a copy of your data</Text>
                        </View>
                        <ChevronRight size={20} color="#CBD5E1" />
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.row, styles.rowLast]}>
                        <View style={[styles.iconBox, styles.iconBoxRed]}>
                            <Trash2 size={20} color="#EF4444" />
                        </View>
                        <View style={styles.rowContent}>
                            <Text style={styles.rowLabel}>Delete My Data</Text>
                            <Text style={styles.rowSubtitle}>Permanently delete your account data</Text>
                        </View>
                        <ChevronRight size={20} color="#CBD5E1" />
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
    iconBoxRed: {
        backgroundColor: '#FEF2F2',
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
    infoBox: {
        backgroundColor: '#F8FAFC',
        margin: 12,
        marginTop: 0,
        padding: 12,
        borderRadius: 12,
    },
    infoText: {
        fontSize: 12,
        color: '#64748B',
        lineHeight: 18,
    },
});
