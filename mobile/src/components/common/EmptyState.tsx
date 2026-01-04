import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertCircle, WifiOff, RefreshCw, Search, MapPin, MessageSquare } from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../../design';

interface EmptyStateProps {
    type: 'no-matches' | 'no-messages' | 'no-trips' | 'offline' | 'error';
    title?: string;
    subtitle?: string;
    actionLabel?: string;
    onAction?: () => void;
}

const emptyStates = {
    'no-matches': {
        icon: Search,
        title: 'No matches found',
        subtitle: 'Try adjusting your trip preferences or check back later',
    },
    'no-messages': {
        icon: MessageSquare,
        title: 'No messages yet',
        subtitle: 'Start a conversation with your match',
    },
    'no-trips': {
        icon: MapPin,
        title: 'No trips yet',
        subtitle: 'Create your first trip to start finding matches',
    },
    'offline': {
        icon: WifiOff,
        title: 'You\'re offline',
        subtitle: 'Check your internet connection and try again',
    },
    'error': {
        icon: AlertCircle,
        title: 'Something went wrong',
        subtitle: 'Please try again later',
    },
};

/**
 * Reusable empty state component
 */
export function EmptyState({
    type,
    title,
    subtitle,
    actionLabel,
    onAction
}: EmptyStateProps) {
    const config = emptyStates[type];
    const Icon = config.icon;

    return (
        <View style={styles.container}>
            <View style={styles.iconContainer}>
                <Icon size={48} color={colors.slate[300]} strokeWidth={1.5} />
            </View>
            <Text style={styles.title}>{title || config.title}</Text>
            <Text style={styles.subtitle}>{subtitle || config.subtitle}</Text>

            {actionLabel && onAction && (
                <TouchableOpacity style={styles.actionButton} onPress={onAction}>
                    {type === 'offline' || type === 'error' ? (
                        <RefreshCw size={16} color={colors.primary} />
                    ) : null}
                    <Text style={styles.actionText}>{actionLabel}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

/**
 * Inline error banner
 */
export function ErrorBanner({
    message,
    onRetry
}: {
    message: string;
    onRetry?: () => void
}) {
    return (
        <View style={styles.errorBanner}>
            <AlertCircle size={16} color="#C62828" />
            <Text style={styles.errorText}>{message}</Text>
            {onRetry && (
                <TouchableOpacity onPress={onRetry} style={styles.retryButton}>
                    <RefreshCw size={14} color="#C62828" />
                </TouchableOpacity>
            )}
        </View>
    );
}

/**
 * Offline indicator bar
 */
export function OfflineBar() {
    return (
        <View style={styles.offlineBar}>
            <WifiOff size={14} color="#FFFFFF" />
            <Text style={styles.offlineText}>No internet connection</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        paddingVertical: 60,
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.slate[100],
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.text.main,
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: colors.text.muted,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primaryAlpha[10],
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: borderRadius.full,
        gap: 8,
    },
    actionText: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.primary,
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFEBEE',
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 12,
        gap: 10,
    },
    errorText: {
        flex: 1,
        fontSize: 14,
        color: '#C62828',
    },
    retryButton: {
        padding: 4,
    },
    offlineBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.slate[700],
        paddingVertical: 8,
        gap: 8,
    },
    offlineText: {
        fontSize: 13,
        color: '#FFFFFF',
    },
});
