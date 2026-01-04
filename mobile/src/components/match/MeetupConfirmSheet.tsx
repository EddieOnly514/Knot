import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    TextInput,
} from 'react-native';
import {
    X,
    MapPin,
    Car,
    Briefcase,
    Building,
    Landmark,
    Check,
    Loader,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, shadows } from '../../design';

interface MeetupConfirmSheetProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (location: string) => void;
    otherName: string;
    waitingForOther?: boolean;
    onCancelConfirmation?: () => void;
}

const MEETUP_OPTIONS = [
    { id: 'pickup_zone', label: 'Rideshare pickup zone', icon: Car },
    { id: 'baggage', label: 'Baggage claim', icon: Briefcase },
    { id: 'terminal', label: 'Terminal entrance', icon: Building },
    { id: 'landmark', label: 'Public landmark', icon: Landmark },
];

export function MeetupConfirmSheet({
    visible,
    onClose,
    onConfirm,
    otherName,
    waitingForOther = false,
    onCancelConfirmation,
}: MeetupConfirmSheetProps) {
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [customLocation, setCustomLocation] = useState('');

    const handleConfirm = () => {
        if (selectedOption === 'landmark' && customLocation) {
            onConfirm(customLocation);
        } else if (selectedOption) {
            const option = MEETUP_OPTIONS.find(o => o.id === selectedOption);
            onConfirm(option?.label || selectedOption);
        }
    };

    const canConfirm = selectedOption && (selectedOption !== 'landmark' || customLocation.length > 0);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={24} color={colors.text.muted} />
                        </TouchableOpacity>
                        <Text style={styles.title}>Confirm a public meetup point</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    <Text style={styles.subtitle}>
                        We hide exact addresses until both confirm.
                    </Text>

                    {waitingForOther ? (
                        /* Waiting State */
                        <View style={styles.waitingContainer}>
                            <View style={styles.waitingIcon}>
                                <Loader size={32} color={colors.primary} />
                            </View>
                            <Text style={styles.waitingTitle}>
                                Waiting for {otherName} to confirm...
                            </Text>
                            <TouchableOpacity onPress={onCancelConfirmation}>
                                <Text style={styles.cancelLink}>Cancel confirmation</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <>
                            {/* Options */}
                            <View style={styles.optionsContainer}>
                                {MEETUP_OPTIONS.map((option) => (
                                    <TouchableOpacity
                                        key={option.id}
                                        style={[
                                            styles.optionRow,
                                            selectedOption === option.id && styles.optionRowSelected,
                                        ]}
                                        onPress={() => setSelectedOption(option.id)}
                                    >
                                        <View style={[
                                            styles.radio,
                                            selectedOption === option.id && styles.radioSelected,
                                        ]}>
                                            {selectedOption === option.id && (
                                                <View style={styles.radioInner} />
                                            )}
                                        </View>
                                        <option.icon size={20} color={colors.text.muted} />
                                        <Text style={styles.optionLabel}>{option.label}</Text>
                                    </TouchableOpacity>
                                ))}

                                {/* Custom Location Input */}
                                {selectedOption === 'landmark' && (
                                    <TextInput
                                        style={styles.customInput}
                                        placeholder="Enter landmark name..."
                                        placeholderTextColor={colors.text.muted}
                                        value={customLocation}
                                        onChangeText={setCustomLocation}
                                    />
                                )}
                            </View>

                            {/* Map Preview Placeholder */}
                            <View style={styles.mapPreview}>
                                <MapPin size={24} color={colors.primary} />
                                <Text style={styles.mapText}>Coarse area preview</Text>
                            </View>

                            {/* Confirm Button */}
                            <TouchableOpacity
                                onPress={handleConfirm}
                                disabled={!canConfirm}
                                activeOpacity={0.9}
                            >
                                <LinearGradient
                                    colors={canConfirm ? [colors.primary, colors.primaryLight] : [colors.slate[300], colors.slate[300]]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.confirmButton}
                                >
                                    <Check size={20} color="#FFFFFF" />
                                    <Text style={styles.confirmText}>Confirm meetup</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.slate[100],
    },
    closeButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text.main,
    },
    subtitle: {
        fontSize: 14,
        color: colors.text.muted,
        textAlign: 'center',
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 24,
    },
    optionsContainer: {
        paddingHorizontal: 16,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.cardBlue,
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        gap: 12,
    },
    optionRowSelected: {
        backgroundColor: colors.primaryAlpha[10],
        borderWidth: 1,
        borderColor: colors.primary,
    },
    radio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: colors.slate[300],
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioSelected: {
        borderColor: colors.primary,
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.primary,
    },
    optionLabel: {
        fontSize: 15,
        fontWeight: '500',
        color: colors.text.main,
    },
    customInput: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.slate[200],
        borderRadius: 12,
        padding: 16,
        fontSize: 15,
        color: colors.text.main,
        marginTop: 8,
    },
    mapPreview: {
        backgroundColor: colors.slate[100],
        marginHorizontal: 16,
        marginTop: 16,
        height: 120,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    mapText: {
        fontSize: 12,
        color: colors.text.muted,
    },
    confirmButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 16,
        marginTop: 24,
        height: 56,
        borderRadius: 16,
        gap: 8,
    },
    confirmText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    waitingContainer: {
        alignItems: 'center',
        paddingVertical: 48,
        paddingHorizontal: 24,
    },
    waitingIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.primaryAlpha[10],
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    waitingTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.text.main,
        marginBottom: 16,
    },
    cancelLink: {
        fontSize: 14,
        color: colors.primary,
    },
});
