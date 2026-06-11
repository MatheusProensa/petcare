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
import { getPets, getRecords, deletePet, deleteRecord } from '../storage';
import { calcAge, displayDate } from '../utils/date';
import { Pet, MedicalRecord, RecordType, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'PetDetail'>;
type Route = RouteProp<RootStackParamList, 'PetDetail'>;

const TYPE_COLOR: Record<RecordType, string> = {
  Vacina: '#10b981',
  Consulta: '#38bdf8',
  Remédio: '#f59e0b',
};

const TYPE_ICON: Record<RecordType, keyof typeof Ionicons.glyphMap> = {
  Vacina: 'shield-checkmark',
  Consulta: 'medical',
  Remédio: 'medkit',
};

export default function PetDetailScreen() {
  const navigation = useNavigation<Nav>();
  const { petId } = useRoute<Route>().params;
  const [pet, setPet] = useState<Pet | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      Promise.all([
        getPets().then(pets => setPet(pets.find(p => p.id === petId) ?? null)),
        getRecords(petId).then(setRecords),
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
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{pet.name}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => navigation.navigate('AddPet', { petId })}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          >
            <Ionicons name="create-outline" size={20} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={confirmDeletePet}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 12 }}
          >
            <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={records}
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
              {[pet.species, pet.breed, age].filter(Boolean).join(' · ')}
            </Text>

            <View style={styles.divider} />

            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Histórico de Saúde</Text>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => navigation.navigate('AddRecord', { petId })}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.addBtnText}>Novo</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('AddRecord', { petId, recordId: item.id })}
            onLongPress={() => confirmDeleteRecord(item.id)}
            activeOpacity={0.8}
          >
            <View style={styles.cardTop}>
              <View style={[styles.badge, { backgroundColor: TYPE_COLOR[item.type] + '22' }]}>
                <Ionicons name={TYPE_ICON[item.type]} size={12} color={TYPE_COLOR[item.type]} />
                <Text style={[styles.badgeText, { color: TYPE_COLOR[item.type] }]}>{item.type}</Text>
              </View>
              <Text style={styles.cardDate}>{displayDate(item.date)}</Text>
            </View>
            <Text style={styles.cardDesc}>{item.description}</Text>
            {item.nextDate ? (
              <View style={styles.nextRow}>
                <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
                <Text style={styles.nextText}>Retorno: {displayDate(item.nextDate)}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={36} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Nenhum registro ainda</Text>
            <Text style={styles.emptyText}>
              Toque em "Novo" para registrar vacinas, consultas ou remédios.
            </Text>
          </View>
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
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  badgeText: { fontSize: 12, fontWeight: '600' },
  cardDate: { fontSize: 12, color: colors.textMuted },
  cardDesc: { fontSize: 14, color: colors.textSubtle, lineHeight: 20 },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  nextText: { fontSize: 12, color: colors.textMuted },
  empty: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.textMuted },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
