import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Image,
    SafeAreaView,
    Linking,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, borderRadius, shadows } from '../../design';
import type { RootStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Message {
    id: string;
    text: string;
    isMine: boolean;
    timestamp: Date;
}

type UnlockState = 'pending' | 'waiting' | 'unlocked';

const quickTemplates = [
    "Where are you exactly?",
    "I'm at the pickup zone",
    "UberX or XL?",
    "Leaving now!",
];

const mockMatch = {
    name: 'Sarah',
    photo: 'https://randomuser.me/api/portraits/women/44.jpg',
    verified: true,
};

export function ChatScreen() {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute();
    const flatListRef = useRef<FlatList>(null);

    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: "Hey! I saw we're both heading to Downtown SF around the same time. Want to share a ride?",
            isMine: false,
            timestamp: new Date(Date.now() - 120000),
        },
        {
            id: '2',
            text: "Hi! Yes, I'm leaving in about 15 minutes. Would love to split! What terminal are you at?",
            isMine: true,
            timestamp: new Date(Date.now() - 60000),
        },
        {
            id: '3',
            text: "I'm at Terminal 4, near the baggage claim. Easy to spot - wearing a blue jacket 👋",
            isMine: false,
            timestamp: new Date(),
        },
    ]);

    const [newMessage, setNewMessage] = useState('');
    const [unlockState, setUnlockState] = useState<UnlockState>('pending');
    const [showTemplates, setShowTemplates] = useState(false);

    const handleSend = (text?: string) => {
        const messageText = text || newMessage;
        if (!messageText.trim()) return;

        setMessages((prev) => [
            ...prev,
            {
                id: Date.now().toString(),
                text: messageText,
                isMine: true,
                timestamp: new Date(),
            },
        ]);
        setNewMessage('');
        setShowTemplates(false);
    };

    const handleConfirmMeetup = () => {
        setUnlockState('waiting');
        setTimeout(() => {
            setUnlockState('unlocked');
        }, 3000);
    };

    const handleOpenRideApp = (app: 'uber' | 'lyft') => {
        const destination = encodeURIComponent('123 Main St, San Francisco, CA');
        if (app === 'uber') {
            Linking.openURL(`uber://?action=setPickup&pickup=my_location&dropoff=${destination}`);
        } else {
            Linking.openURL(`lyft://ridetype?id=lyft&destination=${destination}`);
        }
    };

    const handlePostTrip = () => {
        navigation.navigate('PostTrip', { matchId: 'test' });
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const renderMessage = ({ item }: { item: Message }) => (
        <View style={[styles.messageRow, item.isMine && styles.messageRowMine]}>
            {item.isMine ? (
                <LinearGradient
                    colors={[colors.primary, colors.primaryLight]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.messageBubble, styles.myBubble]}
                >
                    <Text style={[styles.messageText, styles.myMessageText]}>{item.text}</Text>
                </LinearGradient>
            ) : (
                <View style={[styles.messageBubble, styles.theirBubble]}>
                    <Text style={styles.messageText}>{item.text}</Text>
                </View>
            )}
            <Text style={[styles.timestamp, item.isMine && styles.timestampMine]}>
                {formatTime(item.timestamp)}
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
                <Image source={{ uri: mockMatch.photo }} style={styles.headerAvatar} />
                <View style={styles.headerInfo}>
                    <View style={styles.headerNameRow}>
                        <Text style={styles.headerName}>{mockMatch.name}</Text>
                        {mockMatch.verified && (
                            <View style={styles.verifiedBadge}>
                                <Text style={styles.verifiedIcon}>✓</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.headerStatus}>Active now</Text>
                </View>
                <TouchableOpacity style={styles.callButton}>
                    <Text style={styles.callIcon}>📞</Text>
                </TouchableOpacity>
            </View>

            {/* Safety Banner */}
            {unlockState !== 'unlocked' && (
                <View style={styles.safetyBanner}>
                    <Text style={styles.safetyIcon}>🔒</Text>
                    <Text style={styles.safetyText}>Confirm meetup to reveal exact destinations</Text>
                </View>
            )}

            <KeyboardAvoidingView
                style={styles.chatArea}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={90}
            >
                {/* Messages */}
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.messagesContent}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
                    showsVerticalScrollIndicator={false}
                />

                {/* Quick Templates */}
                {showTemplates && (
                    <View style={styles.templatesRow}>
                        {quickTemplates.map((template) => (
                            <TouchableOpacity
                                key={template}
                                style={styles.templateButton}
                                onPress={() => handleSend(template)}
                            >
                                <Text style={styles.templateText}>{template}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Input Row */}
                <View style={styles.inputRow}>
                    <TouchableOpacity
                        style={[styles.templateToggle, showTemplates && styles.templateToggleActive]}
                        onPress={() => setShowTemplates(!showTemplates)}
                    >
                        <Text style={styles.templateToggleIcon}>💬</Text>
                    </TouchableOpacity>
                    <TextInput
                        style={styles.input}
                        placeholder="Type a message..."
                        placeholderTextColor={colors.text.muted}
                        value={newMessage}
                        onChangeText={setNewMessage}
                        onSubmitEditing={() => handleSend()}
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
                        onPress={() => handleSend()}
                        disabled={!newMessage.trim()}
                    >
                        <LinearGradient
                            colors={[colors.primary, colors.primaryLight]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.sendGradient}
                        >
                            <Text style={styles.sendIcon}>➤</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Meetup Panel */}
                <View style={styles.meetupPanel}>
                    {unlockState === 'pending' && (
                        <TouchableOpacity onPress={handleConfirmMeetup} activeOpacity={0.9}>
                            <LinearGradient
                                colors={[colors.primary, colors.primaryLight]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.confirmButton}
                            >
                                <Text style={styles.confirmIcon}>📍</Text>
                                <Text style={styles.confirmText}>Confirm Meetup Point</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    )}

                    {unlockState === 'waiting' && (
                        <View style={styles.waitingContainer}>
                            <Text style={styles.waitingEmoji}>⏳</Text>
                            <Text style={styles.waitingText}>Waiting for {mockMatch.name} to confirm...</Text>
                        </View>
                    )}

                    {unlockState === 'unlocked' && (
                        <View style={styles.unlockedContainer}>
                            {/* Meetup Location */}
                            <View style={styles.mapPreview}>
                                <View style={styles.mapPin}>
                                    <Text style={styles.mapPinIcon}>📍</Text>
                                </View>
                                <View style={styles.mapInfo}>
                                    <Text style={styles.mapLabel}>Meetup Point</Text>
                                    <Text style={styles.mapAddress}>Terminal 4 Pickup Zone</Text>
                                </View>
                            </View>

                            {/* Ride Buttons */}
                            <View style={styles.rideButtonsRow}>
                                <TouchableOpacity
                                    style={styles.uberButton}
                                    onPress={() => handleOpenRideApp('uber')}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.rideButtonIcon}>🚗</Text>
                                    <Text style={styles.rideButtonText}>Open Uber</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.lyftButton}
                                    onPress={() => handleOpenRideApp('lyft')}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.rideButtonIcon}>🚗</Text>
                                    <Text style={styles.rideButtonText}>Open Lyft</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Post-Trip Link */}
                            <TouchableOpacity style={styles.postTripLink} onPress={handlePostTrip}>
                                <Text style={styles.postTripText}>Trip completed? Rate your ride partner →</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        ...shadows.card,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.slate[100],
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.sm,
    },
    backIcon: {
        fontSize: 20,
        color: colors.text.main,
    },
    headerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    headerInfo: {
        flex: 1,
        marginLeft: spacing.sm,
    },
    headerNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    headerName: {
        ...typography.styles.bodyMedium,
        color: colors.text.main,
    },
    verifiedBadge: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: colors.primaryAlpha[10],
        justifyContent: 'center',
        alignItems: 'center',
    },
    verifiedIcon: {
        fontSize: 10,
        color: colors.primary,
    },
    headerStatus: {
        ...typography.styles.caption,
        color: colors.text.muted,
    },
    callButton: {
        width: 40,
        height: 40,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.slate[100],
        justifyContent: 'center',
        alignItems: 'center',
    },
    callIcon: {
        fontSize: 18,
    },
    safetyBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.text.main,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        gap: spacing.sm,
    },
    safetyIcon: {
        fontSize: 14,
    },
    safetyText: {
        ...typography.styles.caption,
        color: colors.text.white,
    },
    chatArea: {
        flex: 1,
    },
    messagesContent: {
        padding: spacing.md,
        paddingBottom: spacing.lg,
    },
    messageRow: {
        marginBottom: spacing.md,
        alignItems: 'flex-start',
    },
    messageRowMine: {
        alignItems: 'flex-end',
    },
    messageBubble: {
        maxWidth: '80%',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 20,
    },
    theirBubble: {
        backgroundColor: colors.surface,
        borderBottomLeftRadius: 4,
        ...shadows.card,
    },
    myBubble: {
        borderBottomRightRadius: 4,
    },
    messageText: {
        ...typography.styles.bodySmall,
        color: colors.text.main,
        lineHeight: 20,
    },
    myMessageText: {
        color: colors.text.white,
    },
    timestamp: {
        ...typography.styles.caption,
        color: colors.text.muted,
        marginTop: 4,
    },
    timestampMine: {
        textAlign: 'right',
    },
    templatesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        gap: spacing.sm,
    },
    templateButton: {
        backgroundColor: colors.slate[100],
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
    },
    templateText: {
        ...typography.styles.caption,
        color: colors.text.muted,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        gap: spacing.sm,
    },
    templateToggle: {
        width: 44,
        height: 44,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.slate[100],
        justifyContent: 'center',
        alignItems: 'center',
    },
    templateToggleActive: {
        backgroundColor: colors.primaryAlpha[10],
    },
    templateToggleIcon: {
        fontSize: 20,
    },
    input: {
        flex: 1,
        height: 44,
        backgroundColor: colors.slate[50],
        borderRadius: 22,
        paddingHorizontal: spacing.md,
        ...typography.styles.body,
        color: colors.text.main,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        overflow: 'hidden',
    },
    sendButtonDisabled: {
        opacity: 0.5,
    },
    sendGradient: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendIcon: {
        fontSize: 18,
        color: colors.text.white,
    },
    meetupPanel: {
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        paddingBottom: spacing.xl,
    },
    confirmButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        borderRadius: borderRadius.lg,
        gap: spacing.sm,
    },
    confirmIcon: {
        fontSize: 18,
    },
    confirmText: {
        ...typography.styles.button,
        color: colors.text.white,
    },
    waitingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        gap: spacing.sm,
    },
    waitingEmoji: {
        fontSize: 20,
    },
    waitingText: {
        ...typography.styles.body,
        color: colors.text.muted,
    },
    unlockedContainer: {
        gap: spacing.md,
    },
    mapPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.slate[100],
        padding: spacing.md,
        borderRadius: borderRadius.xl,
        gap: spacing.md,
    },
    mapPin: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mapPinIcon: {
        fontSize: 16,
    },
    mapInfo: {},
    mapLabel: {
        ...typography.styles.caption,
        color: colors.text.muted,
    },
    mapAddress: {
        ...typography.styles.bodyMedium,
        color: colors.text.main,
    },
    rideButtonsRow: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    uberButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        backgroundColor: colors.rideshare.uber,
        borderRadius: borderRadius.lg,
        gap: spacing.sm,
    },
    lyftButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        backgroundColor: colors.rideshare.lyft,
        borderRadius: borderRadius.lg,
        gap: spacing.sm,
    },
    rideButtonIcon: {
        fontSize: 18,
    },
    rideButtonText: {
        ...typography.styles.bodyMedium,
        color: colors.text.white,
    },
    postTripLink: {
        alignItems: 'center',
        paddingVertical: spacing.sm,
    },
    postTripText: {
        ...typography.styles.bodySmall,
        color: colors.primary,
    },
});
