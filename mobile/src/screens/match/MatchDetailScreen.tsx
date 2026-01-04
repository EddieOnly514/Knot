import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Linking,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
    ShieldCheck,
    Star,
    Shield,
    Ban,
    Send,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, borderRadius, shadows } from '../../design';
import type { RootStackParamList } from '../../types/navigation';

import { BackButton } from '../../components/common/BackButton';
import { LogisticsSummaryCard } from '../../components/match/LogisticsSummaryCard';
import { MeetupConfirmSheet } from '../../components/match/MeetupConfirmSheet';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const QUICK_REPLIES = [
    'Where are you?',
    "I'm at pickup zone",
    'UberX or XL?',
    'I have 1 suitcase',
    'Leaving now',
];

interface Message {
    id: string;
    text: string;
    fromMe: boolean;
    timestamp: string;
}

// Mock data
const mockMessages: Message[] = [
    { id: '1', text: 'Hey! I saw we matched. Still heading downtown?', fromMe: false, timestamp: '2:30 PM' },
    { id: '2', text: 'Yes! I should be at the pickup zone in about 10 minutes', fromMe: true, timestamp: '2:31 PM' },
    { id: '3', text: 'Perfect! I have 1 carry-on. What about you?', fromMe: false, timestamp: '2:32 PM' },
    { id: '4', text: 'Same here, just 1 suitcase. UberX should work!', fromMe: true, timestamp: '2:33 PM' },
];

