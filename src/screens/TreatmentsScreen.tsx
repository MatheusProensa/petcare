import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, SectionList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { spacing, radius, typography, useTheme, useThemedStyles, Palette } from '../theme';
import { recordsRepository } from '../repositories/recordsRepository';
import { displayDate } from '../utils/date';
import { isActiveMedication } from '../services/events';
import { FREQUENCY_LABELS, RECORD_TYPE_LABELS, RECORD_TYPE_ICONS, recordTypeColors } from '../labels';
import { EmptyState } from '../components/EmptyState';
import { ThemeToggle } from '../components/ThemeToggle';
import { MedicalRecord, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Treatments'>;
type Route = RouteProp<RootStackParamList, 'Treatments'>;

function durationInDays(start: string, end: string): number {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  return Math.max(1, Math.round((endMs - startMs) / 86400000));
}

export default function TreatmentsScreen() {
  const navigation = useNavigation<Nav>();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const RECORD_TYPE_COLORS = recordTypeColors(colors);
  const { petId } = useRoute<Route>().params;
  const [treatments, setTreatments] = useState<MedicalRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      recordsRepository
        .getByPet(petId)
        .then(records => setTreatments(records.filter(r => r.type === 'medication' || r.type === 'deworming')))
        .catch(() => Alert.alert('Erro', 'Não foi possível carregar o histórico de tratamentos.'));
    }, [petId]),
  );

  const sections = useMemo(() => {
    const groups = new Map<string, MedicalRecord[]>();
    for (const record of treatments) {
      const year = record.date.slice(0, 4);
      const group = groups.get(year);
      if (group) group.push(record);
      else groups.set(year, [record]);
    }
    return Array.from(groups.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([year, data]) => ({
        title: year,
        data: data.sort((a, b) => b.date.localeCompare(a.date)),
      }));
  }, [treatments]);

  const renderItem = useCallback(({ item }: { item: MedicalRecord }) => {
    const isMedication = item.type === 'medication';
    const active = isMedication && isActiveMedication(item);
    const period = item.endDate
      ? `${displayDate(item.date)} até ${displayDate(item.endDate)}`
      : isMedication
      ? `Início: ${displayDate(item.date)}`
      : `Dose em ${displayDate(item.date)}`;
    const duration = item.endDate ? durationInDays(item.date, item.endDate) : null;
    const details = [
      item.dosage,
      item.frequency ? FREQUENCY_LABELS[item.frequency] : undefined,
      duration ? `${duration} ${duration === 1 ? 'dia' : 'dias'}` : undefined,
    ].filter(Boolean).join(' · ');

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('AddRecord', { petId, recordId: item.id })}
        activeOpacity={0.7}
      >
        <View style={[styles.iconWrapper, { backgroundColor: RECORD_TYPE_COLORS[item.type] + '22' }]}>
          <Ionicons name={RECORD_TYPE_ICONS[item.type]} size={18} color={RECORD_TYPE_COLORS[item.type]} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{item.title}</Text>
            <View
              style={[
                styles.badge,
                { backgroundColor: (active ? colors.success : colors.textMuted) + '22' },
              ]}
            >
              <Text style={[styles.badgeText, { color: active ? colors.success : colors.textMuted }]}>
                {active ? 'Em andamento' : 'Concluído'}
              </Text>
            </View>
          </View>
          <Text style={styles.line}>{period}</Text>
          {details ? <Text style={styles.details}>{details}</Text> : null}
          <Text style={styles.typeLabel}>{RECORD_TYPE_LABELS[item.type]}</Text>
        </View>
      </TouchableOpacity>
    );
  }, [colors, styles, RECORD_TYPE_COLORS, navigation, petId]);

  const renderSectionHeader = useCallback(({ section }: { section: { title: string } }) => (
    <Text style={styles.yearHeader}>{section.title}</Text>
  ), [styles]);

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
        <Text style={styles.headerTitle}>Histórico de Tratamentos</Text>
        <ThemeToggle size={20} />
      </View>

      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderSectionHeader={renderSectionHeader}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.emptyWrapper}>
            <EmptyState
              icon="medkit-outline"
              title="Nenhum tratamento registrado"
              text="Remédios e vermífugos aparecerão aqui, agrupados por ano, conforme forem registrados."
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
  headerTitle: { fontSize: typography.h4.fontSize, fontWeight: typography.h4.fontWeight, color: colors.text },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 48 },
  yearHeader: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  title: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  badgeText: { fontSize: 11, fontWeight: '600' },
  line: { fontSize: 13, color: colors.textSubtle },
  details: { fontSize: 12, color: colors.textMuted },
  typeLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2, textTransform: 'uppercase' },
  emptyWrapper: { paddingTop: spacing.xxl },
});
