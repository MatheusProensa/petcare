import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, SectionList, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { spacing, radius, typography, fonts, shadows, useTheme, useThemedStyles, Palette } from '../theme';
import { petsRepository } from '../repositories/petsRepository';
import { recordsRepository } from '../repositories/recordsRepository';
import { weightsRepository } from '../repositories/weightsRepository';
import { documentsRepository } from '../repositories/documentsRepository';
import { displayDate } from '../utils/date';
import {
  RECORD_TYPE_LABELS,
  RECORD_TYPE_ICONS,
  recordTypeColors,
  DOCUMENT_KIND_LABELS,
  DOCUMENT_KIND_ICONS,
} from '../labels';
import { TimelineItem } from '../components/TimelineItem';
import { EmptyState } from '../components/EmptyState';
import { ThemeToggle } from '../components/ThemeToggle';
import { useToast } from '../hooks/useToast';
import { shareLifelinePdf } from '../services/lifelinePdf';
import { Pet, MedicalRecord, WeightEntry, PetDocument, RecordType, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Lifeline'>;
type Route = RouteProp<RootStackParamList, 'Lifeline'>;

type FilterKey = 'all' | RecordType | 'weight' | 'document';
type LifelineKind = FilterKey | 'arrival';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'memory', label: 'Memórias' },
  { key: 'vaccine', label: 'Vacinas' },
  { key: 'consultation', label: 'Consultas' },
  { key: 'medication', label: 'Remédios' },
  { key: 'deworming', label: 'Vermífugos' },
  { key: 'weight', label: 'Peso' },
  { key: 'document', label: 'Documentos' },
  { key: 'note', label: 'Observações' },
];

const EMOJI: Record<LifelineKind, string> = {
  all: '',
  arrival: '🐾',
  vaccine: '💉',
  consultation: '🏥',
  medication: '💊',
  deworming: '🐛',
  note: '📝',
  memory: '❤️',
  weight: '⚖️',
  document: '📄',
};

interface LifelineEntry {
  id: string;
  date: string;
  createdAt: string;
  kind: LifelineKind;
  record?: MedicalRecord;
  weight?: WeightEntry;
  document?: PetDocument;
}

