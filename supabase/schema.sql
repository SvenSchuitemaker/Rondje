-- Rondje — Supabase schema (fase 1)
-- Uitvoeren in de Supabase SQL-editor of via `supabase db push`.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.activity_source as enum ('own_gps', 'apple_health', 'garmin', 'fit_import');

-- ---------------------------------------------------------------------------
-- profiles: één rij per gebruiker, gekoppeld aan auth.users
-- ---------------------------------------------------------------------------

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Profiel automatisch aanmaken bij registratie.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- activities: één rij per run, ongeacht de bron
-- ---------------------------------------------------------------------------

create table public.activities (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  source           public.activity_source not null default 'own_gps',
  -- Id in het bronsysteem (HealthKit-UUID, Garmin activity id, bestandshash,
  -- of het lokale run-id voor own_gps). Voorkomt dubbele imports.
  external_id      text not null,
  started_at       timestamptz not null,
  ended_at         timestamptz not null,
  duration_sec     integer not null check (duration_sec >= 0),
  distance_m       double precision not null check (distance_m >= 0),
  created_at       timestamptz not null default now(),
  constraint activities_ended_after_started check (ended_at >= started_at),
  constraint activities_user_source_external_unique unique (user_id, source, external_id)
);

create index activities_user_started_idx on public.activities (user_id, started_at desc);

-- ---------------------------------------------------------------------------
-- activity_points: GPS-punten van een activiteit
-- ---------------------------------------------------------------------------

create table public.activity_points (
  id           bigint generated always as identity primary key,
  activity_id  uuid not null references public.activities (id) on delete cascade,
  seq          integer not null,
  recorded_at  timestamptz not null,
  latitude     double precision not null check (latitude between -90 and 90),
  longitude    double precision not null check (longitude between -180 and 180),
  altitude_m   double precision,
  accuracy_m   double precision,
  constraint activity_points_activity_seq_unique unique (activity_id, seq)
);

-- ---------------------------------------------------------------------------
-- Row level security: gebruikers zien en wijzigen alleen hun eigen data
-- ---------------------------------------------------------------------------

alter table public.profiles        enable row level security;
alter table public.activities      enable row level security;
alter table public.activity_points enable row level security;

-- profiles
create policy "profiles: eigen profiel lezen" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "profiles: eigen profiel aanmaken" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles: eigen profiel wijzigen" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- activities
create policy "activities: eigen lezen" on public.activities
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "activities: eigen aanmaken" on public.activities
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "activities: eigen wijzigen" on public.activities
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "activities: eigen verwijderen" on public.activities
  for delete to authenticated using ((select auth.uid()) = user_id);

-- activity_points: eigendom via de bijbehorende activiteit
create policy "activity_points: eigen lezen" on public.activity_points
  for select to authenticated using (
    exists (select 1 from public.activities a
            where a.id = activity_id and a.user_id = (select auth.uid()))
  );
create policy "activity_points: eigen aanmaken" on public.activity_points
  for insert to authenticated with check (
    exists (select 1 from public.activities a
            where a.id = activity_id and a.user_id = (select auth.uid()))
  );
create policy "activity_points: eigen wijzigen" on public.activity_points
  for update to authenticated
  using (
    exists (select 1 from public.activities a
            where a.id = activity_id and a.user_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from public.activities a
            where a.id = activity_id and a.user_id = (select auth.uid()))
  );
create policy "activity_points: eigen verwijderen" on public.activity_points
  for delete to authenticated using (
    exists (select 1 from public.activities a
            where a.id = activity_id and a.user_id = (select auth.uid()))
  );

-- updated_at bijhouden op profiles
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
