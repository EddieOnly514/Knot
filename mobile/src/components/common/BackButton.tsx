import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';
import { shadows } from '../../design';

interface BackButtonProps {
    onPress?: () => void;
    color?: string;
}

export function BackButton({ onPress, color = '#0F172A' }: BackButtonProps) {
    const navigation = useNavigation();

    const handlePress = () => {
        if (onPress) {
            onPress();
        } else {
            navigation.goBack();
        }
    };

    return (
        <TouchableOpacity style={styles.button} onPress={handlePress} activeOpacity={0.8}>
            <ChevronLeft size={24} color={color} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.card,
    },
});
