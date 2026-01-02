import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
    ChevronLeft,
    ChevronRight,
    Smartphone,
    Mail,
    Globe,
    Shield,
    LogOut,
    Trash2,
} from 'lucide-react-native';
import { colors } from '../../design';
import type { RootStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function AccountSecurityScreen() {
    const navigation = useNavigation<NavigationProp>();

    const handleLogout = () => {
        Alert.alert('Log Out', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Log Out', style: 'destructive', onPress: () => {
                    navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
                }
            },
        ]);
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            'Delete Account',
            'This action cannot be undone. All your data will be permanently deleted.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => console.log('Delete') },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <ChevronLeft size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Account & Security</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {/* Account */}
                <Text style={styles.sectionTitle}>Account</Text>
                <View style={styles.card}>
                    <View style={styles.row}>
                        <View style={styles.iconBox}>
                            <Smartphone size={20} color="#64748B" />
                        </View>
                        <View style={styles.rowContent}>
                            <Text style={styles.rowLabel}>Phone Number</Text>
                            <Text style={styles.rowSubtitle}>+1 (949) ***-8821</Text>
                        </View>
                        <View style={styles.verifiedBadge}>
                            <Text style={styles.verifiedText}>Verified</Text>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.row}>
                        <View style={styles.iconBox}>
                            <Mail size={20} color="#64748B" />
                        </View>
                        <View style={styles.rowContent}>
                            <Text style={styles.rowLabel}>Email</Text>
                            <Text style={styles.rowSubtitle}>Add email (optional)</Text>
                        </View>
                        <ChevronRight size={20} color="#CBD5E1" />
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.row, styles.rowLast]}>
                        <View style={styles.iconBox}>
                            <Globe size={20} color="#64748B" />
                        </View>
                        <View style={styles.rowContent}>
                            <Text style={styles.rowLabel}>Language</Text>
                            <Text style={styles.rowSubtitle}>English</Text>
                        </View>
                        <ChevronRight size={20} color="#CBD5E1" />
                    </TouchableOpacity>
                </View>

                {/* Security */}
                <Text style={styles.sectionTitle}>Security</Text>
                <View style={styles.card}>
                    <TouchableOpacity style={styles.row}>
                        <View style={styles.iconBox}>
                            <Smartphone size={20} color="#64748B" />
                        </View>
                        <View style={styles.rowContent}>
                            <Text style={styles.rowLabel}>Change Phone Number</Text>
                            <Text style={styles.rowSubtitle}>Requires verification</Text>
                        </View>
                        <ChevronRight size={20} color="#CBD5E1" />
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.row, styles.rowLast]}>
                        <View style={styles.iconBox}>
                            <Shield size={20} color="#64748B" />
                        </View>
                        <View style={styles.rowContent}>
                            <Text style={styles.rowLabel}>Two-Factor Authentication</Text>
                            <Text style={styles.rowSubtitle}>Coming soon</Text>
                        </View>
                        <View style={styles.comingSoonBadge}>
                            <Text style={styles.comingSoonText}>Soon</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Manage Account */}
                <Text style={styles.sectionTitle}>Manage Account</Text>
                <View style={styles.card}>
                    <TouchableOpacity style={styles.row} onPress={handleLogout}>
                        <View style={styles.iconBox}>
                            <LogOut size={20} color="#64748B" />
                        </View>
                        <Text style={styles.rowLabel}>Log Out</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.row, styles.rowLast]} onPress={handleDeleteAccount}>
                        <View style={[styles.iconBox, styles.iconBoxRed]}>
                            <Trash2 size={20} color="#EF4444" />
                        </View>
                        <Text style={[styles.rowLabel, styles.rowLabelRed]}>Delete Account</Text>
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
    iconBoxRed: {
        backgroundColor: '#FEF2F2',
    },
    rowContent: {
        flex: 1,
    },
    rowLabel: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        color: '#0F172A',
    },
    rowLabelRed: {
        color: '#EF4444',
    },
    rowSubtitle: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 2,
    },
    verifiedBadge: {
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    verifiedText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#22C55E',
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
