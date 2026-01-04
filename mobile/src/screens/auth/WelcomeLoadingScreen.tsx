import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Easing,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography } from '../../design';
import type { RootStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Same geometry as KnotLogo component
const VIEWBOX = 100;
const STROKE_WIDTH = 6;
const CIRCLE_RADIUS = 28;
const CIRCLE1_CX = CIRCLE_RADIUS + STROKE_WIDTH / 2; // 31
const CIRCLE1_CY = CIRCLE_RADIUS + STROKE_WIDTH / 2; // 31
const CIRCLE2_CX = VIEWBOX - CIRCLE_RADIUS - STROKE_WIDTH / 2; // 69
const CIRCLE2_CY = VIEWBOX - CIRCLE_RADIUS - STROKE_WIDTH / 2; // 69

export function WelcomeLoadingScreen() {
    const navigation = useNavigation<NavigationProp>();

    // Animation values for circle positions
    const splitOffset = useRef(new Animated.Value(0)).current;
    const textOpacity = useRef(new Animated.Value(0)).current;
    const containerOpacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Phase 0: Show logo together for 1 second before splitting
        const initialDelay = setTimeout(() => {
            // Phase 1: Circles split apart
            Animated.timing(splitOffset, {
                toValue: 30,
                duration: 800,
                easing: Easing.out(Easing.back(1.5)),
                useNativeDriver: false,
            }).start(() => {
                // Phase 2: Show welcome text
                Animated.timing(textOpacity, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }).start(() => {
                    // Phase 3: Fade out and navigate
                    setTimeout(() => {
                        Animated.timing(containerOpacity, {
                            toValue: 0,
                            duration: 400,
                            useNativeDriver: true,
                        }).start(() => {
                            // Navigate to Main
                            navigation.reset({
                                index: 0,
                                routes: [{ name: 'Main' }],
                            });
                        });
                    }, 800);
                });
            });
        }, 1000);

        return () => clearTimeout(initialDelay);
    }, []);

    // Interpolate circle positions
    const circle1Cx = splitOffset.interpolate({
        inputRange: [0, 30],
        outputRange: [CIRCLE1_CX, CIRCLE1_CX - 20],
    });
    const circle1Cy = splitOffset.interpolate({
        inputRange: [0, 30],
        outputRange: [CIRCLE1_CY, CIRCLE1_CY - 20],
    });
    const circle2Cx = splitOffset.interpolate({
        inputRange: [0, 30],
        outputRange: [CIRCLE2_CX, CIRCLE2_CX + 20],
    });
    const circle2Cy = splitOffset.interpolate({
        inputRange: [0, 30],
        outputRange: [CIRCLE2_CY, CIRCLE2_CY + 20],
    });

    // Create animated circle components
    const AnimatedSvg = Animated.createAnimatedComponent(Svg);

    return (
        <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
            <LinearGradient
                colors={['#DBEAFE', '#E0F2FE', '#F8FAFC']}
                locations={[0, 0.4, 0.7]}
                style={styles.gradient}
            >
                <View style={styles.content}>
                    {/* Static SVG - animation via re-render */}
                    <Animated.View style={styles.logoContainer}>
                        <AnimatedLogoCircles
                            circle1Cx={circle1Cx}
                            circle1Cy={circle1Cy}
                            circle2Cx={circle2Cx}
                            circle2Cy={circle2Cy}
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

// Separate component for animated circles (needs useNativeDriver: false)
function AnimatedLogoCircles({
    circle1Cx,
    circle1Cy,
    circle2Cx,
    circle2Cy,
}: {
    circle1Cx: Animated.AnimatedInterpolation<number>;
    circle1Cy: Animated.AnimatedInterpolation<number>;
    circle2Cx: Animated.AnimatedInterpolation<number>;
    circle2Cy: Animated.AnimatedInterpolation<number>;
}) {
    const AnimatedCircle = Animated.createAnimatedComponent(Circle);

    return (
        <Svg width={160} height={160} viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}>
            <AnimatedCircle
                cx={circle1Cx}
                cy={circle1Cy}
                r={CIRCLE_RADIUS}
                stroke={colors.primary}
                strokeWidth={STROKE_WIDTH}
                fill="none"
            />
            <AnimatedCircle
                cx={circle2Cx}
                cy={circle2Cy}
                r={CIRCLE_RADIUS}
                stroke={colors.primary}
                strokeWidth={STROKE_WIDTH}
                fill="none"
            />
        </Svg>
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
        width: 160,
        height: 160,
        marginBottom: 32,
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
