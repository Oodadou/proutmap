import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

import { Card, Label } from '@/components/ui';
import { myFarts, receivedCount } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors } from '@/lib/theme';
import { KINDS, kindInfo, type Fart } from '@/lib/types';

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

function computeStats(farts: Fart[]) {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startWeek = new Date(startToday);
  startWeek.setDate(startWeek.getDate() - ((startWeek.getDay() + 6) % 7)); // lundi

  const byDay = new Map<string, number>();
  const byKind = new Map<string, number>();
  const victims = new Map<string, number>();
  for (const f of farts) {
    const d = new Date(f.created_at);
    byDay.set(dayKey(d), (byDay.get(dayKey(d)) ?? 0) + 1);
    byKind.set(f.kind, (byKind.get(f.kind) ?? 0) + 1);
    const v = f.victim_name ?? (f.victim_id ? 'un ami' : null);
    if (v) victims.set(v, (victims.get(v) ?? 0) + 1);
  }

  // Série : nombre de jours consécutifs (jusqu'à aujourd'hui ou hier) avec au moins un prout
  let streak = 0;
  const cursor = new Date(startToday);
  if (!byDay.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (byDay.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const avg = (k: 'power' | 'smell' | 'discretion') =>
    farts.length ? (farts.reduce((s, f) => s + f[k], 0) / farts.length).toFixed(1) : '–';

  const top = <T,>(m: Map<T, number>) => [...m.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    total: farts.length,
    today: farts.filter((f) => new Date(f.created_at) >= startToday).length,
    week: farts.filter((f) => new Date(f.created_at) >= startWeek).length,
    record: Math.max(0, ...byDay.values()),
    streak,
    avgPower: avg('power'),
    avgSmell: avg('smell'),
    avgDiscretion: avg('discretion'),
    favKind: top(byKind),
    victimsTotal: [...victims.values()].reduce((a, b) => a + b, 0),
    topVictim: top(victims),
    byKind,
  };
}

function Stat({ label, value, emoji }: { label: string; value: string | number; emoji: string }) {
  return (
    <Card style={{ flex: 1, minWidth: '45%', alignItems: 'center' }}>
      <Text style={{ fontSize: 26 }}>{emoji}</Text>
      <Text style={{ fontSize: 28, fontWeight: '900', color: colors.text }}>{value}</Text>
      <Text style={{ color: colors.muted, textAlign: 'center' }}>{label}</Text>
    </Card>
  );
}

export default function Stats() {
  const { session } = useAuth();
  const me = session!.user.id;
  const [farts, setFarts] = useState<Fart[]>([]);
  const [received, setReceived] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [f, r] = await Promise.all([myFarts(me), receivedCount(me)]);
      setFarts(f);
      setReceived(r);
    } finally {
      setLoading(false);
    }
  }, [me]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const s = useMemo(() => computeStats(farts), [farts]);

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 12 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <Stat emoji="💨" label="Au total" value={s.total} />
        <Stat emoji="📅" label="Aujourd'hui" value={s.today} />
        <Stat emoji="🗓️" label="Cette semaine" value={s.week} />
        <Stat emoji="🏅" label="Record en un jour" value={s.record} />
        <Stat emoji="🔥" label="Jours d'affilée" value={s.streak} />
        <Stat emoji="😈" label="Lâchés sur quelqu'un" value={s.victimsTotal} />
        <Stat emoji="😱" label="Reçus en pleine face" value={received} />
        <Stat
          emoji={s.favKind ? kindInfo(s.favKind[0] as any).emoji : '❔'}
          label="Ton style"
          value={s.favKind ? kindInfo(s.favKind[0] as any).label : '–'}
        />
      </View>

      <Card>
        <Label>Moyennes</Label>
        <Text style={{ fontSize: 17, marginTop: 8, color: colors.text }}>
          💪 Puissance {s.avgPower} · 🤢 Odeur {s.avgSmell} · 🥷 Discrétion {s.avgDiscretion}
        </Text>
      </Card>

      {s.topVictim && (
        <Card>
          <Label>Victime préférée</Label>
          <Text style={{ fontSize: 20, fontWeight: '800', marginTop: 6, color: colors.text }}>
            {s.topVictim[0]} ({s.topVictim[1]} fois) xD
          </Text>
        </Card>
      )}

      <Card>
        <Label>Répartition par type</Label>
        {KINDS.map((k) => {
          const n = s.byKind.get(k.value) ?? 0;
          const pct = s.total ? n / s.total : 0;
          return (
            <View key={k.value} style={{ marginTop: 10 }}>
              <Text style={{ color: colors.text }}>
                {k.emoji} {k.label} — {n}
              </Text>
              <View style={{ height: 10, backgroundColor: colors.border, borderRadius: 5, marginTop: 4 }}>
                <View
                  style={{
                    height: 10,
                    width: `${pct * 100}%`,
                    backgroundColor: colors.primary,
                    borderRadius: 5,
                  }}
                />
              </View>
            </View>
          );
        })}
      </Card>
    </ScrollView>
  );
}
