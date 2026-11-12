-- Ultra termíny – databázové schéma pro Supabase
-- Spusť celé v Supabase → SQL Editor → New query → Run.

-- ============ TABULKY ============

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '',
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  start_month date not null,                       -- první den prvního měsíce
  month_count int not null default 2 check (month_count between 1 and 6),
  min_days int not null default 1 check (min_days between 1 and 7),  -- 1 = jednodenní akce
  confirmed_start date,
  confirmed_end date,
  confirmed_route_id uuid,
  invite_code text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  notified_days date[] not null default '{}',      -- pro e-mail notifikace (aby nechodily opakovaně)
  created_at timestamptz not null default now()
);

create table if not exists public.event_members (
  event_id uuid not null references public.events on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  joined_at timestamptz not null default now(),
  filled_at timestamptz,
  primary key (event_id, user_id)
);

-- status: 2 = můžu, 1 = šlo by to, 0 = nemůžu (jen když je u dne poznámka)
-- den bez záznamu = nemůžu
create table if not exists public.availability (
  event_id uuid not null,
  user_id uuid not null default auth.uid(),
  day date not null,
  status smallint not null check (status in (0, 1, 2)),
  note text not null default '' check (char_length(note) <= 200),
  primary key (event_id, user_id, day),
  foreign key (event_id, user_id) references public.event_members (event_id, user_id) on delete cascade
);

create table if not exists public.routes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events on delete cascade,
  created_by uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  url text not null default '',
  distance_km numeric(6, 1),
  elevation_m int,
  created_at timestamptz not null default now()
);

do $$ begin
  alter table public.events
    add constraint events_confirmed_route_fk
    foreign key (confirmed_route_id) references public.routes (id) on delete set null;
exception when duplicate_object then null; end $$;

create table if not exists public.route_votes (
  route_id uuid not null references public.routes on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  primary key (route_id, user_id)
);

create index if not exists availability_event_idx on public.availability (event_id);
create index if not exists routes_event_idx on public.routes (event_id);
create index if not exists members_user_idx on public.event_members (user_id);

-- ============ POMOCNÉ FUNKCE ============

create or replace function public.is_member(e uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from event_members where event_id = e and user_id = auth.uid());
$$;

create or replace function public.is_owner(e uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from events where id = e and owner_id = auth.uid());
$$;

create or replace function public.shares_event(u uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select u = auth.uid() or exists (
    select 1 from event_members a join event_members b on a.event_id = b.event_id
    where a.user_id = auth.uid() and b.user_id = u
  );
$$;

-- Náhled akce podle pozvánky (před připojením)
create or replace function public.event_preview(code text)
returns table (id uuid, title text, member_count bigint)
language sql security definer stable set search_path = public as $$
  select e.id, e.title, (select count(*) from event_members m where m.event_id = e.id)
  from events e where e.invite_code = code;
$$;

-- Připojení k akci přes pozvánku
create or replace function public.join_event(code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare eid uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select id into eid from events where invite_code = code;
  if eid is null then raise exception 'invalid invite'; end if;
  insert into event_members (event_id, user_id) values (eid, auth.uid()) on conflict do nothing;
  return eid;
end $$;

revoke all on function public.join_event(text) from public, anon;
grant execute on function public.join_event(text) to authenticated;
revoke all on function public.event_preview(text) from public, anon;
grant execute on function public.event_preview(text) to authenticated;

-- ============ TRIGGERY ============

-- Profil pro každého nového uživatele
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name)
  values (new.id, split_part(coalesce(new.email, ''), '@', 1))
  on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Zakladatel je automaticky členem
create or replace function public.handle_new_event() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into event_members (event_id, user_id) values (new.id, new.owner_id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_event_created on public.events;
create trigger on_event_created after insert on public.events
  for each row execute function public.handle_new_event();

-- Zaznamenat, že člověk vyplnil kalendář
create or replace function public.handle_availability_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update event_members set filled_at = now()
  where event_id = coalesce(new.event_id, old.event_id) and user_id = coalesce(new.user_id, old.user_id);
  return null;
end $$;

drop trigger if exists on_availability_change on public.availability;
create trigger on_availability_change after insert or update on public.availability
  for each row execute function public.handle_availability_change();

-- ============ ROW LEVEL SECURITY ============

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_members enable row level security;
alter table public.availability enable row level security;
alter table public.routes enable row level security;
alter table public.route_votes enable row level security;

-- profiles
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select to authenticated using (public.shares_event(id));
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- events
drop policy if exists "events_select" on public.events;
create policy "events_select" on public.events for select to authenticated
  using (public.is_member(id) or owner_id = auth.uid());
drop policy if exists "events_insert" on public.events;
create policy "events_insert" on public.events for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists "events_update" on public.events;
create policy "events_update" on public.events for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "events_delete" on public.events;
create policy "events_delete" on public.events for delete to authenticated using (owner_id = auth.uid());

-- event_members (přidávání jen přes join_event / trigger)
drop policy if exists "members_select" on public.event_members;
create policy "members_select" on public.event_members for select to authenticated using (public.is_member(event_id));
drop policy if exists "members_delete" on public.event_members;
create policy "members_delete" on public.event_members for delete to authenticated
  using (user_id = auth.uid() or public.is_owner(event_id));

-- availability
drop policy if exists "avail_select" on public.availability;
create policy "avail_select" on public.availability for select to authenticated using (public.is_member(event_id));
drop policy if exists "avail_insert" on public.availability;
create policy "avail_insert" on public.availability for insert to authenticated
  with check (user_id = auth.uid() and public.is_member(event_id));
drop policy if exists "avail_update" on public.availability;
create policy "avail_update" on public.availability for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "avail_delete" on public.availability;
create policy "avail_delete" on public.availability for delete to authenticated using (user_id = auth.uid());

-- routes
drop policy if exists "routes_select" on public.routes;
create policy "routes_select" on public.routes for select to authenticated using (public.is_member(event_id));
drop policy if exists "routes_insert" on public.routes;
create policy "routes_insert" on public.routes for insert to authenticated
  with check (created_by = auth.uid() and public.is_member(event_id));
drop policy if exists "routes_update" on public.routes;
create policy "routes_update" on public.routes for update to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());
drop policy if exists "routes_delete" on public.routes;
create policy "routes_delete" on public.routes for delete to authenticated
  using (created_by = auth.uid() or public.is_owner(event_id));

-- route_votes
drop policy if exists "votes_select" on public.route_votes;
create policy "votes_select" on public.route_votes for select to authenticated
  using (exists (select 1 from public.routes r where r.id = route_id and public.is_member(r.event_id)));
drop policy if exists "votes_insert" on public.route_votes;
create policy "votes_insert" on public.route_votes for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.routes r where r.id = route_id and public.is_member(r.event_id)));
drop policy if exists "votes_delete" on public.route_votes;
create policy "votes_delete" on public.route_votes for delete to authenticated using (user_id = auth.uid());
