import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, TextInput, View } from 'react-native';

import { Body, Button, Card, Label, styles } from '@/components/ui';
import { deleteAccount, myProfile, updateName } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { DEMO } from '@/lib/demo';
import { colors } from '@/lib/theme';

// À remplacer par l'adresse de ta page de confidentialité (obligatoire sur les stores)
const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL ?? 'https://example.com/confidentialite';

export default function Profile() {
  const { session, signOut } = useAuth();
  const me = session!.user.id;
  const [name, setName] = useState('');
  const [saved, setSaved] = useState(false);

  useFocusEffect(
    useCallback(() => {
      myProfile().then((p) => p && setName(p.display_name));
    }, []),
  );

  async function onSave() {
    if (!name.trim()) return;
    await updateName(me, name);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  async function onSignOut() {
    if (!DEMO) await GoogleSignin.signOut().catch(() => {});
    await signOut();
  }

  function onDelete() {
    Alert.alert(
      DEMO ? 'Remettre la démo à zéro ?' : 'Supprimer mon compte ?',
      'Tous tes prouts, amis et ligues seront effacés définitivement.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!DEMO) await GoogleSignin.signOut().catch(() => {});
              await deleteAccount();
              await signOut();
            } catch (e: any) {
              Alert.alert('Erreur', e?.message ?? String(e));
            }
          },
        },
      ],
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Card>
        <Label>Mon pseudo</Label>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={name}
            onChangeText={setName}
            maxLength={30}
            placeholder="Ton pseudo"
            placeholderTextColor={colors.muted}
          />
          <Button title={saved ? '✓' : 'OK'} onPress={onSave} />
        </View>
        <Body style={{ color: colors.muted, marginTop: 8, fontSize: 13 }}>
          C'est le nom que voient tes amis et les membres de tes ligues.
        </Body>
      </Card>

      <Card style={{ gap: 10 }}>
        <Button
          title="Politique de confidentialité"
          variant="secondary"
          onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)}
        />
        <Button title="Se déconnecter" variant="secondary" onPress={onSignOut} />
        <Button title={DEMO ? 'Remettre la démo à zéro' : 'Supprimer mon compte'} variant="danger" onPress={onDelete} />
      </Card>
    </ScrollView>
  );
}
