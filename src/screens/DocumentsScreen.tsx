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
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import * as FileSystem from 'expo-file-system/legacy';
import { Input } from '../components/Input';
import { ThemeToggle } from '../components/ThemeToggle';
import { EmptyState } from '../components/EmptyState';
import { spacing, radius, useTheme, useThemedStyles, Palette } from '../theme';
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

function kindColors(colors: Palette): Record<DocumentKind, string> {
  return {
    vaccination_card: colors.success,
    exam: colors.info,
    prescription: colors.warning,
    other: colors.textSubtle,
  };
}

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
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const KIND_COLORS = kindColors(colors);
  const { petId, kind } = useRoute<Route>().params;

  const [documents, setDocuments] = useState<PetDocument[]>([]);
  const [pending, setPending] = useState<PendingFile | null>(null);
  const [editingDoc, setEditingDoc] = useState<PetDocument | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    getDocuments(petId)
      .then(setDocuments)
      .catch(() => Alert.alert('Erro', 'Não foi possível carregar os documentos.'));
  }, [petId]);

  useFocusEffect(load);

  async function pickFromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera para tirar a foto.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const name = `foto-${Date.now()}.jpg`;
    setPending({ uri: asset.uri, name, mimeType: asset.mimeType ?? 'image/jpeg' });
    setTitle(prev => prev || (kind ? DOCUMENT_KIND_LABELS[kind] : ''));
  }

  async function pickFromGallery() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria para selecionar a foto.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const name = asset.fileName ?? `foto-${Date.now()}.jpg`;
    setPending({ uri: asset.uri, name, mimeType: asset.mimeType ?? 'image/jpeg' });
    setTitle(prev => prev || name.replace(/\.\w+$/, ''));
  }

  async function pickFromFiles() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setPending({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType });
    setTitle(asset.name.replace(/\.\w+$/, ''));
  }

  function pickFile() {
    Alert.alert('Adicionar documento', 'De onde vem o arquivo?', [
      { text: 'Tirar foto', onPress: pickFromCamera },
      { text: 'Galeria', onPress: pickFromGallery },
      { text: 'Arquivo (PDF/imagem)', onPress: pickFromFiles },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  async function handleSave() {
    if ((!pending && !editingDoc) || !kind) return;
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
      if (editingDoc) {
        await saveDocument({
          ...editingDoc,
          title: title.trim(),
          date: toISO(date),
        });
      } else if (pending) {
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
      }
      setPending(null);
      setEditingDoc(null);
      setTitle('');
      setDate('');
      load();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o documento.');
    } finally {
      setSaving(false);
    }
  }

  function startEditing(doc: PetDocument) {
    setEditingDoc(doc);
    setTitle(doc.title);
    setDate(displayDate(doc.date));
  }

  function cancelForm() {
    setPending(null);
    setEditingDoc(null);
    setTitle('');
    setDate('');
  }

  function isImage(doc: PetDocument): boolean {
    if (doc.mimeType?.startsWith('image/')) return true;
    return /\.(jpe?g|png|gif|webp|heic)$/i.test(doc.uri);
  }

  // Visualiza sem abrir a folha de compartilhamento: imagens dentro do app,
  // PDFs no leitor padrão do sistema.
  async function openDocument(doc: PetDocument) {
    if (isImage(doc)) {
      navigation.navigate('DocumentViewer', {
        uri: doc.uri,
        title: doc.title,
        mimeType: doc.mimeType,
      });
      return;
    }
    if (Platform.OS === 'web') {
      Alert.alert('Indisponível', 'Abra os documentos pelo aplicativo no celular.');
      return;
    }
    try {
      if (Platform.OS === 'android') {
        const contentUri = await FileSystem.getContentUriAsync(doc.uri);
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: contentUri,
          type: doc.mimeType ?? 'application/pdf',
          flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
        });
      } else {
        await Sharing.shareAsync(doc.uri, { mimeType: doc.mimeType });
      }
    } catch {
      Alert.alert(
        'Não foi possível abrir',
        'Nenhum aplicativo de PDF encontrado. Instale um leitor de PDF ou use o toque longo para compartilhar.',
      );
    }
  }

  async function shareDocument(doc: PetDocument) {
    try {
      await Sharing.shareAsync(doc.uri, { mimeType: doc.mimeType });
    } catch {
      Alert.alert('Erro', 'Não foi possível compartilhar o documento.');
    }
  }

  function showOptions(doc: PetDocument) {
    Alert.alert(doc.title, 'O que deseja fazer?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Editar', onPress: () => startEditing(doc) },
      { text: 'Compartilhar', onPress: () => shareDocument(doc) },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
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
          <ThemeToggle />
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

      {pending || editingDoc ? (
        <View style={styles.form}>
          {pending && (
            <View style={styles.fileRow}>
              <Ionicons name="attach" size={16} color={colors.primaryLight} />
              <Text style={styles.fileName} numberOfLines={1}>
                {pending.name}
              </Text>
              <TouchableOpacity onPress={cancelForm}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          )}

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

          <View style={styles.formActions}>
            {editingDoc && (
              <TouchableOpacity style={styles.cancelBtn} onPress={cancelForm} activeOpacity={0.7}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.saveBtn, { flex: 1 }, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              <Text style={styles.saveBtnText}>
                {saving ? 'Salvando...' : editingDoc ? 'Salvar Alterações' : 'Salvar Documento'}
              </Text>
            </TouchableOpacity>
          </View>
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
              onLongPress={() => showOptions(item)}
              activeOpacity={0.7}
            >
              <View style={styles.docIcon}>
                <Ionicons name={KIND_ICONS[item.kind]} size={18} color={KIND_COLORS[item.kind]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.docTitle}>{item.title}</Text>
                <Text style={styles.docMeta}>{displayDate(item.date)}</Text>
              </View>
              <TouchableOpacity
                onPress={() => showOptions(item)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Opções do documento"
              >
                <Ionicons name="ellipsis-vertical" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrapper}>
              <EmptyState
                icon={KIND_ICONS[kind]}
                title={`Nenhum documento em ${DOCUMENT_KIND_LABELS[kind]}`}
                text="Toque em + para anexar um PDF ou imagem. Toque para visualizar ou use o menu (⋮) para editar, compartilhar ou excluir."
              />
            </View>
          }
        />
      )}
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
  formActions: { flexDirection: 'row', gap: spacing.sm },
  cancelBtn: {
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { fontSize: 16, fontWeight: '600', color: colors.textMuted },
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
