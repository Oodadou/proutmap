import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Share, Text, View } from 'react-native';

import { Body, Button, Card, Chip, Label } from '@/components/ui';
import { leaderboard, leaveLeague, league as loadLeague } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors } from '@/lib/theme';
import type { LeaderboardRow, League } from '@/lib/types';

type Period = 'semaine' | 'mois' | 'annee' | 'tout';

function since(p: Period): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (p === 'semaine') d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  else if (p === 'mois') d.setDate(1);
  else if (p === 'annee') d.setMonth(0, 1);
  else return new Date(0);
  return d;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default function LeagueScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const leagueId = Number(id);
  const { session } = useAuth();
  const me = session!.user.id;

  const [info, setInfo] = useState<League | null>(null);
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [period, setPeriod] = useState<Period>('semaine');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [l, r] = await Promise.all([loadLeague(leagueId), leaderboard(leagueId, since(period))]);
      setInfo(l);
      setRows(r);
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [leagueId, period]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function onLeave() {
    Alert.alert('Quitter la ligue ?', undefined, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Quitter',
        style: 'destructive',
        onPress: async () => {
          await leaveLeague(leagueId, me);
          router.back();
        },
      },
    ]);
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 16 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      <Stack.Screen options={{ title: info?.name ?? 'Ligue' }} />

      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Chip label="Semaine" selected={period === 'semaine'} onPress={() => setPeriod('semaine')} />
        <Chip label="Mois" selected={period === 'mois'} onPress={() => setPeriod('mois')} />
        <Chip label="Année" selected={period === 'annee'} onPress={() => setPeriod('annee')} />
        <Chip label="Depuis toujours" selected={period === 'tout'} onPress={() => setPeriod('tout')} />
      </View>

      <Card>
        <Label>Classement</Label>
        {rows.map((r, i) => (
          <View
            key={r.user_id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              borderBottomWidth: i < rows.length - 1 ? 1 : 0,
              borderBottomColor: colors.border,
              backgroundColor: r.user_id === me ? '#F3FBEA' : undefined,
            }}>
            <Text style={{ width: 40, fontSize: 22, textAlign: 'center' }}>{MEDALS[i] ?? `${i + 1}.`}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>
                {r.display_name}
                {r.user_id === me ? ' (toi)' : ''}
              </Text>
              <Text style={{ color: colors.muted }}>
                💪 moy. {r.avg_power ?? '–'} · 😈 {r.victims} victime{r.victims > 1 ? 's' : ''}
              </Text>
            </View>
            <Text style={{ fontSize: 24, fontWeight: '900', color: colors.primaryDark }}>
              {r.fart_count} 💨
            </Text>
          </View>
        ))}
      </Card>

      {info && (
        <Card style={{ alignItems: 'center', gap: 8 }}>
          <Label>Code d'invitation</Label>
          <Text style={{ fontSize: 32, fontWeight: '900', letterSpacing: 6, color: colors.text }}>
            {info.invite_code}
          </Text>
          <Button
            title="Inviter des potes"
            onPress={() =>
              Share.share({
                message: `Rejoins ma ligue « ${info.name} » sur Prout Map avec le code ${info.invite_code} 🏆💨`,
              })
            }
          />
        </Card>
      )}

      <Body style={{ color: colors.muted, textAlign: 'center' }}>
        Seul le nombre de prouts compte dans le classement. Pas les détails. 🤐
      </Body>
      <Button title="Quitter la ligue" variant="ghost" onPress={onLeave} />
    </ScrollView>
  );
}
