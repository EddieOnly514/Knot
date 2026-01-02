import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    TextInput,
    SafeAreaView,
    ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, borderRadius, shadows } from '../../design';
import type { RootStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type Step = 'confirm' | 'rate' | 'done';

const mockMatch = {
    name: 'Sarah K.',
    photo: 'https://randomuser.me/api/portraits/women/44.jpg',
};

export function PostTripScreen() {
    const navigation = useNavigation<NavigationProp>();

    const [step, setStep] = useState<Step>('confirm');
    const [rating, setRating] = useState(0);
    const [wouldRideAgain, setWouldRideAgain] = useState<boolean | null>(null);
    const [comment, setComment] = useState('');
    const [showReport, setShowReport] = useState(false);
    const [reportReason, setReportReason] = useState('');

    const handleConfirmTrip = (completed: boolean) => {
        if (completed) {
            setStep('rate');
        } else {
            setShowReport(true);
        }
    };

    const handleSubmitRating = () => {
        console.log({ rating, wouldRideAgain, comment });
        setStep('done');
    };

    const handleBlock = () => {
        navigation.navigate('Main');
    };

    const handleReport = () => {
        console.log({ reportReason });
        navigation.navigate('Main');
    };

    if (step === 'done') {
        return (
            <SafeAreaView style={styles.doneContainer}>
                <View style={styles.doneContent}>
                    <View style={styles.doneIconContainer}>
                        <Text style={styles.doneIcon}>✓</Text>
                    </View>
                    <Text style={styles.doneTitle}>Thanks for your feedback!</Text>
                    <Text style={styles.doneSubtitle}>
                        Your rating helps keep Knot safe and friendly.
                    </Text>
                </View>
                <View style={styles.doneButtonContainer}>
                    <TouchableOpacity onPress={() => navigation.navigate('Main')} activeOpacity={0.9}>
                        <LinearGradient
                            colors={[colors.primary, colors.primaryLight]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.primaryButton}
                        >
                            <Text style={styles.primaryButtonText}>Back to Home</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.backIcon}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Trip Complete</Text>
                    <View style={styles.backButton} />
                </View>

                {/* Profile Card */}
                <View style={styles.profileCard}>
                    <Image source={{ uri: mockMatch.photo }} style={styles.avatar} />
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>{mockMatch.name}</Text>
                        <Text style={styles.profileLabel}>Your ride partner</Text>
                    </View>
                </View>

                {step === 'confirm' && !showReport && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            Did you complete the trip with {mockMatch.name}?
                        </Text>
                        <View style={styles.confirmButtons}>
                            <TouchableOpacity
                                style={styles.yesButton}
                                onPress={() => handleConfirmTrip(true)}
                            >
                                <Text style={styles.yesButtonText}>✓ Yes, we rode together</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.noButton}
                                onPress={() => handleConfirmTrip(false)}
                            >
                                <Text style={styles.noButtonText}>✗ No, it didn't happen</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {step === 'rate' && (
                    <View style={styles.section}>
                        {/* Star Rating */}
                        <Text style={styles.rateLabel}>How was your ride with {mockMatch.name}?</Text>
                        <View style={styles.starsRow}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                                    <Text style={[styles.star, star <= rating && styles.starFilled]}>
                                        ★
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Would Ride Again */}
                        <Text style={styles.rateLabel}>Would you ride with {mockMatch.name} again?</Text>
                        <View style={styles.rideAgainRow}>
                            <TouchableOpacity
                                style={[styles.rideAgainButton, wouldRideAgain === true && styles.rideAgainYes]}
                                onPress={() => setWouldRideAgain(true)}
                            >
                                <Text
                                    style={[
                                        styles.rideAgainText,
                                        wouldRideAgain === true && styles.rideAgainTextActive,
                                    ]}
                                >
                                    👍 Yes!
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.rideAgainButton, wouldRideAgain === false && styles.rideAgainNo]}
                                onPress={() => setWouldRideAgain(false)}
                            >
                                <Text
                                    style={[
                                        styles.rideAgainText,
                                        wouldRideAgain === false && styles.rideAgainTextActive,
                                    ]}
                                >
                                    👎 No
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Comment */}
                        <TextInput
                            style={styles.commentInput}
                            placeholder="Optional: Leave a comment..."
                            placeholderTextColor={colors.text.muted}
                            value={comment}
                            onChangeText={setComment}
                            multiline
                        />

                        <TouchableOpacity
                            onPress={handleSubmitRating}
                            disabled={rating === 0}
                            activeOpacity={0.9}
                        >
                            <LinearGradient
                                colors={rating > 0 ? [colors.primary, colors.primaryLight] : [colors.slate[300], colors.slate[300]]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.primaryButton}
                            >
                                <Text style={styles.primaryButtonText}>Submit Rating</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                )}

                {showReport && (
                    <View style={styles.section}>
                        <View style={styles.reportCard}>
                            <Text style={styles.reportTitle}>What happened?</Text>
                            <TextInput
                                style={styles.reportInput}
                                placeholder="Tell us what went wrong..."
                                placeholderTextColor={colors.text.muted}
                                value={reportReason}
                                onChangeText={setReportReason}
                                multiline
                            />
                        </View>

                        <View style={styles.reportButtons}>
                            <TouchableOpacity style={styles.reportButton} onPress={handleReport}>
                                <Text style={styles.reportButtonText}>🚩 Report</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.blockButton} onPress={handleBlock}>
                                <Text style={styles.blockButtonText}>🚫 Block</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.skipLink}
                            onPress={() => navigation.navigate('Main')}
                        >
                            <Text style={styles.skipText}>Skip for now</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.xl,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.md,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadows.card,
    },
    backIcon: {
        fontSize: 20,
        color: colors.text.main,
    },
    headerTitle: {
        ...typography.styles.h3,
        color: colors.text.main,
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: spacing.lg,
        borderRadius: borderRadius['3xl'],
        marginBottom: spacing.lg,
        ...shadows.card,
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
    },
    profileInfo: {
        marginLeft: spacing.md,
    },
    profileName: {
        ...typography.styles.h3,
        color: colors.text.main,
    },
    profileLabel: {
        ...typography.styles.bodySmall,
        color: colors.text.muted,
    },
    section: {
        gap: spacing.md,
    },
    sectionTitle: {
        ...typography.styles.h3,
        color: colors.text.main,
        textAlign: 'center',
    },
    confirmButtons: {
        gap: spacing.sm,
    },
    yesButton: {
        backgroundColor: '#E8F5E9',
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
    },
    yesButtonText: {
        ...typography.styles.bodyMedium,
        color: colors.success,
    },
    noButton: {
        backgroundColor: colors.slate[100],
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
    },
    noButtonText: {
        ...typography.styles.bodyMedium,
        color: colors.text.muted,
    },
    rateLabel: {
        ...typography.styles.body,
        color: colors.text.muted,
        textAlign: 'center',
    },
    starsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    star: {
        fontSize: 40,
        color: colors.slate[300],
    },
    starFilled: {
        color: '#FFD700',
    },
    rideAgainRow: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    rideAgainButton: {
        flex: 1,
        backgroundColor: colors.slate[100],
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
    },
    rideAgainYes: {
        backgroundColor: colors.primary,
    },
    rideAgainNo: {
        backgroundColor: colors.text.main,
    },
    rideAgainText: {
        ...typography.styles.bodyMedium,
        color: colors.text.muted,
    },
    rideAgainTextActive: {
        color: colors.text.white,
    },
    commentInput: {
        backgroundColor: colors.slate[50],
        borderRadius: borderRadius.xl,
        padding: spacing.md,
        minHeight: 80,
        ...typography.styles.body,
        color: colors.text.main,
        textAlignVertical: 'top',
    },
    primaryButton: {
        height: 56,
        borderRadius: borderRadius.lg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    primaryButtonText: {
        ...typography.styles.button,
        color: colors.text.white,
    },
    reportCard: {
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: borderRadius['3xl'],
        ...shadows.card,
    },
    reportTitle: {
        ...typography.styles.bodyMedium,
        color: colors.text.main,
        marginBottom: spacing.sm,
    },
    reportInput: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.slate[200],
        padding: spacing.md,
        minHeight: 100,
        ...typography.styles.body,
        color: colors.text.main,
        textAlignVertical: 'top',
    },
    reportButtons: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    reportButton: {
        flex: 1,
        backgroundColor: '#FFF3E0',
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
    },
    reportButtonText: {
        ...typography.styles.bodyMedium,
        color: '#F57C00',
    },
    blockButton: {
        flex: 1,
        backgroundColor: '#FFEBEE',
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
    },
    blockButtonText: {
        ...typography.styles.bodyMedium,
        color: colors.danger,
    },
    skipLink: {
        alignItems: 'center',
        paddingVertical: spacing.sm,
    },
    skipText: {
        ...typography.styles.body,
        color: colors.text.muted,
    },
    doneContainer: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
    },
    doneContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
    },
    doneIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    doneIcon: {
        fontSize: 40,
        color: colors.success,
    },
    doneTitle: {
        ...typography.styles.h2,
        color: colors.text.main,
        textAlign: 'center',
    },
    doneSubtitle: {
        ...typography.styles.body,
        color: colors.text.muted,
        textAlign: 'center',
        marginTop: spacing.sm,
    },
    doneButtonContainer: {
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.xl,
    },
});
