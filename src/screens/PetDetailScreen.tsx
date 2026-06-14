import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  SectionList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { spacing, radius, typography, useTheme, useThemedStyles, Palette } from '../theme';
import { petsRepository } from '../repositories/petsRepository';
import { recordsRepository } from '../repositories/recordsRepository';
import { weightsRepository } from '../repositories/weightsRepository';
import { documentsRepository } from '../repositories/documentsRepository';
import { calcAge, displayDate, formatDaysUntil, daysUntilISO } from '../utils/date';
import {
  SPECIES_LABELS,
  RECORD_TYPE_LABELS,
  recordTypeColors,
  RECORD_TYPE_ICONS,
  FREQUENCY_LABELS,
  DOCUMENT_KIND_LABELS,
  DOCUMENT_KIND_ICONS,
} from '../labels';
import { getVaccineStatus, eventDateOf, isEventFulfilled, getFulfilledRecordIds } from '../services/events';
import { sharePetSummary } from '../services/share';
import { sharePetPdf } from '../services/pdf';
import { TimelineItem, TimelineBadge } from '../components/TimelineItem';
import { EmptyState } from '../components/EmptyState';
import { ThemeToggle } from '../components/ThemeToggle';
import { MedicalProfileCard } from '../components/MedicalProfileCard';
import { Pet, MedicalRecord, WeightEntry, PetDocument, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'PetDetail'>;
type Route = RouteProp<RootStackParamList, 'PetDetail'>;

type FilterKey = 'all' | 'vaccine' | 'consultation' | 'medication' | 'deworming' | 'note' | 'weight' | 'document';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'vaccine', label: 'Vacinas' },
  { key: 'consultation', label: 'Consultas' },
  { key: 'medication', label: 'Remédios' },
  { key: 'deworming', label: 'Vermífugos' },
  { key: 'weight', label: 'Peso' },
  { key: 'document', label: 'Documentos' },
  { key: 'note', label: 'Observações' },
];

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function monthLabel(isoDate: string): string {
  const [year, month] = isoDate.split('-').map(Number);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

interface TimelineEntry {
  id: string;
  date: string;
  createdAt: string;
  kind: FilterKey;
  record?: MedicalRecord;
  weight?: WeightEntry;
  document?: PetDocument;
}

function QuickAction({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color?: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const tint = color ?? colors.primaryLight;
  return (
    <TouchableOpacity
      style={styles.quickAction}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: tint + '18' }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function vaccineStatusBadges(colors: Palette): Record<string, TimelineBadge> {
  return {
    ok: { label: 'Em dia', color: colors.success },
    due_soon: { label: 'Reforço próximo', color: colors.warning },
    overdue: { label: 'Atrasada', color: colors.danger },
    completed: { label: 'Reforço aplicado', color: colors.info },
  };
}

/** Badge de status para consultas, vermífugos e remédios (vacinas usam vaccineStatusBadges). */
function extendedStatusBadge(
  record: MedicalRecord,
  all: MedicalRecord[],
  fulfilledIds: Set<string>,
  colors: Palette,
): TimelineBadge | undefined {
  const eventDate = eventDateOf(record);
  if (!eventDate) return undefined;

  if (record.type === 'medication') {
    if (daysUntilISO(eventDate) < 0) return { label: 'Tratamento concluído', color: colors.info };
    return undefined;
  }

  if (isEventFulfilled(record, all, fulfilledIds)) {
    return { label: record.type === 'consultation' ? 'Retorno realizado' : 'Dose aplicada', color: colors.info };
  }
  const days = daysUntilISO(eventDate);
  if (days < 0) return { label: 'Atrasado', color: colors.danger };
  if (days <= 15) return { label: 'Próximo', color: colors.warning };
  return undefined;
}

function recordLines(record: MedicalRecord): string[] {
  const lines: string[] = [];
  if (record.type === 'vaccine') {
    const details = [record.manufacturer, record.batch, record.clinic].filter(Boolean).join(' · ');
    if (details) lines.push(details);
    if (record.nextDate) lines.push(`Reforço: ${displayDate(record.nextDate)}`);
  }
  if (record.type === 'consultation') {
    const details = [record.vet, record.clinic].filter(Boolean).join(' · ');
    if (details) lines.push(details);
    if (record.diagnosis) lines.push(`Diagnóstico: ${record.diagnosis}`);
    if (record.nextDate) lines.push(`Retorno: ${displayDate(record.nextDate)}`);
  }
  if (record.type === 'medication') {
    const details = [
      record.frequency ? FREQUENCY_LABELS[record.frequency] : undefined,
      record.endDate ? `até ${displayDate(record.endDate)}` : undefined,
    ].filter(Boolean).join(' · ');
    if (details) lines.push(details);
  }
  if (record.type === 'deworming' && record.nextDate) {
    lines.push(`Próxima dose: ${displayDate(record.nextDate)}`);
  }
  if (record.description) lines.push(record.description);
  return lines;
}

export default function PetDetailScreen() {
  const navigation = useNavigation<Nav>();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const RECORD_TYPE_COLORS = recordTypeColors(colors);
  const VACCINE_STATUS_BADGES = vaccineStatusBadges(colors);
  const { petId } = useRoute<Route>().params;
  const [pet, setPet] = useState<Pet | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [documents, setDocuments] = useState<PetDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('all');
  const fulfilledIds = useMemo(() => getFulfilledRecordIds(records), [records]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      Promise.all([
        petsRepository.getAll().then(pets => setPet(pets.find(p => p.id === petId) ?? null)),
        recordsRepository.getByPet(petId).then(setRecords),
        weightsRepository.getByPet(petId).then(setWeights),
        documentsRepository.getByPet(petId).then(setDocuments),
      ])
        .catch(() => Alert.alert('Erro', 'Não foi possível carregar os dados do pet.'))
        .finally(() => setLoading(false));
    }, [petId]),
  );

  function confirmDeleteRecord(id: string) {
    Alert.alert('Excluir registro', 'Deseja remover este registro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await recordsRepository.remove(id);
            setRecords(prev => prev.filter(r => r.id !== id));
          } catch {
            Alert.alert('Erro', 'Não foi possível excluir o registro.');
          }
        },
      },
    ]);
  }

  function confirmDeletePet() {
    Alert.alert(
      `Excluir ${pet?.name}?`,
      'Todo o histórico de saúde também será removido. Essa ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await petsRepository.remove(petId);
              navigation.goBack();
            } catch {
              Alert.alert('Erro', 'Não foi possível excluir o pet.');
            }
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!pet) {
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
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Pet não encontrado.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const age = calcAge(pet.birthDate);

  const timeline: TimelineEntry[] = [
    ...records.map(r => ({ id: r.id, date: r.date, createdAt: r.createdAt, kind: r.type as FilterKey, record: r })),
    ...weights.map(w => ({ id: w.id, date: w.date, createdAt: w.createdAt, kind: 'weight' as FilterKey, weight: w })),
    ...documents.map(d => ({ id: d.id, date: d.date, createdAt: d.createdAt, kind: 'document' as FilterKey, document: d })),
  ].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

  const filteredTimeline = filter === 'all' ? timeline : timeline.filter(e => e.kind === filter);

  const sections = useMemo(() => {
    const groups = new Map<string, TimelineEntry[]>();
    for (const entry of filteredTimeline) {
      const key = entry.date.slice(0, 7);
      const group = groups.get(key);
      if (group) group.push(entry);
      else groups.set(key, [entry]);
    }
    return Array.from(groups.entries()).map(([key, data]) => ({
      title: monthLabel(`${key}-01`),
      data,
    }));
  }, [filteredTimeline]);

  const renderEntry = useCallback(({ item, index, section }: { item: TimelineEntry; index: number; section: { data: TimelineEntry[] } }) => {
    const isLast = index === section.data.length - 1;
    if (item.weight) {
      return (
        <TimelineItem
          icon="scale"
          color={colors.primaryLight}
          dateLabel={displayDate(item.weight.date)}
          title={`Peso: ${item.weight.weightKg.toLocaleString('pt-BR')} kg`}
          isLast={isLast}
          onPress={() => navigation.navigate('AddWeight', { petId, weightId: item.weight!.id })}
        />
      );
    }
    if (item.document) {
      const doc = item.document;
      return (
        <TimelineItem
          icon={DOCUMENT_KIND_ICONS[doc.kind]}
          color={colors.info}
          dateLabel={`${displayDate(doc.date)} · ${DOCUMENT_KIND_LABELS[doc.kind]}`}
          title={doc.title}
          isLast={isLast}
          onPress={() => navigation.navigate('DocumentViewer', { uri: doc.uri, title: doc.title, mimeType: doc.mimeType })}
        />
      );
    }
    const record = item.record!;
    const vaccineStatus = getVaccineStatus(record, records, fulfilledIds);
    const eventDate = eventDateOf(record);
    const lines = recordLines(record);
    if (eventDate && daysUntilISO(eventDate) >= 0 && !isEventFulfilled(record, records, fulfilledIds)) {
      lines.push(`⏰ ${formatDaysUntil(daysUntilISO(eventDate))}`);
    }
    const badge = record.type === 'vaccine'
      ? (vaccineStatus ? VACCINE_STATUS_BADGES[vaccineStatus] : undefined)
      : extendedStatusBadge(record, records, fulfilledIds, colors);
    return (
      <TimelineItem
        icon={RECORD_TYPE_ICONS[record.type]}
        color={RECORD_TYPE_COLORS[record.type]}
        dateLabel={`${displayDate(record.date)} · ${RECORD_TYPE_LABELS[record.type]}`}
        title={record.title}
        lines={lines}
        badge={badge}
        isLast={isLast}
        onPress={() => navigation.navigate('AddRecord', { petId, recordId: record.id })}
        onLongPress={() => confirmDeleteRecord(record.id)}
      />
    );
  }, [records, fulfilledIds, colors, navigation, petId]);

  const renderSectionHeader = useCallback(({ section }: { section: { title: string } }) => (
    <Text style={styles.monthHeader}>{section.title}</Text>
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
        <Text style={styles.headerTitle}>{pet.name}</Text>
        <View style={styles.headerActions}>
          <ThemeToggle size={20} />
          <TouchableOpacity
            onPress={() => {
              Alert.alert('Compartilhar prontuário', 'Escolha o formato:', [
                {
                  text: 'PDF',
                  onPress: async () => {
                    try {
                      await sharePetPdf(pet!, records, weights);
                    } catch {
                      Alert.alert('Erro', 'Não foi possível gerar o PDF.');
                    }
                  },
                },
                {
                  text: 'Texto',
                  onPress: async () => {
                    try {
                      await sharePetSummary(pet!, records, weights);
                    } catch {
                      // usuário cancelou o compartilhamento
                    }
                  },
                },
                { text: 'Cancelar', style: 'cancel' },
              ]);
            }}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Compartilhar prontuário"
          >
            <Ionicons name="share-social-outline" size={20} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('AddPet', { petId })}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Editar pet"
          >
            <Ionicons name="create-outline" size={20} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={confirmDeletePet}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Excluir pet"
          >
            <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={renderSectionHeader}
        ListHeaderComponent={
          <View style={styles.hero}>
            <View style={styles.photoWrapper}>
              {pet.photo ? (
                <Image source={{ uri: pet.photo }} style={styles.photo} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="paw" size={32} color={colors.primaryLight} />
                </View>
              )}
            </View>

            <Text style={styles.petName}>{pet.name}</Text>
            <Text style={styles.petMeta}>
              {[SPECIES_LABELS[pet.species], pet.breed, age].filter(Boolean).join(' · ')}
            </Text>

            <View style={styles.quickActions}>
              <QuickAction
                icon="shield-checkmark"
                label="Vacinas"
                color={colors.success}
                onPress={() => navigation.navigate('Vaccines', { petId })}
              />
              <QuickAction
                icon="scale"
                label="Peso"
                onPress={() => navigation.navigate('Weight', { petId })}
              />
              <QuickAction
                icon="folder-open"
                label="Documentos"
                onPress={() => navigation.navigate('Documents', { petId })}
              />
              <QuickAction
                icon="warning"
                label="Emergência"
                color={colors.danger}
                onPress={() => navigation.navigate('Emergency', { petId })}
              />
              <QuickAction
                icon="stats-chart"
                label="Estatísticas"
                color={colors.accent}
                onPress={() => navigation.navigate('Stats', { petId })}
              />
              <QuickAction
                icon="medkit"
                label="Remédios"
                color={colors.warning}
                onPress={() => navigation.navigate('Medications', { petId })}
              />
            </View>

            <View style={{ width: '100%', marginBottom: spacing.lg }}>
              <MedicalProfileCard
                profile={pet.medicalProfile}
                onPress={() => navigation.navigate('MedicalProfile', { petId })}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Linha do Tempo</Text>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => navigation.navigate('AddRecord', { petId })}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Novo registro"
              >
                <Ionicons name="add" size={16} color={colors.onPrimary} />
                <Text style={styles.addBtnText}>Novo</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterScroll}
              contentContainerStyle={styles.filterRow}
            >
              {FILTERS.map(f => (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
                  onPress={() => setFilter(f.key)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Filtrar por ${f.label}`}
                  accessibilityState={{ selected: filter === f.key }}
                >
                  <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        }
        renderItem={renderEntry}
        ListEmptyComponent={
          <EmptyState
            image={require('../../assets/icons/document.png')}
            title={filter === 'all' ? 'Nenhum registro ainda' : 'Nada por aqui'}
            text={
              filter === 'all'
                ? 'Toque em "Novo" para registrar vacinas, consultas, remédios, vermífugos ou observações.'
                : 'Nenhum item encontrado para este filtro.'
            }
          />
        }
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 15, color: colors.textMuted },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: { fontSize: typography.h4.fontSize, fontWeight: typography.h4.fontWeight, color: colors.text },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  list: { paddingBottom: 48 },
  hero: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  photoWrapper: {
    width: 84,
    height: 84,
    borderRadius: 42,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  photo: { width: 84, height: 84 },
  photoPlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petName: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  petMeta: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.lg },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    width: '100%',
    marginBottom: spacing.md,
  },
  quickAction: {
    flexBasis: '30%',
    flexGrow: 1,
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: { fontSize: 12, fontWeight: '500', color: colors.textSubtle },
  divider: { width: '100%', height: 1, backgroundColor: colors.border, marginBottom: spacing.lg },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: typography.h3.fontSize, fontWeight: typography.h3.fontWeight, color: colors.text },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
  },
  addBtnText: { fontSize: 13, fontWeight: '600', color: colors.onPrimary },
  filterScroll: { width: '100%', marginBottom: spacing.md },
  filterRow: { gap: spacing.sm, paddingRight: spacing.lg },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary + '22',
    borderColor: colors.primaryLight,
  },
  filterChipText: { fontSize: 13, fontWeight: '500', color: colors.textMuted },
  filterChipTextActive: { color: colors.primaryLight, fontWeight: '600' },
  monthHeader: {
    fontSize: typography.label.fontSize,
    fontWeight: typography.label.fontWeight,
    color: colors.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
});
