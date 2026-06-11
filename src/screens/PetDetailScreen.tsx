import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
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
import { colors, spacing, radius } from '../theme';
import { getPets, getRecords, getWeights, deletePet, deleteRecord } from '../storage';
import { calcAge, displayDate, formatDaysUntil, daysUntilISO } from '../utils/date';
import {
  SPECIES_LABELS,
  RECORD_TYPE_LABELS,
  RECORD_TYPE_COLORS,
  RECORD_TYPE_ICONS,
  FREQUENCY_LABELS,
} from '../labels';
import { getVaccineStatus, eventDateOf } from '../services/events';
import { TimelineItem, TimelineBadge } from '../components/TimelineItem';
import { EmptyState } from '../components/EmptyState';
import { MedicalProfileCard } from '../components/MedicalProfileCard';
import { Pet, MedicalRecord, WeightEntry, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'PetDetail'>;
type Route = RouteProp<RootStackParamList, 'PetDetail'>;

interface TimelineEntry {
  id: string;
  date: string;
  createdAt: string;
  record?: MedicalRecord;
  weight?: WeightEntry;
}

function QuickAction({
  icon,
  label,
  color = colors.primaryLight,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.quickAction}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const VACCINE_STATUS_BADGES: Record<string, TimelineBadge> = {
  ok: { label: 'Em dia', color: colors.success },
  due_soon: { label: 'Reforço próximo', color: colors.warning },
  overdue: { label: 'Atrasada', color: colors.danger },
};

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
  const { petId } = useRoute<Route>().params;
  const [pet, setPet] = useState<Pet | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      Promise.all([
        getPets().then(pets => setPet(pets.find(p => p.id === petId) ?? null)),
        getRecords(petId).then(setRecords),
        getWeights(petId).then(setWeights),
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
            await deleteRecord(id);
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
              await deletePet(petId);
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
    ...records.map(r => ({ id: r.id, date: r.date, createdAt: r.createdAt, record: r })),
    ...weights.map(w => ({ id: w.id, date: w.date, createdAt: w.createdAt, weight: w })),
  ].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

  function renderEntry({ item, index }: { item: TimelineEntry; index: number }) {
    const isLast = index === timeline.length - 1;
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
    const record = item.record!;
    const status = getVaccineStatus(record);
    const eventDate = eventDateOf(record);
    const lines = recordLines(record);
    if (eventDate && daysUntilISO(eventDate) >= 0) {
      lines.push(`⏰ ${formatDaysUntil(daysUntilISO(eventDate))}`);
    }
    return (
      <TimelineItem
        icon={RECORD_TYPE_ICONS[record.type]}
        color={RECORD_TYPE_COLORS[record.type]}
        dateLabel={`${displayDate(record.date)} · ${RECORD_TYPE_LABELS[record.type]}`}
        title={record.title}
        lines={lines}
        badge={record.type === 'vaccine' && status ? VACCINE_STATUS_BADGES[status] : undefined}
        isLast={isLast}
        onPress={() => navigation.navigate('AddRecord', { petId, recordId: record.id })}
        onLongPress={() => confirmDeleteRecord(record.id)}
      />
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
        <Text style={styles.headerTitle}>{pet.name}</Text>
        <View style={styles.headerActions}>
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

      <FlatList
        data={timeline}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
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
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.addBtnText}>Novo</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        renderItem={renderEntry}
        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title="Nenhum registro ainda"
            text='Toque em "Novo" para registrar vacinas, consultas, remédios, vermífugos ou observações.'
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  headerTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
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
    gap: spacing.sm,
    width: '100%',
    marginBottom: spacing.md,
  },
  quickAction: {
    flex: 1,
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
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
  },
  addBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
});
