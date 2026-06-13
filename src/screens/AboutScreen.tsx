import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';
import { spacing, radius, useTheme, useThemedStyles, Palette } from '../theme';
import { exportBackup, importBackup } from '../storage';
import { ThemeToggle } from '../components/ThemeToggle';

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
  const version = Constants.expoConfig?.version ?? '1.0.0';

  async function handleExport() {
    try {
      const json = await exportBackup();
      const date = new Date().toISOString().slice(0, 10);
      const uri = `${FileSystem.cacheDirectory}petcare-backup-${date}.json`;
      await FileSystem.writeAsStringAsync(uri, json);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/json',
          dialogTitle: 'Salvar backup do PetCare',
        });
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível gerar o backup.');
    }
  }

  async function handleImport() {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    Alert.alert(
      'Restaurar backup',
      'Isso substitui TODOS os dados atuais pelos do arquivo. Fotos e documentos anexados só continuam disponíveis se este backup for do mesmo aparelho. Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          style: 'destructive',
          onPress: async () => {
            try {
              const json = await FileSystem.readAsStringAsync(result.assets[0].uri);
              const { pets, records } = await importBackup(json);
              Alert.alert(
                'Backup restaurado',
                `${pets} ${pets === 1 ? 'pet' : 'pets'} e ${records} ${records === 1 ? 'registro' : 'registros'} importados.`,
              );
            } catch {
              Alert.alert('Erro', 'Arquivo de backup inválido ou corrompido.');
            }
          },
        },
      ],
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
          <TouchableOpacity style={styles.backupBtn} onPress={handleExport} activeOpacity={0.8}>
            <Ionicons name="download-outline" size={18} color={colors.primary} />
            <Text style={styles.backupBtnText}>Exportar backup</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backupBtn} onPress={handleImport} activeOpacity={0.8}>
            <Ionicons name="refresh-outline" size={18} color={colors.primary} />
            <Text style={styles.backupBtnText}>Restaurar backup</Text>
          </TouchableOpacity>
          <Text style={styles.backupHint}>
            O backup é um arquivo JSON com pets, registros, pesagens e documentos. Os arquivos de
            fotos e documentos ficam salvos neste aparelho e não viajam dentro do backup.
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
  headerTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
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
  backupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  backupBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
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
