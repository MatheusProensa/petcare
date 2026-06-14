import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { spacing, radius, useTheme, useThemedStyles, Palette } from '../theme';
import { getPets, getAllRecords } from '../storage';
import { getUpcomingEvents, isActiveMedication } from '../services/events';
import { PetCard } from '../components/PetCard';
import { EmptyState } from '../components/EmptyState';
import { ThemeToggle } from '../components/ThemeToggle';
import { Pet, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const { scheme } = useTheme();
  const [pets, setPets] = useState<Pet[]>([]);
  const [activeMedsByPet, setActiveMedsByPet] = useState<Record<string, number>>({});
  const [alertsByPet, setAlertsByPet] = useState<Record<string, number>>({});

  useFocusEffect(
    useCallback(() => {
      Promise.all([getPets(), getAllRecords()])
        .then(([loadedPets, records]) => {
          setPets(loadedPets);

          const recordsByPet = new Map<string, typeof records>();
          records.forEach(r => {
            const list = recordsByPet.get(r.petId);
            if (list) list.push(r);
            else recordsByPet.set(r.petId, [r]);
          });

          const meds: Record<string, number> = {};
          loadedPets.forEach(pet => {
            meds[pet.id] = (recordsByPet.get(pet.id) ?? []).filter(isActiveMedication).length;
          });

          const alerts: Record<string, number> = {};
          getUpcomingEvents(loadedPets, records).forEach(e => {
            if (e.pending) alerts[e.petId] = (alerts[e.petId] ?? 0) + 1;
          });

          setActiveMedsByPet(meds);
          setAlertsByPet(alerts);
        })
        .catch(() => Alert.alert('Erro', 'Não foi possível carregar seus pets.'));
    }, []),
  );

  const isEmpty = pets.length === 0;
  const fabBottom = Math.max(36, insets.bottom + 16);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Image
          source={
            scheme === 'dark'
              ? require('../../assets/logo-dark.png')
              : require('../../assets/logo-light.png')
          }
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <View style={styles.headerSpacer} />
        <ThemeToggle />
      </View>

      <View style={styles.titleSection}>
        <Text style={styles.title}>Seus Pets</Text>
        {!isEmpty && (
          <Text style={styles.subtitle}>
            {pets.length} {pets.length === 1 ? 'pet cadastrado' : 'pets cadastrados'}
          </Text>
        )}
      </View>

      <FlatList
        data={pets}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <PetCard
            pet={item}
            activeMeds={activeMedsByPet[item.id]}
            pendingAlerts={alertsByPet[item.id]}
            onPress={() => navigation.navigate('PetDetail', { petId: item.id })}
          />
        )}
        contentContainerStyle={isEmpty ? styles.emptyContainer : styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            image={require('../../assets/icons/paw.png')}
            title="Nenhum pet cadastrado"
            text="Adicione seu primeiro pet e comece a registrar o histórico de saúde dele."
          />
        }
      />

      <TouchableOpacity
        style={[styles.fab, { bottom: fabBottom }]}
        onPress={() => navigation.navigate('AddPet', {})}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Adicionar pet"
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerLogo: {
    width: 150,
    height: 50,
  },
  headerSpacer: {
    flex: 1,
  },
  titleSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },
  listContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    paddingBottom: 80,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: 62,
    height: 62,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
});
