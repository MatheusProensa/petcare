import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as Sharing from 'expo-sharing';
import { colors, spacing } from '../theme';
import { RootStackParamList } from '../types';

type Route = RouteProp<RootStackParamList, 'DocumentViewer'>;

/** Visualizador de imagens dentro do app (sem sair para compartilhar). */
export default function DocumentViewerScreen() {
  const navigation = useNavigation();
  const { uri, title, mimeType } = useRoute<Route>().params;

  async function handleShare() {
    try {
      await Sharing.shareAsync(uri, { mimeType });
    } catch {
      Alert.alert('Erro', 'Não foi possível compartilhar o documento.');
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
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <TouchableOpacity
          onPress={handleShare}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Compartilhar documento"
        >
          <Ionicons name="share-social-outline" size={22} color={colors.textSubtle} />
        </TouchableOpacity>
      </View>

      <Image source={{ uri }} style={styles.image} resizeMode="contain" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },
  headerTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text, textAlign: 'center' },
  image: { flex: 1 },
});
