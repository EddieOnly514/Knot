import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Image,
    SafeAreaView,
    Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
    ChevronLeft,
    Camera,
    User,
    Users,
    Briefcase,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { colors, typography, spacing, borderRadius, shadows } from '../../design';

const LUGGAGE_OPTIONS = ['None', 'Carry-on', '1 Suitcase', '2+ Suitcases'];
const PARTY_SIZE_OPTIONS = ['1', '2'];

export function EditProfileScreen() {
    const navigation = useNavigation();

    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [firstName, setFirstName] = useState('Sarah');
    const [lastName, setLastName] = useState('Jenkins');
    const [bio, setBio] = useState('');
    const [partySize, setPartySize] = useState('1');
    const [luggage, setLuggage] = useState('Carry-on');

    const handlePickPhoto = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please allow access to your photos.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setPhotoUri(result.assets[0].uri);
        }
    };

    const handleSave = () => {
        // TODO: Save to Supabase
        navigation.goBack();
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <ChevronLeft size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Profile</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {/* Preview Note */}
                <View style={styles.previewNote}>
                    <Text style={styles.previewText}>This is what others see</Text>
                </View>

                {/* Photo */}
                <TouchableOpacity style={styles.photoContainer} onPress={handlePickPhoto}>
                    {photoUri ? (
                        <Image source={{ uri: photoUri }} style={styles.photo} />
                    ) : (
                        <View style={styles.photoPlaceholder}>
                            <User size={40} color="#94A3B8" />
                        </View>
                    )}
                    <View style={styles.cameraButton}>
                        <Camera size={16} color="#FFFFFF" />
                    </View>
                </TouchableOpacity>

                {/* Name Fields */}
                <View style={styles.inputCard}>
                    <Text style={styles.inputLabel}>First Name</Text>
                    <TextInput
                        style={styles.input}
                        value={firstName}
                        onChangeText={setFirstName}
                        placeholder="Enter first name"
                        placeholderTextColor="#94A3B8"
                    />
                </View>

                <View style={styles.inputCard}>
                    <Text style={styles.inputLabel}>Last Name</Text>
                    <TextInput
                        style={styles.input}
                        value={lastName}
                        onChangeText={setLastName}
                        placeholder="Enter last name"
                        placeholderTextColor="#94A3B8"
                    />
                </View>

                {/* Bio */}
                <View style={styles.inputCard}>
                    <View style={styles.labelRow}>
                        <Text style={styles.inputLabel}>Short Bio</Text>
                        <Text style={styles.charCount}>{bio.length}/120</Text>
                    </View>
                    <TextInput
                        style={[styles.input, styles.bioInput]}
                        value={bio}
                        onChangeText={(text) => setBio(text.slice(0, 120))}
                        placeholder="Tell others a bit about yourself..."
                        placeholderTextColor="#94A3B8"
                        multiline
                        numberOfLines={3}
                    />
                </View>

                {/* Party Size */}
                <View style={styles.inputCard}>
                    <View style={styles.labelRow}>
                        <Users size={18} color="#64748B" />
                        <Text style={styles.inputLabel}>Default Party Size</Text>
                    </View>
                    <View style={styles.optionsRow}>
                        {PARTY_SIZE_OPTIONS.map((option) => (
                            <TouchableOpacity
                                key={option}
                                style={[styles.optionButton, partySize === option && styles.optionButtonActive]}
                                onPress={() => setPartySize(option)}
                            >
                                <Text style={[styles.optionText, partySize === option && styles.optionTextActive]}>
                                    {option}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Luggage */}
                <View style={styles.inputCard}>
                    <View style={styles.labelRow}>
                        <Briefcase size={18} color="#64748B" />
                        <Text style={styles.inputLabel}>Default Luggage</Text>
                    </View>
                    <View style={styles.optionsRow}>
                        {LUGGAGE_OPTIONS.map((option) => (
                            <TouchableOpacity
                                key={option}
                                style={[styles.optionButton, styles.optionButtonSmall, luggage === option && styles.optionButtonActive]}
                                onPress={() => setLuggage(option)}
                            >
                                <Text style={[styles.optionText, styles.optionTextSmall, luggage === option && styles.optionTextActive]}>
                                    {option}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </ScrollView>

            {/* Save Button */}
            <View style={styles.buttonContainer}>
                <TouchableOpacity onPress={handleSave} activeOpacity={0.9}>
                    <LinearGradient
                        colors={[colors.primary, colors.primaryLight]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.saveButton}
                    >
                        <Text style={styles.saveText}>Save Changes</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F8FBFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#0F172A',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 100,
    },
    previewNote: {
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        alignSelf: 'center',
        marginBottom: 24,
    },
    previewText: {
        fontSize: 12,
        color: colors.primary,
        fontWeight: '500',
    },
    photoContainer: {
        alignSelf: 'center',
        marginBottom: 24,
        position: 'relative',
    },
    photo: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    photoPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cameraButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    inputCard: {
        backgroundColor: '#F8FBFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 1,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    charCount: {
        fontSize: 12,
        color: '#94A3B8',
        marginLeft: 'auto',
    },
    input: {
        fontSize: 16,
        color: '#0F172A',
        paddingVertical: 4,
    },
    bioInput: {
        minHeight: 60,
        textAlignVertical: 'top',
    },
    optionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 8,
    },
    optionButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 100,
        backgroundColor: '#F1F5F9',
    },
    optionButtonSmall: {
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    optionButtonActive: {
        backgroundColor: '#EFF6FF',
        borderWidth: 1,
        borderColor: colors.primary,
    },
    optionText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#64748B',
    },
    optionTextSmall: {
        fontSize: 12,
    },
    optionTextActive: {
        color: colors.primary,
    },
    buttonContainer: {
        paddingHorizontal: 24,
        paddingVertical: 16,
        paddingBottom: 32,
    },
    saveButton: {
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.button,
    },
    saveText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});
