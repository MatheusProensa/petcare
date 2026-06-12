import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { spacing, radius, useThemedStyles, Palette } from '../theme';
import { getPets } from '../storage';
import { PetCard } from '../components/PetCard';
import { EmptyState } from '../components/EmptyState';
import { Pet, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const [pets, setPets] = useState<Pet[]>([]);

  useFocusEffect(
    useCallback(() => {
      getPets()
        .then(setPets)
        .catch(() => Alert.alert('Erro', 'Não foi possível carregar seus pets.'));
    }, []),
  );

  const isEmpty = pets.length === 0;
  const fabBottom = Math.max(36, insets.bottom + 16);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.logo}>PetCare</Text>
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
            onPress={() => navigation.navigate('PetDetail', { petId: item.id })}
          />
        )}
        contentContainerStyle={isEmpty ? styles.emptyContainer : styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="paw-outline"
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
  },
  logo: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryLight,
    letterSpacing: 0.8,
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
