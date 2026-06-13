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
import { getRecords, saveRecord, deleteRecord } from '../storage';
import { maskDate, isValidDate, isFuture, toISO, displayDate } from '../utils/date';
import {
  RECORD_TYPE_LABELS,
  recordTypeColors,
  FREQUENCY_LABELS,
  REMINDER_OPTIONS,
} from '../labels';
import { MedicalRecord, RecordType, Frequency, RootStackParamList } from '../types';

type Route = RouteProp<RootStackParamList, 'AddRecord'>;

const RECORD_TYPES: RecordType[] = ['vaccine', 'consultation', 'medication', 'deworming', 'note'];
const FREQUENCIES: Frequency[] = ['once_daily', 'twice_daily', 'every_8h', 'every_12h', 'continuous'];

const TITLE_LABELS: Record<RecordType, string> = {
  vaccine: 'Nome da vacina',
  consultation: 'Motivo da consulta',
  medication: 'Nome do medicamento',
  deworming: 'Nome do vermífugo',
  note: 'Título',
};

const TITLE_PLACEHOLDERS: Record<RecordType, string> = {
  vaccine: 'Ex: V10',
  consultation: 'Ex: Consulta de rotina',
  medication: 'Ex: Antibiótico 250mg',
  deworming: 'Ex: Vermífugo oral',
  note: 'Ex: Mudança de ração',
};

const DATE_LABELS: Record<RecordType, string> = {
  vaccine: 'Data de aplicação',
  consultation: 'Data da consulta',
  medication: 'Data de início',
  deworming: 'Data de aplicação',
  note: 'Data',
};

const NEXT_DATE_LABELS: Partial<Record<RecordType, string>> = {
  vaccine: 'Data de reforço (opcional)',
  consultation: 'Retorno (opcional)',
  deworming: 'Próxima dose (opcional)',
};

function trimOrUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export default function AddRecordScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const RECORD_TYPE_COLORS = recordTypeColors(colors);
  const route = useRoute<Route>();
  const { petId, recordId, initialType, prefill } = route.params;

  const [original, setOriginal] = useState<MedicalRecord | null>(null);
  const [type, setType] = useState<RecordType>(initialType ?? 'vaccine');
  const [title, setTitle] = useState(prefill?.title ?? '');
  const [date, setDate] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [frequency, setFrequency] = useState<Frequency | undefined>();
  const [dosage, setDosage] = useState('');
  const [manufacturer, setManufacturer] = useState(prefill?.manufacturer ?? '');
  const [batch, setBatch] = useState(prefill?.batch ?? '');
  const [clinic, setClinic] = useState(prefill?.clinic ?? '');
  const [vet, setVet] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [description, setDescription] = useState('');
  const [reminderDays, setReminderDays] = useState<number[]>([]);
  const [customReminder, setCustomReminder] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!recordId) return;
    getRecords(petId)
      .then(records => {
        const record = records.find(r => r.id === recordId);
        if (!record) return;
        setOriginal(record);
        setType(record.type);
        setTitle(record.title);
        setDate(displayDate(record.date));
        setNextDate(record.nextDate ? displayDate(record.nextDate) : '');
        setEndDate(record.endDate ? displayDate(record.endDate) : '');
        setFrequency(record.frequency);
        setDosage(record.dosage ?? '');
        setManufacturer(record.manufacturer ?? '');
        setBatch(record.batch ?? '');
        setClinic(record.clinic ?? '');
        setVet(record.vet ?? '');
        setDiagnosis(record.diagnosis ?? '');
        setDescription(record.description ?? '');
        const days = record.reminderDays ?? [];
        const presets = REMINDER_OPTIONS.map(o => o.days);
        setReminderDays(days.filter(d => presets.includes(d)));
        const custom = days.find(d => !presets.includes(d));
        setCustomReminder(custom !== undefined ? String(custom) : '');
      })
      .catch(() => Alert.alert('Erro', 'Não foi possível carregar o registro.'));
  }, [petId, recordId]);

  const futureDate = type === 'medication' ? endDate : nextDate;
  const showReminders = type !== 'note' && futureDate.length === 10;

  function handleTypeChange(t: RecordType) {
    setType(t);
    if (t === 'note') {
      setNextDate('');
      setEndDate('');
      setFrequency(undefined);
      setReminderDays([]);
      setCustomReminder('');
    } else if (t === 'medication') {
      setNextDate('');
    } else {
      setEndDate('');
      setFrequency(undefined);
      setDosage('');
    }
  }

  function toggleReminder(days: number) {
    setReminderDays(prev =>
      prev.includes(days) ? prev.filter(d => d !== days) : [...prev, days],
    );
  }

  function validate(): string | null {
    if (!title.trim()) return `Informe o campo "${TITLE_LABELS[type]}".`;
    if (!date || !isValidDate(date)) return `Informe uma data válida em "${DATE_LABELS[type]}".`;
    if (isFuture(date)) return `"${DATE_LABELS[type]}" não pode ser no futuro.`;
    if (type !== 'medication' && type !== 'note' && nextDate) {
      if (!isValidDate(nextDate)) return 'Verifique a próxima data (DD/MM/AAAA).';
      if (toISO(nextDate) <= toISO(date)) return 'A próxima data deve ser depois da data do registro.';
    }
    if (type === 'medication' && endDate) {
      if (!isValidDate(endDate)) return 'Verifique a data final (DD/MM/AAAA).';
      if (toISO(endDate) < toISO(date)) return 'A data final deve ser depois do início.';
    }
    if (customReminder && (!/^\d+$/.test(customReminder) || Number(customReminder) > 365)) {
      return 'O lembrete personalizado deve ser um número de dias (até 365).';
    }
    return null;
  }

  async function handleSave() {
    const error = validate();
    if (error) {
      Alert.alert('Verifique os campos', error);
      return;
    }
    setSaving(true);
    try {
      const allReminders = [...reminderDays];
      if (customReminder) {
        const custom = Number(customReminder);
        if (!allReminders.includes(custom)) allReminders.push(custom);
      }
      const record: MedicalRecord = {
        id: original?.id ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        petId,
        type,
        date: toISO(date),
        title: title.trim(),
        description: trimOrUndefined(description),
        createdAt: original?.createdAt ?? new Date().toISOString(),
      };
      if (type !== 'medication' && type !== 'note' && nextDate) record.nextDate = toISO(nextDate);
      if (type === 'medication') {
        // Uso contínuo não tem data final, mesmo que o campo tenha sido
        // preenchido antes de trocar a frequência.
        if (endDate && frequency !== 'continuous') record.endDate = toISO(endDate);
        record.frequency = frequency;
        record.dosage = trimOrUndefined(dosage);
      }
      if (type === 'vaccine') {
        record.manufacturer = trimOrUndefined(manufacturer);
        record.batch = trimOrUndefined(batch);
        record.clinic = trimOrUndefined(clinic);
      }
      if (type === 'consultation') {
        record.vet = trimOrUndefined(vet);
        record.clinic = trimOrUndefined(clinic);
        record.diagnosis = trimOrUndefined(diagnosis);
      }
      if (showReminders && allReminders.length > 0) {
        record.reminderDays = allReminders.sort((a, b) => a - b);
      }
      await saveRecord(record);
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
        <ThemeToggle />
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
                    type === t && {
                      backgroundColor: RECORD_TYPE_COLORS[t] + '22',
                      borderColor: RECORD_TYPE_COLORS[t],
                    },
                  ]}
                  onPress={() => handleTypeChange(t)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.typeChipText, type === t && { color: RECORD_TYPE_COLORS[t] }]}
                  >
                    {RECORD_TYPE_LABELS[t]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Input
            label={TITLE_LABELS[type]}
            placeholder={TITLE_PLACEHOLDERS[type]}
            value={title}
            onChangeText={setTitle}
            autoCapitalize="sentences"
            returnKeyType="next"
          />

          <Input
            label={DATE_LABELS[type]}
            placeholder="DD/MM/AAAA"
            value={date}
            onChangeText={t => setDate(maskDate(t))}
            keyboardType="numeric"
            maxLength={10}
            returnKeyType="next"
          />

          {type === 'vaccine' && (
            <>
              <Input
                label={NEXT_DATE_LABELS.vaccine!}
                placeholder="DD/MM/AAAA"
                value={nextDate}
                onChangeText={t => setNextDate(maskDate(t))}
                keyboardType="numeric"
                maxLength={10}
              />
              <Input
                label="Fabricante (opcional)"
                placeholder="Ex: Zoetis"
                value={manufacturer}
                onChangeText={setManufacturer}
              />
              <Input
                label="Lote (opcional)"
                placeholder="Ex: L2026-04"
                value={batch}
                onChangeText={setBatch}
              />
              <Input
                label="Clínica (opcional)"
                placeholder="Ex: Clínica VetVida"
                value={clinic}
                onChangeText={setClinic}
              />
            </>
          )}

          {type === 'consultation' && (
            <>
              <Input
                label="Veterinário (opcional)"
                placeholder="Ex: Dra. Ana Souza"
                value={vet}
                onChangeText={setVet}
              />
              <Input
                label="Clínica (opcional)"
                placeholder="Ex: Clínica VetVida"
                value={clinic}
                onChangeText={setClinic}
              />
              <Input
                label="Diagnóstico (opcional)"
                placeholder="Ex: Otite leve no ouvido direito"
                value={diagnosis}
                onChangeText={setDiagnosis}
                multiline
              />
              <Input
                label={NEXT_DATE_LABELS.consultation!}
                placeholder="DD/MM/AAAA"
                value={nextDate}
                onChangeText={t => setNextDate(maskDate(t))}
                keyboardType="numeric"
                maxLength={10}
              />
            </>
          )}

          {type === 'medication' && (
            <>
              <Input
                label="Dosagem (opcional)"
                placeholder="Ex: 250mg, 1 comprimido"
                value={dosage}
                onChangeText={setDosage}
              />
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Frequência</Text>
                <View style={styles.typeRow}>
                  {FREQUENCIES.map(f => (
                    <TouchableOpacity
                      key={f}
                      style={[styles.freqChip, frequency === f && styles.freqChipActive]}
                      onPress={() => {
                        setFrequency(prev => {
                          const next = prev === f ? undefined : f;
                          if (next === 'continuous') setEndDate('');
                          return next;
                        });
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[styles.typeChipText, frequency === f && { color: colors.primaryLight }]}
                      >
                        {FREQUENCY_LABELS[f]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              {frequency !== 'continuous' && (
                <Input
                  label="Data final (opcional)"
                  placeholder="DD/MM/AAAA"
                  value={endDate}
                  onChangeText={t => setEndDate(maskDate(t))}
                  keyboardType="numeric"
                  maxLength={10}
                />
              )}
            </>
          )}

          {type === 'deworming' && (
            <Input
              label={NEXT_DATE_LABELS.deworming!}
              placeholder="DD/MM/AAAA"
              value={nextDate}
              onChangeText={t => setNextDate(maskDate(t))}
              keyboardType="numeric"
              maxLength={10}
            />
          )}

          <Input
            label={type === 'note' ? 'Descrição' : 'Observações (opcional)'}
            placeholder={
              type === 'note'
                ? 'Ex: Vomitou durante a madrugada, mas comeu normalmente pela manhã'
                : 'Anotações adicionais'
            }
            value={description}
            onChangeText={setDescription}
            multiline
          />

          {showReminders && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Lembrete</Text>
              <Text style={styles.fieldHint}>
                Escolha com quantos dias de antecedência você quer ser avisado.
              </Text>
              <View style={styles.typeRow}>
                {REMINDER_OPTIONS.map(opt => {
                  const active = reminderDays.includes(opt.days);
                  return (
                    <TouchableOpacity
                      key={opt.days}
                      style={[styles.freqChip, active && styles.freqChipActive]}
                      onPress={() => toggleReminder(opt.days)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.typeChipText, active && { color: colors.primaryLight }]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Input
                label="Personalizado (dias antes, opcional)"
                placeholder="Ex: 10"
                value={customReminder}
                onChangeText={t => setCustomReminder(t.replace(/\D/g, '').slice(0, 3))}
                keyboardType="numeric"
                maxLength={3}
              />
            </View>
          )}

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
  field: { gap: spacing.xs },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: colors.textSubtle, letterSpacing: 0.3 },
  fieldHint: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.xs },
  typeRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  typeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeChipText: { fontSize: 13, fontWeight: '500', color: colors.textMuted },
  freqChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  freqChipActive: {
    backgroundColor: colors.primary + '22',
    borderColor: colors.primaryLight,
  },
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
