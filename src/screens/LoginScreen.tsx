import React, { useState, useEffect } from 'react';
import { View, Text, Image, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import { spacing, fonts, useThemedStyles, Palette } from '../theme';
import { Button } from '../components/Button';
import { signInWithGoogleCredential } from '../services/firebase';

WebBrowser.maybeCompleteAuthSession();

const WEB_CLIENT_ID = '33584582520-9vcp6efel05f73neav4080ij3776r9re.apps.googleusercontent.com';

interface Props {
  onSignedIn: (uid: string, isNewUser: boolean) => void;
}

export default function LoginScreen({ onSignedIn }: Props) {
  const styles = useThemedStyles(createStyles);
  const [loading, setLoading] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: WEB_CLIENT_ID,
    scopes: ['profile', 'email'],
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token, access_token } = response.params;
      setLoading(true);
      signInWithGoogleCredential(id_token, access_token)
        .then(result => {
          const isNewUser = (result as any).additionalUserInfo?.isNewUser ?? false;
          onSignedIn(result.user.uid, isNewUser);
        })
        .catch(() => {
          Alert.alert('Erro', 'Não foi possível fazer login. Tente novamente.');
        })
        .finally(() => setLoading(false));
    } else if (response?.type === 'error') {
      Alert.alert('Erro', 'Login cancelado ou falhou. Tente novamente.');
    }
  }, [response]);

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
              onPress={() => promptAsync()}
              icon="logo-google"
              disabled={!request}
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
    safe: { flex: 1, backgroundColor: p.background },
    container: { flex: 1, paddingHorizontal: spacing.lg, justifyContent: 'space-between' },
    hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
    logo: { width: 96, height: 96, marginBottom: spacing.sm },
    title: { fontFamily: fonts.displayExtra, fontSize: 40, color: p.primary },
    subtitle: { fontFamily: fonts.text, fontSize: 16, color: p.textMuted, textAlign: 'center', lineHeight: 24 },
    footer: { paddingBottom: spacing.xl, gap: spacing.md },
    hint: { fontFamily: fonts.text, fontSize: 14, color: p.textMuted, textAlign: 'center' },
    legal: { fontFamily: fonts.text, fontSize: 12, color: p.textSubtle, textAlign: 'center', lineHeight: 18, marginTop: spacing.sm },
  });
}
