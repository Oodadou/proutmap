import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';

import { Body, Button, Card, Label, styles } from '@/components/ui';
import { createLeague, joinLeague, myLeagues } from '@/lib/api';
import { colors } from '@/lib/theme';
import type { League } from '@/lib/types';

export default function Leagues() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setLeagues(await myLeagues());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function onCreate() {
    if (!name.trim()) return;
    try {
      const id = await createLeague(name);
      setName('');
      router.push({ pathname: '/league/[id]', params: { id: String(id) } });
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? String(e));
    }
  }

  async function onJoin() {
    if (!code.trim()) return;
    try {
      const id = await joinLeague(code);
      if (!id) {
        Alert.alert('Code inconnu', 'Aucune ligue avec ce code.');
        return;
      }
      setCode('');
      router.push({ pathname: '/league/[id]', params: { id: String(id) } });
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? String(e));
    }
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 16 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      <Card>
        <Label>Mes ligues</Label>
        {leagues.length === 0 && (
          <Body style={{ color: colors.muted, marginTop: 8 }}>
            Crée une ligue avec tes collègues ou ta bande de potes, et que le meilleur péteur gagne.
          </Body>
        )}
        {leagues.map((l) => (
          <Pressable
            key={l.id}
            onPress={() => router.push({ pathname: '/league/[id]', params: { id: String(l.id) } })}
            style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>🏆 {l.name}</Text>
            <Text style={{ color: colors.muted }}>Code : {l.invite_code}</Text>
          </Pressable>
        ))}
      </Card>

      <Card>
        <Label>Créer une ligue</Label>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Ex : Les Pétaradeurs du bureau"
            placeholderTextColor={colors.muted}
            value={name}
            onChangeText={setName}
            maxLength={40}
          />
          <Button title="Créer" onPress={onCreate} />
        </View>
      </Card>

      <Card>
        <Label>Rejoindre avec un code</Label>
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
          <Button title="Rejoindre" onPress={onJoin} />
        </View>
      </Card>
    </ScrollView>
  );
}
