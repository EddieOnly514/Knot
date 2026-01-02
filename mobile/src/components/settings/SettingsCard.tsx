import React from 'react';
import {
    View,
    StyleSheet,
} from 'react-native';
import { SettingsRow, SettingsRowProps } from './SettingsRow';

interface SettingsCardProps {
    items: SettingsRowProps[];
    onItemPress?: (id: string) => void;
    onToggle?: (id: string, value: boolean) => void;
}

export function SettingsCard({ items, onItemPress, onToggle }: SettingsCardProps) {
    return (
        <View style={styles.card}>
            {items.map((item, index) => (
                <SettingsRow
                    key={item.id}
                    {...item}
                    isLast={index === items.length - 1}
                    onPress={() => onItemPress?.(item.id)}
                    onToggle={(value) => onToggle?.(item.id, value)}
                />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        marginBottom: 24,
        paddingVertical: 8,
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 12,
        elevation: 2,
    },
});
