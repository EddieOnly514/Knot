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
    Bell,
    MessageSquare,
    Mail,
    Moon,
} from 'lucide-react-native';
import { colors } from '../../design';

export function NotificationsSettingsScreen() {
    const navigation = useNavigation();

    const [channels, setChannels] = useState({
        push: true,
        sms: true,
        email: false,
    });

    const [categories, setCategories] = useState({
        newMatch: true,
        newMessage: true,
        meetupConfirmed: true,
        tripReminders: true,
        safetyAlerts: true,
        productUpdates: false,
    });

    const [quietHours, setQuietHours] = useState({
        enabled: false,
        start: '11:00 PM',
        end: '7:00 AM',
    });

    const toggleChannel = (key: keyof typeof channels) => {
        setChannels(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleCategory = (key: keyof typeof categories) => {
        setCategories(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <ChevronLeft size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {/* Channels */}
                <Text style={styles.sectionTitle}>Channels</Text>
                <View style={styles.card}>
                    <View style={styles.row}>
                        <Bell size={20} color="#64748B" />
                        <Text style={styles.rowLabel}>Push Notifications</Text>
                        <Switch
                            value={channels.push}
                            onValueChange={() => toggleChannel('push')}
                            trackColor={{ false: '#E2E8F0', true: colors.primary }}
                            thumbColor="#FFFFFF"
                        />
                    </View>
                    <View style={styles.row}>
                        <MessageSquare size={20} color="#64748B" />
                        <Text style={styles.rowLabel}>SMS</Text>
                        <Switch
                            value={channels.sms}
                            onValueChange={() => toggleChannel('sms')}
                            trackColor={{ false: '#E2E8F0', true: colors.primary }}
                            thumbColor="#FFFFFF"
                        />
                    </View>
                    <View style={[styles.row, styles.rowLast]}>
                        <Mail size={20} color="#64748B" />
                        <Text style={styles.rowLabel}>Email</Text>
                        <Switch
                            value={channels.email}
                            onValueChange={() => toggleChannel('email')}
                            trackColor={{ false: '#E2E8F0', true: colors.primary }}
                            thumbColor="#FFFFFF"
                        />
                    </View>
                </View>

                {/* Categories */}
                <Text style={styles.sectionTitle}>Categories</Text>
                <View style={styles.card}>
                    {[
                        { key: 'newMatch', label: 'New Match' },
                        { key: 'newMessage', label: 'New Message' },
                        { key: 'meetupConfirmed', label: 'Meetup Confirmed' },
                        { key: 'tripReminders', label: 'Trip Reminders' },
                        { key: 'safetyAlerts', label: 'Safety Alerts' },
                        { key: 'productUpdates', label: 'Product Updates' },
                    ].map((item, index, arr) => (
                        <View key={item.key} style={[styles.rowSimple, index === arr.length - 1 && styles.rowLast]}>
                            <Text style={styles.rowLabel}>{item.label}</Text>
                            <Switch
                                value={categories[item.key as keyof typeof categories]}
                                onValueChange={() => toggleCategory(item.key as keyof typeof categories)}
                                trackColor={{ false: '#E2E8F0', true: colors.primary }}
                                thumbColor="#FFFFFF"
                            />
                        </View>
                    ))}
                </View>

                {/* Quiet Hours */}
                <Text style={styles.sectionTitle}>Quiet Hours</Text>
                <View style={styles.card}>
                    <View style={styles.row}>
                        <Moon size={20} color="#64748B" />
                        <View style={styles.rowContent}>
                            <Text style={styles.rowLabel}>Quiet Hours</Text>
                            <Text style={styles.rowSubtitle}>
                                {quietHours.start} - {quietHours.end}
                            </Text>
                        </View>
                        <Switch
                            value={quietHours.enabled}
                            onValueChange={(value) => setQuietHours(prev => ({ ...prev, enabled: value }))}
                            trackColor={{ false: '#E2E8F0', true: colors.primary }}
                            thumbColor="#FFFFFF"
                        />
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
        paddingVertical: 4,
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
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F8FAFC',
    },
    rowSimple: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F8FAFC',
    },
    rowLast: {
        borderBottomWidth: 0,
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
    rowSubtitle: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 2,
    },
});
