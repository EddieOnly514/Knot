import React from 'react';
import { View } from 'react-native';
import Svg, { Rect, Circle, Path } from 'react-native-svg';

interface KnotLogoProps {
  size?: number;
  color?: string;
}

export const KnotLogo: React.FC<KnotLogoProps> = ({
  size = 100,
  color = '#0057FF'
}) => {
  // Scale the SVG proportionally
  const scale = size / 200;
  const scaledSize = 200 * scale;

  return (
    <View style={{ width: size, height: size }}>
      <Svg
        width={scaledSize}
        height={scaledSize}
        viewBox="0 0 200 200"
        fill="none"
      >
        <Rect width="200" height="200" fill="#FFFFFF" />

        <Circle
          cx="100"
          cy="100"
          r="70"
          stroke={color}
          strokeWidth="18"
          strokeLinecap="round"
        />

        <Circle
          cx="100"
          cy="100"
          r="35"
          stroke={color}
          strokeWidth="18"
          strokeLinecap="round"
        />

        <Path
          d="M100 135 L100 170"
          stroke={color}
          strokeWidth="18"
          strokeLinecap="round"
        />

        <Path
          d="M100 30 L100 65"
          stroke={color}
          strokeWidth="18"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
};