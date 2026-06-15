import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius, shadows, fonts, useTheme, useThemedStyles, Palette } from '../theme';
import { displayDate } from '../utils/date';
import { WeightEntry } from '../types';

const CHART_HEIGHT = 120;

interface Props {
  /** Pesagens em ordem decrescente de data (mais recente primeiro). */
  weights: WeightEntry[];
  title?: string;
}

export function WeightChart({ weights, title = 'Evolução' }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  // Ordem cronológica para o gráfico.
  const data = [...weights].reverse();
  if (data.length < 2) return null;

  const values = data.map(w => w.weightKg);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  const range = max - min || 1;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>{title}</Text>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Mínimo</Text>
          <Text style={styles.statValue}>{min.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Média</Text>
          <Text style={styles.statValue}>{avg.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Máximo</Text>
          <Text style={styles.statValue}>{max.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.bars}>
          {data.map((w, i) => {
            const ratio = 0.25 + (0.75 * (w.weightKg - min)) / range;
            const delta = i > 0 ? w.weightKg - data[i - 1].weightKg : null;
            return (
              <View key={w.id} style={styles.barColumn}>
                {delta !== null && Math.abs(delta) >= 0.01 ? (
                  <View style={styles.deltaRow}>
                    <Ionicons
                      name={delta > 0 ? 'arrow-up' : 'arrow-down'}
                      size={9}
                      color={delta > 0 ? colors.warning : colors.success}
                    />
                    <Text style={[styles.deltaText, { color: delta > 0 ? colors.warning : colors.success }]}>
                      {Math.abs(delta).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.deltaRow} />
                )}
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
    ...shadows.sm,
  },
  title: { fontSize: 13, fontFamily: fonts.textSemibold, fontWeight: '600', color: colors.textSubtle },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statItem: { alignItems: 'center', gap: 2 },
  statLabel: { fontSize: 10, fontFamily: fonts.text, color: colors.textMuted },
  statValue: { fontSize: 13, fontFamily: fonts.textBold, fontWeight: '700', color: colors.text },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  barColumn: { alignItems: 'center', gap: 4, width: 44 },
  bar: {
    width: 22,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  barValue: { fontSize: 11, fontFamily: fonts.textSemibold, color: colors.textSubtle, fontWeight: '600' },
  barLabel: { fontSize: 10, fontFamily: fonts.text, color: colors.textMuted },
  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 12 },
  deltaText: { fontSize: 10, fontFamily: fonts.textSemibold, fontWeight: '600' },
});
