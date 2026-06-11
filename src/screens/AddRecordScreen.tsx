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
import { colors, spacing, radius } from '../theme';
import { getRecords, saveRecord, deleteRecord } from '../storage';
import { maskDate, isValidDate, isFuture, toISO, displayDate } from '../utils/date';
import { RECORD_TYPE_LABELS } from '../labels';
import { MedicalRecord, RecordType, RootStackParamList } from '../types';

type Route = RouteProp<RootStackParamList, 'AddRecord'>;

const RECORD_TYPES: RecordType[] = ['vaccine', 'consultation', 'medication'];

const TYPE_COLOR: Record<RecordType, string> = {
  vaccine: '#10b981',
  consultation: '#38bdf8',
  medication: '#f59e0b',
};

export default function AddRecordScreen() {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const { petId, recordId } = route.params;

  const [original, setOriginal] = useState<MedicalRecord | null>(null);
  const [type, setType] = useState<RecordType>('vaccine');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!recordId) return;
    getRecords(petId)
      .then(records => {
        const record = records.find(r => r.id === recordId);
        if (!record) return;
        setOriginal(record);
        setType(record.type);
        setDate(displayDate(record.date));
        setDescription(record.description);
        setNextDate(record.nextDate ? displayDate(record.nextDate) : '');
      })
      .catch(() => Alert.alert('Erro', 'Não foi possível carregar o registro.'));
  }, [petId, recordId]);

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
        id: original?.id ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        petId,
        type,
        date: toISO(date),
        description: description.trim(),
        nextDate: nextDate ? toISO(nextDate) : undefined,
        createdAt: original?.createdAt ?? new Date().toISOString(),
      });
      navigation.goBack();
    } catch {
      setSaving(false);
      Alert.alert('Erro', 'Não foi possível salvar o registro. Tente novamente.');
    }
  }

  function confirmDelete() {
    if (!original) return;
    Alert.alert('Excluir registro', 'Deseja remover este registro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteRecord(original.id);
            navigation.goBack();
          } catch {
            Alert.alert('Erro', 'Não foi possível excluir o registro.');
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
        <Text style={styles.headerTitle}>{recordId ? 'Editar Registro' : 'Novo Registro'}</Text>
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
                  <Text style={[styles.typeChipText, type === t && { color: TYPE_COLOR[t] }]}>
                    {RECORD_TYPE_LABELS[t]}
                  </Text>
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
            <Text style={styles.saveBtnText}>
              {saving ? 'Salvando...' : recordId ? 'Salvar Alterações' : 'Salvar Registro'}
            </Text>
          </TouchableOpacity>

          {original && (
            <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
              <Text style={styles.deleteBtnText}>Excluir registro</Text>
            </TouchableOpacity>
          )}
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
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  deleteBtnText: { fontSize: 14, fontWeight: '500', color: colors.danger },
});
