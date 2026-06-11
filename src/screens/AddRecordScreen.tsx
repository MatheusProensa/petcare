import React, { useState } from 'react';
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
import { colors, spacing, radius } from '../theme';
import { saveRecord } from '../storage';
import { maskDate, isValidDate, isFuture, toISO } from '../utils/date';
import { RecordType, RootStackParamList } from '../types';

type Route = RouteProp<RootStackParamList, 'AddRecord'>;

const RECORD_TYPES: RecordType[] = ['Vacina', 'Consulta', 'Remédio'];

const TYPE_COLOR: Record<RecordType, string> = {
  Vacina: '#10b981',
  Consulta: '#38bdf8',
  Remédio: '#f59e0b',
};

export default function AddRecordScreen() {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const { petId } = route.params;

  const [type, setType] = useState<RecordType>('Vacina');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!date || !isValidDate(date)) {
      Alert.alert('Campo obrigatório', 'Informe uma data válida (DD/MM/AAAA).');
      return;
    }
    if (isFuture(date)) {
      Alert.alert('Data inválida', 'A data do registro não pode ser no futuro.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Campo obrigatório', 'Informe a descrição do registro.');
      return;
    }
    if (nextDate && !isValidDate(nextDate)) {
      Alert.alert('Data inválida', 'Verifique a próxima data.');
      return;
    }
    if (nextDate && toISO(nextDate) <= toISO(date)) {
      Alert.alert('Data inválida', 'A próxima data deve ser depois da data do registro.');
      return;
    }
    setSaving(true);
    try {
      await saveRecord({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        petId,
        type,
        date: toISO(date),
        description: description.trim(),
        nextDate: nextDate ? toISO(nextDate) : undefined,
        createdAt: new Date().toISOString(),
      });
      navigation.goBack();
    } catch {
      setSaving(false);
      Alert.alert('Erro', 'Não foi possível salvar o registro. Tente novamente.');
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Novo Registro</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Tipo de registro</Text>
            <View style={styles.typeRow}>
              {RECORD_TYPES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeChip,
                    type === t && { backgroundColor: TYPE_COLOR[t] + '22', borderColor: TYPE_COLOR[t] },
                  ]}
                  onPress={() => setType(t)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.typeChipText, type === t && { color: TYPE_COLOR[t] }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Input
            label="Data"
            placeholder="DD/MM/AAAA"
            value={date}
            onChangeText={t => setDate(maskDate(t))}
            keyboardType="numeric"
            maxLength={10}
            returnKeyType="next"
          />

          <Input
            label="Descrição"
            placeholder="Ex: Antirrábica V10, dose anual"
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <Input
            label="Próxima data (opcional)"
            placeholder="DD/MM/AAAA"
            value={nextDate}
            onChangeText={t => setNextDate(maskDate(t))}
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
            <Text style={styles.saveBtnText}>{saving ? 'Salvando...' : 'Salvar Registro'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  field: { gap: spacing.xs },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: colors.textSubtle, letterSpacing: 0.3 },
  typeRow: { flexDirection: 'row', gap: spacing.sm },
  typeChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeChipText: { fontSize: 14, fontWeight: '500', color: colors.textMuted },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    marginTop: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
