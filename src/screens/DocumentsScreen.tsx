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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
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

type Nav = NativeStackNavigationProp<RootStackParamList, 'Documents'>;
type Route = RouteProp<RootStackParamList, 'Documents'>;

const KINDS: DocumentKind[] = ['vaccination_card', 'exam', 'prescription', 'other'];

const KIND_ICONS: Record<DocumentKind, keyof typeof Ionicons.glyphMap> = {
  exam: 'flask',
  prescription: 'receipt',
  vaccination_card: 'card',
  other: 'document',
};

const KIND_COLORS: Record<DocumentKind, string> = {
  vaccination_card: colors.success,
  exam: colors.primaryLight,
  prescription: colors.warning,
  other: colors.textSubtle,
};

const KIND_HINTS: Record<DocumentKind, string> = {
  vaccination_card: 'Carteira de vacinação do pet',
  exam: 'Hemogramas, raio-x, ultrassom...',
  prescription: 'Receitas e prescrições do veterinário',
  other: 'Qualquer outro documento',
};

interface PendingFile {
  uri: string;
  name: string;
  mimeType?: string;
}

export default function DocumentsScreen() {
  const navigation = useNavigation<Nav>();
  const { petId, kind } = useRoute<Route>().params;

  const [documents, setDocuments] = useState<PetDocument[]>([]);
  const [pending, setPending] = useState<PendingFile | null>(null);
  const [title, setTitle] = useState('');
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
    if (!pending || !kind) return;
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

  // ------------------------- Modo 1: lista de categorias -------------------------

  if (!kind) {
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
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.categories}>
          {KINDS.map(k => {
            const count = documents.filter(d => d.kind === k).length;
            return (
              <TouchableOpacity
                key={k}
                style={styles.categoryCard}
                onPress={() => navigation.navigate('Documents', { petId, kind: k })}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={DOCUMENT_KIND_LABELS[k]}
              >
                <View style={[styles.categoryIcon, { backgroundColor: KIND_COLORS[k] + '18' }]}>
                  <Ionicons name={KIND_ICONS[k]} size={20} color={KIND_COLORS[k]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.categoryTitle}>{DOCUMENT_KIND_LABELS[k]}</Text>
                  <Text style={styles.categoryHint}>{KIND_HINTS[k]}</Text>
                </View>
                <View style={styles.categoryCount}>
                  <Text style={styles.categoryCountText}>{count}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            );
          })}
        </View>
      </SafeAreaView>
    );
  }

  // ----------------------- Modo 2: documentos da categoria -----------------------

  const kindDocs = documents.filter(d => d.kind === kind);

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
        <Text style={styles.headerTitle}>{DOCUMENT_KIND_LABELS[kind]}</Text>
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

          <Input
            label="Título"
            placeholder={kind === 'exam' ? 'Ex: Hemograma completo' : 'Ex: ' + DOCUMENT_KIND_LABELS[kind]}
            value={title}
            onChangeText={setTitle}
          />

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
          data={kindDocs}
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
                <Ionicons name={KIND_ICONS[item.kind]} size={18} color={KIND_COLORS[item.kind]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.docTitle}>{item.title}</Text>
                <Text style={styles.docMeta}>{displayDate(item.date)}</Text>
              </View>
              <Ionicons name="open-outline" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrapper}>
              <EmptyState
                icon={KIND_ICONS[kind]}
                title={`Nenhum documento em ${DOCUMENT_KIND_LABELS[kind]}`}
                text="Toque em + para anexar um PDF ou imagem. Toque e segure um documento para excluir."
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
  categories: { padding: spacing.lg, gap: spacing.sm },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  categoryHint: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  categoryCount: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  categoryCountText: { fontSize: 12, fontWeight: '600', color: colors.textSubtle },
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
