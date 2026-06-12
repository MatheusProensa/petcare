import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { spacing, radius, useThemedStyles, Palette } from '../theme';
import { displayDate } from '../utils/date';
import { WeightEntry } from '../types';

const CHART_HEIGHT = 120;

interface Props {
  /** Pesagens em ordem decrescente de data (mais recente primeiro). */
  weights: WeightEntry[];
  title?: string;
}

export function WeightChart({ weights, title = 'Evolução' }: Props) {
  const styles = useThemedStyles(createStyles);
  // Ordem cronológica para o gráfico.
  const data = [...weights].reverse();
  if (data.length < 2) return null;

  const values = data.map(w => w.weightKg);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.bars}>
          {data.map(w => {
            const ratio = 0.25 + (0.75 * (w.weightKg - min)) / range;
            return (
              <View key={w.id} style={styles.barColumn}>
                <Text style={styles.barValue}>
                  {w.weightKg.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
                </Text>
                <View style={[styles.bar, { height: CHART_HEIGHT * ratio }]} />
                <Text style={styles.barLabel}>{displayDate(w.date).slice(0, 5)}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  wrapper: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  title: { fontSize: 13, fontWeight: '600', color: colors.textSubtle },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  barColumn: { alignItems: 'center', gap: 4, width: 44 },
  bar: {
    width: 22,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  barValue: { fontSize: 11, color: colors.textSubtle, fontWeight: '600' },
  barLabel: { fontSize: 10, color: colors.textMuted },
});
