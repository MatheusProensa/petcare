import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { spacing, radius, typography, fonts, shadows, useTheme, useThemedStyles, Palette } from '../theme';
import { recordsRepository } from '../repositories/recordsRepository';
import { medicationsRepository } from '../repositories/medicationsRepository';
import { displayDate, daysUntilISO, formatDaysUntil } from '../utils/date';
import { isActiveMedication } from '../services/events';
import { FREQUENCY_LABELS } from '../labels';
import { EmptyState } from '../components/EmptyState';
import { ThemeToggle } from '../components/ThemeToggle';
import { Button } from '../components/Button';
import { useToast } from '../hooks/useToast';
import { MedicalRecord, MedicationDose, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Medications'>;
type Route = RouteProp<RootStackParamList, 'Medications'>;

/** "há 3 horas" / "há 2 dias" a partir de um ISO de data/hora. */
function formatTimeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / 3600000);
  if (hours < 1) return 'há poucos minutos';
  if (hours < 24) return `há ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  const days = Math.floor(hours / 24);
  return `há ${days} ${days === 1 ? 'dia' : 'dias'}`;
}

/** Formata data + hora para exibição no histórico de doses. */
function formatDoseDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${date} às ${time}`;
}

/** Progresso do tratamento (0-100), ou null se não há data de início/fim válida. */
function treatmentProgress(record: MedicalRecord): number | null {
  if (!record.endDate) return null;
  const start = new Date(record.date).getTime();
  const end = new Date(record.endDate).getTime();
  if (end <= start) return null;
  const pct = ((Date.now() - start) / (end - start)) * 100;
  return Math.min(100, Math.max(0, pct));
}

