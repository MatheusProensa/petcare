import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius, shadows, fonts, useTheme, useThemedStyles, Palette } from '../theme';
import { MedicalProfile } from '../types';

interface Props {
  profile?: MedicalProfile;
  onPress: () => void;
}

export function MedicalProfileCard({ profile, onPress }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const filled =
    profile &&
    (profile.allergies ||
      profile.chronicConditions ||
      profile.bloodType ||
      profile.vetName ||
      profile.notes ||
      profile.neutered !== undefined);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.iconWrapper}>
        <Ionicons name="fitness" size={18} color={colors.danger} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Perfil Médico</Text>
        {filled ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {[
              profile?.neutered ? 'Castrado' : undefined,
              profile?.allergies ? `Alergias: ${profile.allergies}` : undefined,
              profile?.chronicConditions,
              profile?.vetName,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        ) : (
          <Text style={styles.subtitle}>Toque para preencher alergias, doenças e veterinário</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </TouchableOpacity>
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
    ...shadows.sm,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 14, fontFamily: fonts.textSemibold, fontWeight: '600', color: colors.text },
  subtitle: { fontSize: 12, fontFamily: fonts.text, color: colors.textMuted, marginTop: 2 },
});
