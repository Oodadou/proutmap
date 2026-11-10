export type FartKind = 'silencieux' | 'classique' | 'tonitruant' | 'foireux' | 'en_rafale';

export type Fart = {
  id: number;
  user_id: string;
  lat: number;
  lng: number;
  kind: FartKind;
  power: number;
  smell: number;
  discretion: number;
  note: string | null;
  victim_id: string | null;
  victim_name: string | null;
  created_at: string;
  author?: { display_name: string } | null;
};

export type Profile = {
  id: string;
  display_name: string;
  friend_code: string;
};

export type FriendRow = {
  friendship_id: number;
  friend_id: string;
  display_name: string;
  status: 'pending' | 'accepted';
  incoming: boolean;
};

export type League = {
  id: number;
  name: string;
  invite_code: string;
  owner_id: string;
};

export type LeaderboardRow = {
  user_id: string;
  display_name: string;
  fart_count: number;
  avg_power: number | null;
  victims: number;
};

export const KINDS: { value: FartKind; label: string; emoji: string }[] = [
  { value: 'silencieux', label: 'Silencieux', emoji: '🤫' },
  { value: 'classique', label: 'Classique', emoji: '💨' },
  { value: 'tonitruant', label: 'Tonitruant', emoji: '📢' },
  { value: 'foireux', label: 'Foireux', emoji: '😬' },
  { value: 'en_rafale', label: 'En rafale', emoji: '🔫' },
];

export const kindInfo = (k: FartKind) => KINDS.find((x) => x.value === k) ?? KINDS[1];
