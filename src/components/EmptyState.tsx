import React from 'react';
import { View, Text, StyleSheet, Image, ImageSourcePropType } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius, useTheme, useThemedStyles, Palette } from '../theme';

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  image?: ImageSourcePropType;
  title: string;
  text?: string;
}

export function EmptyState({ icon, image, title, text }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container}>
      <View style={styles.iconWrapper}>
        {image ? (
          <Image source={image} style={styles.image} resizeMode="contain" />
        ) : icon ? (
          <Ionicons name={icon} size={36} color={colors.primaryLight} />
        ) : null}
      </View>
      <Text style={styles.title}>{title}</Text>
      {text ? <Text style={styles.text}>{text}</Text> : null}
    </View>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  image: {
    width: 46,
    height: 46,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  text: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
