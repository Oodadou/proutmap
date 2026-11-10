import * as demo from './demo';
import { DEMO } from './demo';
import { supabase } from './supabase';
import type { Fart, FriendRow, LeaderboardRow, League, Profile } from './types';

export async function myProfile(): Promise<Profile | null> {
  if (DEMO) return demo.demoProfile();
  const { data } = await supabase.rpc('my_profile');
  return (data as Profile[] | null)?.[0] ?? null;
}

/** Tous les prouts visibles : les miens, ceux des amis, ceux qu'on m'a lâchés dessus */
export async function visibleFarts(): Promise<Fart[]> {
  if (DEMO) return demo.demoVisibleFarts();
  const { data, error } = await supabase
    .from('farts')
    .select('*, author:profiles!farts_user_id_fkey(display_name)')
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) throw error;
  return data as Fart[];
}

export async function myFarts(userId: string): Promise<Fart[]> {
  if (DEMO) return demo.demoMyFarts();
  const { data, error } = await supabase
    .from('farts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Fart[];
}

export async function receivedCount(userId: string): Promise<number> {
  if (DEMO) return demo.demoReceivedCount();
  const { count } = await supabase
    .from('farts')
    .select('id', { count: 'exact', head: true })
    .eq('victim_id', userId);
  return count ?? 0;
}

export async function addFart(f: Omit<Fart, 'id' | 'user_id' | 'created_at'>) {
  if (DEMO) return demo.demoAddFart(f);
  const { data, error } = await supabase.from('farts').insert(f).select('id').single();
  if (error) throw error;
  if (f.victim_id) {
    // La notification est un bonus : on n'échoue pas si elle ne part pas
    supabase.functions.invoke('notify-victim', { body: { fart_id: data.id } }).catch(() => {});
  }
  return data.id as number;
}

export async function deleteFart(id: number) {
  if (DEMO) return demo.demoDeleteFart(id);
  const { error } = await supabase.from('farts').delete().eq('id', id);
  if (error) throw error;
}

export async function reportFart(fart: Fart, reason: string) {
  if (DEMO) return;
  await supabase
    .from('reports')
    .insert({ fart_id: fart.id, reported_user_id: fart.user_id, reason });
}

export async function friends(): Promise<FriendRow[]> {
  if (DEMO) return demo.demoFriends();
  const { data, error } = await supabase.rpc('my_friends');
  if (error) throw error;
  return data as FriendRow[];
}

export async function addFriend(code: string): Promise<string> {
  if (DEMO) return demo.demoAddFriend(code);
  const { data, error } = await supabase.rpc('add_friend', { code });
  if (error) throw error;
  return data as string;
}

export async function acceptFriend(friendshipId: number) {
  if (DEMO) return;
  await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
}

export async function removeFriend(friendshipId: number) {
  if (DEMO) return demo.demoRemoveFriend(friendshipId);
  await supabase.from('friendships').delete().eq('id', friendshipId);
}

export async function myLeagues(): Promise<League[]> {
  if (DEMO) return demo.demoLeagues();
  const { data, error } = await supabase.from('leagues').select('*').order('created_at');
  if (error) throw error;
  return data as League[];
}

export async function league(id: number): Promise<League | null> {
  if (DEMO) return (await demo.demoLeagues()).find((l) => l.id === id) ?? null;
  const { data } = await supabase.from('leagues').select('*').eq('id', id).single();
  return data as League | null;
}

export async function createLeague(name: string): Promise<number> {
  if (DEMO) return demo.demoCreateLeague(name);
  const { data, error } = await supabase.rpc('create_league', { league_name: name });
  if (error) throw error;
  return data as number;
}

export async function joinLeague(code: string): Promise<number | null> {
  if (DEMO) return null;
  const { data, error } = await supabase.rpc('join_league', { code });
  if (error) throw error;
  return data as number | null;
}

export async function leaveLeague(leagueId: number, userId: string) {
  if (DEMO) return demo.demoLeaveLeague(leagueId);
  await supabase.from('league_members').delete().eq('league_id', leagueId).eq('user_id', userId);
}

export async function leaderboard(leagueId: number, since: Date): Promise<LeaderboardRow[]> {
  if (DEMO) return demo.demoLeaderboard(leagueId, since);
  const { data, error } = await supabase.rpc('league_leaderboard', {
    l: leagueId,
    since: since.toISOString(),
  });
  if (error) throw error;
  return data as LeaderboardRow[];
}

export async function updateName(userId: string, name: string) {
  if (DEMO) return demo.demoUpdateName(name);
  await supabase.from('profiles').update({ display_name: name.trim() }).eq('id', userId);
}

export async function deleteAccount() {
  if (DEMO) return demo.demoReset();
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw error;
  await supabase.auth.signOut();
}
