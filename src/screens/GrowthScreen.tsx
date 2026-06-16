import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { spacing, radius, typography, fonts, shadows, useTheme, useThemedStyles, Palette } from '../theme';
import { petsRepository } from '../repositories/petsRepository';
import { weightsRepository } from '../repositories/weightsRepository';
import { displayDate, formatDuration } from '../utils/date';
import { WeightChart } from '../components/WeightChart';
import { EmptyState } from '../components/EmptyState';
import { ThemeToggle } from '../components/ThemeToggle';
import { Pet, WeightEntry, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Growth'>;
type Route = RouteProp<RootStackParamList, 'Growth'>;

export default function GrowthScreen() {
  const navigation = useNavigation<Nav>();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { petId } = useRoute<Route>().params;
  const [pet, setPet] = useState<Pet | null>(null);
  const [weights, setWeights] = useState<WeightEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      Promise.all([
        petsRepository.getAll().then(pets => setPet(pets.find(p => p.id === petId) ?? null)),
        weightsRepository.getByPet(petId).then(setWeights),
      ]).catch(() => Alert.alert('Erro', 'Não foi possível carregar a evolução de peso.'));
    }, [petId]),
  );

  // weights vem em ordem decrescente (mais recente primeiro).
  const latest = weights[0];
  const oldest = weights[weights.length - 1];
  const hasEnoughData = weights.length >= 2;
  const totalDiff = hasEnoughData ? latest.weightKg - oldest.weightKg : null;
  const totalDiffPercent =
    hasEnoughData && oldest.weightKg !== 0 ? (totalDiff! / oldest.weightKg) * 100 : null;
  const trackingDuration = oldest ? formatDuration(oldest.date) : '';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Crescimento{pet ? ` · ${pet.name}` : ''}</Text>
        <ThemeToggle size={20} />
      </View>

      {hasEnoughData ? (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          <View style={styles.cardsRow}>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Peso inicial</Text>
              <Text style={styles.cardValue}>{oldest.weightKg.toLocaleString('pt-BR')} kg</Text>
              <Text style={styles.cardSub}>{displayDate(oldest.date)}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Peso atual</Text>
              <Text style={styles.cardValue}>{latest.weightKg.toLocaleString('pt-BR')} kg</Text>
              <Text style={styles.cardSub}>{displayDate(latest.date)}</Text>
            </View>
          </View>

          <View style={styles.cardsRow}>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Variação total</Text>
              <Text
                style={[
                  styles.cardValue,
                  {
                    color:
                      totalDiff === 0
                        ? colors.text
                        : totalDiff! > 0
                        ? colors.warning
                        : colors.success,
                  },
                ]}
              >
                {totalDiff! > 0 ? '+' : ''}
                {totalDiff!.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg
              </Text>
              {totalDiffPercent !== null && (
                <Text style={styles.cardSub}>
                  {totalDiffPercent > 0 ? '+' : ''}
                  {totalDiffPercent.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
                </Text>
              )}
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Pesagens</Text>
              <Text style={styles.cardValue}>{weights.length}</Text>
              <Text style={styles.cardSub}>desde {displayDate(oldest.date)}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Tempo de acompanhamento</Text>
            <Text style={styles.cardValue}>{trackingDuration}</Text>
          </View>

          <WeightChart weights={weights} title="Evolução completa" />
        </ScrollView>
      ) : (
        <View style={styles.emptyWrapper}>
          <EmptyState
            icon="trending-up-outline"
            title="Acompanhamento em construção"
            text="Registre pelo menos duas pesagens para ver o crescimento do seu pet ao longo do tempo."
          />
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddWeight', { petId })}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color={colors.onPrimary} />
            <Text style={styles.addButtonText}>Registrar peso</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: { fontSize: typography.h4.fontSize, fontWeight: typography.h4.fontWeight, fontFamily: fonts.display, color: colors.text },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 48, gap: spacing.md },
  cardsRow: { flexDirection: 'row', gap: spacing.md },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
    ...shadows.sm,
  },
  cardLabel: { fontSize: 12, fontFamily: fonts.text, color: colors.textMuted },
  cardValue: { fontSize: 20, fontWeight: '800', fontFamily: fonts.displayExtra, color: colors.text },
  cardSub: { fontSize: 12, fontFamily: fonts.text, color: colors.textMuted },
  emptyWrapper: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    marginTop: spacing.md,
    shadowColor: colors.primary,
    ...shadows.sm,
  },
  addButtonText: { color: colors.onPrimary, fontFamily: fonts.textBold, fontWeight: '700', fontSize: 14 },
});
