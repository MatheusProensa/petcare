import React from 'react';
import { View, Text, TextInput, TextInputProps, StyleSheet } from 'react-native';
import { spacing, radius, fonts, useTheme, useThemedStyles, Palette } from '../theme';

interface Props extends TextInputProps {
  label: string;
}

export function Input({ label, style, ...props }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, props.multiline && styles.multiline, style]}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.primaryLight}
        {...props}
      />
    </View>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  wrapper: { gap: spacing.xs },
  label: {
    fontSize: 13,
    fontFamily: fonts.textMedium,
    fontWeight: '500',
    color: colors.textSubtle,
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    color: colors.text,
    fontSize: 15,
    fontFamily: fonts.text,
  },
  multiline: {
    minHeight: 100,
    paddingTop: spacing.sm + 4,
    textAlignVertical: 'top',
  },
});
