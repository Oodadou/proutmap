/**
 * MODE DÉMO : l'appli fonctionne sans serveur, sans compte et sans clé.
 * Tout est stocké sur le téléphone, avec de faux amis qui se vengent quand on leur pète dessus.
 *
 * Activé si EXPO_PUBLIC_DEMO=1 ou si aucune adresse Supabase n'est configurée.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

import type { Fart, FartKind, FriendRow, LeaderboardRow, League, Profile } from './types';

export const DEMO =
  process.env.EXPO_PUBLIC_DEMO === '1' || !process.env.EXPO_PUBLIC_SUPABASE_URL;

export const DEMO_ME = 'demo-me';

type Bot = { id: string; name: string; code: string };
const BOTS: Bot[] = [
  { id: 'bot-kevin', name: 'Kévin', code: 'KEVIN1' },
  { id: 'bot-sophie', name: 'Sophie', code: 'SOPHIE' },
  { id: 'bot-marcel', name: 'Tonton Marcel', code: 'MARCEL' },
];
const KINDS: FartKind[] = ['silencieux', 'classique', 'tonitruant', 'foireux', 'en_rafale'];
const NOTES = [
  'Réunion du lundi, personne n’a rien vu',
  'Dans l’ascenseur. Désolé.',
  'Au restau, j’ai accusé le chien',
  null,
  null,
  'Record personnel',
];

type State = {
  name: string;
  farts: Fart[];
  nextId: number;
  friends: { bot: string; status: 'accepted' | 'pending' }[];
  leagues: League[];
  seeded: boolean;
};

const KEY = 'proutmap-demo-v1';
let cache: State | null = null;

async function load(): Promise<State> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) return (cache = JSON.parse(raw));
  } catch {}
  cache = {
    name: 'Moi',
    farts: [],
    nextId: 1,
    friends: BOTS.map((b) => ({ bot: b.id, status: 'accepted' as const })),
    leagues: [{ id: 1, name: 'Les Pétaradeurs (démo)', invite_code: 'DEMO42', owner_id: DEMO_ME }],
    seeded: false,
  };
  return cache;
}

async function save() {
  if (cache) await AsyncStorage.setItem(KEY, JSON.stringify(cache)).catch(() => {});
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const botName = (id: string) => BOTS.find((b) => b.id === id)?.name ?? 'Un ami';

function botFart(s: State, bot: string, lat: number, lng: number, daysAgo: number, victim?: string): Fart {
  return {
    id: s.nextId++,
    user_id: bot,
    lat: lat + rnd(-0.02, 0.02),
    lng: lng + rnd(-0.03, 0.03),
    kind: pick(KINDS),
    power: Math.ceil(rnd(0, 5)),
    smell: Math.ceil(rnd(0, 5)),
    discretion: Math.ceil(rnd(0, 5)),
    note: pick(NOTES),
    victim_id: victim ?? null,
    victim_name: null,
    created_at: new Date(Date.now() - daysAgo * 86400000 - rnd(0, 86400000)).toISOString(),
    author: { display_name: botName(bot) },
  };
}

/** Place quelques prouts des faux amis autour de la position donnée (une seule fois). */
export async function demoSeed(lat: number, lng: number) {
  const s = await load();
  if (s.seeded) return;
  for (const b of BOTS) {
    const n = b.id === 'bot-marcel' ? 9 : 5;
    for (let i = 0; i < n; i++) s.farts.push(botFart(s, b.id, lat, lng, rnd(0, 20)));
  }
  s.farts.push(botFart(s, 'bot-kevin', lat, lng, 0.3, DEMO_ME)); // Kévin t'a déjà eu
  s.seeded = true;
  await save();
}

// ---- Fonctions équivalentes à api.ts ----------------------------------

export async function demoProfile(): Promise<Profile> {
  const s = await load();
  return { id: DEMO_ME, display_name: s.name, friend_code: 'MOI123' };
}

export async function demoUpdateName(name: string) {
  const s = await load();
  s.name = name.trim();
  await save();
}

