import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius } from '../theme';
import { getRecords, getWeights } from '../storage';
import { RECORD_TYPE_LABELS, RECORD_TYPE_COLORS, RECORD_TYPE_ICONS } from '../labels';
import { WeightChart } from '../components/WeightChart';
import { MedicalRecord, WeightEntry, RecordType, RootStackParamList } from '../types';

type Route = RouteProp<RootStackParamList, 'Stats'>;

const TYPES: RecordType[] = ['vaccine', 'consultation', 'medication', 'deworming', 'note'];

export default function StatsScreen() {
  const navigation = useNavigation();
  const { petId } = useRoute<Route>().params;
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [weights, setWeights] = useState<WeightEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      Promise.all([getRecords(petId).then(setRecords), getWeights(petId).then(setWeights)]).catch(
        () => Alert.alert('Erro', 'Não foi possível carregar as estatísticas.'),
      );
    }, [petId]),
  );

  const counts = TYPES.map(type => ({
    type,
    count: records.filter(r => r.type === type).length,
  }));
  const maxCount = Math.max(1, ...counts.map(c => c.count));
  const total = records.length + weights.length;

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
        <Text style={styles.headerTitle}>Estatísticas</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.totalCard}>
          <Text style={styles.totalValue}>{total}</Text>
          <Text style={styles.totalLabel}>
            {total === 1 ? 'registro no prontuário' : 'registros no prontuário'}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Registros por tipo</Text>
          {counts.map(({ type, count }) => (
            <View key={type} style={styles.barRow}>
              <View style={styles.barLabelWrapper}>
                <Ionicons name={RECORD_TYPE_ICONS[type]} size={13} color={RECORD_TYPE_COLORS[type]} />
                <Text style={styles.barLabel}>{RECORD_TYPE_LABELS[type]}</Text>
              </View>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      backgroundColor: RECORD_TYPE_COLORS[type],
                      width: `${Math.max(3, (count / maxCount) * 100)}%`,
                      opacity: count === 0 ? 0.15 : 1,
                    },
                  ]}
                />
              </View>
              <Text style={styles.barCount}>{count}</Text>
            </View>
          ))}
          <View style={styles.barRow}>
            <View style={styles.barLabelWrapper}>
              <Ionicons name="scale" size={13} color={colors.primaryLight} />
              <Text style={styles.barLabel}>Pesagens</Text>
            </View>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    backgroundColor: colors.primaryLight,
                    width: `${Math.max(3, (weights.length / Math.max(maxCount, weights.length)) * 100)}%`,
                    opacity: weights.length === 0 ? 0.15 : 1,
                  },
                ]}
              />
            </View>
            <Text style={styles.barCount}>{weights.length}</Text>
          </View>
        </View>

        {weights.length >= 2 ? (
          <WeightChart weights={weights} title="Evolução de peso" />
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Evolução de peso</Text>
            <Text style={styles.hint}>
              Registre pelo menos duas pesagens para ver o gráfico de evolução.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: 48 },
  totalCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  totalValue: { fontSize: 40, fontWeight: '700', color: colors.primaryLight },
  totalLabel: { fontSize: 13, color: colors.textMuted },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTitle: { fontSize: 13, fontWeight: '600', color: colors.textSubtle, marginBottom: spacing.xs },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barLabelWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    width: 104,
  },
  barLabel: { fontSize: 12, color: colors.textSubtle },
  barTrack: {
    flex: 1,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 7 },
  barCount: { width: 24, fontSize: 13, fontWeight: '600', color: colors.text, textAlign: 'right' },
  hint: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
});
