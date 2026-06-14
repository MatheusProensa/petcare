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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Input } from '../components/Input';
import { ThemeToggle } from '../components/ThemeToggle';
import { Button } from '../components/Button';
import { useToast } from '../hooks/useToast';
import { spacing, radius, useTheme, useThemedStyles, Palette } from '../theme';
import { getRecords, saveRecord, deleteRecord } from '../storage';
import { persistPhoto, deletePhoto } from '../storage/files';
import { maskDate, isValidDate, isFuture, toISO, displayDate } from '../utils/date';
import {
  RECORD_TYPE_LABELS,
  recordTypeColors,
  FREQUENCY_LABELS,
  REMINDER_OPTIONS,
} from '../labels';
import { MedicalRecord, RecordType, Frequency, RootStackParamList } from '../types';

type Route = RouteProp<RootStackParamList, 'AddRecord'>;

const RECORD_TYPES: RecordType[] = ['vaccine', 'consultation', 'medication', 'deworming', 'note', 'memory'];
const FREQUENCIES: Frequency[] = ['once_daily', 'twice_daily', 'every_8h', 'every_12h', 'continuous'];

const TITLE_LABELS: Record<RecordType, string> = {
  vaccine: 'Nome da vacina',
  consultation: 'Motivo da consulta',
  medication: 'Nome do medicamento',
  deworming: 'Nome do vermífugo',
  note: 'Título',
  memory: 'Título da memória',
};

const TITLE_PLACEHOLDERS: Record<RecordType, string> = {
  vaccine: 'Ex: V10',
  consultation: 'Ex: Consulta de rotina',
  medication: 'Ex: Antibiótico 250mg',
  deworming: 'Ex: Vermífugo oral',
  note: 'Ex: Mudança de ração',
  memory: 'Ex: Primeiro dia em casa',
};

const DATE_LABELS: Record<RecordType, string> = {
  vaccine: 'Data de aplicação',
  consultation: 'Data da consulta',
  medication: 'Data de início',
  deworming: 'Data de aplicação',
  note: 'Data',
  memory: 'Data da memória',
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
  const { showToast } = useToast();
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
  const [photos, setPhotos] = useState<string[]>([]);
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
        setPhotos(record.photos ?? (record.photo ? [record.photo] : []));
        const days = record.reminderDays ?? [];
        const presets = REMINDER_OPTIONS.map(o => o.days);
        setReminderDays(days.filter(d => presets.includes(d)));
        const custom = days.find(d => !presets.includes(d));
        setCustomReminder(custom !== undefined ? String(custom) : '');
      })
      .catch(() => Alert.alert('Erro', 'Não foi possível carregar o registro.'));
  }, [petId, recordId]);

  const futureDate = type === 'medication' ? endDate : nextDate;
  const showReminders = type !== 'note' && type !== 'memory' && futureDate.length === 10;

  function handleTypeChange(t: RecordType) {
    setType(t);
    if (t === 'note' || t === 'memory') {
      setNextDate('');
      setEndDate('');
      setFrequency(undefined);
      setDosage('');
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

  const PHOTO_PICKER_OPTIONS = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  } satisfies ImagePicker.ImagePickerOptions;

  const GALLERY_PICKER_OPTIONS = {
    mediaTypes: ['images'],
    quality: 0.8,
    allowsMultipleSelection: true,
  } satisfies ImagePicker.ImagePickerOptions;

  async function pickPhotosFromGallery() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria para selecionar fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync(GALLERY_PICKER_OPTIONS);
    if (!result.canceled) setPhotos(prev => [...prev, ...result.assets.map(a => a.uri)]);
  }

  async function pickPhotoFromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera para tirar a foto.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync(PHOTO_PICKER_OPTIONS);
    if (!result.canceled) setPhotos(prev => [...prev, result.assets[0].uri]);
  }

  function addPhoto() {
    Alert.alert('Foto da memória', 'De onde vem a foto?', [
      { text: 'Tirar foto', onPress: pickPhotoFromCamera },
      { text: 'Galeria', onPress: pickPhotosFromGallery },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  function removePhoto(index: number) {
    Alert.alert('Remover foto', 'Deseja remover esta foto da memória?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => setPhotos(prev => prev.filter((_, i) => i !== index)) },
    ]);
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
      const originalPhotos = original?.photos ?? (original?.photo ? [original.photo] : []);
      if (type === 'memory') {
        const storedPhotos = await Promise.all(
          photos.map((uri, i) => persistPhoto(uri, `${record.id}-${i}`)),
        );
        for (const oldUri of originalPhotos) {
          if (!storedPhotos.includes(oldUri)) await deletePhoto(oldUri);
        }
        record.photos = storedPhotos.length ? storedPhotos : undefined;
      } else {
        for (const oldUri of originalPhotos) await deletePhoto(oldUri);
      }
      await saveRecord(record);
      navigation.goBack();
      showToast(recordId ? 'Registro atualizado' : 'Registro salvo com sucesso');
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
            const photosToDelete = original.photos ?? (original.photo ? [original.photo] : []);
            for (const uri of photosToDelete) await deletePhoto(uri);
            navigation.goBack();
            showToast('Registro excluído');
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
            label={type === 'note' || type === 'memory' ? 'Descrição' : 'Observações (opcional)'}
            placeholder={
              type === 'note'
                ? 'Ex: Vomitou durante a madrugada, mas comeu normalmente pela manhã'
                : type === 'memory'
                ? 'Ex: Hoje foi o primeiro dia em nossa casa, estava com muito medo no início, mas logo se acostumou'
                : 'Anotações adicionais'
            }
            value={description}
            onChangeText={setDescription}
            multiline
          />

          {type === 'memory' && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Fotos (opcional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoGallery}>
                {photos.map((uri, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.photoThumbWrapper}
                    onPress={() => removePhoto(i)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Remover foto"
                  >
                    <Image source={{ uri }} style={styles.photoThumb} />
                    <View style={styles.photoRemoveBadge}>
                      <Ionicons name="close" size={12} color="#fff" />
                    </View>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={styles.photoAddTile} onPress={addPhoto} activeOpacity={0.8}>
                  <Ionicons name="image-outline" size={22} color={colors.textMuted} />
                  <Text style={styles.photoPlaceholderText}>Adicionar</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}

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

          <Button
            label={recordId ? 'Salvar Alterações' : 'Salvar Registro'}
            onPress={handleSave}
            loading={saving}
          />

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
  photoGallery: {
    flexDirection: 'row',
  },
  photoThumbWrapper: {
    marginRight: spacing.sm,
  },
  photoThumb: {
    width: 88,
    height: 88,
    borderRadius: radius.md,
  },
  photoRemoveBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAddTile: {
    width: 88,
    height: 88,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  photoPlaceholderText: { fontSize: 13, color: colors.textMuted },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  deleteBtnText: { fontSize: 14, fontWeight: '500', color: colors.danger },
});