const withAuthor = (s: State, f: Fart): Fart => ({
  ...f,
  author: { display_name: f.user_id === DEMO_ME ? s.name : botName(f.user_id) },
});

export async function demoVisibleFarts(): Promise<Fart[]> {
  const s = await load();
  return [...s.farts]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((f) => withAuthor(s, f));
}

export async function demoMyFarts(): Promise<Fart[]> {
  return (await demoVisibleFarts()).filter((f) => f.user_id === DEMO_ME);
}

export async function demoReceivedCount(): Promise<number> {
  const s = await load();
  return s.farts.filter((f) => f.victim_id === DEMO_ME).length;
}

export async function demoAddFart(f: Omit<Fart, 'id' | 'user_id' | 'created_at'>) {
  const s = await load();
  const fart: Fart = { ...f, id: s.nextId++, user_id: DEMO_ME, created_at: new Date().toISOString() };
  s.farts.push(fart);
  if (!s.seeded) await demoSeed(f.lat, f.lng);
  await save();

  // Vengeance ! Le faux ami riposte 8 secondes plus tard avec une notification
  if (f.victim_id && f.victim_id.startsWith('bot-')) {
    const bot = f.victim_id;
    setTimeout(async () => {
      const st = await load();
      st.farts.push({ ...botFart(st, bot, f.lat, f.lng, 0, DEMO_ME), created_at: new Date().toISOString() });
      await save();
      Notifications.scheduleNotificationAsync({
        content: {
          title: `💨 ${botName(bot)}`,
          body: "Oups je t'ai pété dessus !! xD (vengeance)",
          sound: true,
        },
        trigger: null,
      }).catch(() => {});
    }, 8000);
  }
  return fart.id;
}

export async function demoDeleteFart(id: number) {
  const s = await load();
  s.farts = s.farts.filter((f) => f.id !== id);
  await save();
}

export async function demoFriends(): Promise<FriendRow[]> {
  const s = await load();
  return s.friends.map((f, i) => ({
    friendship_id: i + 1,
    friend_id: f.bot,
    display_name: botName(f.bot),
    status: f.status,
    incoming: false,
  }));
}

export async function demoAddFriend(code: string): Promise<string> {
  const s = await load();
  const bot = BOTS.find((b) => b.code === code.trim().toUpperCase());
  if (!bot) return 'introuvable';
  if (s.friends.some((f) => f.bot === bot.id)) return 'deja';
  s.friends.push({ bot: bot.id, status: 'accepted' });
  await save();
  return 'accepte';
}

export async function demoRemoveFriend(friendshipId: number) {
  const s = await load();
  s.friends.splice(friendshipId - 1, 1);
  await save();
}

export async function demoLeagues(): Promise<League[]> {
  return (await load()).leagues;
}

export async function demoCreateLeague(name: string): Promise<number> {
  const s = await load();
  const id = Math.max(0, ...s.leagues.map((l) => l.id)) + 1;
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  s.leagues.push({ id, name: name.trim(), invite_code: code, owner_id: DEMO_ME });
  await save();
  return id;
}

export async function demoLeaveLeague(id: number) {
  const s = await load();
  s.leagues = s.leagues.filter((l) => l.id !== id);
  await save();
}

export async function demoLeaderboard(_leagueId: number, since: Date): Promise<LeaderboardRow[]> {
  const s = await load();
  const members = [DEMO_ME, ...s.friends.filter((f) => f.status === 'accepted').map((f) => f.bot)];
  return members
    .map((uid) => {
      const mine = s.farts.filter((f) => f.user_id === uid && new Date(f.created_at) >= since);
      return {
        user_id: uid,
        display_name: uid === DEMO_ME ? s.name : botName(uid),
        fart_count: mine.length,
        avg_power: mine.length
          ? Math.round((mine.reduce((a, f) => a + f.power, 0) / mine.length) * 10) / 10
          : null,
        victims: mine.filter((f) => f.victim_id || f.victim_name).length,
      };
    })
    .sort((a, b) => b.fart_count - a.fart_count);
}

export async function demoReset() {
  cache = null;
  await AsyncStorage.removeItem(KEY).catch(() => {});
}
