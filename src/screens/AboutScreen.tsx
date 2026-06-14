import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';
import { spacing, radius, typography, useTheme, useThemedStyles, Palette } from '../theme';
import { backupRepository } from '../repositories/backupRepository';
import { petsRepository } from '../repositories/petsRepository';
import { recordsRepository } from '../repositories/recordsRepository';
import { displayDate } from '../utils/date';
import { useToast } from '../hooks/useToast';
import { ThemeToggle } from '../components/ThemeToggle';
import { Button } from '../components/Button';

const FEATURES = [
  { image: require('../../assets/icons/shield.png'), label: 'Proteção', text: 'Segurança' },
  { image: require('../../assets/icons/paw.png'), label: 'Pet', text: 'Amor' },
  { image: require('../../assets/icons/document.png'), label: 'Histórico', text: 'Organização' },
  { image: require('../../assets/icons/heart.png'), label: 'Cuidado', text: 'Bem-estar' },
];

export default function AboutScreen() {
  const navigation = useNavigation();
  const { colors, scheme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { showToast } = useToast();
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const busy = exporting || importing || loadingDemo;

  useFocusEffect(
    useCallback(() => {
      backupRepository.getLastBackupDate().then(setLastBackup).catch(() => {});
    }, []),
  );

  async function handleExport() {
    setExporting(true);
    try {
      const json = await backupRepository.export();
      const date = new Date().toISOString().slice(0, 10);
      const uri = `${FileSystem.cacheDirectory}petcare-backup-${date}.json`;
      await FileSystem.writeAsStringAsync(uri, json);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/json',
          dialogTitle: 'Salvar backup do PetCare',
        });
      }
      setLastBackup(await backupRepository.getLastBackupDate());
      showToast('Backup exportado com sucesso');
    } catch {
      Alert.alert('Erro', 'Não foi possível gerar o backup.');
    } finally {
      setExporting(false);
    }
  }

  async function handleImport() {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;

    let json: string;
    try {
      json = await FileSystem.readAsStringAsync(result.assets[0].uri);
    } catch {
      Alert.alert('Erro', 'Não foi possível ler o arquivo selecionado.');
      return;
    }

    let summary: { pets: number; records: number; exportedAt?: string };
    try {
      summary = backupRepository.peekSummary(json);
    } catch {
      Alert.alert('Erro', 'Arquivo de backup inválido ou corrompido.');
      return;
    }

    const [currentPets, currentRecords] = await Promise.all([petsRepository.getAll(), recordsRepository.getAll()]);
    const exportedAtText = summary.exportedAt ? displayDate(summary.exportedAt.slice(0, 10)) : 'data desconhecida';

    Alert.alert(
      'Restaurar backup',
      `Este backup tem ${summary.pets} ${summary.pets === 1 ? 'pet' : 'pets'} e ${summary.records} ${summary.records === 1 ? 'registro' : 'registros'}, exportado em ${exportedAtText}.\n\n` +
        `Seus dados atuais (${currentPets.length} ${currentPets.length === 1 ? 'pet' : 'pets'}, ${currentRecords.length} ${currentRecords.length === 1 ? 'registro' : 'registros'}) serão substituídos. Fotos e documentos só continuam disponíveis se este backup for do mesmo aparelho.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          style: 'destructive',
          onPress: async () => {
            setImporting(true);
            try {
              const { pets, records } = await backupRepository.import(json);
              showToast(
                `${pets} ${pets === 1 ? 'pet' : 'pets'} e ${records} ${records === 1 ? 'registro' : 'registros'} importados`,
              );
            } catch {
              Alert.alert('Erro', 'Arquivo de backup inválido ou corrompido.');
            } finally {
              setImporting(false);
            }
          },
        },
      ],
    );
  }

  function handleLoadDemoData() {
    Alert.alert(
      'Carregar dados de demonstração',
      'Isso substitui TODOS os seus dados atuais por pets, registros e pesagens fictícios, pensados para demonstrar o app. Esta ação não pode ser desfeita. Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Carregar',
          style: 'destructive',
          onPress: async () => {
            setLoadingDemo(true);
            try {
              await backupRepository.loadDemoData();
              showToast('Dados de demonstração carregados');
            } catch {
              Alert.alert('Erro', 'Não foi possível carregar os dados de demonstração.');
            } finally {
              setLoadingDemo(false);
            }
          },
        },
      ],
    );
  }

  const lastBackupText = lastBackup
    ? `Último backup: ${displayDate(lastBackup.slice(0, 10))} às ${lastBackup.slice(11, 16)}`
    : 'Nenhum backup ainda';

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
        <Text style={styles.headerTitle}>Sobre</Text>
        <ThemeToggle />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Image
          source={
            scheme === 'dark'
              ? require('../../assets/logo-dark.png')
              : require('../../assets/logo-light.png')
          }
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.slogan}>Cuidar é o nosso compromisso ♡</Text>

        <View style={styles.features}>
          {FEATURES.map(f => (
            <View key={f.label} style={styles.feature}>
              <Image source={f.image} style={styles.featureIcon} resizeMode="contain" />
              <Text style={styles.featureLabel}>{f.label}</Text>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.description}>
          O PetCare guarda o prontuário completo dos seus pets: vacinas, consultas, medicamentos,
          peso, exames e documentos — tudo organizado e sempre à mão, inclusive em emergências.
        </Text>

        <View style={styles.backupSection}>
          <Text style={styles.backupTitle}>Seus dados</Text>
          <Text style={styles.lastBackup}>{lastBackupText}</Text>
          <Button
            label={exporting ? 'Gerando backup...' : 'Exportar backup'}
            icon="download-outline"
            variant="secondary"
            onPress={handleExport}
            loading={exporting}
            disabled={busy && !exporting}
          />
          <Button
            label={importing ? 'Restaurando...' : 'Restaurar backup'}
            icon="refresh-outline"
            variant="secondary"
            onPress={handleImport}
            loading={importing}
            disabled={busy && !importing}
          />
          <Text style={styles.backupHint}>
            O backup é um arquivo JSON com pets, registros, pesagens e documentos. Os arquivos de
            fotos e documentos ficam salvos neste aparelho e não viajam dentro do backup.
          </Text>
        </View>

        <View style={styles.backupSection}>
          <Text style={styles.backupTitle}>Modo demonstração</Text>
          <Button
            label={loadingDemo ? 'Carregando...' : 'Carregar dados de demonstração'}
            icon="sparkles-outline"
            variant="secondary"
            onPress={handleLoadDemoData}
            loading={loadingDemo}
            disabled={busy && !loadingDemo}
          />
          <Text style={styles.backupHint}>
            Preenche o app com pets fictícios e histórico de exemplo — útil para explorar as
            funcionalidades. Substitui seus dados atuais.
          </Text>
        </View>

        <Text style={styles.version}>Versão {version}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontSize: typography.h4.fontSize,
    fontWeight: typography.h4.fontWeight,
    color: colors.text,
  },
  scroll: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: 48,
  },
  logo: {
    width: 240,
    height: 80,
  },
  slogan: {
    marginTop: spacing.sm,
    fontSize: 14,
    color: colors.textSubtle,
  },
  features: {
    flexDirection: 'row',
    marginTop: spacing.xxl,
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  feature: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    gap: 4,
  },
  featureIcon: {
    width: 28,
    height: 28,
    marginBottom: 2,
  },
  featureLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  featureText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'center',
  },
  backupSection: {
    width: '100%',
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  backupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  lastBackup: {
    fontSize: 12,
    color: colors.textSubtle,
    marginBottom: spacing.xs,
  },
  backupHint: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.textSubtle,
  },
  version: {
    marginTop: spacing.xl,
    fontSize: 12,
    color: colors.textSubtle,
  },
});
