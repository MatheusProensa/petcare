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
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Input } from '../components/Input';
import { colors, spacing, radius } from '../theme';
import { getPets, savePet } from '../storage';
import { Pet, RootStackParamList } from '../types';

type Route = RouteProp<RootStackParamList, 'MedicalProfile'>;

function trimOrUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export default function MedicalProfileScreen() {
  const navigation = useNavigation();
  const { petId } = useRoute<Route>().params;

  const [pet, setPet] = useState<Pet | null>(null);
  const [neutered, setNeutered] = useState(false);
  const [allergies, setAllergies] = useState('');
  const [chronicConditions, setChronicConditions] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [vetName, setVetName] = useState('');
  const [vetPhone, setVetPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getPets()
      .then(pets => {
        const found = pets.find(p => p.id === petId);
        if (!found) return;
        setPet(found);
        const profile = found.medicalProfile;
        if (!profile) return;
        setNeutered(profile.neutered ?? false);
        setAllergies(profile.allergies ?? '');
        setChronicConditions(profile.chronicConditions ?? '');
        setBloodType(profile.bloodType ?? '');
        setVetName(profile.vetName ?? '');
        setVetPhone(profile.vetPhone ?? '');
        setNotes(profile.notes ?? '');
      })
      .catch(() => Alert.alert('Erro', 'Não foi possível carregar o perfil médico.'));
  }, [petId]);

  async function handleSave() {
    if (!pet) return;
    setSaving(true);
    try {
      await savePet({
        ...pet,
        medicalProfile: {
          neutered,
          allergies: trimOrUndefined(allergies),
          chronicConditions: trimOrUndefined(chronicConditions),
          bloodType: trimOrUndefined(bloodType),
          vetName: trimOrUndefined(vetName),
          vetPhone: trimOrUndefined(vetPhone),
          notes: trimOrUndefined(notes),
        },
      });
      navigation.goBack();
    } catch {
      setSaving(false);
      Alert.alert('Erro', 'Não foi possível salvar o perfil médico.');
    }
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
        <Text style={styles.headerTitle}>Perfil Médico</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>Castrado</Text>
              <Text style={styles.switchHint}>{neutered ? 'Sim' : 'Não'}</Text>
            </View>
            <Switch
              value={neutered}
              onValueChange={setNeutered}
              trackColor={{ false: colors.surfaceElevated, true: colors.primary }}
              thumbColor={colors.text}
            />
          </View>

          <Input
            label="Alergias"
            placeholder="Ex: Dipirona, frango"
            value={allergies}
            onChangeText={setAllergies}
            multiline
          />
          <Input
            label="Doenças crônicas"
            placeholder="Ex: Dermatite atópica"
            value={chronicConditions}
            onChangeText={setChronicConditions}
            multiline
          />
          <Input
            label="Tipo sanguíneo"
            placeholder="Ex: DEA 1.1 positivo"
            value={bloodType}
            onChangeText={setBloodType}
          />
          <Input
            label="Veterinário principal"
            placeholder="Ex: Dra. Ana Souza"
            value={vetName}
            onChangeText={setVetName}
          />
          <Input
            label="Telefone do veterinário"
            placeholder="Ex: (11) 99999-0000"
            value={vetPhone}
            onChangeText={setVetPhone}
            keyboardType="phone-pad"
          />
          <Input
            label="Observações médicas"
            placeholder="Informações importantes sobre a saúde do pet"
            value={notes}
            onChangeText={setNotes}
            multiline
          />

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving || !pet}
            activeOpacity={0.85}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Salvando...' : 'Salvar Perfil'}</Text>
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  switchLabel: { fontSize: 15, fontWeight: '500', color: colors.text },
  switchHint: { fontSize: 12, color: colors.textMuted },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
