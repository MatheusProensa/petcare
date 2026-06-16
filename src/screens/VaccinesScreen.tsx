import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { spacing, radius, fonts, shadows, useTheme, useThemedStyles, Palette } from '../theme';
import { getRecords, saveRecord, deleteRecord } from '../storage';
import { displayDate, formatDaysUntil, daysUntilISO } from '../utils/date';
import { getVaccineStatus, getFulfilledRecordIds, VaccineStatus } from '../services/events';
import { VACCINE_TYPE_LABELS } from '../labels';
import { EmptyState } from '../components/EmptyState';
import { ThemeToggle } from '../components/ThemeToggle';
import { useToast } from '../hooks/useToast';
import { MedicalRecord, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Vaccines'>;
type Route = RouteProp<RootStackParamList, 'Vaccines'>;

const STATUS_META: Record<VaccineStatus, { label: string }> = {
  ok: { label: 'Em dia' },
  due_soon: { label: 'Reforço próximo' },
  overdue: { label: 'Atrasada' },
  completed: { label: 'Reforço aplicado' },
};

export default function VaccinesScreen() {
  const navigation = useNavigation<Nav>();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { petId } = useRoute<Route>().params;
  const [vaccines, setVaccines] = useState<MedicalRecord[]>([]);
  const [allRecords, setAllRecords] = useState<MedicalRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      getRecords(petId)
        .then(records => {
          setAllRecords(records);
          setVaccines(records.filter(r => r.type === 'vaccine'));
        })
        .catch(() => Alert.alert('Erro', 'Não foi possível carregar as vacinas.'));
    }, [petId]),
  );

  const statusColor: Record<VaccineStatus, string> = {
    ok: colors.success,
    due_soon: colors.warning,
    overdue: colors.danger,
    completed: colors.info,
  };

  const { showToast } = useToast();
  const fulfilledIds = useMemo(() => getFulfilledRecordIds(allRecords), [allRecords]);

  const handleQuickDose = useCallback(async (item: MedicalRecord) => {
    const newRecord: MedicalRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      petId,
      type: 'vaccine',
      date: new Date().toISOString().slice(0, 10),
      title: item.title,
      manufacturer: item.manufacturer,
      batch: item.batch,
      clinic: item.clinic,
      vaccineType: item.vaccineType,
      createdAt: new Date().toISOString(),
    };
    try {
      await saveRecord(newRecord);
      setVaccines(prev => [newRecord, ...prev]);
      setAllRecords(prev => [newRecord, ...prev]);
      showToast('Dose registrada', 'success', {
        label: 'Desfazer',
        onPress: async () => {
          try {
            await deleteRecord(newRecord.id);
            setVaccines(prev => prev.filter(v => v.id !== newRecord.id));
            setAllRecords(prev => prev.filter(r => r.id !== newRecord.id));
          } catch {
            Alert.alert('Erro', 'Não foi possível desfazer.');
          }
        },
      });
    } catch {
      Alert.alert('Erro', 'Não foi possível registrar a dose.');
    }
  }, [petId, showToast]);
  const overdueCount = vaccines.filter(
    v => getVaccineStatus(v, allRecords, fulfilledIds) === 'overdue',
  ).length;
  const dueSoonCount = vaccines.filter(
    v => getVaccineStatus(v, allRecords, fulfilledIds) === 'due_soon',
  ).length;

  function renderVaccine({ item }: { item: MedicalRecord }) {
    const status = getVaccineStatus(item, allRecords, fulfilledIds) ?? 'ok';
    const details = [item.manufacturer, item.batch, item.clinic].filter(Boolean).join(' · ');
    const showCountdown =
      item.nextDate && (status === 'ok' || status === 'due_soon') && daysUntilISO(item.nextDate) >= 0;
    return (
      <View style={styles.card}>
        <View style={[styles.statusStripe, { backgroundColor: statusColor[status] }]} />
        <View style={styles.cardBody}>
          <TouchableOpacity
            onPress={() => navigation.navigate('AddRecord', { petId, recordId: item.id })}
            activeOpacity={0.7}
          >
            <View style={styles.cardTop}>
              <Text style={styles.title}>{item.title}</Text>
              <View style={[styles.badge, { backgroundColor: statusColor[status] + '22' }]}>
                <Text style={[styles.badgeText, { color: statusColor[status] }]}>
                  {STATUS_META[status].label}
                </Text>
              </View>
            </View>
            {item.vaccineType && (
              <View style={[styles.typeBadge, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="shield-checkmark-outline" size={11} color={colors.primaryStrong} />
                <Text style={[styles.typeBadgeText, { color: colors.primaryStrong }]}>
                  {VACCINE_TYPE_LABELS[item.vaccineType]}
                </Text>
              </View>
            )}
            <Text style={styles.line}>Aplicada em {displayDate(item.date)}</Text>
            {item.nextDate ? (
              <Text style={styles.line}>
                Reforço: {displayDate(item.nextDate)}
                {showCountdown ? ` (${formatDaysUntil(daysUntilISO(item.nextDate))})` : ''}
              </Text>
            ) : null}
            {details ? <Text style={styles.details}>{details}</Text> : null}
          </TouchableOpacity>
          {(status === 'due_soon' || status === 'overdue') && (
            <TouchableOpacity
              style={styles.doseBtn}
              onPress={() => handleQuickDose(item)}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle-outline" size={14} color={colors.primaryLight} />
              <Text style={styles.doseBtnText}>Registrar dose aplicada</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
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
        <Text style={styles.headerTitle}>Vacinas</Text>
        <View style={styles.headerActions}>
          <ThemeToggle size={20} />
          <TouchableOpacity
            onPress={() => navigation.navigate('AddRecord', { petId, initialType: 'vaccine', lockType: true })}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Nova vacina"
          >
            <Ionicons name="add" size={26} color={colors.primaryLight} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={vaccines}
        keyExtractor={item => item.id}
        renderItem={renderVaccine}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          vaccines.length > 0 ? (
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={[styles.summaryValue, { color: colors.success }]}>
                  {vaccines.length}
                </Text>
                <Text style={styles.summaryLabel}>aplicadas</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={[styles.summaryValue, { color: colors.warning }]}>{dueSoonCount}</Text>
                <Text style={styles.summaryLabel}>reforço próximo</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={[styles.summaryValue, { color: colors.danger }]}>{overdueCount}</Text>
                <Text style={styles.summaryLabel}>atrasadas</Text>
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyWrapper}>
            <EmptyState
              image={require('../../assets/icons/shield.png')}
              title="Nenhuma vacina registrada"
              text="Toque em + para registrar a primeira vacina com data de reforço, fabricante e lote."
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
  headerTitle: { fontSize: 16, fontWeight: '700', fontFamily: fonts.display, color: colors.text },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 48 },
  summaryRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm + 4,
    gap: 2,
    ...shadows.sm,
  },
  summaryValue: { fontSize: 20, fontWeight: '800', fontFamily: fonts.displayExtra },
  summaryLabel: { fontSize: 11, fontFamily: fonts.text, color: colors.textMuted },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    ...shadows.sm,
  },
  statusStripe: { width: 4 },
  cardBody: { flex: 1, padding: spacing.md, gap: 3 },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: { flex: 1, fontSize: 15, fontFamily: fonts.textSemibold, fontWeight: '600', color: colors.text },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  badgeText: { fontSize: 11, fontFamily: fonts.textBold, fontWeight: '700' },
  line: { fontSize: 13, fontFamily: fonts.text, color: colors.textSubtle },
  details: { fontSize: 12, fontFamily: fonts.text, color: colors.textMuted },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    marginBottom: 2,
  },
  typeBadgeText: { fontSize: 11, fontFamily: fonts.textBold, fontWeight: '700' },
  doseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
  },
  doseBtnText: { fontSize: 12, fontFamily: fonts.textBold, fontWeight: '700', color: colors.primaryLight },
  emptyWrapper: { paddingTop: spacing.xxl },
});
