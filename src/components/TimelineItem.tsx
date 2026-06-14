import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius, useThemedStyles, Palette } from '../theme';

export interface TimelineBadge {
  label: string;
  color: string;
}

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  dateLabel: string;
  title: string;
  lines?: string[];
  badge?: TimelineBadge;
  isLast?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}

export const TimelineItem = React.memo(function TimelineItem({
  icon,
  color,
  dateLabel,
  title,
  lines,
  badge,
  isLast,
  onPress,
  onLongPress,
}: Props) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.row}>
      <View style={styles.rail}>
        <View style={[styles.dot, { backgroundColor: color + '22', borderColor: color }]}>
          <Ionicons name={icon} size={13} color={color} />
        </View>
        {!isLast && <View style={styles.line} />}
      </View>

      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={onPress || onLongPress ? 0.8 : 1}
        disabled={!onPress && !onLongPress}
      >
        <View style={styles.cardTop}>
          <Text style={styles.date}>{dateLabel}</Text>
          {badge ? (
            <View style={[styles.badge, { backgroundColor: badge.color + '22' }]}>
              <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.title}>{title}</Text>
        {lines?.map((line, i) => (
          <Text key={i} style={styles.line2}>
            {line}
          </Text>
        ))}
      </TouchableOpacity>
    </View>
  );
});

const createStyles = (colors: Palette) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
  },
  rail: {
    width: 36,
    alignItems: 'center',
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginLeft: spacing.sm,
    marginBottom: spacing.sm,
    gap: 3,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  date: {
    fontSize: 12,
    color: colors.textMuted,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  line2: {
    fontSize: 13,
    color: colors.textSubtle,
    lineHeight: 19,
  },
});
