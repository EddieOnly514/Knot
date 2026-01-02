import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
    ChevronLeft,
    ChevronRight,
    HelpCircle,
    MessageCircle,
    AlertTriangle,
    Package,
    MessageSquare,
} from 'lucide-react-native';
import { colors } from '../../design';

const HELP_ITEMS = [
    {
        id: 'faq',
        icon: HelpCircle,
        label: 'Help Center',
        subtitle: 'Browse frequently asked questions',
    },
    {
        id: 'contact',
        icon: MessageCircle,
        label: 'Contact Support',
        subtitle: 'Get help from our team',
    },
    {
        id: 'safety',
        icon: AlertTriangle,
        label: 'Report a Safety Issue',
        subtitle: 'Report concerns about a trip or user',
    },
    {
        id: 'lost',
        icon: Package,
        label: 'Lost & Found',
        subtitle: 'Report a lost or found item',
    },
    {
        id: 'feedback',
        icon: MessageSquare,
        label: 'Send Feedback',
        subtitle: 'Help us improve Knot',
    },
];

export function HelpSupportScreen() {
    const navigation = useNavigation();

    const handlePress = (id: string) => {
        // TODO: Navigate to specific help pages or open support
        console.log('Navigate to:', id);
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <ChevronLeft size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Help & Support</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                <View style={styles.card}>
                    {HELP_ITEMS.map((item, index) => (
                        <TouchableOpacity
                            key={item.id}
                            style={[styles.row, index === HELP_ITEMS.length - 1 && styles.rowLast]}
                            onPress={() => handlePress(item.id)}
                        >
                            <View style={[styles.iconBox, item.id === 'safety' && styles.iconBoxOrange]}>
                                <item.icon size={20} color={item.id === 'safety' ? '#F59E0B' : '#64748B'} />
                            </View>
                            <View style={styles.rowContent}>
                                <Text style={styles.rowLabel}>{item.label}</Text>
                                <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
                            </View>
                            <ChevronRight size={20} color="#CBD5E1" />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Contact Info */}
                <View style={styles.contactCard}>
                    <Text style={styles.contactTitle}>Need immediate help?</Text>
                    <Text style={styles.contactText}>Email us at support@getknot.app</Text>
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
    iconBoxOrange: {
        backgroundColor: '#FEF3C7',
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
    contactCard: {
        backgroundColor: '#EFF6FF',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
    },
    contactTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0F172A',
        marginBottom: 4,
    },
    contactText: {
        fontSize: 14,
        color: colors.primary,
    },
});
