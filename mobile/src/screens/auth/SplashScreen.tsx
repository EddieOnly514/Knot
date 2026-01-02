import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Easing,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, typography } from '../../design';
import type { AuthStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList>;

export function SplashScreen() {
    const navigation = useNavigation<NavigationProp>();

    // Animation values for the two rings
    const ring1Rotation = useRef(new Animated.Value(0)).current;
    const ring2Rotation = useRef(new Animated.Value(0)).current;
    const fadeIn = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Fade in animation
        Animated.timing(fadeIn, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();

        // Subtle rotation for ring 1
        Animated.loop(
            Animated.timing(ring1Rotation, {
                toValue: 1,
                duration: 8000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();

        // Counter rotation for ring 2
        Animated.loop(
            Animated.timing(ring2Rotation, {
                toValue: -1,
                duration: 8000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();

        // Navigate after delay
        const timer = setTimeout(() => {
            navigation.navigate('Onboarding');
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    const ring1Rotate = ring1Rotation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const ring2Rotate = ring2Rotation.interpolate({
        inputRange: [-1, 0],
        outputRange: ['-360deg', '0deg'],
    });

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.logoContainer, { opacity: fadeIn }]}>
                {/* Double Ring Logo */}
                <View style={styles.ringsContainer}>
                    <Animated.View
                        style={[
                            styles.ring,
                            styles.ring1,
                            { transform: [{ rotate: ring1Rotate }] },
                        ]}
                    />
                    <Animated.View
                        style={[
                            styles.ring,
                            styles.ring2,
                            { transform: [{ rotate: ring2Rotate }] },
                        ]}
                    />
                </View>

                {/* Knot Text */}
                <Text style={styles.logoText}>Knot</Text>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoContainer: {
        alignItems: 'center',
    },
    ringsContainer: {
        width: 80,
        height: 80,
        position: 'relative',
        marginBottom: 24,
    },
    ring: {
        position: 'absolute',
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 4,
        borderColor: colors.primary,
    },
    ring1: {
        top: 0,
        left: 0,
    },
    ring2: {
        bottom: 0,
        right: 0,
    },
    logoText: {
        ...typography.styles.h1,
        color: colors.text.main,
        fontSize: 36,
        letterSpacing: -1,
    },
});