export default function LifelineScreen() {
  const navigation = useNavigation<Nav>();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const RECORD_TYPE_COLORS = recordTypeColors(colors);
  const { petId } = useRoute<Route>().params;
  const [pet, setPet] = useState<Pet | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [documents, setDocuments] = useState<PetDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [exporting, setExporting] = useState(false);
  const { showToast } = useToast();

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      Promise.all([
        petsRepository.getAll().then(pets => setPet(pets.find(p => p.id === petId) ?? null)),
        recordsRepository.getByPet(petId).then(setRecords),
        weightsRepository.getByPet(petId).then(setWeights),
        documentsRepository.getByPet(petId).then(setDocuments),
      ])
        .catch(() => Alert.alert('Erro', 'Não foi possível carregar a linha da vida.'))
        .finally(() => setLoading(false));
    }, [petId]),
  );

  const timeline: LifelineEntry[] = useMemo(() => {
    const entries: LifelineEntry[] = [
      ...records.map(r => ({ id: r.id, date: r.date, createdAt: r.createdAt, kind: r.type as LifelineKind, record: r })),
      ...weights.map(w => ({ id: w.id, date: w.date, createdAt: w.createdAt, kind: 'weight' as LifelineKind, weight: w })),
      ...documents.map(d => ({ id: d.id, date: d.date, createdAt: d.createdAt, kind: 'document' as LifelineKind, document: d })),
    ];
    if (pet?.createdAt) {
      const arrivalDate = pet.createdAt.slice(0, 10);
      entries.push({ id: `${pet.id}-arrival`, date: arrivalDate, createdAt: pet.createdAt, kind: 'arrival' });
    }
    return entries.sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  }, [records, weights, documents, pet]);

  const filteredTimeline = filter === 'all' ? timeline : timeline.filter(e => e.kind === filter);

  const sections = useMemo(() => {
    const groups = new Map<string, LifelineEntry[]>();
    for (const entry of filteredTimeline) {
      const year = entry.date.slice(0, 4);
      const group = groups.get(year);
      if (group) group.push(entry);
      else groups.set(year, [entry]);
    }
    return Array.from(groups.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([year, data]) => ({ title: year, data }));
  }, [filteredTimeline]);

  const renderEntry = useCallback(({ item, index, section }: { item: LifelineEntry; index: number; section: { data: LifelineEntry[] } }) => {
    const isLast = index === section.data.length - 1;

    if (item.kind === 'arrival') {
      return (
        <TimelineItem
          icon="paw"
          color={colors.primary}
          dateLabel={displayDate(item.date)}
          title={`${EMOJI.arrival} Chegou ao lar`}
          isLast={isLast}
        />
      );
    }

    if (item.weight) {
      return (
        <TimelineItem
          icon="scale"
          color={colors.primaryLight}
          dateLabel={displayDate(item.weight.date)}
          title={`${EMOJI.weight} Peso registrado: ${item.weight.weightKg.toLocaleString('pt-BR')} kg`}
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
          title={`${EMOJI.document} ${doc.title}`}
          isLast={isLast}
          onPress={() => navigation.navigate('DocumentViewer', { uri: doc.uri, title: doc.title, mimeType: doc.mimeType })}
        />
      );
    }

    const record = item.record!;
    const lines: string[] = [];
    if (record.description) lines.push(record.description);
    const photos = record.type === 'memory' ? (record.photos ?? (record.photo ? [record.photo] : [])) : undefined;

    return (
      <TimelineItem
        icon={RECORD_TYPE_ICONS[record.type]}
        color={RECORD_TYPE_COLORS[record.type]}
        dateLabel={`${displayDate(record.date)} · ${RECORD_TYPE_LABELS[record.type]}`}
        title={`${EMOJI[record.type]} ${record.title}`}
        lines={lines}
        photos={photos}
        isLast={isLast}
        onPress={() => navigation.navigate('AddRecord', { petId, recordId: record.id })}
      />
    );
  }, [colors, RECORD_TYPE_COLORS, navigation, petId]);

  const renderSectionHeader = useCallback(({ section }: { section: { title: string } }) => (
    <Text style={styles.yearHeader}>{section.title}</Text>
  ), [styles]);

  const handleExportPdf = useCallback(async () => {
    if (!pet) return;
    setExporting(true);
    try {
      await shareLifelinePdf(pet, records, weights, documents);
    } catch {
      showToast('Não foi possível exportar a linha da vida.', 'error');
    } finally {
      setExporting(false);
    }
  }, [pet, records, weights, documents, showToast]);

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
        <Text style={styles.headerTitle}>Linha da Vida{pet ? ` · ${pet.name}` : ''}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleExportPdf}
            disabled={exporting || !pet}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Exportar linha da vida em PDF"
          >
            {exporting ? (
              <ActivityIndicator color={colors.text} size="small" />
            ) : (
              <Ionicons name="share-outline" size={20} color={colors.text} />
            )}
          </TouchableOpacity>
          <ThemeToggle size={20} />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={renderSectionHeader}
          renderItem={renderEntry}
          ListHeaderComponent={
            <View style={styles.intro}>
              <Text style={styles.introText}>
                A história completa de {pet?.name ?? 'seu pet'}, do primeiro dia até hoje.
              </Text>
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
          ListEmptyComponent={
            <EmptyState
              icon="time-outline"
              title="A história ainda está começando"
              text="Registre vacinas, consultas, memórias e outros marcos para ver a linha da vida tomar forma."
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: { fontSize: typography.h4.fontSize, fontWeight: typography.h4.fontWeight, fontFamily: fonts.display, color: colors.text },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  list: { paddingBottom: 48 },
  intro: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  introText: { fontSize: 13, fontFamily: fonts.text, color: colors.textMuted, lineHeight: 19, marginBottom: spacing.md },
  filterScroll: { width: '100%' },
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
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  filterChipText: { fontSize: 13, fontFamily: fonts.textMedium, fontWeight: '500', color: colors.textMuted },
  filterChipTextActive: { color: colors.primaryStrong, fontFamily: fonts.textBold, fontWeight: '700' },
  yearHeader: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight,
    fontFamily: typography.h3.fontFamily,
    letterSpacing: typography.h3.letterSpacing,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
});
