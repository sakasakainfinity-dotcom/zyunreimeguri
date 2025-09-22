-- Schema definition for 巡礼マップ
-- Generated for Supabase PostgreSQL

create extension if not exists "uuid-ossp";

create table if not exists public.missions (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  title text not null,
  color text,
  sort_index integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.places (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  latitude double precision not null,
  longitude double precision not null,
  prefecture text,
  address text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.mission_places (
  id uuid primary key default uuid_generate_v4(),
  mission_id uuid references public.missions(id) on delete cascade,
  place_id uuid references public.places(id) on delete cascade,
  order_index integer,
  unique (mission_id, place_id)
);

create table if not exists public.visits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  place_id uuid not null references public.places(id) on delete cascade,
  visited_at timestamp with time zone,
  note text,
  photos_count integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.visit_photos (
  id uuid primary key default uuid_generate_v4(),
  visit_id uuid not null references public.visits(id) on delete cascade,
  path text not null,
  storage_bucket text not null default 'visit-photos',
  mime_type text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.reports (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  target_type text not null check (target_type in ('visit', 'place')),
  target_id uuid not null,
  reason text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.badges (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  title text not null,
  description text,
  condition jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.user_badges (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  badge_id uuid not null references public.badges(id) on delete cascade,
  unlocked_at timestamp with time zone default timezone('utc'::text, now()),
  unique (user_id, badge_id)
);

create table if not exists public.certificates (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  mission_id uuid not null references public.missions(id) on delete cascade,
  image_path text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Indexes
create index if not exists idx_mission_places_mission on public.mission_places(mission_id);
create index if not exists idx_mission_places_place on public.mission_places(place_id);
create index if not exists idx_visits_user on public.visits(user_id);
create index if not exists idx_visits_place on public.visits(place_id);
create index if not exists idx_visit_photos_visit on public.visit_photos(visit_id);
create index if not exists idx_reports_target on public.reports(target_id, target_type);
create index if not exists idx_certificates_user on public.certificates(user_id);

-- Row Level Security
alter table public.visits enable row level security;
alter table public.visit_photos enable row level security;
alter table public.reports enable row level security;
alter table public.user_badges enable row level security;
alter table public.certificates enable row level security;

-- Visits: users can manage their own rows
create policy if not exists "Users can read own visits" on public.visits
  for select using (auth.uid() = user_id);

create policy if not exists "Users can insert own visits" on public.visits
  for insert with check (auth.uid() = user_id);

create policy if not exists "Users can update own visits" on public.visits
  for update using (auth.uid() = user_id);

create policy if not exists "Users can delete own visits" on public.visits
  for delete using (auth.uid() = user_id);

-- Visit photos
create policy if not exists "Users can read own visit photos" on public.visit_photos
  for select using (exists (select 1 from public.visits v where v.id = visit_id and v.user_id = auth.uid()));

create policy if not exists "Users can insert own visit photos" on public.visit_photos
  for insert with check (exists (select 1 from public.visits v where v.id = visit_id and v.user_id = auth.uid()));

-- Reports: authenticated users can insert and view own reports
create policy if not exists "Users can insert reports" on public.reports
  for insert with check (auth.role() = 'authenticated');

create policy if not exists "Users can read own reports" on public.reports
  for select using (auth.uid() = user_id);

-- User badges
create policy if not exists "Users can read own badges" on public.user_badges
  for select using (auth.uid() = user_id);

create policy if not exists "Users can insert own badges" on public.user_badges
  for insert with check (auth.uid() = user_id);

-- Certificates
create policy if not exists "Users can read own certificates" on public.certificates
  for select using (auth.uid() = user_id);

create policy if not exists "Users can insert own certificates" on public.certificates
  for insert with check (auth.uid() = user_id);
