import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius, useTheme, useThemedStyles, Palette } from '../theme';
import { SPECIES_LABELS } from '../labels';
import { Pet } from '../types';

interface Props {
  pet: Pet;
  subtitle?: string;
  onPress: () => void;
}

export function PetCard({ pet, subtitle, onPress }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.photoWrapper}>
        {pet.photo ? (
          <Image source={{ uri: pet.photo }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="paw" size={22} color={colors.primaryLight} />
          </View>
        )}
      </View>

      <View style={styles.cardInfo}>
        <Text style={styles.petName}>{pet.name}</Text>
        <Text style={styles.petSubtitle}>
          {subtitle ?? `${SPECIES_LABELS[pet.species]}${pet.breed ? ` · ${pet.breed}` : ''}`}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

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
    width: 54,
    height: 54,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  photo: {
    width: 54,
    height: 54,
  },
  photoPlaceholder: {
    width: 54,
    height: 54,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
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
});
