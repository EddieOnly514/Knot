import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors } from '../../design';

interface SkeletonProps {
    width?: number | string;
    height?: number;
    borderRadius?: number;
    style?: object;
}

/**
 * Skeleton loader component for loading states
 */
export function Skeleton({
    width = '100%',
    height = 16,
    borderRadius = 8,
    style
}: SkeletonProps) {
    const animatedValue = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(animatedValue, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(animatedValue, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, []);

    const opacity = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    return (
        <Animated.View
            style={[
                styles.skeleton,
                { width, height, borderRadius, opacity },
                style,
            ]}
        />
    );
}

/**
 * Skeleton card for match cards
 */
export function MatchCardSkeleton() {
    return (
        <View style={styles.matchCard}>
            <View style={styles.matchHeader}>
                <Skeleton width={52} height={52} borderRadius={26} />
                <View style={styles.matchInfo}>
                    <Skeleton width={100} height={18} />
                    <Skeleton width={80} height={14} style={{ marginTop: 4 }} />
                </View>
                <Skeleton width={50} height={24} borderRadius={12} />
            </View>
            <View style={styles.chipsRow}>
                <Skeleton width={70} height={32} borderRadius={16} />
                <Skeleton width={90} height={32} borderRadius={16} />
                <Skeleton width={60} height={32} borderRadius={16} />
            </View>
            <View style={styles.actionsRow}>
                <Skeleton width="30%" height={48} borderRadius={12} />
                <Skeleton width="65%" height={48} borderRadius={12} />
            </View>
        </View>
    );
}

/**
 * Skeleton for trip cards
 */
export function TripCardSkeleton() {
    return (
        <View style={styles.tripCard}>
            <Skeleton width="60%" height={18} />
            <Skeleton width="40%" height={14} style={{ marginTop: 8 }} />
            <View style={styles.tripMeta}>
                <Skeleton width={80} height={28} borderRadius={14} />
                <Skeleton width={80} height={28} borderRadius={14} />
            </View>
        </View>
    );
}

/**
 * Skeleton for message bubbles
 */
export function MessageSkeleton({ isMine = false }: { isMine?: boolean }) {
    return (
        <View style={[styles.messageRow, isMine && styles.messageRowMine]}>
            <Skeleton
                width={isMine ? '70%' : '75%'}
                height={50}
                borderRadius={18}
            />
        </View>
    );
}

/**
 * Full page loading skeleton
 */
export function PageSkeleton({ type = 'list' }: { type?: 'list' | 'detail' }) {
    if (type === 'detail') {
        return (
            <View style={styles.pageSkeleton}>
                <Skeleton width="100%" height={200} borderRadius={0} />
                <View style={styles.pageContent}>
                    <Skeleton width="70%" height={24} />
                    <Skeleton width="50%" height={16} style={{ marginTop: 12 }} />
                    <Skeleton width="100%" height={100} style={{ marginTop: 24 }} />
                    <Skeleton width="100%" height={48} borderRadius={12} style={{ marginTop: 24 }} />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.pageSkeleton}>
            <View style={styles.pageContent}>
                {[1, 2, 3].map(i => (
                    <MatchCardSkeleton key={i} />
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    skeleton: {
        backgroundColor: colors.slate[200],
    },
    matchCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
    },
    matchHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    matchInfo: {
        flex: 1,
        marginLeft: 12,
    },
    chipsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    tripCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
    },
    tripMeta: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
    },
    messageRow: {
        marginBottom: 12,
        alignItems: 'flex-start',
    },
    messageRowMine: {
        alignItems: 'flex-end',
    },
    pageSkeleton: {
        flex: 1,
        backgroundColor: colors.background,
    },
    pageContent: {
        padding: 16,
    },
});
