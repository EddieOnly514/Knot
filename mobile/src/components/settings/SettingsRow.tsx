import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Switch,
} from 'react-native';
import {
    Smartphone,
    Bell,
    Briefcase,
    ShieldBan,
    LifeBuoy,
    FileText,
    ChevronRight,
} from 'lucide-react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../../design';

// Icon mapping
const ICON_MAP: { [key: string]: any } = {
    Smartphone,
    Bell,
    Briefcase,
    ShieldBan,
    LifeBuoy,
    FileText,
};

export type SettingsRowType = 'link' | 'value' | 'toggle';

export interface SettingsRowProps {
    id: string;
    label: string;
    icon: string;
    type: SettingsRowType;
    value?: string | boolean;
    isLast?: boolean;
    onPress?: () => void;
    onToggle?: (value: boolean) => void;
}

export function SettingsRow({
    label,
    icon,
    type,
    value,
    isLast = false,
    onPress,
    onToggle,
}: SettingsRowProps) {
    const IconComponent = ICON_MAP[icon];

    const renderRightContent = () => {
        switch (type) {
            case 'toggle':
                return (
                    <Switch
                        value={value as boolean}
                        onValueChange={onToggle}
                        trackColor={{
                            false: '#E2E8F0',
                            true: colors.primary
                        }}
                        thumbColor="#FFFFFF"
                        ios_backgroundColor="#E2E8F0"
                    />
                );
            case 'value':
                return (
                    <View style={styles.valueContainer}>
                        <Text style={styles.valueText}>{value as string}</Text>
                        <ChevronRight size={20} color="#CBD5E1" />
                    </View>
                );
            case 'link':
            default:
                return <ChevronRight size={20} color="#CBD5E1" />;
        }
    };

    const Wrapper = type === 'toggle' ? View : TouchableOpacity;

    return (
        <Wrapper
            style={[styles.row, !isLast && styles.rowBorder]}
            onPress={type !== 'toggle' ? onPress : undefined}
            activeOpacity={0.7}
        >
            {/* Left Side */}
            <View style={styles.leftContent}>
                <View style={styles.iconBox}>
                    {IconComponent && (
                        <IconComponent size={20} color="#64748B" />
                    )}
                </View>
                <Text style={styles.label}>{label}</Text>
            </View>

            {/* Right Side */}
            {renderRightContent()}
        </Wrapper>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    rowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#F8FAFC',
    },
    leftContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0F172A',
    },
    valueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    valueText: {
        fontSize: 14,
        color: '#94A3B8',
        marginRight: 8,
    },
});
