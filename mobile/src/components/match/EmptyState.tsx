import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Clock, AlertCircle } from 'lucide-react-native';
import { colors, typography, spacing, borderRadius } from '../../design';

interface EmptyStateProps {
    title: string;
    suggestions?: string[];
    primaryAction?: {
        label: string;
        onPress: () => void;
    };
    secondaryAction?: {
        label: string;
        onPress: () => void;
    };
}

export function EmptyState({
    title,
    suggestions,
    primaryAction,
    secondaryAction,
}: EmptyStateProps) {
    return (
        <View style={styles.container}>
            <View style={styles.iconContainer}>
                <AlertCircle size={48} color={colors.slate[300]} />
            </View>

            <Text style={styles.title}>{title}</Text>

            {suggestions && suggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                    {suggestions.map((suggestion, index) => (
                        <View key={index} style={styles.suggestionRow}>
                            <View style={styles.bullet} />
                            <Text style={styles.suggestionText}>{suggestion}</Text>
                        </View>
                    ))}
                </View>
            )}

            <View style={styles.actionsRow}>
                {primaryAction && (
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={primaryAction.onPress}
                    >
                        <Clock size={16} color={colors.primary} />
                        <Text style={styles.primaryButtonText}>{primaryAction.label}</Text>
                    </TouchableOpacity>
                )}
                {secondaryAction && (
                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={secondaryAction.onPress}
                    >
                        <Text style={styles.secondaryButtonText}>{secondaryAction.label}</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    iconContainer: {
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text.main,
        textAlign: 'center',
        marginBottom: 16,
    },
    suggestionsContainer: {
        marginBottom: 24,
    },
    suggestionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    bullet: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.slate[300],
        marginRight: 12,
    },
    suggestionText: {
        fontSize: 14,
        color: colors.text.muted,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primaryAlpha[10],
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 100,
        gap: 8,
    },
    primaryButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.primary,
    },
    secondaryButton: {
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    secondaryButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.text.muted,
    },
});
