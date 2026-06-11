import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { Input } from '../components/Input';
import { EmptyState } from '../components/EmptyState';
import { colors, spacing, radius } from '../theme';
import { getDocuments, saveDocument, deleteDocument } from '../storage';
import { persistDocumentFile } from '../storage/files';
import { maskDate, isValidDate, toISO, displayDate } from '../utils/date';
import { DOCUMENT_KIND_LABELS } from '../labels';
import { PetDocument, DocumentKind, RootStackParamList } from '../types';

type Route = RouteProp<RootStackParamList, 'Documents'>;

const KINDS: DocumentKind[] = ['exam', 'prescription', 'vaccination_card', 'other'];

const KIND_ICONS: Record<DocumentKind, keyof typeof Ionicons.glyphMap> = {
  exam: 'flask',
  prescription: 'receipt',
  vaccination_card: 'card',
  other: 'document',
};

interface PendingFile {
  uri: string;
  name: string;
  mimeType?: string;
}

export default function DocumentsScreen() {
  const navigation = useNavigation();
  const { petId } = useRoute<Route>().params;

  const [documents, setDocuments] = useState<PetDocument[]>([]);
  const [pending, setPending] = useState<PendingFile | null>(null);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<DocumentKind>('exam');
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    getDocuments(petId)
      .then(setDocuments)
      .catch(() => Alert.alert('Erro', 'Não foi possível carregar os documentos.'));
  }, [petId]);

  useFocusEffect(load);

  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setPending({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType });
    setTitle(asset.name.replace(/\.\w+$/, ''));
  }

  async function handleSave() {
    if (!pending) return;
    if (!title.trim()) {
      Alert.alert('Campo obrigatório', 'Informe o título do documento.');
      return;
    }
    if (!date || !isValidDate(date)) {
      Alert.alert('Data inválida', 'Informe uma data válida (DD/MM/AAAA).');
      return;
    }
    setSaving(true);
    try {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const uri = await persistDocumentFile(pending.uri, id);
      await saveDocument({
        id,
        petId,
        title: title.trim(),
        kind,
        date: toISO(date),
        uri,
        mimeType: pending.mimeType,
        createdAt: new Date().toISOString(),
      });
      setPending(null);
      setTitle('');
      setDate('');
      setKind('exam');
      load();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o documento.');
    } finally {
      setSaving(false);
    }
  }

  async function openDocument(doc: PetDocument) {
    if (Platform.OS === 'web') {
      Alert.alert('Indisponível', 'Abra os documentos pelo aplicativo no celular.');
      return;
    }
    try {
      await Sharing.shareAsync(doc.uri, { mimeType: doc.mimeType });
    } catch {
      Alert.alert('Erro', 'Não foi possível abrir o documento.');
    }
  }

  function confirmDelete(doc: PetDocument) {
    Alert.alert('Excluir documento', `Remover "${doc.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDocument(doc.id);
            load();
          } catch {
            Alert.alert('Erro', 'Não foi possível excluir o documento.');
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
        <Text style={styles.headerTitle}>Exames e Documentos</Text>
        <TouchableOpacity
          onPress={pickFile}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Adicionar documento"
        >
          <Ionicons name="add" size={26} color={colors.primaryLight} />
        </TouchableOpacity>
      </View>

      {pending ? (
        <View style={styles.form}>
          <View style={styles.fileRow}>
            <Ionicons name="attach" size={16} color={colors.primaryLight} />
            <Text style={styles.fileName} numberOfLines={1}>
              {pending.name}
            </Text>
            <TouchableOpacity onPress={() => setPending(null)}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Input label="Título" placeholder="Ex: Hemograma completo" value={title} onChangeText={setTitle} />

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Tipo</Text>
            <View style={styles.chips}>
              {KINDS.map(k => (
                <TouchableOpacity
                  key={k}
                  style={[styles.chip, kind === k && styles.chipActive]}
                  onPress={() => setKind(k)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, kind === k && styles.chipTextActive]}>
                    {DOCUMENT_KIND_LABELS[k]}
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
          />

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Salvando...' : 'Salvar Documento'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={documents}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.docRow}
              onPress={() => openDocument(item)}
              onLongPress={() => confirmDelete(item)}
              activeOpacity={0.7}
            >
              <View style={styles.docIcon}>
                <Ionicons name={KIND_ICONS[item.kind]} size={18} color={colors.primaryLight} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.docTitle}>{item.title}</Text>
                <Text style={styles.docMeta}>
                  {DOCUMENT_KIND_LABELS[item.kind]} · {displayDate(item.date)}
                </Text>
              </View>
              <Ionicons name="open-outline" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrapper}>
              <EmptyState
                icon="folder-open-outline"
                title="Nenhum documento"
                text="Toque em + para anexar exames, receitas ou a carteirinha de vacinação (PDF ou imagem). Toque e segure um documento para excluir."
              />
            </View>
          }
        />
      )}
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
  list: { paddingHorizontal: spacing.lg, paddingBottom: 48 },
  emptyWrapper: { paddingTop: spacing.xxl },
  form: { padding: spacing.lg, gap: spacing.lg },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  fileName: { flex: 1, fontSize: 13, color: colors.textSubtle },
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
  chipText: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  chipTextActive: { color: '#fff' },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  docIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  docMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
