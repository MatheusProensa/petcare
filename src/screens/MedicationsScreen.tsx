import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { spacing, radius, useTheme, useThemedStyles, Palette } from '../theme';
import { getRecords } from '../storage';
import { displayDate } from '../utils/date';
import { isActiveMedication } from '../services/events';
import { FREQUENCY_LABELS } from '../labels';
import { EmptyState } from '../components/EmptyState';
import { ThemeToggle } from '../components/ThemeToggle';
import { MedicalRecord, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Medications'>;
type Route = RouteProp<RootStackParamList, 'Medications'>;

export default function MedicationsScreen() {
  const navigation = useNavigation<Nav>();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { petId } = useRoute<Route>().params;
  const [medications, setMedications] = useState<MedicalRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      getRecords(petId)
        .then(records => setMedications(records.filter(r => r.type === 'medication')))
        .catch(() => Alert.alert('Erro', 'Não foi possível carregar os remédios.'));
    }, [petId]),
  );

  const active = medications.filter(isActiveMedication);
  const finished = medications.filter(m => !isActiveMedication(m));
  const sections = [
    ...(active.length ? [{ title: 'Em uso', data: active }] : []),
    ...(finished.length ? [{ title: 'Finalizados', data: finished }] : []),
  ];

  function renderMedication(item: MedicalRecord, isActive: boolean) {
    const details = [
      item.frequency ? FREQUENCY_LABELS[item.frequency] : undefined,
      item.endDate ? `até ${displayDate(item.endDate)}` : undefined,
    ].filter(Boolean).join(' · ');
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.card}
        onPress={() => navigation.navigate('AddRecord', { petId, recordId: item.id })}
        activeOpacity={0.8}
      >
        <View style={[styles.statusStripe, { backgroundColor: isActive ? colors.success : colors.border }]} />
        <View style={styles.cardBody}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.line}>Início: {displayDate(item.date)}</Text>
          {details ? <Text style={styles.line}>{details}</Text> : null}
          {item.description ? <Text style={styles.details}>{item.description}</Text> : null}
        </View>
      </TouchableOpacity>
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
        renderItem={({ item }) => (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{item.title}</Text>
            {item.data.map(med => renderMedication(med, item.title === 'Em uso'))}
          </View>
        )}
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
  headerTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 48 },
  section: { marginBottom: spacing.md },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
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
  },
  statusStripe: { width: 4 },
  cardBody: { flex: 1, padding: spacing.md, gap: 3 },
  title: { fontSize: 15, fontWeight: '600', color: colors.text },
  line: { fontSize: 13, color: colors.textSubtle },
  details: { fontSize: 12, color: colors.textMuted },
  emptyWrapper: { paddingTop: spacing.xxl },
});
