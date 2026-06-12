import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius, useTheme, useThemedStyles, Palette } from '../theme';
import { displayDate } from '../utils/date';
import { WeightEntry } from '../types';

interface Props {
  /** Pesagens em ordem decrescente de data (mais recente primeiro). */
  weights: WeightEntry[];
}

export function WeightCard({ weights }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const latest = weights[0];
  const previous = weights[1];
  const diff = latest && previous ? latest.weightKg - previous.weightKg : null;

  return (
    <View style={styles.card}>
      <View style={styles.iconWrapper}>
        <Ionicons name="scale" size={20} color={colors.primaryLight} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>Último peso</Text>
        <Text style={styles.value}>
          {latest ? `${latest.weightKg.toLocaleString('pt-BR')} kg` : '—'}
        </Text>
        {latest ? <Text style={styles.date}>{displayDate(latest.date)}</Text> : null}
      </View>
      {diff !== null && (
        <View style={styles.diffWrapper}>
          <Ionicons
            name={diff === 0 ? 'remove' : diff > 0 ? 'trending-up' : 'trending-down'}
            size={16}
            color={diff === 0 ? colors.textMuted : diff > 0 ? colors.warning : colors.success}
          />
          <Text
            style={[
              styles.diff,
              { color: diff === 0 ? colors.textMuted : diff > 0 ? colors.warning : colors.success },
            ]}
          >
            {diff > 0 ? '+' : ''}
            {diff.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg
          </Text>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 12, color: colors.textMuted },
  value: { fontSize: 20, fontWeight: '700', color: colors.text },
  date: { fontSize: 12, color: colors.textMuted },
  diffWrapper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  diff: { fontSize: 14, fontWeight: '600' },
});
