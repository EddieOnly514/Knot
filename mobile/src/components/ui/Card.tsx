import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, borderRadius, shadows } from '../../design';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  padding?: keyof typeof spacing;
  onPress?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  elevated = true,
  padding = 'lg',
}) => {
  return (
    <View
      style={[
        styles.container,
        elevated && shadows.card,
        { padding: spacing[padding] },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface.elevated,
    borderRadius: borderRadius.lg,
  },
});