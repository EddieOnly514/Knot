import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    SafeAreaView,
    Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
    ShieldCheck,
    Star,
    Pencil,
    MapPin,
    Shield,
    SlidersHorizontal,
    Bell,
    Lock,
    Settings,
    HelpCircle,
    FileText,
    LogOut,
    ChevronRight,
    Trash2,
} from 'lucide-react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../../design';
import type { RootStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Mock User Data
const USER_DATA = {
    firstName: "Sarah",
    avatarUrl: null,
    initials: "SJ",
    isPhoneVerified: true,
    rating: 4.8,
    wouldRideAgain: 92,
    activeTrips: 1,
};

// Action Tiles Config
const ACTION_TILES = [
    { id: 'trips', label: 'Trips', icon: MapPin, badge: USER_DATA.activeTrips > 0 ? `${USER_DATA.activeTrips} active` : null },
    { id: 'safety', label: 'Safety', icon: Shield, badge: null },
    { id: 'preferences', label: 'Preferences', icon: SlidersHorizontal, badge: null },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: null },
];

// Settings Rows Config
const SETTINGS_SECTIONS = [
    {
        items: [
            { id: 'privacy', label: 'Privacy', subtitle: 'Location, visibility, data', icon: Lock },
            { id: 'account', label: 'Account & Security', subtitle: 'Phone, email, password', icon: Settings },
            { id: 'help', label: 'Help & Support', subtitle: 'FAQ, contact, report', icon: HelpCircle },
            { id: 'legal', label: 'Legal', subtitle: 'Terms, privacy policy', icon: FileText },
        ]
    }
];

export function ProfileScreen() {
    const navigation = useNavigation<NavigationProp>();

    const handleEditProfile = () => {
        (navigation as any).navigate('EditProfile');
    };

    const handleTilePress = (id: string) => {
        switch (id) {
            case 'trips':
                (navigation as any).navigate('TripsHistory');
                break;
            case 'safety':
                (navigation as any).navigate('SafetyCenter');
                break;
            case 'preferences':
                (navigation as any).navigate('Preferences');
                break;
            case 'notifications':
                (navigation as any).navigate('NotificationsSettings');
                break;
        }
    };

    const handleSettingsPress = (id: string) => {
        switch (id) {
            case 'privacy':
                (navigation as any).navigate('PrivacySettings');
                break;
            case 'account':
                (navigation as any).navigate('AccountSecurity');
                break;
            case 'help':
                (navigation as any).navigate('HelpSupport');
                break;
            case 'legal':
                (navigation as any).navigate('Legal');
                break;
        }
    };

    const handleLogout = () => {
        Alert.alert('Log Out', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log Out', style: 'destructive', onPress: () => console.log('Logout') },
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
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Profile Header */}
                <View style={styles.profileHeader}>
                    {/* Avatar */}
                    <View style={styles.avatarContainer}>
                        {USER_DATA.avatarUrl ? (
                            <Image source={{ uri: USER_DATA.avatarUrl }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarFallback}>
                                <Text style={styles.avatarInitials}>{USER_DATA.initials}</Text>
                            </View>
                        )}
                    </View>

                    {/* Name */}
                    <Text style={styles.userName}>{USER_DATA.firstName}</Text>

                    {/* Trust Row */}
                    <View style={styles.trustRow}>
                        {/* Verified Chip */}
                        <TouchableOpacity style={styles.trustChip}>
                            <ShieldCheck size={14} color={colors.primary} />
                            <Text style={styles.trustChipText}>Verified</Text>
                        </TouchableOpacity>

                        {/* Rating Chip */}
                        <View style={styles.trustChip}>
                            <Star size={14} color="#F59E0B" fill="#F59E0B" />
                            <Text style={styles.trustChipText}>{USER_DATA.rating}</Text>
                        </View>

                        {/* Would Ride Again */}
                        <View style={styles.trustChip}>
                            <Text style={styles.trustChipText}>{USER_DATA.wouldRideAgain}% ride again</Text>
                        </View>
                    </View>

                    {/* Edit Profile Button */}
                    <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
                        <Pencil size={16} color={colors.primary} />
                        <Text style={styles.editButtonText}>Edit Profile</Text>
                    </TouchableOpacity>
                </View>

                {/* Action Tiles */}
                <View style={styles.tilesGrid}>
                    {ACTION_TILES.map((tile) => (
                        <TouchableOpacity
                            key={tile.id}
                            style={styles.tile}
                            onPress={() => handleTilePress(tile.id)}
                            activeOpacity={0.8}
                        >
                            <View style={styles.tileIconContainer}>
                                <tile.icon size={24} color={colors.primary} />
                            </View>
                            <Text style={styles.tileLabel}>{tile.label}</Text>
                            {tile.badge && (
                                <View style={styles.tileBadge}>
                                    <Text style={styles.tileBadgeText}>{tile.badge}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Settings List */}
                <View style={styles.settingsCard}>
                    {SETTINGS_SECTIONS[0].items.map((item, index) => (
                        <TouchableOpacity
                            key={item.id}
                            style={[
                                styles.settingsRow,
                                index < SETTINGS_SECTIONS[0].items.length - 1 && styles.settingsRowBorder
                            ]}
                            onPress={() => handleSettingsPress(item.id)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.settingsIconBox}>
                                <item.icon size={20} color="#64748B" />
                            </View>
                            <View style={styles.settingsContent}>
                                <Text style={styles.settingsLabel}>{item.label}</Text>
                                <Text style={styles.settingsSubtitle}>{item.subtitle}</Text>
                            </View>
                            <ChevronRight size={20} color="#CBD5E1" />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Footer Actions */}
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <LogOut size={18} color="#64748B" />
                        <Text style={styles.logoutText}>Log Out</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
                        <Trash2 size={14} color="#EF4444" />
                        <Text style={styles.deleteText}>Delete Account</Text>
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 100,
    },

    // Profile Header
    profileHeader: {
        alignItems: 'center',
        paddingTop: 24,
        paddingBottom: 24,
    },
    avatarContainer: {
        marginBottom: 12,
    },
    avatar: {
        width: 88,
        height: 88,
        borderRadius: 44,
        borderWidth: 4,
        borderColor: '#FFFFFF',
    },
    avatarFallback: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    avatarInitials: {
        fontSize: 32,
        fontWeight: '700',
        color: colors.primary,
    },
    userName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 12,
    },
    trustRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    trustChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FBFF',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 100,
        gap: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    trustChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#475569',
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 100,
        gap: 6,
    },
    editButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.primary,
    },

    // Action Tiles
    tilesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
    },
    tile: {
        width: '47%',
        backgroundColor: '#F8FBFF',
        borderRadius: 20,
        padding: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 12,
        elevation: 2,
    },
    tileIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    tileLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0F172A',
    },
    tileBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: colors.primary,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 100,
    },
    tileBadgeText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#FFFFFF',
    },

    // Settings Card
    settingsCard: {
        backgroundColor: '#F8FBFF',
        borderRadius: 24,
        marginBottom: 24,
        paddingVertical: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 12,
        elevation: 2,
    },
    settingsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    settingsRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#F8FAFC',
    },
    settingsIconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    settingsContent: {
        flex: 1,
    },
    settingsLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0F172A',
    },
    settingsSubtitle: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 2,
    },

    // Footer
    footer: {
        alignItems: 'center',
        paddingTop: 8,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        gap: 8,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#64748B',
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        marginTop: 4,
        gap: 6,
    },
    deleteText: {
        fontSize: 12,
        color: '#EF4444',
    },
});
