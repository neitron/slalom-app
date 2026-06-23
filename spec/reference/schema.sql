-- Supabase schema for Slalom Tricks Tracker (single user, RLS-protected)
-- Run in Supabase SQL editor. Anon key is safe to ship: RLS restricts to the signed-in user.

create extension if not exists "pgcrypto";

create table tricks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  tier int not null check (tier between 1 and 6),
  category text not null,
  entry text not null default '',
  exit text not null default '',
  lr boolean not null default false,
  rate numeric,
  rate_l numeric,
  rate_r numeric,
  last_practiced date,
  status text not null default 'Not Started',
  aliases text[] not null default '{}',
  video text,
  icon text,
  tags text[] not null default '{}',
  fav boolean not null default false,
  unique (user_id, name)
);

create table transitions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  from_trick uuid not null references tricks(id) on delete cascade,
  to_trick uuid not null references tricks(id) on delete cascade,
  from_side text check (from_side in ('L','R')),
  to_side text check (to_side in ('L','R')),
  bidi boolean not null default false,
  rate numeric,
  last_practiced date,
  unique nulls not distinct (user_id, from_trick, to_trick, from_side, to_side)
);

create table sequences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  steps jsonb not null default '[]',  -- [{"trickId": uuid, "side": "L"|"R"|null}]
  created date not null default current_date,
  rate numeric,
  last_practiced date
);

create table practice_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  entity_type text not null check (entity_type in ('trick','transition','sequence')),
  entity_id uuid not null,
  side text check (side in ('L','R')),
  score int not null check (score between 1 and 5),
  at timestamptz not null default now()
);

-- RLS: each table only visible/writable to its owner
alter table tricks enable row level security;
alter table transitions enable row level security;
alter table sequences enable row level security;
alter table practice_log enable row level security;

create policy "own rows" on tricks       for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on transitions  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on sequences    for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on practice_log for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create index on transitions (user_id, from_trick);
create index on practice_log (user_id, entity_type, entity_id, at desc);
