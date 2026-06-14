import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius, useTheme, useThemedStyles, Palette } from '../theme';
import { SPECIES_LABELS } from '../labels';
import { calcAge } from '../utils/date';
import { Pet } from '../types';

interface Props {
  pet: Pet;
  subtitle?: string;
  activeMeds?: number;
  pendingAlerts?: number;
  onPress: () => void;
}

export const PetCard = React.memo(function PetCard({ pet, subtitle, activeMeds, pendingAlerts, onPress }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.photoWrapper}>
        {pet.photo ? (
          <Image source={{ uri: pet.photo }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Image
              source={require('../../assets/icons/paw.png')}
              style={styles.placeholderPaw}
              resizeMode="contain"
            />
          </View>
        )}
      </View>

      <View style={styles.cardInfo}>
        <Text style={styles.petName}>{pet.name}</Text>
        <Text style={styles.petSubtitle}>
          {subtitle ??
            `${SPECIES_LABELS[pet.species]}${pet.breed ? ` · ${pet.breed}` : ''}${
              pet.birthDate ? ` · ${calcAge(pet.birthDate)}` : ''
            }`}
        </Text>
      </View>

      {!!pendingAlerts && (
        <View style={[styles.badge, { backgroundColor: colors.warning + '22' }]}>
          <Ionicons name="notifications" size={12} color={colors.warning} />
          <Text style={[styles.badgeText, { color: colors.warning }]}>{pendingAlerts}</Text>
        </View>
      )}
      {!!activeMeds && (
        <View style={[styles.badge, { backgroundColor: colors.accent + '22' }]}>
          <Ionicons name="medkit" size={12} color={colors.accent} />
          <Text style={[styles.badgeText, { color: colors.accent }]}>{activeMeds}</Text>
        </View>
      )}

      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
});

const createStyles = (colors: Palette) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  photoWrapper: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  photo: {
    width: 64,
    height: 64,
  },
  photoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderPaw: {
    width: 32,
    height: 32,
  },
  cardInfo: {
    flex: 1,
    gap: 3,
  },
  petName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  petSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
