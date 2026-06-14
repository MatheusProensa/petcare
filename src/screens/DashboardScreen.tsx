import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { spacing, radius, typography, useTheme, useThemedStyles, Palette } from '../theme';
import { petsRepository } from '../repositories/petsRepository';
import { recordsRepository } from '../repositories/recordsRepository';
import { weightsRepository } from '../repositories/weightsRepository';
import { getUpcomingEvents, isActiveMedication, UpcomingEvent } from '../services/events';
import { syncEventNotifications } from '../services/notifications';
import { StatCard } from '../components/StatCard';
import { ReminderCard } from '../components/ReminderCard';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { HealthStatusCard } from '../components/HealthStatusCard';
import { PetCard } from '../components/PetCard';
import { RECORD_TYPE_ICONS, RECORD_TYPE_LABELS, recordTypeColors } from '../labels';
import { displayDate } from '../utils/date';
import { Pet, MedicalRecord, WeightEntry, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { colors, scheme, toggleTheme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const TYPE_COLORS = recordTypeColors(colors);
  const [pets, setPets] = useState<Pet[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [activeMedsCount, setActiveMedsCount] = useState(0);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);

  useFocusEffect(
    useCallback(() => {
      Promise.all([petsRepository.getAll(), recordsRepository.getAll(), weightsRepository.getAll()])
        .then(([loadedPets, loadedRecords, loadedWeights]) => {
          setPets(loadedPets);
          setRecords(loadedRecords);
          setWeights(loadedWeights);
          setEvents(getUpcomingEvents(loadedPets, loadedRecords));
          setActiveMedsCount(loadedRecords.filter(isActiveMedication).length);
          // Mantém as notificações locais alinhadas com os eventos atuais.
          syncEventNotifications(loadedPets, loadedRecords).catch(() => {});
        })
        .catch(() => Alert.alert('Erro', 'Não foi possível carregar a visão geral.'));
    }, []),
  );

  const alerts = events.filter(e => e.pending);
  const allUpcoming = events.filter(e => !e.pending && e.daysUntil >= 0);
  const upcoming = showAllUpcoming ? allUpcoming : allUpcoming.slice(0, 5);
  const hasPets = pets.length > 0;
  const recentRecords = [...records]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3);

  const petName = useCallback((petId: string): string => {
    return pets.find(p => p.id === petId)?.name ?? '';
  }, [pets]);

  const activeMedsByPet: Record<string, number> = {};
  records.forEach(r => {
    if (isActiveMedication(r)) activeMedsByPet[r.petId] = (activeMedsByPet[r.petId] ?? 0) + 1;
  });

  const alertsByPet: Record<string, number> = {};
  events.forEach(e => {
    if (e.pending) alertsByPet[e.petId] = (alertsByPet[e.petId] ?? 0) + 1;
  });

  const handleNewRecord = useCallback(() => {
    if (pets.length === 0) {
      navigation.navigate('AddPet', {});
      return;
    }
    if (pets.length === 1) {
      navigation.navigate('AddRecord', { petId: pets[0].id });
      return;
    }
    Alert.alert(
      'Novo registro',
      'Para qual pet?',
      [
        ...pets.map(p => ({
          text: p.name,
          onPress: () => navigation.navigate('AddRecord', { petId: p.id }),
        })),
        { text: 'Cancelar', style: 'cancel' as const },
      ],
    );
  }, [pets, navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Image
            source={
              scheme === 'dark'
                ? require('../../assets/logo-dark.png')
                : require('../../assets/logo-light.png')
            }
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={toggleTheme}
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={scheme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            >
              <Ionicons
                name={scheme === 'dark' ? 'sunny-outline' : 'moon-outline'}
                size={21}
                color={colors.textSubtle}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('Search')}
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Buscar registros"
            >
              <Ionicons name="search" size={22} color={colors.textSubtle} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('About')}
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Sobre o app"
            >
              <Ionicons name="information-circle-outline" size={22} color={colors.textSubtle} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.title}>{getGreeting()}!</Text>
        <Text style={styles.subtitle}>
          {hasPets ? 'Aqui está o resumo de hoje' : 'Vamos cadastrar seu primeiro pet?'}
        </Text>

        {hasPets ? (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Seus Pets</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Home')}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityRole="button"
                  accessibilityLabel="Ver todos os pets"
                >
                  <Text style={styles.seeAll}>Ver todos</Text>
                </TouchableOpacity>
              </View>
              {pets.map(pet => (
                <PetCard
                  key={pet.id}
                  pet={pet}
                  activeMeds={activeMedsByPet[pet.id]}
                  pendingAlerts={alertsByPet[pet.id]}
                  onPress={() => navigation.navigate('PetDetail', { petId: pet.id })}
                />
              ))}
            </View>

            <HealthStatusCard
              records={records}
              weights={weights}
              pets={pets}
              events={events}
              activeMedsCount={activeMedsCount}
            />

            <View style={styles.quickActions}>
              <View style={styles.quickActionItem}>
                <Button
                  label="Adicionar pet"
                  icon="add-circle-outline"
                  variant="secondary"
                  onPress={() => navigation.navigate('AddPet', {})}
                />
              </View>
              <View style={styles.quickActionItem}>
                <Button
                  label="Novo registro"
                  icon="create-outline"
                  variant="secondary"
                  onPress={handleNewRecord}
                />
              </View>
            </View>

            {alerts.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>⚠️ Alertas</Text>
                {alerts.map(event => (
                  <ReminderCard
                    key={event.key}
                    event={event}
                    onPress={() => navigation.navigate('PetDetail', { petId: event.petId })}
                  />
                ))}
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Próximos eventos</Text>
              {upcoming.length === 0 && alerts.length === 0 ? (
                <View style={styles.calmCard}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                  <Text style={styles.calmText}>
                    Tudo em dia! Nenhum reforço, retorno ou dose programada para os próximos dias.
                  </Text>
                </View>
              ) : upcoming.length === 0 ? (
                <Text style={styles.emptyHint}>Nenhum outro evento programado.</Text>
              ) : (
                upcoming.map(event => (
                  <ReminderCard
                    key={event.key}
                    event={event}
                    onPress={() => navigation.navigate('PetDetail', { petId: event.petId })}
                  />
                ))
              )}
              {!showAllUpcoming && allUpcoming.length > 5 && (
                <TouchableOpacity
                  onPress={() => setShowAllUpcoming(true)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver mais ${allUpcoming.length - 5} eventos`}
                >
                  <Text style={styles.seeMore}>Ver mais {allUpcoming.length - 5}</Text>
                </TouchableOpacity>
              )}
            </View>

            {recentRecords.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Últimos registros</Text>
                {recentRecords.map(record => (
                  <TouchableOpacity
                    key={record.id}
                    style={styles.recordRow}
                    onPress={() => navigation.navigate('PetDetail', { petId: record.petId })}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`${RECORD_TYPE_LABELS[record.type]}: ${record.title}, ${petName(record.petId)}`}
                  >
                    <View style={[styles.recordIcon, { backgroundColor: TYPE_COLORS[record.type] + '22' }]}>
                      <Ionicons name={RECORD_TYPE_ICONS[record.type]} size={16} color={TYPE_COLORS[record.type]} />
                    </View>
                    <View style={styles.recordInfo}>
                      <Text style={styles.recordTitle} numberOfLines={1}>{record.title}</Text>
                      <Text style={styles.recordMeta} numberOfLines={1}>
                        {petName(record.petId)} · {RECORD_TYPE_LABELS[record.type]} · {displayDate(record.date)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Estatísticas rápidas</Text>
              <View style={styles.statsRow}>
                <StatCard icon="paw" label="Pets" value={pets.length} />
                <StatCard
                  icon="notifications"
                  label="Alertas pendentes"
                  value={alerts.length}
                  color={alerts.length > 0 ? colors.warning : colors.success}
                />
                <StatCard
                  icon="medkit"
                  label="Remédios ativos"
                  value={activeMedsCount}
                  color={colors.accent}
                  onPress={() => navigation.navigate('Home')}
                />
              </View>
            </View>
          </>
        ) : (
          <View style={styles.emptyWrapper}>
            <EmptyState
              image={require('../../assets/icons/paw.png')}
              title="Bem-vindo ao PetCare"
              text="Cadastre seu primeiro pet para acompanhar vacinas, consultas, peso e muito mais."
            />
            <TouchableOpacity
              style={styles.petsBtn}
              onPress={() => navigation.navigate('AddPet', {})}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Adicionar pet"
            >
              <Ionicons name="add" size={18} color={colors.onPrimary} />
              <Text style={styles.petsBtnText}>Adicionar Pet</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: 48 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  logo: {
    width: 150,
    height: 50,
  },
  title: {
    fontSize: typography.h1.fontSize,
    fontWeight: typography.h1.fontWeight,
    color: colors.text,
    letterSpacing: -0.5,
    marginTop: spacing.sm,
  },
  subtitle: {
    fontSize: typography.body.fontSize,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing.lg,
  },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  quickActions: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  quickActionItem: { flex: 1 },
  section: { gap: spacing.sm, marginBottom: spacing.lg },
  sectionTitle: { fontSize: typography.h4.fontSize, fontWeight: typography.h4.fontWeight, color: colors.text, marginBottom: 2 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seeAll: { fontSize: 13, fontWeight: '600', color: colors.primaryLight },
  calmCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.success + '12',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.success + '33',
    padding: spacing.md,
  },
  calmText: { flex: 1, fontSize: 13, color: colors.textSubtle, lineHeight: 19 },
  emptyHint: { fontSize: 13, color: colors.textMuted },
  seeMore: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryLight,
    textAlign: 'center',
    paddingVertical: spacing.xs,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm + 2,
  },
  recordIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordInfo: { flex: 1, gap: 1 },
  recordTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  recordMeta: { fontSize: 12, color: colors.textSubtle },
  petsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  petsBtnText: { fontSize: 15, fontWeight: '600', color: colors.onPrimary },
  emptyWrapper: { marginTop: spacing.xxl, gap: spacing.lg },
});
