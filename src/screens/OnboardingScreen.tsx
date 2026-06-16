import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { spacing, typography, fonts, useThemedStyles, Palette } from '../theme';
import { onboardingRepository } from '../repositories/onboardingRepository';
import { Button } from '../components/Button';
import { RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;

const SLIDES: Array<{ image: any; title: string; text: string }> = [
  {
    image: require('../../assets/icons/paw.png'),
    title: 'Cadastre seus pets',
    text: 'Adicione foto, espécie, raça e data de nascimento de cada um dos seus companheiros.',
  },
  {
    image: require('../../assets/icons/heart.png'),
    title: 'Registre vacinas, consultas, remédios e peso',
    text: 'Mantenha o histórico de saúde completo e organizado, sempre à mão.',
  },
  {
    image: require('../../assets/icons/shield.png'),
    title: 'Receba lembretes',
    text: 'Vacinas, retornos e fim de tratamentos avisam você antes de vencer.',
  },
  {
    image: require('../../assets/icons/document.png'),
    title: 'Guarde documentos importantes',
    text: 'Exames, receitas e carteiras de vacinação digitalizados em um só lugar.',
  },
];

export default function OnboardingScreen() {
  const navigation = useNavigation<Nav>();
  const styles = useThemedStyles(createStyles);

  async function handleStart() {
    await onboardingRepository.setSeen();
    navigation.replace('Dashboard');
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.appName}>PetCare</Text>
        <Text style={styles.subtitle}>Tudo sobre a saúde do seu pet, em um só lugar</Text>
      </View>

      <View style={styles.slides}>
        {SLIDES.map(slide => (
          <View key={slide.title} style={styles.slide}>
            <View style={styles.iconWrap}>
              <Image source={slide.image} style={styles.icon} resizeMode="contain" />
            </View>
            <View style={styles.slideText}>
              <Text style={styles.slideTitle}>{slide.title}</Text>
              <Text style={styles.slideBody}>{slide.text}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Button label="Começar" onPress={handleStart} accessibilityLabel="Começar a usar o PetCare" />
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xl,
    },
    appName: {
      fontSize: typography.h1.fontSize,
      fontWeight: typography.h1.fontWeight,
      fontFamily: typography.h1.fontFamily,
      color: colors.primary,
      letterSpacing: typography.h1.letterSpacing,
    },
    subtitle: {
      fontSize: typography.body.fontSize,
      fontFamily: typography.body.fontFamily,
      color: colors.textMuted,
      marginTop: spacing.xs,
    },
    slides: {
      flex: 1,
      paddingHorizontal: spacing.lg,
      justifyContent: 'center',
      gap: spacing.xl,
    },
    slide: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    iconWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    icon: { width: 28, height: 28 },
    slideText: { flex: 1, gap: 2 },
    slideTitle: {
      fontSize: typography.h4.fontSize,
      fontWeight: typography.h4.fontWeight,
      fontFamily: typography.h4.fontFamily,
      color: colors.text,
    },
    slideBody: {
      fontSize: typography.label.fontSize,
      fontFamily: fonts.text,
      color: colors.textSubtle,
      lineHeight: 18,
    },
    footer: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
    },
  });
