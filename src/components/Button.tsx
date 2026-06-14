import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, typography, useThemedStyles, Palette } from '../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';

interface ButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
}

export function Button({
  label,
  icon,
  loading,
  disabled,
  variant = 'primary',
  onPress,
  accessibilityLabel,
  ...rest
}: ButtonProps) {
  const styles = useThemedStyles(createStyles);
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[styles.base, styles[variant], isDisabled && styles.disabled]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={textColor(variant, styles)} size="small" />
      ) : (
        <View style={styles.content}>
          {icon ? (
            <Ionicons name={icon} size={18} color={textColor(variant, styles)} />
          ) : null}
          <Text style={[styles.label, styles[`${variant}Text` as const]]}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function textColor(variant: ButtonVariant, styles: ReturnType<typeof createStyles>): string {
  return (styles[`${variant}Text` as const] as { color: string }).color;
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    base: {
      width: '100%',
      borderRadius: radius.md,
      paddingVertical: spacing.md - 2,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    label: {
      fontSize: typography.h4.fontSize,
      fontWeight: typography.h4.fontWeight,
    },
    disabled: { opacity: 0.6 },

    primary: {
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 6,
    },
    primaryText: { color: colors.onPrimary },

    secondary: {
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    secondaryText: { color: colors.primary },

    destructive: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.danger,
    },
    destructiveText: { color: colors.danger },

    ghost: {
      backgroundColor: 'transparent',
    },
    ghostText: { color: colors.primaryLight },
  });
