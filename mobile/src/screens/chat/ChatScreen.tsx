import React, { useState, useRef, useEffect, useCallback } from 'react';
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
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
    ChevronLeft,
    Phone,
    Send,
    MessageSquare,
    MapPin,
    Lock,
    Clock,
    CheckCircle,
    Star,
    Navigation,
} from 'lucide-react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../../design';
import type { RootStackParamList } from '../../types/navigation';
import { chatService, MessageWithSender } from '../../services/chatService';
import { matchService, MatchWithProfile } from '../../services/matchService';
import { meetupService } from '../../services/meetupService';
import { MeetupConfirmSheet } from '../../components/match/MeetupConfirmSheet';
import { useAuth } from '../../contexts/AuthContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ScreenRouteProp = RouteProp<RootStackParamList, 'Chat'>;

type MeetupState = 'chat' | 'waiting' | 'confirmed';

const quickReplies = [
    "Where are you exactly?",
    "I'm at the pickup zone",
    "On my way!",
    "Running 5 min late",
];

export function ChatScreen() {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute<ScreenRouteProp>();
    const flatListRef = useRef<FlatList>(null);
    const inputRef = useRef<TextInput>(null);
    const { user, profile } = useAuth();

    const matchId = route.params?.matchId;

    const [messages, setMessages] = useState<MessageWithSender[]>([]);
    const [matchData, setMatchData] = useState<MatchWithProfile | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [meetupState, setMeetupState] = useState<MeetupState>('chat');
    const [showMeetupSheet, setShowMeetupSheet] = useState(false);
    const [meetupLocation, setMeetupLocation] = useState<string | null>(null);
    const [showQuickReplies, setShowQuickReplies] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Load messages + match info + meetup state
    useEffect(() => {
        if (!matchId) return;

        const load = async () => {
            setIsLoading(true);
            const [messagesRes, matchRes, confirmationsRes] = await Promise.all([
                chatService.getMessages(matchId),
                matchService.getMatch(matchId),
                meetupService.getConfirmations(matchId),
            ]);
            if (messagesRes.data) setMessages(messagesRes.data);
            if (matchRes.data) {
                setMatchData(matchRes.data);
                // Hydrate meetup state from match status
                if (matchRes.data.status === 'meetup_confirmed') {
                    setMeetupState('confirmed');
                } else if (matchRes.data.status === 'meetup_pending') {
                    // We have at least one confirmation — check if ours
                    const myConfirmation = confirmationsRes.data?.find(c => c.user_id === profile?.id);
                    if (myConfirmation) {
                        setMeetupState('waiting');
                        setMeetupLocation(myConfirmation.location_name);
                    } else {
                        setMeetupState('chat'); // other user confirmed, we haven't yet
                    }
                }
            }
            // Get confirmed location for display
            if (confirmationsRes.data && confirmationsRes.data.length > 0) {
                setMeetupLocation(confirmationsRes.data[0].location_name);
            }
            setIsLoading(false);
            chatService.markAsRead(matchId);
        };

        load();

        // Subscribe to new messages via realtime
        const unsubscribeMessages = chatService.subscribeToMessages(matchId, (newMsg) => {
            setMessages(prev => {
                if (prev.some(m => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
            });
        });

        // Subscribe to match status changes (for meetup dual-confirm)
        const unsubscribeStatus = meetupService.subscribeToMatchStatus(matchId, (newStatus) => {
            if (newStatus === 'meetup_confirmed') {
                setMeetupState('confirmed');
            } else if (newStatus === 'meetup_pending') {
                // If we haven't confirmed, stay in 'chat'. If we have, stay in 'waiting'.
                setMeetupState(prev => prev === 'waiting' ? 'waiting' : 'chat');
            }
        });

        return () => {
            unsubscribeMessages();
            unsubscribeStatus();
        };
    }, [matchId]);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
    }, [messages]);

    const handleSend = async (text?: string) => {
        const messageText = text || newMessage;
        if (!messageText.trim() || isSending || !matchId) return;

        setNewMessage('');
        setShowQuickReplies(false);
        setIsSending(true);

        const { error } = await chatService.sendMessage(matchId, messageText.trim());
        if (error) {
            Alert.alert('Error', 'Failed to send message. Please try again.');
            setNewMessage(messageText); // restore text on failure
        }
        // Real-time subscription will add the sent message to the list

        setIsSending(false);
    };

    const handleOpenMeetupSheet = () => {
        setShowMeetupSheet(true);
    };

    const handleConfirmMeetup = async (location: string) => {
        if (!matchId) return;
        setShowMeetupSheet(false);
        setMeetupState('waiting');
        setMeetupLocation(location);

        const { bothConfirmed, error } = await meetupService.confirmMeetup(matchId, location);
        if (error) {
            Alert.alert('Error', 'Failed to confirm meetup. Please try again.');
            setMeetupState('chat');
            return;
        }
        if (bothConfirmed) {
            setMeetupState('confirmed');
        }
        // If !bothConfirmed, we stay in 'waiting' — realtime will update us when the other confirms
    };

    const handleCancelConfirmation = async () => {
        if (!matchId) return;
        setMeetupState('chat');
        setMeetupLocation(null);
        await meetupService.cancelConfirmation(matchId);
    };

    const handleOpenRideApp = (app: 'uber' | 'lyft') => {
        const destination = encodeURIComponent(matchData?.other_trip?.rough_location ?? 'Airport');
        const deepLinks = {
            uber: `uber://?action=setPickup&pickup=my_location&dropoff=${destination}`,
            lyft: `lyft://ridetype?id=lyft&destination=${destination}`,
        };
        Linking.canOpenURL(deepLinks[app]).then(supported => {
            if (supported) {
                Linking.openURL(deepLinks[app]);
            } else {
                const storeLinks = {
                    uber: Platform.OS === 'ios'
                        ? 'https://apps.apple.com/app/uber/id368677368'
                        : 'https://play.google.com/store/apps/details?id=com.ubercab',
                    lyft: Platform.OS === 'ios'
                        ? 'https://apps.apple.com/app/lyft/id529379082'
                        : 'https://play.google.com/store/apps/details?id=me.lyft.android',
                };
                Linking.openURL(storeLinks[app]);
            }
        });
    };

    const handlePostTrip = () => {
        navigation.navigate('PostTrip', { matchId: matchId || '' });
    };

    const formatTime = (isoString: string) =>
        new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const isMyMessage = (msg: MessageWithSender) => msg.sender_id === profile?.id;

    const otherUser = matchData?.other_user;
    const otherName = otherUser ? otherUser.first_name : 'Match';
    const otherPhoto = otherUser?.photo_url;

    const renderMessage = ({ item }: { item: MessageWithSender }) => {
        const mine = isMyMessage(item);
        return (
            <View style={[styles.messageRow, mine && styles.messageRowMine]}>
                {mine ? (
                    <LinearGradient
                        colors={[colors.primary, '#3B82F6']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.messageBubble, styles.myBubble]}
                    >
                        <Text style={[styles.messageText, styles.myMessageText]}>{item.content}</Text>
                    </LinearGradient>
                ) : (
                    <View style={[styles.messageBubble, styles.theirBubble]}>
                        <Text style={styles.messageText}>{item.content}</Text>
                    </View>
                )}
                <View style={[styles.messageFooter, mine && styles.messageFooterMine]}>
                    <Text style={styles.timestamp}>{formatTime(item.created_at)}</Text>
                    {mine && !item.read && (
                        <CheckCircle size={12} color={colors.text.muted} style={{ marginLeft: 4 }} />
                    )}
                </View>
            </View>
        );
    };

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <ChevronLeft size={24} color={colors.text.main} />
                    </TouchableOpacity>
                    <View style={styles.headerProfile}>
                        <ActivityIndicator size="small" color={colors.primary} />
                    </View>
                </View>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <ChevronLeft size={24} color={colors.text.main} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerProfile} activeOpacity={0.8}>
                    {otherPhoto ? (
                        <Image source={{ uri: otherPhoto }} style={styles.headerAvatar} />
                    ) : (
                        <View style={[styles.headerAvatar, styles.avatarPlaceholder]}>
                            <Text style={styles.avatarInitial}>{otherName[0]}</Text>
                        </View>
                    )}
                    <View style={styles.headerInfo}>
                        <View style={styles.headerNameRow}>
                            <Text style={styles.headerName}>{otherName}</Text>
                            {otherUser?.rating && otherUser.rating >= 4.5 && (
                                <View style={styles.verifiedBadge}>
                                    <CheckCircle size={12} color={colors.primary} />
                                </View>
                            )}
                        </View>
                        {matchData?.other_trip && (
                            <View style={styles.headerMeta}>
                                <MapPin size={10} color={colors.text.muted} />
                                <Text style={styles.headerDestination}>
                                    {matchData.other_trip.rough_location ?? 'Airport'}
                                </Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.callButton}>
                    <Phone size={20} color={colors.primary} />
                </TouchableOpacity>
            </View>

            {/* Safety Banner */}
            {meetupState !== 'confirmed' && (
                <View style={styles.safetyBanner}>
                    <Lock size={14} color={colors.text.white} />
                    <Text style={styles.safetyText}>Confirm meetup to coordinate your ride</Text>
                </View>
            )}

            <KeyboardAvoidingView
                style={styles.chatArea}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={0}
            >
                {/* Messages */}
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.messagesContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyMessages}>
                            <Text style={styles.emptyMessagesText}>
                                Say hi to {otherName}! 👋
                            </Text>
                        </View>
                    }
                />

                {/* Quick Replies */}
                {showQuickReplies && (
                    <View style={styles.quickRepliesContainer}>
                        {quickReplies.map((reply) => (
                            <TouchableOpacity
                                key={reply}
                                style={styles.quickReplyButton}
                                onPress={() => handleSend(reply)}
                            >
                                <Text style={styles.quickReplyText}>{reply}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Input Row */}
                <View style={styles.inputContainer}>
                    <TouchableOpacity
                        style={[styles.quickRepliesToggle, showQuickReplies && styles.quickRepliesToggleActive]}
                        onPress={() => setShowQuickReplies(!showQuickReplies)}
                    >
                        <MessageSquare size={20} color={showQuickReplies ? colors.primary : colors.text.muted} />
                    </TouchableOpacity>
                    <TextInput
                        ref={inputRef}
                        style={styles.input}
                        placeholder="Type a message..."
                        placeholderTextColor={colors.text.muted}
                        value={newMessage}
                        onChangeText={setNewMessage}
                        onSubmitEditing={() => handleSend()}
                        returnKeyType="send"
                        multiline
                        maxLength={500}
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
                        onPress={() => handleSend()}
                        disabled={!newMessage.trim() || isSending}
                    >
                        <LinearGradient
                            colors={newMessage.trim() ? [colors.primary, '#3B82F6'] : [colors.slate[200], colors.slate[300]]}
                            style={styles.sendGradient}
                        >
                            {isSending ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Send size={18} color="#FFFFFF" />
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Meetup Panel */}
                <View style={styles.meetupPanel}>
                    {meetupState === 'chat' && (
                        <TouchableOpacity onPress={handleOpenMeetupSheet} activeOpacity={0.9}>
                            <LinearGradient
                                colors={[colors.primary, '#3B82F6']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.confirmButton}
                            >
                                <MapPin size={18} color="#FFFFFF" />
                                <Text style={styles.confirmText}>Ready to Meet Up</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    )}

                    {meetupState === 'waiting' && (
                        <View style={styles.waitingContainer}>
                            <ActivityIndicator size="small" color={colors.primary} />
                            <Text style={styles.waitingText}>Waiting for {otherName} to confirm...</Text>
                            <TouchableOpacity onPress={handleCancelConfirmation}>
                                <Text style={styles.cancelLink}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {meetupState === 'confirmed' && (
                        <View style={styles.confirmedContainer}>
                            <View style={styles.locationCard}>
                                <View style={styles.locationIcon}>
                                    <Navigation size={16} color={colors.primary} />
                                </View>
                                <View style={styles.locationInfo}>
                                    <Text style={styles.locationLabel}>Meetup Point</Text>
                                    <Text style={styles.locationAddress}>
                                        {meetupLocation ?? matchData?.other_trip?.rough_location ?? 'Pickup Zone'}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.rideButtonsRow}>
                                <TouchableOpacity style={styles.uberButton} onPress={() => handleOpenRideApp('uber')} activeOpacity={0.8}>
                                    <Text style={styles.rideButtonText}>Open Uber</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.lyftButton} onPress={() => handleOpenRideApp('lyft')} activeOpacity={0.8}>
                                    <Text style={styles.rideButtonText}>Open Lyft</Text>
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity style={styles.postTripLink} onPress={handlePostTrip}>
                                <Star size={14} color={colors.primary} />
                                <Text style={styles.postTripText}>Trip done? Rate your ride partner</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </KeyboardAvoidingView>

            {/* Meetup Confirm Sheet */}
            <MeetupConfirmSheet
                visible={showMeetupSheet}
                onClose={() => setShowMeetupSheet(false)}
                onConfirm={handleConfirmMeetup}
                otherName={otherName}
                waitingForOther={meetupState === 'waiting'}
                onCancelConfirmation={handleCancelConfirmation}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingVertical: 10,
        ...shadows.card,
    },
    backButton: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: colors.slate[100],
        justifyContent: 'center', alignItems: 'center',
    },
    headerProfile: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
    headerAvatar: { width: 44, height: 44, borderRadius: 22 },
    avatarPlaceholder: {
        backgroundColor: colors.primaryAlpha[20],
        justifyContent: 'center', alignItems: 'center',
    },
    avatarInitial: { fontSize: 18, fontWeight: '700', color: colors.primary },
    headerInfo: { marginLeft: 10 },
    headerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    headerName: { fontSize: 16, fontWeight: '600', color: colors.text.main },
    verifiedBadge: { marginLeft: 2 },
    headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
    headerDestination: { fontSize: 12, color: colors.text.muted },
    callButton: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: colors.primaryAlpha[10],
        justifyContent: 'center', alignItems: 'center',
    },
    safetyBanner: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.slate[800],
        paddingHorizontal: 16, paddingVertical: 10, gap: 8,
    },
    safetyText: { fontSize: 13, color: colors.text.white },
    chatArea: { flex: 1 },
    messagesContent: { padding: 16, paddingBottom: 8 },
    emptyMessages: { flex: 1, alignItems: 'center', paddingTop: 48 },
    emptyMessagesText: { fontSize: 15, color: colors.text.muted },
    messageRow: { marginBottom: 12, alignItems: 'flex-start' },
    messageRowMine: { alignItems: 'flex-end' },
    messageBubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
    theirBubble: { backgroundColor: '#FFFFFF', borderBottomLeftRadius: 4, ...shadows.card },
    myBubble: { borderBottomRightRadius: 4 },
    messageText: { fontSize: 15, color: colors.text.main, lineHeight: 21 },
    myMessageText: { color: '#FFFFFF' },
    messageFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    messageFooterMine: { justifyContent: 'flex-end' },
    timestamp: { fontSize: 11, color: colors.text.muted },
    quickRepliesContainer: {
        flexDirection: 'row', flexWrap: 'wrap',
        paddingHorizontal: 12, paddingVertical: 8,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1, borderTopColor: colors.slate[100], gap: 8,
    },
    quickReplyButton: {
        backgroundColor: colors.slate[100],
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100,
    },
    quickReplyText: { fontSize: 13, color: colors.text.muted, fontWeight: '500' },
    inputContainer: {
        flexDirection: 'row', alignItems: 'flex-end',
        paddingHorizontal: 12, paddingVertical: 10,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1, borderTopColor: colors.slate[100], gap: 8,
    },
    quickRepliesToggle: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: colors.slate[100],
        justifyContent: 'center', alignItems: 'center',
    },
    quickRepliesToggleActive: { backgroundColor: colors.primaryAlpha[10] },
    input: {
        flex: 1, minHeight: 44, maxHeight: 100,
        backgroundColor: colors.slate[50], borderRadius: 22,
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12,
        fontSize: 15, color: colors.text.main,
    },
    sendButton: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden' },
    sendButtonDisabled: { opacity: 0.6 },
    sendGradient: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
    meetupPanel: {
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1, borderTopColor: colors.slate[100],
        paddingHorizontal: 16, paddingVertical: 14, paddingBottom: 24,
    },
    confirmButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        height: 52, borderRadius: 14, gap: 8,
    },
    confirmText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
    waitingContainer: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', paddingVertical: 14, gap: 10,
    },
    waitingText: { fontSize: 14, color: colors.text.muted, marginBottom: 8 },
    cancelLink: { fontSize: 14, color: colors.primary, fontWeight: '500' },
    confirmedContainer: { gap: 12 },
    locationCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.slate[50], padding: 14, borderRadius: 14, gap: 12,
    },
    locationIcon: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: colors.primaryAlpha[10],
        justifyContent: 'center', alignItems: 'center',
    },
    locationInfo: {},
    locationLabel: { fontSize: 12, color: colors.text.muted },
    locationAddress: { fontSize: 15, fontWeight: '600', color: colors.text.main, marginTop: 2 },
    rideButtonsRow: { flexDirection: 'row', gap: 10 },
    uberButton: {
        flex: 1, height: 48, backgroundColor: '#000000',
        borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    },
    lyftButton: {
        flex: 1, height: 48, backgroundColor: '#FF00BF',
        borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    },
    rideButtonText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
    postTripLink: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', paddingVertical: 8, gap: 6,
    },
    postTripText: { fontSize: 14, color: colors.primary, fontWeight: '500' },
});
