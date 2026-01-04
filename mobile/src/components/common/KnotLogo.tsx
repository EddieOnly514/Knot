import React from 'react';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../../design';

interface KnotLogoProps {
    size?: 'small' | 'medium' | 'large' | number;
    color?: string;
}

/**
 * Knot Logo - Two diagonal circles that barely touch
 * 
 * The logo consists of two equal circles positioned diagonally:
 * - Top-left circle
 * - Bottom-right circle  
 * - Circles just barely touch in the center (minimal overlap)
 * - Neither circle pokes out from the bounding box
 * 
 * SVG is used for consistent rendering across all screens.
 */
export function KnotLogo({ size = 'medium', color = colors.primary }: KnotLogoProps) {
    // Calculate dimensions based on size
    const sizeValue = typeof size === 'number'
        ? size
        : size === 'small' ? 32 : size === 'medium' ? 48 : 64;

    // Logo geometry:
    // - viewBox is 100x100 for easy calculations
    // - Each circle radius is ~28 (so diameter is 56)
    // - Circles positioned at diagonal corners, just touching
    const viewBox = 100;
    const strokeWidth = 6;
    const circleRadius = 28;

    // Position circles so they just barely touch at center
    // Top-left circle center: offset from top-left by radius + half stroke
    // Bottom-right circle center: offset from bottom-right by radius + half stroke
    const circle1Cx = circleRadius + strokeWidth / 2;
    const circle1Cy = circleRadius + strokeWidth / 2;
    const circle2Cx = viewBox - circleRadius - strokeWidth / 2;
    const circle2Cy = viewBox - circleRadius - strokeWidth / 2;

    return (
        <Svg
            width={sizeValue}
            height={sizeValue}
            viewBox={`0 0 ${viewBox} ${viewBox}`}
        >
            {/* Top-left circle */}
            <Circle
                cx={circle1Cx}
                cy={circle1Cy}
                r={circleRadius}
                stroke={color}
                strokeWidth={strokeWidth}
                fill="none"
            />
            {/* Bottom-right circle */}
            <Circle
                cx={circle2Cx}
                cy={circle2Cy}
                r={circleRadius}
                stroke={color}
                strokeWidth={strokeWidth}
                fill="none"
            />
        </Svg>
    );
}

// Export logo dimensions for reference
export const KNOT_LOGO_SIZES = {
    small: 32,
    medium: 48,
    large: 64,
};
