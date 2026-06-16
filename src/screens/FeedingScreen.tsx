import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Switch,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { spacing, radius, fonts, shadows, useTheme, useThemedStyles, Palette } from '../theme';
import { getFeedingSchedules, saveFeedingSchedule, deleteFeedingSchedule } from '../storage';
import { scheduleFeedingNotification, cancelFeedingNotification } from '../services/notifications';
import { petsRepository } from '../repositories/petsRepository';
import { ThemeToggle } from '../components/ThemeToggle';
import { EmptyState } from '../components/EmptyState';
import { useToast } from '../hooks/useToast';
import { FeedingSchedule, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Feeding'>;
type Route = RouteProp<RootStackParamList, 'Feeding'>;

const PRESET_LABELS = ['Manhã', 'Almoço', 'Tarde', 'Noite'];
const PRESET_TIMES: Record<string, { hour: number; minute: number }> = {
  Manhã:  { hour: 7,  minute: 0 },
  Almoço: { hour: 12, minute: 0 },
  Tarde:  { hour: 16, minute: 0 },
  Noite:  { hour: 19, minute: 0 },
};
const MEAL_ICONS: Record<string, keyof typeof import('@expo/vector-icons').Ionicons.glyphMap> = {
  Manhã:  'sunny-outline',
  Almoço: 'restaurant-outline',
  Tarde:  'partly-sunny-outline',
  Noite:  'moon-outline',
};

function pad2(n: number) { return String(n).padStart(2, '0'); }
function timeLabel(hour: number, minute: number) { return `${pad2(hour)}:${pad2(minute)}`; }
function mealIcon(label: string): keyof typeof import('@expo/vector-icons').Ionicons.glyphMap {
  return MEAL_ICONS[label] ?? 'nutrition-outline';
}

export default function FeedingScreen() {
  const navigation = useNavigation<Nav>();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { petId } = useRoute<Route>().params;
  const { showToast } = useToast();

  const [petName, setPetName] = useState('');
  const [schedules, setSchedules] = useState<FeedingSchedule[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  // form state
  const [formLabel, setFormLabel] = useState('Manhã');
  const [formHour, setFormHour] = useState('07');
  const [formMinute, setFormMinute] = useState('00');
  const [formFood, setFormFood] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      petsRepository.getAll().then(pets => {
        const pet = pets.find(p => p.id === petId);
        if (pet) setPetName(pet.name);
      });
      getFeedingSchedules(petId).then(setSchedules);
    }, [petId]),
  );

  function openModal() {
    setFormLabel('Manhã');
    setFormHour('07');
    setFormMinute('00');
    setFormFood('');
    setFormAmount('');
    setModalVisible(true);
  }

  function selectPreset(label: string) {
    setFormLabel(label);
    const t = PRESET_TIMES[label];
    if (t) {
      setFormHour(pad2(t.hour));
      setFormMinute(pad2(t.minute));
    }
  }

  async function handleSave() {
    const hour = parseInt(formHour, 10);
    const minute = parseInt(formMinute, 10);
    if (isNaN(hour) || hour < 0 || hour > 23) { Alert.alert('Hora inválida', 'Digite um valor entre 0 e 23.'); return; }
    if (isNaN(minute) || minute < 0 || minute > 59) { Alert.alert('Minuto inválido', 'Digite um valor entre 0 e 59.'); return; }
    setSaving(true);
    const schedule: FeedingSchedule = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      petId,
      label: formLabel.trim() || 'Refeição',
      hour,
      minute,
      food: formFood.trim() || undefined,
      amount: formAmount.trim() || undefined,
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    await saveFeedingSchedule(schedule);
    await scheduleFeedingNotification(schedule, petName);
    setSchedules(prev => [...prev, schedule].sort((a, b) => a.hour - b.hour || a.minute - b.minute));
    setSaving(false);
    setModalVisible(false);
    showToast(`Lembrete de ${schedule.label} configurado!`, 'success');
  }

  async function handleToggle(schedule: FeedingSchedule) {
    const updated = { ...schedule, enabled: !schedule.enabled };
    await saveFeedingSchedule(updated);
    if (updated.enabled) {
      await scheduleFeedingNotification(updated, petName);
    } else {
      await cancelFeedingNotification(updated.id);
    }
    setSchedules(prev => prev.map(s => s.id === updated.id ? updated : s));
  }

  async function handleDelete(schedule: FeedingSchedule) {
    Alert.alert('Remover horário', `Remover lembrete de ${schedule.label}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          await deleteFeedingSchedule(schedule.id);
          await cancelFeedingNotification(schedule.id);
          setSchedules(prev => prev.filter(s => s.id !== schedule.id));
          showToast('Horário removido', 'success');
        },
      },
    ]);
  }

  function renderSchedule({ item }: { item: FeedingSchedule }) {
    const details = [item.food, item.amount].filter(Boolean).join(' · ');
    return (
      <View style={[styles.card, !item.enabled && styles.cardDisabled]}>
        <View style={[styles.cardIcon, { backgroundColor: colors.primary + '18' }]}>
          <Ionicons name={mealIcon(item.label)} size={20} color={item.enabled ? colors.primary : colors.textMuted} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardLabel, !item.enabled && styles.textMuted]}>{item.label}</Text>
          <Text style={styles.cardTime}>{timeLabel(item.hour, item.minute)}</Text>
          {!!details && <Text style={styles.cardDetails}>{details}</Text>}
        </View>
        <Switch
          value={item.enabled}
          onValueChange={() => handleToggle(item)}
          trackColor={{ false: colors.border, true: colors.primary + '88' }}
          thumbColor={item.enabled ? colors.primary : colors.textMuted}
        />
        <TouchableOpacity
          onPress={() => handleDelete(item)}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          accessibilityLabel="Remover horário"
        >
          <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
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
        <Text style={styles.headerTitle}>Alimentação{petName ? ` · ${petName}` : ''}</Text>
        <View style={styles.headerRight}>
          <ThemeToggle size={20} />
          <TouchableOpacity
            onPress={openModal}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Adicionar horário"
          >
            <Ionicons name="add" size={26} color={colors.primaryLight} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={schedules}
        keyExtractor={item => item.id}
        renderItem={renderSchedule}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          schedules.length > 0 ? (
            <View style={styles.infoCard}>
              <Ionicons name="notifications-outline" size={16} color={colors.primaryLight} />
              <Text style={styles.infoText}>
                Você receberá uma notificação diária nos horários configurados.
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyWrapper}>
            <EmptyState
              icon="restaurant-outline"
              title="Nenhum horário configurado"
              text={`Toque em + para adicionar os horários de refeição de ${petName || 'seu pet'} e receber lembretes diários.`}
            />
          </View>
        }
      />

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Novo horário de refeição</Text>

              <Text style={styles.fieldLabel}>Refeição</Text>
              <View style={styles.chipRow}>
                {PRESET_LABELS.map(label => (
                  <TouchableOpacity
                    key={label}
                    style={[styles.chip, formLabel === label && styles.chipActive]}
                    onPress={() => selectPreset(label)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, formLabel === label && styles.chipTextActive]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Horário</Text>
              <View style={styles.timeRow}>
                <TextInput
                  style={styles.timeInput}
                  value={formHour}
                  onChangeText={setFormHour}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="07"
                  placeholderTextColor={colors.textMuted}
                  selectTextOnFocus
                />
                <Text style={styles.timeSep}>:</Text>
                <TextInput
                  style={styles.timeInput}
                  value={formMinute}
                  onChangeText={setFormMinute}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="00"
                  placeholderTextColor={colors.textMuted}
                  selectTextOnFocus
                />
              </View>

              <Text style={styles.fieldLabel}>Tipo de ração <Text style={styles.optional}>(opcional)</Text></Text>
              <TextInput
                style={styles.input}
                value={formFood}
                onChangeText={setFormFood}
                placeholder="Ex: Royal Canin Golden"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.fieldLabel}>Quantidade <Text style={styles.optional}>(opcional)</Text></Text>
              <TextInput
                style={styles.input}
                value={formAmount}
                onChangeText={setFormAmount}
                placeholder="Ex: 200g, 1 xícara"
                placeholderTextColor={colors.textMuted}
              />

              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                <Text style={styles.saveBtnText}>{saving ? 'Salvando...' : 'Salvar horário'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  headerTitle: { fontSize: 16, fontWeight: '700', fontFamily: fonts.display, color: colors.text, flex: 1, marginHorizontal: spacing.sm },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 48 },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary + '33',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoText: { flex: 1, fontSize: 13, fontFamily: fonts.text, color: colors.textSubtle, lineHeight: 18 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  cardDisabled: { opacity: 0.5 },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1, gap: 1 },
  cardLabel: { fontSize: 14, fontFamily: fonts.textSemibold, fontWeight: '600', color: colors.text },
  cardTime: { fontSize: 20, fontFamily: fonts.displayExtra, fontWeight: '800', color: colors.primary },
  cardDetails: { fontSize: 12, fontFamily: fonts.text, color: colors.textMuted, marginTop: 2 },
  textMuted: { color: colors.textMuted },
  emptyWrapper: { paddingTop: spacing.xxl },
  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    maxHeight: '90%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: { fontSize: 18, fontFamily: fonts.display, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
  fieldLabel: { fontSize: 13, fontFamily: fonts.textSemibold, fontWeight: '600', color: colors.textSubtle, marginBottom: spacing.xs, marginTop: spacing.md },
  optional: { fontFamily: fonts.text, fontWeight: '400', color: colors.textMuted },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  chipText: { fontSize: 13, fontFamily: fonts.textMedium, fontWeight: '500', color: colors.textMuted },
  chipTextActive: { color: colors.primaryStrong, fontFamily: fonts.textBold, fontWeight: '700' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  timeInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    fontSize: 28,
    fontFamily: fonts.displayExtra,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  timeSep: { fontSize: 28, fontFamily: fonts.displayExtra, fontWeight: '800', color: colors.text },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    fontSize: 15,
    fontFamily: fonts.text,
    color: colors.text,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
    shadowColor: colors.primary,
    ...shadows.md,
    shadowOpacity: 0.3,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 15, fontFamily: fonts.textBold, fontWeight: '700', color: colors.onPrimary },
  cancelBtn: { alignItems: 'center', padding: spacing.md },
  cancelBtnText: { fontSize: 14, fontFamily: fonts.text, color: colors.textMuted },
});
