import React, { useState, useRef, useEffect } from 'react';
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

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ScreenRouteProp = RouteProp<RootStackParamList, 'Chat'>;

interface Message {
    id: string;
    text: string;
    isMine: boolean;
    timestamp: Date;
    status?: 'sending' | 'sent' | 'read';
}

type MeetupState = 'chat' | 'confirm_pending' | 'waiting' | 'confirmed';

const quickReplies = [
    "Where are you exactly?",
    "I'm at the pickup zone",
    "On my way!",
    "Running 5 min late",
];

// Mock match data - will be fetched from API
const getMockMatch = () => ({
    id: 'match-1',
    name: 'Sarah',
    photo: 'https://randomuser.me/api/portraits/women/44.jpg',
    verified: true,
    rating: 4.9,
    destination: 'Downtown SF',
    departureTime: 'In 15 min',
});

export function ChatScreen() {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute<ScreenRouteProp>();
    const flatListRef = useRef<FlatList>(null);
    const inputRef = useRef<TextInput>(null);

    const matchId = route.params?.matchId;
    const match = getMockMatch();

    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: "Hey! I saw we're both heading to Downtown SF around the same time. Want to share a ride?",
            isMine: false,
            timestamp: new Date(Date.now() - 120000),
            status: 'read',
        },
        {
            id: '2',
            text: "Hi! Yes, I'm leaving in about 15 minutes. Would love to split! What terminal are you at?",
            isMine: true,
            timestamp: new Date(Date.now() - 60000),
            status: 'read',
        },
        {
            id: '3',
            text: "I'm at Terminal 4, near the baggage claim. Easy to spot - wearing a blue jacket 👋",
            isMine: false,
            timestamp: new Date(),
            status: 'read',
        },
    ]);

    const [newMessage, setNewMessage] = useState('');
    const [meetupState, setMeetupState] = useState<MeetupState>('chat');
    const [showQuickReplies, setShowQuickReplies] = useState(false);
    const [isSending, setIsSending] = useState(false);

    // Scroll to bottom on new message
    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages]);

    const handleSend = async (text?: string) => {
        const messageText = text || newMessage;
        if (!messageText.trim() || isSending) return;

        const tempId = Date.now().toString();
        const newMsg: Message = {
            id: tempId,
            text: messageText.trim(),
            isMine: true,
            timestamp: new Date(),
            status: 'sending',
        };

        setMessages(prev => [...prev, newMsg]);
        setNewMessage('');
        setShowQuickReplies(false);
        setIsSending(true);

        // Simulate send
        setTimeout(() => {
            setMessages(prev =>
                prev.map(m => m.id === tempId ? { ...m, status: 'sent' } : m)
            );
            setIsSending(false);
        }, 500);
    };

    const handleConfirmMeetup = () => {
        setMeetupState('confirm_pending');
        // Simulate other user confirming
        setTimeout(() => {
            setMeetupState('confirmed');
        }, 2000);
    };

    const handleOpenRideApp = (app: 'uber' | 'lyft') => {
        const destination = encodeURIComponent('Downtown SF');
        const deepLinks = {
            uber: `uber://?action=setPickup&pickup=my_location&dropoff=${destination}`,
            lyft: `lyft://ridetype?id=lyft&destination=${destination}`,
        };

        Linking.canOpenURL(deepLinks[app]).then(supported => {
            if (supported) {
                Linking.openURL(deepLinks[app]);
            } else {
                // Fallback to app store
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
        navigation.navigate('PostTrip', { matchId: matchId || 'test' });
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const renderMessage = ({ item }: { item: Message }) => (
        <View style={[styles.messageRow, item.isMine && styles.messageRowMine]}>
            {item.isMine ? (
                <LinearGradient
                    colors={[colors.primary, '#3B82F6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.messageBubble, styles.myBubble]}
                >
                    <Text style={[styles.messageText, styles.myMessageText]}>{item.text}</Text>
                </LinearGradient>
            ) : (
                <View style={[styles.messageBubble, styles.theirBubble]}>
                    <Text style={styles.messageText}>{item.text}</Text>
                </View>
            )}
            <View style={[styles.messageFooter, item.isMine && styles.messageFooterMine]}>
                <Text style={styles.timestamp}>{formatTime(item.timestamp)}</Text>
                {item.isMine && item.status === 'sending' && (
                    <ActivityIndicator size="small" color={colors.text.muted} style={{ marginLeft: 4 }} />
                )}
                {item.isMine && item.status === 'sent' && (
                    <CheckCircle size={12} color={colors.text.muted} style={{ marginLeft: 4 }} />
                )}
            </View>
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
                    <ChevronLeft size={24} color={colors.text.main} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.headerProfile} activeOpacity={0.8}>
                    <Image source={{ uri: match.photo }} style={styles.headerAvatar} />
                    <View style={styles.headerInfo}>
                        <View style={styles.headerNameRow}>
                            <Text style={styles.headerName}>{match.name}</Text>
                            {match.verified && (
                                <View style={styles.verifiedBadge}>
                                    <CheckCircle size={12} color={colors.primary} />
                                </View>
                            )}
                        </View>
                        <View style={styles.headerMeta}>
                            <MapPin size={10} color={colors.text.muted} />
                            <Text style={styles.headerDestination}>{match.destination}</Text>
                            <Text style={styles.headerDot}>•</Text>
                            <Clock size={10} color={colors.text.muted} />
                            <Text style={styles.headerTime}>{match.departureTime}</Text>
                        </View>
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
                            <Send size={18} color="#FFFFFF" />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Meetup Panel */}
                <View style={styles.meetupPanel}>
                    {meetupState === 'chat' && (
                        <TouchableOpacity onPress={handleConfirmMeetup} activeOpacity={0.9}>
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

                    {meetupState === 'confirm_pending' && (
                        <View style={styles.waitingContainer}>
                            <ActivityIndicator size="small" color={colors.primary} />
                            <Text style={styles.waitingText}>Waiting for {match.name} to confirm...</Text>
                        </View>
                    )}

                    {meetupState === 'confirmed' && (
                        <View style={styles.confirmedContainer}>
                            {/* Meetup Location */}
                            <View style={styles.locationCard}>
                                <View style={styles.locationIcon}>
                                    <Navigation size={16} color={colors.primary} />
                                </View>
                                <View style={styles.locationInfo}>
                                    <Text style={styles.locationLabel}>Meetup Point</Text>
                                    <Text style={styles.locationAddress}>Terminal 4 Pickup Zone</Text>
                                </View>
                            </View>

                            {/* Ride Buttons */}
                            <View style={styles.rideButtonsRow}>
                                <TouchableOpacity
                                    style={styles.uberButton}
                                    onPress={() => handleOpenRideApp('uber')}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.rideButtonText}>Open Uber</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.lyftButton}
                                    onPress={() => handleOpenRideApp('lyft')}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.rideButtonText}>Open Lyft</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Post-Trip Link */}
                            <TouchableOpacity style={styles.postTripLink} onPress={handlePostTrip}>
                                <Star size={14} color={colors.primary} />
                                <Text style={styles.postTripText}>Trip done? Rate your ride partner</Text>
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
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingVertical: 10,
        ...shadows.card,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.slate[100],
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerProfile: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 8,
    },
    headerAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    headerInfo: {
        marginLeft: 10,
    },
    headerNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    headerName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text.main,
    },
    verifiedBadge: {
        marginLeft: 2,
    },
    headerMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        marginTop: 2,
    },
    headerDestination: {
        fontSize: 12,
        color: colors.text.muted,
    },
    headerDot: {
        fontSize: 12,
        color: colors.text.muted,
        marginHorizontal: 2,
    },
    headerTime: {
        fontSize: 12,
        color: colors.text.muted,
    },
    callButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primaryAlpha[10],
        justifyContent: 'center',
        alignItems: 'center',
    },
    safetyBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.slate[800],
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 8,
    },
    safetyText: {
        fontSize: 13,
        color: colors.text.white,
    },
    chatArea: {
        flex: 1,
    },
    messagesContent: {
        padding: 16,
        paddingBottom: 8,
    },
    messageRow: {
        marginBottom: 12,
        alignItems: 'flex-start',
    },
    messageRowMine: {
        alignItems: 'flex-end',
    },
    messageBubble: {
        maxWidth: '80%',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 18,
    },
    theirBubble: {
        backgroundColor: '#FFFFFF',
        borderBottomLeftRadius: 4,
        ...shadows.card,
    },
    myBubble: {
        borderBottomRightRadius: 4,
    },
    messageText: {
        fontSize: 15,
        color: colors.text.main,
        lineHeight: 21,
    },
    myMessageText: {
        color: '#FFFFFF',
    },
    messageFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    messageFooterMine: {
        justifyContent: 'flex-end',
    },
    timestamp: {
        fontSize: 11,
        color: colors.text.muted,
    },
    quickRepliesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: colors.slate[100],
        gap: 8,
    },
    quickReplyButton: {
        backgroundColor: colors.slate[100],
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 100,
    },
    quickReplyText: {
        fontSize: 13,
        color: colors.text.muted,
        fontWeight: '500',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: colors.slate[100],
        gap: 8,
    },
    quickRepliesToggle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.slate[100],
        justifyContent: 'center',
        alignItems: 'center',
    },
    quickRepliesToggleActive: {
        backgroundColor: colors.primaryAlpha[10],
    },
    input: {
        flex: 1,
        minHeight: 44,
        maxHeight: 100,
        backgroundColor: colors.slate[50],
        borderRadius: 22,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
        fontSize: 15,
        color: colors.text.main,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        overflow: 'hidden',
    },
    sendButtonDisabled: {
        opacity: 0.6,
    },
    sendGradient: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    meetupPanel: {
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: colors.slate[100],
        paddingHorizontal: 16,
        paddingVertical: 14,
        paddingBottom: 24,
    },
    confirmButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 52,
        borderRadius: 14,
        gap: 8,
    },
    confirmText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    waitingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 10,
    },
    waitingText: {
        fontSize: 14,
        color: colors.text.muted,
    },
    confirmedContainer: {
        gap: 12,
    },
    locationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.slate[50],
        padding: 14,
        borderRadius: 14,
        gap: 12,
    },
    locationIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.primaryAlpha[10],
        justifyContent: 'center',
        alignItems: 'center',
    },
    locationInfo: {},
    locationLabel: {
        fontSize: 12,
        color: colors.text.muted,
    },
    locationAddress: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text.main,
        marginTop: 2,
    },
    rideButtonsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    uberButton: {
        flex: 1,
        height: 48,
        backgroundColor: '#000000',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    lyftButton: {
        flex: 1,
        height: 48,
        backgroundColor: '#FF00BF',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rideButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    postTripLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        gap: 6,
    },
    postTripText: {
        fontSize: 14,
        color: colors.primary,
        fontWeight: '500',
    },
});
