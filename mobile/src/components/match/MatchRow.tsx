import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
} from 'react-native';
import { Clock } from 'lucide-react-native';
import { colors, spacing, borderRadius, shadows } from '../../design';

export type MatchStatus = 'matched' | 'meetup_pending' | 'meetup_confirmed' | 'completed';

export interface MatchRowData {
    id: string;
    name: string;
    photo: string | null;
    initials: string;
    status: MatchStatus;
    lastMessage: string;
    timestamp: string;
    hasIssue?: boolean;
}

interface MatchRowProps {
    match: MatchRowData;
    onPress: () => void;
}

const STATUS_CONFIG: Record<MatchStatus, { label: string; bg: string; text: string }> = {
    matched: { label: 'Matched', bg: colors.primaryAlpha[10], text: colors.primary },
    meetup_pending: { label: 'Meetup pending', bg: '#FEF3C7', text: '#D97706' },
    meetup_confirmed: { label: 'Meetup confirmed', bg: '#DCFCE7', text: '#16A34A' },
    completed: { label: 'Completed', bg: colors.slate[100], text: colors.text.muted },
};

export function MatchRow({ match, onPress }: MatchRowProps) {
    const statusConfig = STATUS_CONFIG[match.status];

    return (
        <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
            {/* Avatar */}
            {match.photo ? (
                <Image source={{ uri: match.photo }} style={styles.avatar} />
            ) : (
                <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitials}>{match.initials}</Text>
                </View>
            )}

            {/* Content */}
            <View style={styles.content}>
                <View style={styles.topRow}>
                    <Text style={styles.name}>{match.name}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                        <Text style={[styles.statusText, { color: statusConfig.text }]}>
                            {statusConfig.label}
                        </Text>
                    </View>
                </View>
                <Text style={styles.lastMessage} numberOfLines={1}>
                    {match.lastMessage}
                </Text>
            </View>

            {/* Meta */}
            <View style={styles.meta}>
                <View style={styles.timeRow}>
                    <Clock size={12} color={colors.text.muted} />
                    <Text style={styles.timeText}>{match.timestamp}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.slate[100],
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    avatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primaryAlpha[10],
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitials: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.primary,
    },
    content: {
        flex: 1,
        marginLeft: 12,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text.main,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 100,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '600',
    },
    lastMessage: {
        fontSize: 13,
        color: colors.text.muted,
    },
    meta: {
        alignItems: 'flex-end',
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    timeText: {
        fontSize: 11,
        color: colors.text.muted,
    },
});
