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
import type { RootStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function WelcomeLoadingScreen() {
    const navigation = useNavigation<NavigationProp>();

    // Animation values
    const ring1X = useRef(new Animated.Value(0)).current;
    const ring2X = useRef(new Animated.Value(0)).current;
    const ring1Scale = useRef(new Animated.Value(1)).current;
    const ring2Scale = useRef(new Animated.Value(1)).current;
    const textOpacity = useRef(new Animated.Value(0)).current;
    const containerOpacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Phase 1: Rings "open up" - move apart and scale up
        Animated.parallel([
            Animated.timing(ring1X, {
                toValue: -25,
                duration: 700,
                easing: Easing.out(Easing.back(1.2)),
                useNativeDriver: true,
            }),
            Animated.timing(ring2X, {
                toValue: 25,
                duration: 700,
                easing: Easing.out(Easing.back(1.2)),
                useNativeDriver: true,
            }),
            Animated.timing(ring1Scale, {
                toValue: 1.3,
                duration: 700,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(ring2Scale, {
                toValue: 1.3,
                duration: 700,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start(() => {
            // Phase 2: Show welcome text
            Animated.timing(textOpacity, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }).start(() => {
                // Phase 3: Fade out and navigate
                setTimeout(() => {
                    Animated.timing(containerOpacity, {
                        toValue: 0,
                        duration: 300,
                        useNativeDriver: true,
                    }).start(() => {
                        // Navigate to Main
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'Main' }],
                        });
                    });
                }, 600);
            });
        });
    }, []);

    return (
        <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
            <View style={styles.content}>
                {/* Animated Rings */}
                <View style={styles.ringsContainer}>
                    <Animated.View
                        style={[
                            styles.ring,
                            {
                                transform: [
                                    { translateX: ring1X },
                                    { scale: ring1Scale },
                                ],
                            },
                        ]}
                    />
                    <Animated.View
                        style={[
                            styles.ring,
                            {
                                transform: [
                                    { translateX: ring2X },
                                    { scale: ring2Scale },
                                ],
                            },
                        ]}
                    />
                </View>

                {/* Welcome Text */}
                <Animated.View style={[styles.textContainer, { opacity: textOpacity }]}>
                    <Text style={styles.welcomeText}>Welcome to</Text>
                    <Text style={styles.knotText}>Knot</Text>
                </Animated.View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
    },
    ringsContainer: {
        width: 140,
        height: 70,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
    },
    ring: {
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 4,
        borderColor: colors.primary,
        marginHorizontal: -8,
    },
    textContainer: {
        alignItems: 'center',
    },
    welcomeText: {
        ...typography.styles.body,
        color: colors.text.muted,
        marginBottom: 4,
    },
    knotText: {
        ...typography.styles.h1,
        color: colors.text.main,
        fontSize: 40,
        letterSpacing: -1,
    },
});
