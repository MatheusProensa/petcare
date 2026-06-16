import React, { useState } from 'react';
import { View, Text, Image, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing, typography, fonts, useThemedStyles, Palette } from '../theme';
import { Button } from '../components/Button';
import { signInWithGoogle } from '../services/firebase';
import { syncDown } from '../services/cloudSync';

interface Props {
  onSignedIn: (uid: string, isNewUser: boolean) => void;
}

export default function LoginScreen({ onSignedIn }: Props) {
  const styles = useThemedStyles(createStyles);
  const [loading, setLoading] = useState(false);

  async function handleGoogle() {
    setLoading(true);
    try {
      const result = await signInWithGoogle();
      const uid = result.user.uid;
      const isNewUser = result.additionalUserInfo?.isNewUser ?? false;
      onSignedIn(uid, isNewUser);
    } catch (e: any) {
      if (e?.code !== 'SIGN_IN_CANCELLED') {
        Alert.alert('Erro ao entrar', 'Não foi possível fazer login com o Google. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Image source={require('../../assets/icons/paw.png')} style={styles.logo} />
          <Text style={styles.title}>PetCare</Text>
          <Text style={styles.subtitle}>
            O histórico de saúde dos seus pets,{'\n'}sempre com você — em qualquer celular.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.hint}>Entre com sua conta Google para sincronizar seus dados</Text>

          {loading ? (
            <ActivityIndicator size="large" color="#E66A3A" style={{ marginTop: spacing.lg }} />
          ) : (
            <Button
              label="Entrar com Google"
              onPress={handleGoogle}
              icon="logo-google"
            />
          )}

          <Text style={styles.legal}>
            Seus dados ficam salvos com segurança na nuvem e podem ser restaurados a qualquer momento.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function createStyles(p: Palette) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: p.background,
    },
    container: {
      flex: 1,
      paddingHorizontal: spacing.lg,
      justifyContent: 'space-between',
    },
    hero: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
    },
    logo: {
      width: 96,
      height: 96,
      marginBottom: spacing.sm,
    },
    title: {
      fontFamily: fonts.displayExtra,
      fontSize: 40,
      color: p.primary,
    },
    subtitle: {
      fontFamily: fonts.text,
      fontSize: 16,
      color: p.textMuted,
      textAlign: 'center',
      lineHeight: 24,
    },
    footer: {
      paddingBottom: spacing.xl,
      gap: spacing.md,
    },
    hint: {
      fontFamily: fonts.text,
      fontSize: 14,
      color: p.textMuted,
      textAlign: 'center',
    },
    legal: {
      fontFamily: fonts.text,
      fontSize: 12,
      color: p.textSubtle,
      textAlign: 'center',
      lineHeight: 18,
      marginTop: spacing.sm,
    },
  });
}
