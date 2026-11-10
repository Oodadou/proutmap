-- =====================================================================
-- Prout Map — schéma de base de données Supabase
-- À exécuter une fois dans Supabase > SQL Editor (ou via `supabase db push`)
-- =====================================================================

-- ---------- Profils ----------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Péteur anonyme',
  friend_code  text not null unique,
  push_token   text,
  created_at   timestamptz not null default now()
);

-- Code ami lisible (6 caractères, sans 0/O/1/I pour éviter les confusions)
create or replace function public.gen_friend_code() returns text
language plpgsql as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where friend_code = code);
  end loop;
  return code;
end $$;

-- Création automatique du profil à la première connexion (Google / Apple)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, friend_code)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'name', ''),
      'Péteur anonyme'
    ),
    public.gen_friend_code()
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Amis -------------------------------------------------------
create table public.friendships (
  id           bigint generated always as identity primary key,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at   timestamptz not null default now(),
  check (requester_id <> addressee_id)
);
create unique index friendships_pair_idx on public.friendships
  (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create or replace function public.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.friendships
    where status = 'accepted'
      and ((requester_id = a and addressee_id = b) or (requester_id = b and addressee_id = a))
  );
$$;

-- ---------- Prouts -----------------------------------------------------
create table public.farts (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  lat         double precision not null,
  lng         double precision not null,
  kind        text not null default 'classique'
              check (kind in ('silencieux', 'classique', 'tonitruant', 'foireux', 'en_rafale')),
  power       smallint not null default 3 check (power between 1 and 5),
  smell       smallint not null default 3 check (smell between 1 and 5),
  discretion  smallint not null default 3 check (discretion between 1 and 5),
  note        text check (char_length(note) <= 280),
  -- Option « Oups je t'ai pété dessus !! xD »
  victim_id   uuid references public.profiles(id) on delete set null,
  victim_name text check (char_length(victim_name) <= 60),
  created_at  timestamptz not null default now()
);
create index farts_user_idx on public.farts (user_id, created_at desc);
create index farts_victim_idx on public.farts (victim_id);

