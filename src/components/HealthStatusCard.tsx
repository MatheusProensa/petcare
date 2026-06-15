import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius, shadows, typography, fonts, useTheme, useThemedStyles, Palette } from '../theme';
import { displayDate } from '../utils/date';
import { UpcomingEvent } from '../services/events';
import { MedicalRecord, WeightEntry, Pet } from '../types';

interface Props {
  records: MedicalRecord[];
  weights: WeightEntry[];
  pets: Pet[];
  events: UpcomingEvent[];
  activeMedsCount: number;
}

interface InfoRow {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}

export function HealthStatusCard({ records, weights, pets, events, activeMedsCount }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const petName = (petId: string): string => pets.find(p => p.id === petId)?.name ?? '';

  const lastVaccine = [...records]
    .filter(r => r.type === 'vaccine')
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const lastConsultation = [...records]
    .filter(r => r.type === 'consultation')
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const lastWeighing = [...weights].sort((a, b) => b.date.localeCompare(a.date))[0];

  const pendingAlerts = events.filter(e => e.pending);
  const hasOverdue = pendingAlerts.some(e => e.overdue);

  const semaphore = hasOverdue ? '🔴' : pendingAlerts.length > 0 ? '🟡' : '🟢';
  const semaphoreLabel = hasOverdue
    ? 'Há itens atrasados'
    : pendingAlerts.length > 0
    ? 'Atenção: itens pendentes'
    : 'Tudo em dia';
  const semaphoreColor = hasOverdue ? colors.danger : pendingAlerts.length > 0 ? colors.warning : colors.success;

  const rows: InfoRow[] = [
    {
      icon: 'shield-checkmark',
      label: 'Última vacina',
      value: lastVaccine ? `${lastVaccine.title} · ${petName(lastVaccine.petId)} · ${displayDate(lastVaccine.date)}` : '—',
    },
    {
      icon: 'medical',
      label: 'Última consulta',
      value: lastConsultation ? `${petName(lastConsultation.petId)} · ${displayDate(lastConsultation.date)}` : '—',
    },
    {
      icon: 'scale',
      label: 'Última pesagem',
      value: lastWeighing
        ? `${lastWeighing.weightKg.toLocaleString('pt-BR')} kg · ${displayDate(lastWeighing.date)}`
        : '—',
    },
    {
      icon: 'medkit',
      label: 'Remédios em uso',
      value: activeMedsCount > 0 ? `${activeMedsCount}` : 'Nenhum',
    },
    {
      icon: 'notifications',
      label: 'Alertas pendentes',
      value: pendingAlerts.length > 0 ? `${pendingAlerts.length}` : 'Nenhum',
    },
  ];

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Saúde Hoje</Text>
        <View style={[styles.semaphore, { backgroundColor: hasOverdue ? colors.dangerSoft : pendingAlerts.length > 0 ? colors.warningSoft : colors.successSoft }]}>
          <Text style={styles.semaphoreEmoji}>{semaphore}</Text>
          <Text style={[styles.semaphoreLabel, { color: semaphoreColor }]}>{semaphoreLabel}</Text>
        </View>
      </View>
      {rows.map(row => (
        <View key={row.label} style={styles.row}>
          <View style={styles.iconWrapper}>
            <Ionicons name={row.icon} size={16} color={colors.primaryLight} />
          </View>
          <Text style={styles.rowLabel}>{row.label}</Text>
          <Text style={styles.rowValue} numberOfLines={1}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  title: { fontSize: typography.h4.fontSize, fontWeight: typography.h4.fontWeight, fontFamily: typography.h4.fontFamily, color: colors.text },
  semaphore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  semaphoreEmoji: { fontSize: 12 },
  semaphoreLabel: { fontSize: 11, fontFamily: fonts.textBold, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconWrapper: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { fontSize: 12, fontFamily: fonts.text, color: colors.textMuted, width: 110 },
  rowValue: { flex: 1, fontSize: 13, fontFamily: fonts.textSemibold, fontWeight: '600', color: colors.text },
});
