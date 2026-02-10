import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Easing,
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography } from '../../design';
import { useAuth } from '../../contexts/AuthContext';

export function WelcomeLoadingScreen() {
    const { devBypassAuth } = useAuth();

    // Animation values
    const logoScale = useRef(new Animated.Value(0.8)).current;
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const textOpacity = useRef(new Animated.Value(0)).current;
    const containerOpacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Phase 1: Logo fades in and scales up
        Animated.parallel([
            Animated.timing(logoOpacity, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.spring(logoScale, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }),
        ]).start(() => {
            // Phase 2: Show welcome text
            Animated.timing(textOpacity, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }).start(() => {
                // Phase 3: Fade out and complete auth
                setTimeout(() => {
                    Animated.timing(containerOpacity, {
                        toValue: 0,
                        duration: 400,
                        useNativeDriver: true,
                    }).start(() => {
                        // Complete auth to trigger navigation to Main
                        devBypassAuth();
                    });
                }, 800);
            });
        });
    }, []);

    return (
        <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
            <LinearGradient
                colors={['#DBEAFE', '#E0F2FE', '#F8FAFC']}
                locations={[0, 0.4, 0.7]}
                style={styles.gradient}
            >
                <View style={styles.content}>
                    {/* Logo */}
                    <Animated.View
                        style={[
                            styles.logoContainer,
                            {
                                opacity: logoOpacity,
                                transform: [{ scale: logoScale }],
                            }
                        ]}
                    >
                        <Image
                            source={require('../../../assets/knot-logo.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </Animated.View>

                    {/* Welcome Text */}
                    <Animated.View style={[styles.textContainer, { opacity: textOpacity }]}>
                        <Text style={styles.welcomeText}>Welcome to Knot</Text>
                    </Animated.View>
                </View>
            </LinearGradient>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    gradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
    },
    logoContainer: {
        width: 120,
        height: 120,
        marginBottom: 32,
    },
    logo: {
        width: 120,
        height: 120,
    },
    textContainer: {
        alignItems: 'center',
    },
    welcomeText: {
        fontSize: 32,
        fontWeight: '700',
        color: colors.text.main,
        letterSpacing: -0.5,
    },
});
