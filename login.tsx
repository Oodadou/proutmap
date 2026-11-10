import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';
import { useEffect, useState } from 'react';
import { Alert, Image, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, styles as ui } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { DEMO } from '@/lib/demo';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';

if (!DEMO) {
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  });
}

export default function Login() {
  const [busy, setBusy] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [demoName, setDemoName] = useState('');
  const { demoSignIn } = useAuth();

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
    }
  }, []);

  async function signInGoogle() {
    setBusy(true);
    try {
      await GoogleSignin.hasPlayServices();
      const res = await GoogleSignin.signIn();
      if (!isSuccessResponse(res)) return; // annulé
      const idToken = res.data.idToken;
      if (!idToken) throw new Error('Pas de jeton Google');
      const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
      if (error) throw error;
    } catch (e: any) {
      Alert.alert('Connexion Google impossible', e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function signInApple() {
    try {
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!cred.identityToken) throw new Error('Pas de jeton Apple');
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: cred.identityToken,
      });
      if (error) throw error;
      // Apple ne donne le nom qu'à la toute première connexion : on le garde
      const name = [cred.fullName?.givenName, cred.fullName?.familyName].filter(Boolean).join(' ');
      if (name && data.user) {
        await supabase.from('profiles').update({ display_name: name }).eq('id', data.user.id);
      }
    } catch (e: any) {
      if (e?.code === 'ERR_REQUEST_CANCELED') return;
      Alert.alert('Connexion Apple impossible', e?.message ?? String(e));
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.hero}>
        <Image source={require('@/assets/images/splash-icon.png')} style={styles.logo} />
        <Text style={styles.title}>Prout Map</Text>
        <Text style={styles.subtitle}>
          Chaque prout mérite sa place sur la carte.{'\n'}Et parfois… sur un ami. xD
        </Text>
      </View>

      {DEMO ? (
        <View style={styles.buttons}>
          <TextInput
            style={ui.input}
            placeholder="Ton pseudo"
            placeholderTextColor={colors.muted}
            value={demoName}
            onChangeText={setDemoName}
            maxLength={30}
          />
          <Button title="💨 Essayer la démo" onPress={() => demoSignIn(demoName)} />
          <Text style={styles.legal}>
            Version de test : tout reste sur ton téléphone, avec 3 faux amis pour s'entraîner.
          </Text>
        </View>
      ) : (
      <View style={styles.buttons}>
        {appleAvailable && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={16}
            style={{ height: 52 }}
            onPress={signInApple}
          />
        )}
        <Button title="Continuer avec Google" variant="secondary" onPress={signInGoogle} loading={busy} />
        <Text style={styles.legal}>
          En continuant, tu acceptes les conditions d'utilisation et la politique de confidentialité.
        </Text>
      </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: 'space-between' },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 180, height: 180, marginBottom: 12 },
  title: { fontSize: 40, fontWeight: '900', color: colors.text },
  subtitle: { fontSize: 17, color: colors.muted, textAlign: 'center', marginTop: 8, lineHeight: 24 },
  buttons: { gap: 12, paddingBottom: 12 },
  legal: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 4 },
});