export function MatchDetailScreen() {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute();

    const [messages, setMessages] = useState<Message[]>(mockMessages);
    const [inputText, setInputText] = useState('');
    const [meetupConfirmed, setMeetupConfirmed] = useState(false);
    const [showMeetupSheet, setShowMeetupSheet] = useState(false);
    const [waitingForOther, setWaitingForOther] = useState(false);

    const scrollViewRef = useRef<ScrollView>(null);

    // Mock match data
    const matchData = {
        id: '1',
        name: 'Sarah',
        verified: true,
        rating: 4.9,
        totalParty: 2,
        totalLuggage: '2 suitcases total',
        timeLabel: 'Leaves in 15m',
        rideType: 'UberX',
    };

    const handleSend = () => {
        if (!inputText.trim()) return;

        const newMessage: Message = {
            id: Date.now().toString(),
            text: inputText,
            fromMe: true,
            timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        };

        setMessages(prev => [...prev, newMessage]);
        setInputText('');
    };

    const handleQuickReply = (text: string) => {
        setInputText(text);
    };

    const handleConfirmMeetup = (location: string) => {
        setWaitingForOther(true);

        // Simulate other user confirming after 2 seconds
        setTimeout(() => {
            setWaitingForOther(false);
            setMeetupConfirmed(true);
            setShowMeetupSheet(false);
        }, 2000);
    };

    const handleOpenRideApp = (app: 'uber' | 'lyft') => {
        const url = app === 'uber'
            ? 'uber://'
            : 'lyft://';
        Linking.openURL(url).catch(() => {
            // Fallback to web
            const webUrl = app === 'uber'
                ? 'https://m.uber.com'
                : 'https://www.lyft.com';
            Linking.openURL(webUrl);
        });
    };

    useEffect(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
    }, [messages]);

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Header */}
                <View style={styles.header}>
                    <BackButton />
                    <View style={styles.headerCenter}>
                        <View style={styles.headerNameRow}>
                            <Text style={styles.headerName}>{matchData.name}</Text>
                            {matchData.verified && (
                                <View style={styles.verifiedBadge}>
                                    <ShieldCheck size={12} color={colors.primary} />
                                </View>
                            )}
                            <View style={styles.ratingBadge}>
                                <Star size={12} color="#F59E0B" fill="#F59E0B" />
                                <Text style={styles.ratingText}>{matchData.rating}</Text>
                            </View>
                        </View>
                    </View>
                    <View style={styles.headerActions}>
                        <TouchableOpacity style={styles.headerButton}>
                            <Shield size={20} color={colors.text.muted} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.headerButton}>
                            <Ban size={20} color={colors.text.muted} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Logistics Summary */}
                <LogisticsSummaryCard
                    totalParty={matchData.totalParty}
                    totalLuggage={matchData.totalLuggage}
                    timeLabel={matchData.timeLabel}
                    rideType={matchData.rideType}
                    meetupConfirmed={meetupConfirmed}
                    otherName={matchData.name}
                />

                {/* Primary CTA */}
                {meetupConfirmed ? (
                    <View style={styles.rideButtons}>
                        <TouchableOpacity
                            style={styles.rideButton}
                            onPress={() => handleOpenRideApp('uber')}
                        >
                            <Text style={styles.rideButtonText}>Open Uber</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.rideButton}
                            onPress={() => handleOpenRideApp('lyft')}
                        >
                            <Text style={styles.rideButtonText}>Open Lyft</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.confirmContainer}>
                        <TouchableOpacity onPress={() => setShowMeetupSheet(true)} activeOpacity={0.9}>
                            <LinearGradient
                                colors={[colors.primary, colors.primaryLight]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.confirmButton}
                            >
                                <Text style={styles.confirmButtonText}>Confirm meetup</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                        <Text style={styles.confirmHelper}>
                            Both must confirm before any address is shared.
                        </Text>
                    </View>
                )}

                {/* Messages */}
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.messagesContainer}
                    contentContainerStyle={styles.messagesContent}
                    showsVerticalScrollIndicator={false}
                >
                    {messages.map(message => (
                        <View
                            key={message.id}
                            style={[
                                styles.messageBubble,
                                message.fromMe ? styles.messageBubbleMine : styles.messageBubbleTheirs,
                            ]}
                        >
                            <Text style={[
                                styles.messageText,
                                message.fromMe ? styles.messageTextMine : styles.messageTextTheirs,
                            ]}>
                                {message.text}
                            </Text>
                            <Text style={styles.messageTime}>{message.timestamp}</Text>
                        </View>
                    ))}
                </ScrollView>

                {/* Quick Replies */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.quickRepliesContainer}
                    contentContainerStyle={styles.quickRepliesContent}
                >
                    {QUICK_REPLIES.map((reply, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.quickReplyChip}
                            onPress={() => handleQuickReply(reply)}
                        >
                            <Text style={styles.quickReplyText}>{reply}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Input */}
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Type a message..."
                        placeholderTextColor={colors.text.muted}
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                        onPress={handleSend}
                        disabled={!inputText.trim()}
                    >
                        <Send size={20} color={inputText.trim() ? '#FFFFFF' : colors.text.muted} />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            {/* Meetup Confirm Sheet */}
            <MeetupConfirmSheet
                visible={showMeetupSheet}
                onClose={() => setShowMeetupSheet(false)}
                onConfirm={handleConfirmMeetup}
                otherName={matchData.name}
                waitingForOther={waitingForOther}
                onCancelConfirmation={() => setWaitingForOther(false)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    keyboardView: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: colors.slate[100],
    },
    headerCenter: {
        flex: 1,
        marginHorizontal: 12,
    },
    headerNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    headerName: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text.main,
    },
    verifiedBadge: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.primaryAlpha[10],
        alignItems: 'center',
        justifyContent: 'center',
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 100,
        gap: 2,
    },
    ratingText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#D97706',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 4,
    },
    headerButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.cardBlue,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmContainer: {
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    confirmButton: {
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    confirmHelper: {
        fontSize: 12,
        color: colors.text.muted,
        textAlign: 'center',
        marginTop: 8,
    },
    rideButtons: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 12,
        marginBottom: 12,
    },
    rideButton: {
        flex: 1,
        backgroundColor: '#000000',
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rideButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    messagesContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    messagesContent: {
        padding: 16,
        paddingBottom: 24,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 16,
        marginBottom: 8,
    },
    messageBubbleMine: {
        alignSelf: 'flex-end',
        backgroundColor: colors.primary,
        borderBottomRightRadius: 4,
    },
    messageBubbleTheirs: {
        alignSelf: 'flex-start',
        backgroundColor: colors.cardBlue,
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 20,
    },
    messageTextMine: {
        color: '#FFFFFF',
    },
    messageTextTheirs: {
        color: colors.text.main,
    },
    messageTime: {
        fontSize: 10,
        color: 'rgba(255, 255, 255, 0.7)',
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    quickRepliesContainer: {
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: colors.slate[100],
    },
    quickRepliesContent: {
        padding: 8,
        gap: 8,
    },
    quickReplyChip: {
        backgroundColor: colors.cardBlue,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 100,
        marginRight: 8,
    },
    quickReplyText: {
        fontSize: 13,
        color: colors.text.main,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingBottom: 24,
        gap: 12,
    },
    input: {
        flex: 1,
        backgroundColor: colors.cardBlue,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 15,
        color: colors.text.main,
        maxHeight: 100,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: colors.slate[200],
    },
});
