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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Input } from '../components/Input';
import { colors, spacing, radius } from '../theme';
import { savePet } from '../storage';
import { persistPhoto } from '../storage/photos';
import { Species } from '../types';

const SPECIES: Species[] = ['Cão', 'Gato', 'Pássaro', 'Outro'];

function maskDate(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function isValidDate(d: string): boolean {
  if (d.length < 10) return false;
  const [day, month, year] = d.split('/').map(Number);
  if (!day || !month || !year || year < 1900 || year > new Date().getFullYear()) return false;
  const date = new Date(year, month - 1, day);
  return date.getMonth() === month - 1;
}

function toISO(d: string): string {
  const [day, month, year] = d.split('/');
  return `${year}-${month}-${day}`;
}

export default function AddPetScreen() {
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [species, setSpecies] = useState<Species>('Cão');
  const [breed, setBreed] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [photo, setPhoto] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria para selecionar a foto.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setPhoto(result.assets[0].uri);
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Campo obrigatório', 'Informe o nome do pet.');
      return;
    }
    if (birthDate && !isValidDate(birthDate)) {
      Alert.alert('Data inválida', 'Verifique a data de nascimento (DD/MM/AAAA).');
      return;
    }
    setSaving(true);
    try {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await savePet({
        id,
        name: name.trim(),
        species,
        breed: breed.trim(),
        birthDate: birthDate ? toISO(birthDate) : '',
        photo: photo ? await persistPhoto(photo, id) : undefined,
        createdAt: new Date().toISOString(),
      });
      navigation.goBack();
    } catch {
      setSaving(false);
      Alert.alert('Erro', 'Não foi possível salvar o pet. Tente novamente.');
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
        <Text style={styles.headerTitle}>Novo Pet</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto} activeOpacity={0.8}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="camera" size={28} color={colors.primaryLight} />
              </View>
            )}
            <View style={styles.photoBadge}>
              <Ionicons name="add" size={14} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.photoHint}>Toque para adicionar foto</Text>

          <View style={styles.form}>
            <Input
              label="Nome do pet"
              placeholder="Ex: Thor"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="next"
            />

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Espécie</Text>
              <View style={styles.chips}>
                {SPECIES.map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, species === s && styles.chipActive]}
                    onPress={() => setSpecies(s)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, species === s && styles.chipTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Input
              label="Raça (opcional)"
              placeholder="Ex: Golden Retriever"
              value={breed}
              onChangeText={setBreed}
              autoCapitalize="words"
              returnKeyType="next"
            />

            <Input
              label="Data de nascimento (opcional)"
              placeholder="DD/MM/AAAA"
              value={birthDate}
              onChangeText={t => setBirthDate(maskDate(t))}
              keyboardType="numeric"
              maxLength={10}
              returnKeyType="done"
            />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Salvando...' : 'Salvar Pet'}</Text>
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
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 48,
    alignItems: 'center',
  },
  photoBtn: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    position: 'relative',
  },
  photo: { width: 100, height: 100, borderRadius: 50 },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  photoHint: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.xl },
  form: { width: '100%', gap: spacing.lg, marginBottom: spacing.xl },
  field: { gap: spacing.xs },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: colors.textSubtle, letterSpacing: 0.3 },
  chips: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, color: colors.textMuted, fontWeight: '500' },
  chipTextActive: { color: '#fff' },
  saveBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
