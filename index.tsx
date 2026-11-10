import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { FartMap } from '@/components/fart-map';
import { Chip } from '@/components/ui';
import { deleteFart, reportFart, visibleFarts } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { DEMO, demoSeed } from '@/lib/demo';
import { colors } from '@/lib/theme';
import type { Fart } from '@/lib/types';

type Filter = 'tout' | 'moi' | 'amis' | 'recus';

export default function MapScreen() {
  const { session } = useAuth();
  const me = session!.user.id;
  const [farts, setFarts] = useState<Fart[]>([]);
  const [filter, setFilter] = useState<Filter>('tout');
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);

  const reload = useCallback(() => {
    visibleFarts().then(setFarts).catch(() => {});
  }, []);

  useFocusEffect(reload);

  // Position de l'utilisateur (et, en démo, les faux amis placés autour)
  useEffect(() => {
    (async () => {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) return;
      const p =
        (await Location.getLastKnownPositionAsync()) ??
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
      if (!p) return;
      setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
      if (DEMO) {
        await demoSeed(p.coords.latitude, p.coords.longitude);
        reload();
      }
    })().catch(() => {});
  }, [reload]);

  // En démo, on rafraîchit régulièrement pour voir arriver les vengeances
  useEffect(() => {
    if (!DEMO) return;
    const t = setInterval(reload, 5000);
    return () => clearInterval(t);
  }, [reload]);

  const shown = useMemo(
    () =>
      farts.filter((f) => {
        if (filter === 'moi') return f.user_id === me;
        if (filter === 'amis') return f.user_id !== me && f.victim_id !== me;
        if (filter === 'recus') return f.victim_id === me;
        return true;
      }),
    [farts, filter, me],
  );

  function onFartPress(f: Fart) {
    if (f.user_id === me) {
      Alert.alert('Supprimer ce prout ?', undefined, [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await deleteFart(f.id);
            setFarts((all) => all.filter((x) => x.id !== f.id));
          },
        },
      ]);
    } else {
      Alert.alert('Signaler ce contenu ?', 'Notre équipe vérifiera la note associée.', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Signaler', style: 'destructive', onPress: () => reportFart(f, 'Signalé depuis la carte') },
      ]);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <FartMap farts={shown} me={me} myPosition={pos} onFartPress={onFartPress} />

      <View style={styles.filters} pointerEvents="box-none">
        <Chip label="Tout" selected={filter === 'tout'} onPress={() => setFilter('tout')} />
        <Chip label="Moi" selected={filter === 'moi'} onPress={() => setFilter('moi')} />
        <Chip label="Amis" selected={filter === 'amis'} onPress={() => setFilter('amis')} />
        <Chip label="Reçus 😱" selected={filter === 'recus'} onPress={() => setFilter('recus')} />
      </View>

      {DEMO && (
        <View style={styles.demo} pointerEvents="none">
          <Text style={styles.demoText}>MODE DÉMO</Text>
        </View>
      )}

      <Pressable style={styles.fab} onPress={() => router.push('/new-fart')}>
        <Text style={styles.fabText}>💨 Prouter ici</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  filters: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  demo: {
    position: 'absolute',
    top: 60,
    right: 12,
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  demoText: { color: '#fff', fontWeight: '900', fontSize: 11 },
  fab: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 18, fontWeight: '900' },
});
