import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius } from '../theme';
import { getPets, getAllRecords } from '../storage';
import { getUpcomingEvents, isActiveMedication, UpcomingEvent } from '../services/events';
import { StatCard } from '../components/StatCard';
import { ReminderCard } from '../components/ReminderCard';
import { EmptyState } from '../components/EmptyState';
import { Pet, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;

export default function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const [pets, setPets] = useState<Pet[]>([]);
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [activeMedsCount, setActiveMedsCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      Promise.all([getPets(), getAllRecords()])
        .then(([loadedPets, records]) => {
          setPets(loadedPets);
          setEvents(getUpcomingEvents(loadedPets, records));
          setActiveMedsCount(records.filter(isActiveMedication).length);
        })
        .catch(() => Alert.alert('Erro', 'Não foi possível carregar a visão geral.'));
    }, []),
  );

  const alerts = events.filter(e => e.pending);
  const upcoming = events.filter(e => !e.pending && e.daysUntil >= 0).slice(0, 5);
  const hasPets = pets.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.logo}>PetCare</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Search')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Buscar registros"
          >
            <Ionicons name="search" size={22} color={colors.textSubtle} />
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Visão Geral</Text>

        {hasPets ? (
          <>
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
              />
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
            </View>

            <TouchableOpacity
              style={styles.petsBtn}
              onPress={() => navigation.navigate('Home')}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Ver seus pets"
            >
              <Ionicons name="paw" size={18} color="#fff" />
              <Text style={styles.petsBtnText}>
                Seus Pets ({pets.length})
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#fff" />
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.emptyWrapper}>
            <EmptyState
              icon="paw-outline"
              title="Bem-vindo ao PetCare"
              text="Cadastre seu primeiro pet para acompanhar vacinas, consultas, peso e muito mais."
            />
            <TouchableOpacity
              style={styles.petsBtn}
              onPress={() => navigation.navigate('AddPet', {})}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.petsBtnText}>Adicionar Pet</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: 48 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  logo: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryLight,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  section: { gap: spacing.sm, marginBottom: spacing.lg },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 2 },
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
  petsBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  emptyWrapper: { marginTop: spacing.xxl, gap: spacing.lg },
});
