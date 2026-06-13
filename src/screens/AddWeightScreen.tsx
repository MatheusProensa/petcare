import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Input } from '../components/Input';
import { ThemeToggle } from '../components/ThemeToggle';
import { spacing, radius, useTheme, useThemedStyles, Palette } from '../theme';
import { getWeights, saveWeight, deleteWeight } from '../storage';
import { maskDate, isValidDate, isFuture, toISO, displayDate } from '../utils/date';
import { WeightEntry, RootStackParamList } from '../types';

type Route = RouteProp<RootStackParamList, 'AddWeight'>;

function maskWeight(text: string): string {
  return text
    .replace(/[^\d,\.]/g, '')
    .replace('.', ',')
    .replace(/,(?=.*,)/g, '')
    .slice(0, 6);
}

function parseWeight(text: string): number | null {
  const value = Number(text.replace(',', '.'));
  if (!Number.isFinite(value) || value <= 0 || value > 200) return null;
  return value;
}

export default function AddWeightScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { petId, weightId } = useRoute<Route>().params;

  const [original, setOriginal] = useState<WeightEntry | null>(null);
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!weightId) return;
    getWeights(petId)
      .then(weights => {
        const entry = weights.find(w => w.id === weightId);
        if (!entry) return;
        setOriginal(entry);
        setWeight(entry.weightKg.toLocaleString('pt-BR'));
        setDate(displayDate(entry.date));
      })
      .catch(() => Alert.alert('Erro', 'Não foi possível carregar o registro de peso.'));
  }, [petId, weightId]);

  async function handleSave() {
    const weightKg = parseWeight(weight);
    if (!weightKg) {
      Alert.alert('Peso inválido', 'Informe o peso em kg (ex: 12,5).');
      return;
    }
    if (!date || !isValidDate(date)) {
      Alert.alert('Data inválida', 'Informe uma data válida (DD/MM/AAAA).');
      return;
    }
    if (isFuture(date)) {
      Alert.alert('Data inválida', 'A data da pesagem não pode ser no futuro.');
      return;
    }
    setSaving(true);
    try {
      await saveWeight({
        id: original?.id ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        petId,
        date: toISO(date),
        weightKg,
        createdAt: original?.createdAt ?? new Date().toISOString(),
      });
      navigation.goBack();
    } catch {
      setSaving(false);
      Alert.alert('Erro', 'Não foi possível salvar o peso. Tente novamente.');
    }
  }

  function confirmDelete() {
    if (!original) return;
    Alert.alert('Excluir pesagem', 'Deseja remover este registro de peso?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteWeight(original.id);
            navigation.goBack();
          } catch {
            Alert.alert('Erro', 'Não foi possível excluir a pesagem.');
          }
        },
      },
    ]);
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
        <Text style={styles.headerTitle}>{weightId ? 'Editar Pesagem' : 'Nova Pesagem'}</Text>
        <ThemeToggle />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Input
            label="Peso (kg)"
            placeholder="Ex: 12,5"
            value={weight}
            onChangeText={t => setWeight(maskWeight(t))}
            keyboardType="decimal-pad"
            maxLength={6}
            returnKeyType="next"
          />

          <Input
            label="Data da pesagem"
            placeholder="DD/MM/AAAA"
            value={date}
            onChangeText={t => setDate(maskDate(t))}
            keyboardType="numeric"
            maxLength={10}
            returnKeyType="done"
          />

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            <Text style={styles.saveBtnText}>
              {saving ? 'Salvando...' : weightId ? 'Salvar Alterações' : 'Salvar Pesagem'}
            </Text>
          </TouchableOpacity>

          {original && (
            <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
              <Text style={styles.deleteBtnText}>Excluir pesagem</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  scroll: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 48 },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  deleteBtnText: { fontSize: 14, fontWeight: '500', color: colors.danger },
});
