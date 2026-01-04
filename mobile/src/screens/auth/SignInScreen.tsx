import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    TextInput,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, borderRadius } from '../../design';
import { KnotLogo } from '../../components/common/KnotLogo';
import { supabase } from '../../lib/supabase';
import type { AuthStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList>;

export function SignInScreen() {
    const navigation = useNavigation<NavigationProp>();
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showOtp, setShowOtp] = useState(false);

    const formatPhoneNumber = (text: string) => {
        // Remove non-digits
        const cleaned = text.replace(/\D/g, '');
        // Format as (XXX) XXX-XXXX
        const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
        if (match) {
            const formatted = [
                match[1] ? `(${match[1]}` : '',
                match[2] ? `) ${match[2]}` : '',
                match[3] ? `-${match[3]}` : '',
            ].join('');
            return formatted;
        }
        return text;
    };

    const getE164Phone = () => {
        const cleaned = phone.replace(/\D/g, '');
        return `+1${cleaned}`; // Assuming US numbers
    };

    const handleSendCode = async () => {
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length !== 10) {
            Alert.alert('Invalid Phone', 'Please enter a valid 10-digit phone number');
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOtp({
                phone: getE164Phone(),
            });

            if (error) {
                Alert.alert('Error', error.message);
            } else {
                setShowOtp(true);
                Alert.alert('Code Sent', 'Check your phone for the verification code');
            }
        } catch (err) {
            Alert.alert('Error', 'Failed to send code. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyCode = async () => {
        if (otp.length !== 6) {
            Alert.alert('Invalid Code', 'Please enter the 6-digit code');
            return;
        }

        setIsLoading(true);
        try {
            const { data, error } = await supabase.auth.verifyOtp({
                phone: getE164Phone(),
                token: otp,
                type: 'sms',
            });

            if (error) {
                Alert.alert('Error', error.message);
            } else if (data.session) {
                // Auth successful! AuthContext will handle navigation
                console.log('[SignIn] OTP verified, session created');
            }
        } catch (err) {
            Alert.alert('Error', 'Failed to verify code. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <LinearGradient
            colors={['#DBEAFE', '#E0F2FE', '#F8FAFC']}
            locations={[0, 0.3, 0.6]}
            style={styles.container}
        >
            <SafeAreaView style={styles.safeArea}>
                <KeyboardAvoidingView
                    style={styles.content}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    {/* Logo */}
                    <View style={styles.logoSection}>
                        <KnotLogo size={80} color={colors.primary} />
                        <Text style={styles.appName}>Knot</Text>
                        <Text style={styles.tagline}>Share rides, save money</Text>
                    </View>

                    {/* Phone Input */}
                    <View style={styles.inputSection}>
                        {!showOtp ? (
                            <>
                                <Text style={styles.label}>Enter your phone number</Text>
                                <View style={styles.phoneRow}>
                                    <View style={styles.countryCode}>
                                        <Text style={styles.countryCodeText}>+1</Text>
                                    </View>
                                    <TextInput
                                        style={styles.phoneInput}
                                        value={phone}
                                        onChangeText={(text) => setPhone(formatPhoneNumber(text))}
                                        placeholder="(555) 555-5555"
                                        placeholderTextColor={colors.text.muted}
                                        keyboardType="phone-pad"
                                        maxLength={14}
                                        editable={!isLoading}
                                    />
                                </View>

                                <TouchableOpacity
                                    style={[styles.button, isLoading && styles.buttonDisabled]}
                                    onPress={handleSendCode}
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.buttonText}>Send Code</Text>
                                    )}
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <Text style={styles.label}>Enter verification code</Text>
                                <Text style={styles.sublabel}>Sent to {getE164Phone()}</Text>

                                <TextInput
                                    style={styles.otpInput}
                                    value={otp}
                                    onChangeText={setOtp}
                                    placeholder="000000"
                                    placeholderTextColor={colors.text.muted}
                                    keyboardType="number-pad"
                                    maxLength={6}
                                    editable={!isLoading}
                                    autoFocus
                                />

                                <TouchableOpacity
                                    style={[styles.button, isLoading && styles.buttonDisabled]}
                                    onPress={handleVerifyCode}
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.buttonText}>Verify</Text>
                                    )}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.backButton}
                                    onPress={() => {
                                        setShowOtp(false);
                                        setOtp('');
                                    }}
                                >
                                    <Text style={styles.backButtonText}>Use a different number</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>

                    {/* Terms */}
                    <Text style={styles.terms}>
                        By continuing, you agree to our{' '}
                        <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                        <Text style={styles.termsLink}>Privacy Policy</Text>
                    </Text>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: spacing.lg,
        justifyContent: 'center',
    },
    logoSection: {
        alignItems: 'center',
        marginBottom: 48,
    },
    appName: {
        fontSize: 42,
        fontWeight: '700',
        color: colors.text.main,
        marginTop: spacing.lg,
        letterSpacing: -1,
    },
    tagline: {
        fontSize: 17,
        color: colors.text.muted,
        marginTop: spacing.sm,
    },
    inputSection: {
        marginBottom: spacing.xl,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text.main,
        marginBottom: spacing.sm,
    },
    sublabel: {
        fontSize: 14,
        color: colors.text.muted,
        marginBottom: spacing.md,
    },
    phoneRow: {
        flexDirection: 'row',
        marginBottom: spacing.md,
    },
    countryCode: {
        backgroundColor: colors.slate[100],
        paddingHorizontal: spacing.md,
        paddingVertical: 16,
        borderRadius: borderRadius.lg,
        marginRight: spacing.sm,
        justifyContent: 'center',
    },
    countryCodeText: {
        fontSize: 17,
        fontWeight: '500',
        color: colors.text.main,
    },
    phoneInput: {
        flex: 1,
        backgroundColor: '#fff',
        paddingHorizontal: spacing.md,
        paddingVertical: 16,
        borderRadius: borderRadius.lg,
        fontSize: 17,
        color: colors.text.main,
        borderWidth: 1,
        borderColor: colors.slate[200],
    },
    otpInput: {
        backgroundColor: '#fff',
        paddingHorizontal: spacing.md,
        paddingVertical: 16,
        borderRadius: borderRadius.lg,
        fontSize: 24,
        fontWeight: '600',
        color: colors.text.main,
        borderWidth: 1,
        borderColor: colors.slate[200],
        textAlign: 'center',
        letterSpacing: 8,
        marginBottom: spacing.md,
    },
    button: {
        backgroundColor: colors.primary,
        paddingVertical: 16,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 56,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#fff',
    },
    backButton: {
        marginTop: spacing.md,
        alignItems: 'center',
    },
    backButtonText: {
        fontSize: 15,
        color: colors.primary,
    },
    terms: {
        fontSize: 13,
        color: colors.text.muted,
        textAlign: 'center',
        paddingHorizontal: spacing.lg,
        lineHeight: 20,
    },
    termsLink: {
        color: colors.primary,
    },
});
