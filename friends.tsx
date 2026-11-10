import * as Clipboard from 'expo-clipboard';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Share, Text, TextInput, View } from 'react-native';

import { Body, Button, Card, Label, styles } from '@/components/ui';
import { acceptFriend, addFriend, friends, myProfile, removeFriend } from '@/lib/api';
import { colors } from '@/lib/theme';
import type { FriendRow, Profile } from '@/lib/types';

const RESULTS: Record<string, string> = {
  envoye: 'Demande envoyée ! 📨',
  accepte: "Vous êtes maintenant amis ! Que les prouts commencent. 💨",
  deja: 'Vous êtes déjà amis (ou une demande est en attente).',
  introuvable: 'Aucun utilisateur avec ce code.',
  'soi-meme': "C'est ton propre code 😅",
};

export default function Friends() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rows, setRows] = useState<FriendRow[]>([]);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, f] = await Promise.all([myProfile(), friends()]);
      setProfile(p);
      setRows(f);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function onAdd() {
    if (!code.trim()) return;
    setBusy(true);
    try {
      const res = await addFriend(code);
      Alert.alert('Ajout d’ami', RESULTS[res] ?? res);
      setCode('');
      load();
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  function onRemove(r: FriendRow) {
    Alert.alert(
      `Retirer ${r.display_name} ?`,
      "Vous ne verrez plus vos prouts respectifs et il/elle ne pourra plus te péter dessus.",
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer / bloquer',
          style: 'destructive',
          onPress: async () => {
            await removeFriend(r.friendship_id);
            load();
          },
        },
      ],
    );
  }

  const incoming = rows.filter((r) => r.incoming);
  const accepted = rows.filter((r) => r.status === 'accepted');
  const outgoing = rows.filter((r) => r.status === 'pending' && !r.incoming);

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 16 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      <Card style={{ alignItems: 'center' }}>
        <Label>Ton code ami</Label>
        <Text style={{ fontSize: 40, fontWeight: '900', letterSpacing: 6, color: colors.text, marginVertical: 8 }}>
          {profile?.friend_code ?? '······'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button
            title="Copier"
            variant="secondary"
            onPress={() => profile && Clipboard.setStringAsync(profile.friend_code)}
          />
          <Button
            title="Partager"
            onPress={() =>
              profile &&
              Share.share({
                message: `Ajoute-moi sur Prout Map avec le code ${profile.friend_code} 💨 (je te préviens, je vais te péter dessus xD)`,
              })
            }
          />
        </View>
      </Card>

      <Card>
        <Label>Ajouter un ami</Label>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <TextInput
            style={[styles.input, { flex: 1, letterSpacing: 3, fontWeight: '700' }]}
            placeholder="CODE"
            placeholderTextColor={colors.muted}
            autoCapitalize="characters"
            value={code}
            onChangeText={setCode}
            maxLength={6}
          />
          <Button title="Ajouter" onPress={onAdd} loading={busy} />
        </View>
      </Card>

      {incoming.length > 0 && (
        <Card>
          <Label>Demandes reçues</Label>
          {incoming.map((r) => (
            <View key={r.friendship_id} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 }}>
              <Body style={{ flex: 1 }}>{r.display_name}</Body>
              <Button title="Accepter" onPress={async () => { await acceptFriend(r.friendship_id); load(); }} />
              <Button title="✕" variant="ghost" onPress={async () => { await removeFriend(r.friendship_id); load(); }} />
            </View>
          ))}
        </Card>
      )}

      <Card>
        <Label>Mes amis ({accepted.length})</Label>
        {accepted.length === 0 && (
          <Body style={{ color: colors.muted, marginTop: 8 }}>
            Partage ton code pour que tes potes t'ajoutent.
          </Body>
        )}
        {accepted.map((r) => (
          <View key={r.friendship_id} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
            <Body style={{ flex: 1 }}>💨 {r.display_name}</Body>
            <Button title="Retirer" variant="ghost" onPress={() => onRemove(r)} />
          </View>
        ))}
        {outgoing.map((r) => (
          <View key={r.friendship_id} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
            <Body style={{ flex: 1, color: colors.muted }}>⏳ {r.display_name} (en attente)</Body>
            <Button title="Annuler" variant="ghost" onPress={async () => { await removeFriend(r.friendship_id); load(); }} />
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}