-- ---------- Ligues -----------------------------------------------------
create table public.leagues (
  id          bigint generated always as identity primary key,
  name        text not null check (char_length(name) between 1 and 40),
  invite_code text not null unique,
  owner_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table public.league_members (
  league_id bigint not null references public.leagues(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (league_id, user_id)
);

create or replace function public.is_league_member(l bigint, u uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.league_members where league_id = l and user_id = u);
$$;

-- ---------- Signalements (exigence App Store pour le contenu utilisateur)
create table public.reports (
  id          bigint generated always as identity primary key,
  reporter_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  fart_id     bigint references public.farts(id) on delete cascade,
  reported_user_id uuid references public.profiles(id) on delete cascade,
  reason      text check (char_length(reason) <= 500),
  created_at  timestamptz not null default now()
);

-- =====================================================================
-- Sécurité (Row Level Security)
-- =====================================================================
alter table public.profiles       enable row level security;
alter table public.friendships    enable row level security;
alter table public.farts          enable row level security;
alter table public.leagues        enable row level security;
alter table public.league_members enable row level security;
alter table public.reports        enable row level security;

-- Profils : lisibles par les utilisateurs connectés (nom + code ami), modifiables par soi-même
create policy "profils lisibles" on public.profiles
  for select to authenticated using (true);
create policy "modifier son profil" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- push_token ne doit être visible que par son propriétaire
revoke select on public.profiles from authenticated, anon;
grant select (id, display_name, friend_code, created_at) on public.profiles to authenticated;
grant update (display_name, push_token) on public.profiles to authenticated;

-- Amitiés : visibles par les deux personnes concernées
create policy "voir ses amitiés" on public.friendships
  for select to authenticated using (auth.uid() in (requester_id, addressee_id));
create policy "accepter une demande" on public.friendships
  for update to authenticated using (addressee_id = auth.uid()) with check (addressee_id = auth.uid());
create policy "supprimer une amitié" on public.friendships
  for delete to authenticated using (auth.uid() in (requester_id, addressee_id));

-- Prouts : je vois les miens, ceux de mes amis, et ceux qu'on m'a lâchés dessus
create policy "voir les prouts" on public.farts
  for select to authenticated using (
    user_id = auth.uid()
    or victim_id = auth.uid()
    or public.are_friends(auth.uid(), user_id)
  );
create policy "ajouter un prout" on public.farts
  for insert to authenticated with check (
    user_id = auth.uid()
    and (victim_id is null or public.are_friends(auth.uid(), victim_id))
  );
create policy "supprimer son prout" on public.farts
  for delete to authenticated using (user_id = auth.uid());

-- Ligues : visibles par les membres
create policy "voir ses ligues" on public.leagues
  for select to authenticated using (public.is_league_member(id, auth.uid()));
create policy "voir les membres" on public.league_members
  for select to authenticated using (public.is_league_member(league_id, auth.uid()));
create policy "quitter une ligue" on public.league_members
  for delete to authenticated using (user_id = auth.uid());

-- Signalements : on peut seulement en créer
create policy "signaler" on public.reports
  for insert to authenticated with check (reporter_id = auth.uid());

-- =====================================================================
-- Fonctions appelées par l'appli (RPC)
-- =====================================================================

-- Mon profil complet (y compris push_token)
create or replace function public.my_profile()
returns table (id uuid, display_name text, friend_code text)
language sql stable security definer set search_path = public as $$
  select id, display_name, friend_code from public.profiles where id = auth.uid();
$$;

-- Envoyer une demande d'ami à partir d'un code
create or replace function public.add_friend(code text) returns text
language plpgsql security definer set search_path = public as $$
declare
  target uuid;
  existing public.friendships;
begin
  select id into target from public.profiles where friend_code = upper(trim(code));
  if target is null then return 'introuvable'; end if;
  if target = auth.uid() then return 'soi-meme'; end if;

  select * into existing from public.friendships
  where least(requester_id, addressee_id) = least(auth.uid(), target)
    and greatest(requester_id, addressee_id) = greatest(auth.uid(), target);

  if existing.id is not null then
    -- Si l'autre m'avait déjà invité, on accepte directement
    if existing.status = 'pending' and existing.addressee_id = auth.uid() then
      update public.friendships set status = 'accepted' where id = existing.id;
      return 'accepte';
    end if;
    return 'deja';
  end if;

  insert into public.friendships (requester_id, addressee_id) values (auth.uid(), target);
  return 'envoye';
end $$;

-- Liste de mes amis et demandes
create or replace function public.my_friends()
returns table (friendship_id bigint, friend_id uuid, display_name text, status text, incoming boolean)
language sql stable security definer set search_path = public as $$
  select f.id,
         p.id,
         p.display_name,
         f.status,
         (f.addressee_id = auth.uid() and f.status = 'pending')
  from public.friendships f
  join public.profiles p
    on p.id = case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
  where auth.uid() in (f.requester_id, f.addressee_id)
  order by f.status desc, p.display_name;
$$;

-- Créer une ligue (le créateur en devient membre)
create or replace function public.create_league(league_name text) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  new_id bigint;
begin
  insert into public.leagues (name, invite_code, owner_id)
  values (trim(league_name), public.gen_friend_code(), auth.uid())
  returning id into new_id;
  insert into public.league_members (league_id, user_id) values (new_id, auth.uid());
  return new_id;
end $$;

-- Rejoindre une ligue avec son code
create or replace function public.join_league(code text) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  lid bigint;
begin
  select id into lid from public.leagues where invite_code = upper(trim(code));
  if lid is null then return null; end if;
  insert into public.league_members (league_id, user_id)
  values (lid, auth.uid()) on conflict do nothing;
  return lid;
end $$;

-- Classement d'une ligue depuis une date
create or replace function public.league_leaderboard(l bigint, since timestamptz)
returns table (user_id uuid, display_name text, fart_count bigint, avg_power numeric, victims bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_league_member(l, auth.uid()) then
    raise exception 'pas membre de cette ligue';
  end if;
  return query
    select m.user_id,
           p.display_name,
           count(f.id),
           round(avg(f.power)::numeric, 1),
           count(f.id) filter (where f.victim_id is not null or f.victim_name is not null)
    from public.league_members m
    join public.profiles p on p.id = m.user_id
    left join public.farts f on f.user_id = m.user_id and f.created_at >= since
    where m.league_id = l
    group by m.user_id, p.display_name
    order by count(f.id) desc, p.display_name;
end $$;

-- Suppression de compte (obligatoire sur l'App Store)
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  delete from auth.users where id = auth.uid();
end $$;

revoke execute on function public.delete_my_account() from anon;
revoke execute on function public.gen_friend_code() from anon, authenticated;
