import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { spacing, radius, useTheme, useThemedStyles, Palette } from '../theme';
import { getWeights } from '../storage';
import { displayDate } from '../utils/date';
import { WeightCard } from '../components/WeightCard';
import { WeightChart } from '../components/WeightChart';
import { EmptyState } from '../components/EmptyState';
import { ThemeToggle } from '../components/ThemeToggle';
import { WeightEntry, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Weight'>;
type Route = RouteProp<RootStackParamList, 'Weight'>;

export default function WeightScreen() {
  const navigation = useNavigation<Nav>();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { petId } = useRoute<Route>().params;
  const [weights, setWeights] = useState<WeightEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      getWeights(petId)
        .then(setWeights)
        .catch(() => Alert.alert('Erro', 'Não foi possível carregar as pesagens.'));
    }, [petId]),
  );

  function renderEntry({ item, index }: { item: WeightEntry; index: number }) {
    const previous = weights[index + 1];
    const diff = previous ? item.weightKg - previous.weightKg : null;
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => navigation.navigate('AddWeight', { petId, weightId: item.id })}
        activeOpacity={0.7}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.rowWeight}>{item.weightKg.toLocaleString('pt-BR')} kg</Text>
          <Text style={styles.rowDate}>{displayDate(item.date)}</Text>
        </View>
        {diff !== null && (
          <Text
            style={[
              styles.rowDiff,
              { color: diff === 0 ? colors.textMuted : diff > 0 ? colors.warning : colors.success },
            ]}
          >
            {diff > 0 ? '+' : ''}
            {diff.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg
          </Text>
        )}
        <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
      </TouchableOpacity>
    );
  }

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
        <Text style={styles.headerTitle}>Controle de Peso</Text>
        <View style={styles.headerActions}>
        <ThemeToggle size={20} />
        <TouchableOpacity
          onPress={() => navigation.navigate('AddWeight', { petId })}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Nova pesagem"
        >
          <Ionicons name="add" size={26} color={colors.primaryLight} />
        </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={weights}
        keyExtractor={item => item.id}
        renderItem={renderEntry}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          weights.length > 0 ? (
            <View style={styles.summary}>
              <WeightCard weights={weights} />
              <WeightChart weights={weights} />
              <Text style={styles.sectionTitle}>Histórico completo</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyWrapper}>
            <EmptyState
              image={require('../../assets/icons/heart.png')}
              title="Nenhuma pesagem registrada"
              text="Toque em + para registrar o primeiro peso e acompanhar a evolução."
            />
          </View>
        }
      />
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
  headerTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 48 },
  summary: { gap: spacing.md, marginBottom: spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: spacing.sm },
  emptyWrapper: { paddingTop: spacing.xxl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowWeight: { fontSize: 16, fontWeight: '600', color: colors.text },
  rowDate: { fontSize: 12, color: colors.textMuted },
  rowDiff: { fontSize: 13, fontWeight: '600' },
});
