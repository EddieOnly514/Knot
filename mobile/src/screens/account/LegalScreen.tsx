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
    FileText,
    Shield,
    Users,
} from 'lucide-react-native';

const LEGAL_ITEMS = [
    {
        id: 'terms',
        icon: FileText,
        label: 'Terms of Service',
        url: 'https://getknot.app/terms',
    },
    {
        id: 'privacy',
        icon: Shield,
        label: 'Privacy Policy',
        url: 'https://getknot.app/privacy',
    },
    {
        id: 'guidelines',
        icon: Users,
        label: 'Community Guidelines',
        url: 'https://getknot.app/guidelines',
    },
];

export function LegalScreen() {
    const navigation = useNavigation();

    const handlePress = (url: string) => {
        Linking.openURL(url);
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <ChevronLeft size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Legal</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                <View style={styles.card}>
                    {LEGAL_ITEMS.map((item, index) => (
                        <TouchableOpacity
                            key={item.id}
                            style={[styles.row, index === LEGAL_ITEMS.length - 1 && styles.rowLast]}
                            onPress={() => handlePress(item.url)}
                        >
                            <View style={styles.iconBox}>
                                <item.icon size={20} color="#64748B" />
                            </View>
                            <Text style={styles.rowLabel}>{item.label}</Text>
                            <ChevronRight size={20} color="#CBD5E1" />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Version */}
                <Text style={styles.versionText}>Knot v1.0.0</Text>
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
    rowLabel: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        color: '#0F172A',
    },
    versionText: {
        textAlign: 'center',
        fontSize: 12,
        color: '#94A3B8',
    },
});
