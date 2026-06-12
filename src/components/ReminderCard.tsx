import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius, useTheme, useThemedStyles, Palette } from '../theme';
import { RECORD_TYPE_ICONS } from '../labels';
import { displayDate, formatDaysUntil } from '../utils/date';
import { UpcomingEvent } from '../services/events';

interface Props {
  event: UpcomingEvent;
  onPress: () => void;
}

export function ReminderCard({ event, onPress }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const color = event.overdue
    ? colors.danger
    : event.daysUntil <= 3
      ? colors.warning
      : colors.primaryLight;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.iconWrapper, { backgroundColor: color + '18' }]}>
        <Ionicons name={RECORD_TYPE_ICONS[event.type]} size={16} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.petName}>{event.petName}</Text>
        <Text style={styles.title} numberOfLines={1}>
          {event.title}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.when, { color }]}>
          {event.overdue ? `atrasado ${formatDaysUntil(event.daysUntil)}` : formatDaysUntil(event.daysUntil)}
        </Text>
        <Text style={styles.date}>{displayDate(event.date)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petName: { fontSize: 12, color: colors.textMuted },
  title: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 1 },
  right: { alignItems: 'flex-end', gap: 2 },
  when: { fontSize: 12, fontWeight: '600' },
  date: { fontSize: 11, color: colors.textMuted },
});
