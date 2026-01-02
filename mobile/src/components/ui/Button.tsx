import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../../design';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
  fullWidth = false,
}) => {
  const isDisabled = disabled || loading;

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: borderRadius.lg,
      ...shadows.button,
    };

    // Size styles
    const sizeStyles = {
      small: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        minHeight: 36,
      },
      medium: {
        paddingHorizontal: spacing['2xl'],
        paddingVertical: spacing.md,
        minHeight: 48,
      },
      large: {
        paddingHorizontal: spacing['3xl'],
        paddingVertical: spacing.lg,
        minHeight: 56,
      },
    };

    // Variant styles
    const variantStyles = {
      primary: {
        backgroundColor: isDisabled ? colors.button.disabled : colors.button.primary,
      },
      secondary: {
        backgroundColor: isDisabled ? colors.button.disabled : colors.button.secondary,
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: isDisabled ? colors.button.disabled : colors.button.primary,
      },
      ghost: {
        backgroundColor: 'transparent',
        ...shadows.none,
      },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...(fullWidth && { width: '100%' }),
      ...style,
    };
  };

  const getTextStyle = (): TextStyle => {
    const sizeStyles = {
      small: typography.styles.bodySmall,
      medium: typography.styles.button,
      large: typography.styles.buttonLarge,
    };

    const variantStyles = {
      primary: {
        color: isDisabled ? colors.button.disabledText : colors.button.primaryText,
      },
      secondary: {
        color: isDisabled ? colors.button.disabledText : colors.button.secondaryText,
      },
      outline: {
        color: isDisabled ? colors.button.disabledText : colors.button.primary,
      },
      ghost: {
        color: isDisabled ? colors.button.disabledText : colors.button.primary,
      },
    };

    return {
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...textStyle,
    };
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={getButtonStyle()}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? colors.text.white : colors.primary}
          size="small"
        />
      ) : (
        <>
          {icon && icon}
          <Text style={getTextStyle()}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    // Base styles are applied dynamically
  },
});