export default function MedicationsScreen() {
  const navigation = useNavigation<Nav>();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { showToast } = useToast();
  const { petId } = useRoute<Route>().params;
  const [medications, setMedications] = useState<MedicalRecord[]>([]);
  const [doses, setDoses] = useState<MedicationDose[]>([]);
  const [dosesModalRecord, setDosesModalRecord] = useState<MedicalRecord | null>(null);

  useFocusEffect(
    useCallback(() => {
      Promise.all([recordsRepository.getByPet(petId), medicationsRepository.getDoses(petId)])
        .then(([records, loadedDoses]) => {
          setMedications(records.filter(r => r.type === 'medication'));
          setDoses(loadedDoses);
        })
        .catch(() => Alert.alert('Erro', 'Não foi possível carregar os remédios.'));
    }, [petId]),
  );

  const dosesByRecord = useMemo(() => {
    const map = new Map<string, MedicationDose[]>();
    for (const dose of doses) {
      const list = map.get(dose.recordId) ?? [];
      list.push(dose);
      map.set(dose.recordId, list);
    }
    for (const list of map.values()) list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return map;
  }, [doses]);

  const handleMarkDose = useCallback(async (recordId: string) => {
    const now = new Date();
    const dose: MedicationDose = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      recordId,
      petId,
      date: now.toISOString().slice(0, 10),
      createdAt: now.toISOString(),
    };
    try {
      await medicationsRepository.saveDose(dose);
      setDoses(prev => [dose, ...prev]);
      showToast('Dose registrada', 'success', {
        label: 'Desfazer',
        onPress: async () => {
          try {
            await medicationsRepository.removeDose(dose.id);
            setDoses(prev => prev.filter(d => d.id !== dose.id));
          } catch {
            Alert.alert('Erro', 'Não foi possível desfazer o registro.');
          }
        },
      });
    } catch {
      Alert.alert('Erro', 'Não foi possível registrar a dose.');
    }
  }, [petId, showToast]);

  const active = medications.filter(isActiveMedication);
  const finished = medications.filter(m => !isActiveMedication(m));
  const sections = [
    ...(active.length ? [{ title: 'Em uso', data: active }] : []),
    ...(finished.length ? [{ title: 'Finalizados', data: finished }] : []),
  ];

  const renderMedication = useCallback((item: MedicalRecord, isActive: boolean) => {
    const details = [
      item.dosage,
      item.frequency ? FREQUENCY_LABELS[item.frequency] : undefined,
      item.endDate ? `até ${displayDate(item.endDate)}` : undefined,
    ].filter(Boolean).join(' · ');
    const continuous = item.frequency === 'continuous';
    const progress = treatmentProgress(item);
    const daysLeft = item.endDate ? daysUntilISO(item.endDate) : null;
    const recordDoses = dosesByRecord.get(item.id) ?? [];
    const lastDose = recordDoses[0];

    return (
      <View key={item.id} style={styles.card}>
        <View style={[styles.statusStripe, { backgroundColor: isActive ? colors.success : colors.border }]} />
        <View style={styles.cardBody}>
          <TouchableOpacity
            onPress={() => navigation.navigate('AddRecord', { petId, recordId: item.id })}
            activeOpacity={0.7}
          >
            <View style={styles.titleRow}>
              <Text style={styles.title}>{item.title}</Text>
              <View style={[styles.badge, { backgroundColor: (continuous ? colors.accent : colors.info) + '22' }]}>
                <Text style={[styles.badgeText, { color: continuous ? colors.accent : colors.info }]}>
                  {continuous ? 'Contínuo' : 'Temporário'}
                </Text>
              </View>
            </View>
            <Text style={styles.line}>Início: {displayDate(item.date)}</Text>
            {details ? <Text style={styles.line}>{details}</Text> : null}
            {item.description ? <Text style={styles.details}>{item.description}</Text> : null}
          </TouchableOpacity>

          {progress !== null && (
            <View style={styles.progressWrap}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors.primary }]} />
              </View>
              <Text style={styles.progressLabel}>
                {daysLeft !== null && daysLeft >= 0 ? `Termina ${formatDaysUntil(daysLeft)}` : 'Tratamento concluído'}
              </Text>
            </View>
          )}

          {isActive && daysLeft !== null && daysLeft >= 0 && daysLeft <= 3 && (
            <View style={styles.alertRow}>
              <Ionicons name="alarm" size={14} color={colors.warning} />
              <Text style={styles.alertText}>Fim do tratamento {formatDaysUntil(daysLeft)}</Text>
            </View>
          )}

          <View style={styles.doseRow}>
            <Text style={styles.lastDose}>
              {lastDose ? `Última dose: ${formatTimeAgo(lastDose.createdAt)}` : 'Nenhuma dose registrada'}
            </Text>
            {recordDoses.length > 0 && (
              <TouchableOpacity
                onPress={() => setDosesModalRecord(item)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={`Ver doses de ${item.title}`}
              >
                <Text style={styles.verDoses}>
                  Ver doses ({recordDoses.length})
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {isActive && (
            <Button
              label="Marcar dose tomada"
              variant="secondary"
              icon="checkmark-circle-outline"
              onPress={() => handleMarkDose(item.id)}
            />
          )}
        </View>
      </View>
    );
  }, [colors, styles, dosesByRecord, navigation, petId, handleMarkDose]);

  const renderSection = useCallback(({ item }: { item: { title: string; data: MedicalRecord[] } }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{item.title}</Text>
      {item.data.map(med => renderMedication(med, item.title === 'Em uso'))}
    </View>
  ), [styles, renderMedication]);

  const modalDoses = dosesModalRecord ? (dosesByRecord.get(dosesModalRecord.id) ?? []) : [];

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
        <Text style={styles.headerTitle}>Remédios</Text>
        <View style={styles.headerActions}>
          <ThemeToggle size={20} />
          <TouchableOpacity
            onPress={() => navigation.navigate('AddRecord', { petId, initialType: 'medication' })}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Novo remédio"
          >
            <Ionicons name="add" size={26} color={colors.primaryLight} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={sections}
        keyExtractor={item => item.title}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={renderSection}
        ListEmptyComponent={
          <View style={styles.emptyWrapper}>
            <EmptyState
              icon="medkit"
              title="Nenhum remédio registrado"
              text="Toque em + para registrar um remédio, com frequência e data de término."
            />
          </View>
        }
      />

      {/* Modal de histórico de doses */}
      <Modal
        visible={dosesModalRecord !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setDosesModalRecord(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Histórico de doses</Text>
                {dosesModalRecord && (
                  <Text style={styles.modalSubtitle}>{dosesModalRecord.title}</Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => setDosesModalRecord(null)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Fechar"
              >
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {modalDoses.length === 0 ? (
                <Text style={styles.modalEmpty}>Nenhuma dose registrada.</Text>
              ) : (
                modalDoses.map((dose, index) => (
                  <View key={dose.id} style={[styles.doseItem, index < modalDoses.length - 1 && styles.doseItemBorder]}>
                    <View style={styles.doseDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.doseDate}>{formatDoseDateTime(dose.createdAt)}</Text>
                      <Text style={styles.doseAgo}>{formatTimeAgo(dose.createdAt)}</Text>
                    </View>
                    <TouchableOpacity
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      accessibilityRole="button"
                      accessibilityLabel="Excluir dose"
                      onPress={() =>
                        Alert.alert('Excluir dose', 'Deseja remover este registro de dose?', [
                          { text: 'Cancelar', style: 'cancel' },
                          {
                            text: 'Excluir',
                            style: 'destructive',
                            onPress: async () => {
                              try {
                                await medicationsRepository.removeDose(dose.id);
                                setDoses(prev => prev.filter(d => d.id !== dose.id));
                              } catch {
                                Alert.alert('Erro', 'Não foi possível excluir a dose.');
                              }
                            },
                          },
                        ])
                      }
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 48 },
  section: { marginBottom: spacing.md },
  sectionTitle: {
    fontSize: 13,
    fontFamily: fonts.textBold,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
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
  cardBody: { flex: 1, padding: spacing.md, gap: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  title: { flex: 1, fontSize: 15, fontFamily: fonts.textSemibold, fontWeight: '600', color: colors.text },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  badgeText: { fontSize: 11, fontFamily: fonts.textBold, fontWeight: '700' },
  line: { fontSize: 13, fontFamily: fonts.text, color: colors.textSubtle },
  details: { fontSize: 12, fontFamily: fonts.text, color: colors.textMuted },
  progressWrap: { gap: 4 },
  progressTrack: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSunken,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: radius.full },
  progressLabel: { fontSize: 12, fontFamily: fonts.text, color: colors.textSubtle },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  alertText: { fontSize: 12, fontFamily: fonts.textBold, fontWeight: '700', color: colors.warning },
  doseRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lastDose: { fontSize: 12, fontFamily: fonts.text, color: colors.textMuted },
  verDoses: { fontSize: 12, fontFamily: fonts.textBold, fontWeight: '700', color: colors.primary },
  emptyWrapper: { paddingTop: spacing.xxl },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.sm,
    maxHeight: '75%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: 16, fontFamily: fonts.textSemibold, fontWeight: '600', color: colors.text },
  modalSubtitle: { fontSize: 13, fontFamily: fonts.text, color: colors.textMuted, marginTop: 2 },
  modalScroll: { paddingHorizontal: spacing.lg },
  modalEmpty: { fontSize: 14, fontFamily: fonts.text, color: colors.textMuted, paddingTop: spacing.lg, textAlign: 'center' },
  doseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  doseItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  doseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  doseDate: { fontSize: 14, fontFamily: fonts.textMedium, fontWeight: '500', color: colors.text },
  doseAgo: { fontSize: 12, fontFamily: fonts.text, color: colors.textMuted, marginTop: 1 },
});
