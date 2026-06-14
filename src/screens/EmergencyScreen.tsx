import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Input } from '../components/Input';
import { ThemeToggle } from '../components/ThemeToggle';
import { Button } from '../components/Button';
import { spacing, radius, useTheme, useThemedStyles, Palette } from '../theme';
import { useToast } from '../hooks/useToast';
import { getPets, getRecords, getTutorInfo, saveTutorInfo } from '../storage';
import { isActiveMedication } from '../services/events';
import { shareTravelKitPdf } from '../services/travelKit';
import { FREQUENCY_LABELS } from '../labels';
import { Pet, MedicalRecord, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Emergency'>;
type Route = RouteProp<RootStackParamList, 'Emergency'>;

function InfoBlock({ label, value }: { label: string; value?: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.infoBlock}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, !value && styles.infoEmpty]}>{value || 'Não informado'}</Text>
    </View>
  );
}

export default function EmergencyScreen() {
  const navigation = useNavigation<Nav>();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { showToast } = useToast();
  const { petId } = useRoute<Route>().params;

  const [pet, setPet] = useState<Pet | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [activeMeds, setActiveMeds] = useState<MedicalRecord[]>([]);
  const [tutorName, setTutorName] = useState('');
  const [tutorPhone, setTutorPhone] = useState('');
  const [editingTutor, setEditingTutor] = useState(false);
  const [generatingKit, setGeneratingKit] = useState(false);

  useFocusEffect(
    useCallback(() => {
      Promise.all([
        getPets().then(pets => setPet(pets.find(p => p.id === petId) ?? null)),
        getRecords(petId).then(loaded => {
          setRecords(loaded);
          setActiveMeds(loaded.filter(isActiveMedication));
        }),
        getTutorInfo().then(info => {
          setTutorName(info.name);
          setTutorPhone(info.phone);
        }),
      ]).catch(() => Alert.alert('Erro', 'Não foi possível carregar os dados de emergência.'));
    }, [petId]),
  );

  const handleGenerateTravelKit = useCallback(async () => {
    if (!pet) return;
    setGeneratingKit(true);
    try {
      await shareTravelKitPdf(pet, { name: tutorName, phone: tutorPhone }, records);
    } catch {
      Alert.alert('Erro', 'Não foi possível gerar o Kit Viagem.');
    } finally {
      setGeneratingKit(false);
    }
  }, [pet, tutorName, tutorPhone, records]);

  async function handleSaveTutor() {
    if (tutorPhone.trim() && !/\d/.test(tutorPhone)) {
      Alert.alert('Telefone inválido', 'Informe um número de telefone válido.');
      return;
    }
    try {
      await saveTutorInfo({ name: tutorName.trim(), phone: tutorPhone.trim() });
      setEditingTutor(false);
      showToast('Dados do tutor salvos');
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar os dados do tutor.');
    }
  }

  function handleCancelTutor() {
    getTutorInfo().then(info => {
      setTutorName(info.name);
      setTutorPhone(info.phone);
    });
    setEditingTutor(false);
  }

  function call(phone?: string) {
    if (!phone) return;
    Linking.openURL(`tel:${phone.replace(/\D/g, '')}`).catch(() => {
      Alert.alert('Erro', 'Não foi possível iniciar a ligação.');
    });
  }

  const profile = pet?.medicalProfile;

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
        <Text style={styles.headerTitle}>Emergência{pet ? ` · ${pet.name}` : ''}</Text>
        <ThemeToggle />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.banner}>
          <Ionicons name="warning" size={18} color={colors.warning} />
          <Text style={styles.bannerText}>
            Informações rápidas para mostrar ao veterinário em uma emergência.
          </Text>
        </View>

        {/* Tutor */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Tutor</Text>
            <View style={styles.cardHeaderActions}>
              {editingTutor && (
                <TouchableOpacity
                  onPress={handleCancelTutor}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.cardActionMuted}>Cancelar</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => (editingTutor ? handleSaveTutor() : setEditingTutor(true))}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.cardAction}>{editingTutor ? 'Salvar' : 'Editar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
          {editingTutor ? (
            <View style={{ gap: spacing.md }}>
              <Input label="Nome do tutor" value={tutorName} onChangeText={setTutorName} />
              <Input
                label="Telefone"
                value={tutorPhone}
                onChangeText={setTutorPhone}
                keyboardType="phone-pad"
              />
            </View>
          ) : (
            <>
              <InfoBlock label="Nome" value={tutorName} />
              <View style={styles.phoneRow}>
                <InfoBlock label="Telefone" value={tutorPhone} />
                {tutorPhone ? (
                  <TouchableOpacity
                    style={styles.callBtn}
                    onPress={() => call(tutorPhone)}
                    accessibilityRole="button"
                    accessibilityLabel="Ligar para o tutor"
                  >
                    <Ionicons name="call" size={16} color="#fff" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </>
          )}
        </View>

        {/* Veterinário */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Veterinário</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('MedicalProfile', { petId })}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.cardAction}>Editar</Text>
            </TouchableOpacity>
          </View>
          <InfoBlock label="Nome" value={profile?.vetName} />
          <View style={styles.phoneRow}>
            <InfoBlock label="Telefone" value={profile?.vetPhone} />
            {profile?.vetPhone ? (
              <TouchableOpacity
                style={styles.callBtn}
                onPress={() => call(profile.vetPhone)}
                accessibilityRole="button"
                accessibilityLabel="Ligar para o veterinário"
              >
                <Ionicons name="call" size={16} color="#fff" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Saúde */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Saúde</Text>
          <InfoBlock label="Alergias" value={profile?.allergies} />
          <InfoBlock label="Doenças crônicas" value={profile?.chronicConditions} />
          <InfoBlock label="Tipo sanguíneo" value={profile?.bloodType} />
          <InfoBlock label="Observações importantes" value={profile?.notes} />
        </View>

        {/* Medicamentos em uso */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Medicamentos em uso</Text>
          {activeMeds.length === 0 ? (
            <Text style={styles.infoEmpty}>Nenhum medicamento ativo.</Text>
          ) : (
            activeMeds.map(med => (
              <View key={med.id} style={styles.medRow}>
                <Ionicons name="medkit" size={14} color={colors.warning} />
                <Text style={styles.medText}>
                  {med.title}
                  {med.dosage ? ` · ${med.dosage}` : ''}
                  {med.frequency ? ` · ${FREQUENCY_LABELS[med.frequency]}` : ''}
                </Text>
              </View>
            ))
          )}
        </View>

        <Button
          label="Gerar Kit Viagem"
          icon="airplane-outline"
          variant="secondary"
          loading={generatingKit}
          onPress={handleGenerateTravelKit}
        />
      </ScrollView>
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
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: 48 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warning + '15',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.warning + '44',
    padding: spacing.md,
  },
  bannerText: { flex: 1, fontSize: 13, color: colors.textSubtle, lineHeight: 19 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  cardHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  cardAction: { fontSize: 13, fontWeight: '600', color: colors.primaryLight },
  cardActionMuted: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  infoBlock: { gap: 2, flex: 1 },
  infoLabel: { fontSize: 11, color: colors.textMuted, letterSpacing: 0.4 },
  infoValue: { fontSize: 14, color: colors.text, lineHeight: 20 },
  infoEmpty: { fontSize: 14, color: colors.textMuted, fontStyle: 'italic' },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  callBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  medText: { fontSize: 14, color: colors.textSubtle, flex: 1 },
});
