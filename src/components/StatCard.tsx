import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius, useTheme, useThemedStyles, Palette } from '../theme';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  color?: string;
  onPress?: () => void;
}

export const StatCard = React.memo(function StatCard({ icon, label, value, color, onPress }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const tint = color ?? colors.primaryLight;
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper style={styles.card} onPress={onPress} activeOpacity={onPress ? 0.8 : undefined}>
      <View style={[styles.iconWrapper, { backgroundColor: tint + '18' }]}>
        <Ionicons name={icon} size={16} color={tint} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </Wrapper>
  );
});

const createStyles = (colors: Palette) => StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  iconWrapper: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { fontSize: 22, fontWeight: '700', color: colors.text },
  label: { fontSize: 11, color: colors.textMuted },
});
