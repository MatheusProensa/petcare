import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius, useTheme, useThemedStyles, Palette } from '../theme';
import { RECORD_TYPE_LABELS, recordTypeColors, RECORD_TYPE_ICONS } from '../labels';
import { displayDate } from '../utils/date';
import { MedicalRecord } from '../types';

interface Props {
  record: MedicalRecord;
  petName?: string;
  onPress: () => void;
}

export function HealthRecordCard({ record, petName, onPress }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const color = recordTypeColors(colors)[record.type];
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.top}>
        <View style={[styles.badge, { backgroundColor: color + '22' }]}>
          <Ionicons name={RECORD_TYPE_ICONS[record.type]} size={11} color={color} />
          <Text style={[styles.badgeText, { color }]}>{RECORD_TYPE_LABELS[record.type]}</Text>
        </View>
        <Text style={styles.date}>{displayDate(record.date)}</Text>
      </View>
      <Text style={styles.title}>{record.title}</Text>
      {petName ? <Text style={styles.petName}>🐾 {petName}</Text> : null}
      {record.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {record.description}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  badgeText: { fontSize: 11, fontWeight: '600' },
  date: { fontSize: 12, color: colors.textMuted },
  title: { fontSize: 15, fontWeight: '600', color: colors.text },
  petName: { fontSize: 12, color: colors.textSubtle },
  description: { fontSize: 13, color: colors.textSubtle, lineHeight: 19 },
});
