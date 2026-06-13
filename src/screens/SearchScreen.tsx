import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { spacing, radius, useTheme, useThemedStyles, Palette } from '../theme';
import { getPets, getAllRecords } from '../storage';
import { isActiveMedication } from '../services/events';
import { maskDate, isValidDate, toISO } from '../utils/date';
import { RECORD_TYPE_LABELS } from '../labels';
import { HealthRecordCard } from '../components/HealthRecordCard';
import { EmptyState } from '../components/EmptyState';
import { Pet, MedicalRecord, RecordType, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Search'>;

const TYPES: RecordType[] = ['vaccine', 'consultation', 'medication', 'deworming', 'note'];

function matchesQuery(record: MedicalRecord, query: string): boolean {
  const q = query.toLowerCase();
  return [record.title, record.description, record.diagnosis, record.vet, record.clinic]
    .filter(Boolean)
    .some(field => field!.toLowerCase().includes(q));
}

export default function SearchScreen() {
  const navigation = useNavigation<Nav>();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [pets, setPets] = useState<Pet[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<RecordType | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [onlyActiveMeds, setOnlyActiveMeds] = useState(false);

  useEffect(() => {
    Promise.all([getPets().then(setPets), getAllRecords().then(setRecords)]).catch(() =>
      Alert.alert('Erro', 'Não foi possível carregar os registros.'),
    );
  }, []);

  const petNames = new Map(pets.map(p => [p.id, p.name]));

  const results = records
    .filter(r => !typeFilter || r.type === typeFilter)
    .filter(r => !query.trim() || matchesQuery(r, query.trim()))
    .filter(r => !(fromDate.length === 10 && isValidDate(fromDate)) || r.date >= toISO(fromDate))
    .filter(r => !(toDate.length === 10 && isValidDate(toDate)) || r.date <= toISO(toDate))
    .filter(r => !onlyActiveMeds || isActiveMedication(r))
    .sort((a, b) => b.date.localeCompare(a.date));

  const hasFilter =
    query.trim() || typeFilter || onlyActiveMeds || (fromDate.length === 10 && isValidDate(fromDate)) ||
    (toDate.length === 10 && isValidDate(toDate));

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
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar vacinas, remédios, consultas..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={styles.filters}>
        <View style={styles.chips}>
          {TYPES.map(t => {
            const active = typeFilter === t;
            return (
              <TouchableOpacity
                key={t}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setTypeFilter(active ? null : t)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {RECORD_TYPE_LABELS[t]}
                </Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={[styles.chip, onlyActiveMeds && styles.chipActive]}
            onPress={() => setOnlyActiveMeds(v => !v)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, onlyActiveMeds && styles.chipTextActive]}>
              Remédios em uso
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.dateRow}>
          <View style={styles.dateBox}>
            <Text style={styles.dateLabel}>De</Text>
            <TextInput
              style={styles.dateInput}
              placeholder="DD/MM/AAAA"
              placeholderTextColor={colors.textMuted}
              value={fromDate}
              onChangeText={t => setFromDate(maskDate(t))}
              keyboardType="numeric"
              maxLength={10}
            />
          </View>
          <View style={styles.dateBox}>
            <Text style={styles.dateLabel}>Até</Text>
            <TextInput
              style={styles.dateInput}
              placeholder="DD/MM/AAAA"
              placeholderTextColor={colors.textMuted}
              value={toDate}
              onChangeText={t => setToDate(maskDate(t))}
              keyboardType="numeric"
              maxLength={10}
            />
          </View>
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <View style={{ marginBottom: spacing.sm }}>
            <HealthRecordCard
              record={item}
              petName={petNames.get(item.petId)}
              onPress={() =>
                navigation.navigate('AddRecord', { petId: item.petId, recordId: item.id })
              }
            />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyWrapper}>
            <EmptyState
              icon="search-outline"
              title={hasFilter ? 'Nada encontrado' : 'Busque no prontuário'}
              text={
                hasFilter
                  ? 'Tente outros termos ou ajuste os filtros de tipo e data.'
                  : 'Pesquise por nome de vacina, remédio, diagnóstico, veterinário ou clínica.'
              }
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
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text, padding: 0 },
  filters: { paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.md },
  chips: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  chipTextActive: { color: '#fff' },
  dateRow: { flexDirection: 'row', gap: spacing.sm },
  dateBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dateLabel: { fontSize: 12, color: colors.textMuted, width: 24 },
  dateInput: { flex: 1, fontSize: 13, color: colors.text, padding: 0 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 48 },
  emptyWrapper: { paddingTop: spacing.xl },
});
