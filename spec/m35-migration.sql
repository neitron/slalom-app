-- =====================================================================
-- M3.5 Social Layer migration (v2, post-critique)
-- Run as a SINGLE transaction in the Supabase SQL editor.
-- Set app.legacy_owner BEFORE running:
--   select set_config('app.legacy_owner', '<uuid>', false);
-- =====================================================================
begin;

-- 0. Extensions ------------------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- 0a. Schema-migration sentinel (prevents accidental re-run) ---------
create table if not exists public.schema_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);
do $$
begin
  if exists (select 1 from public.schema_migrations where version = 'm3_5_social') then
    raise exception 'Migration m3_5_social already applied';
  end if;
end$$;

-- 0b. Resolve legacy owner and assert it exists ----------------------
do $$
declare
  v_owner uuid := nullif(current_setting('app.legacy_owner', true), '')::uuid;
  v_count int;
begin
  if v_owner is null then
    select count(*) into v_count from auth.users;
    if v_count = 1 then
      select id into v_owner from auth.users limit 1;
    else
      raise exception 'Set app.legacy_owner to the owning user uuid (found % auth.users): select set_config(''app.legacy_owner'', ''<uuid>'', false);', v_count;
    end if;
  end if;
  if not exists (select 1 from auth.users where id = v_owner) then
    raise exception 'app.legacy_owner % does not exist in auth.users', v_owner;
  end if;
  perform set_config('app.legacy_owner', v_owner::text, false);
end$$;

-- 1. profiles --------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  nickname      citext unique,
  display_name  text,
  avatar_emoji  text,
  bio           text,
  visibility    text not null default 'friends'
                check (visibility in ('public','friends','private')),
  nickname_changed_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint nickname_format check (
    nickname is null or (
      length(nickname::text) between 3 and 24
      and nickname::text ~ '^[A-Za-z0-9_][A-Za-z0-9_.-]{1,22}[A-Za-z0-9_]$'
      and nickname::text !~ '[._-]{3,}'
    )
  ),
  constraint visibility_requires_nickname check (
    visibility = 'private' or nickname is not null
  )
);
create index if not exists profiles_nickname_idx on public.profiles (nickname);

create or replace function public.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nickname, visibility)
  values (new.id, null, 'private')
  on conflict (id) do nothing;
  return new;
end$$;
drop trigger if exists trg_auth_user_profile on auth.users;
create trigger trg_auth_user_profile
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();

insert into public.profiles (id, nickname, visibility)
select u.id, null, 'private'
  from auth.users u
  left join public.profiles p on p.id = u.id
 where p.id is null;

create table if not exists public.reserved_nicknames (
  nickname citext primary key
);
insert into public.reserved_nicknames(nickname) values
  ('admin'),('root'),('support'),('me'),('you'),('system'),('null'),
  ('settings'),('friends'),('people'),('profile'),('login'),('signup'),
  ('anonymous'),('public'),('auth'),('api'),('www'),('mail'),('help'),
  ('about'),('terms'),('privacy'),('undefined'),('user'),('users'),
  ('moderator'),('mod')
on conflict do nothing;

create or replace function public.check_nickname_reserved()
returns trigger language plpgsql as $$
begin
  if new.nickname is not null then
    if exists (select 1 from public.reserved_nicknames r where r.nickname = new.nickname) then
      raise exception 'nickname % is reserved', new.nickname;
    end if;
  end if;
  if tg_op = 'UPDATE' and new.nickname is distinct from old.nickname
     and old.nickname is not null
     and old.nickname_changed_at is not null
     and old.nickname_changed_at > now() - interval '30 days' then
    raise exception 'nickname can only be changed once every 30 days';
  end if;
  if tg_op = 'UPDATE' and new.nickname is distinct from old.nickname then
    new.nickname_changed_at := now();
  end if;
  return new;
end$$;
drop trigger if exists trg_profiles_nickname on public.profiles;
create trigger trg_profiles_nickname
  before insert or update of nickname on public.profiles
  for each row execute function public.check_nickname_reserved();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and new is distinct from old then
    new.updated_at := now();
  end if;
  return new;
end$$;
drop trigger if exists trg_profiles_touch on public.profiles;
create trigger trg_profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- 2. friendships + user_blocks ---------------------------------------
create table if not exists public.friendships (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references auth.users(id) on delete cascade,
  addressee_id  uuid not null references auth.users(id) on delete cascade,
  status        text not null default 'pending'
                check (status in ('pending','accepted')),
  created_at    timestamptz not null default now(),
  responded_at  timestamptz,
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id),
  check (status = 'pending' or responded_at is not null)
);
create unique index if not exists friendships_pair_uidx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists friendships_requester_idx on public.friendships(requester_id);
create index if not exists friendships_addressee_idx on public.friendships(addressee_id);
create index if not exists friendships_status_idx    on public.friendships(status);

create table if not exists public.user_blocks (
  blocker_id  uuid not null references auth.users(id) on delete cascade,
  blocked_id  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index if not exists user_blocks_blocked_idx on public.user_blocks(blocked_id);

create or replace function public.friendships_guard()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if new.requester_id <> auth.uid() then
      raise exception 'requester_id must equal auth.uid()';
    end if;
    if new.status <> 'pending' then
      raise exception 'new friendships must start as pending';
    end if;
    if exists (select 1 from public.user_blocks b
                where (b.blocker_id = new.requester_id and b.blocked_id = new.addressee_id)
                   or (b.blocker_id = new.addressee_id and b.blocked_id = new.requester_id)) then
      raise exception 'cannot send request: block exists';
    end if;
    return new;
  elsif tg_op = 'UPDATE' then
    -- Pin immutable columns to prevent identity rewriting during accept.
    if new.id is distinct from old.id
       or new.requester_id is distinct from old.requester_id
       or new.addressee_id is distinct from old.addressee_id
       or new.created_at is distinct from old.created_at then
      raise exception 'immutable column changed on friendship update';
    end if;
    if old.status = 'pending' and new.status = 'accepted' then
      if auth.uid() <> old.addressee_id then
        raise exception 'only addressee may accept';
      end if;
      new.responded_at := now();
      return new;
    end if;
    raise exception 'invalid friendship transition % -> %', old.status, new.status;
  end if;
  return new;
end$$;
drop trigger if exists trg_friendships_guard on public.friendships;
create trigger trg_friendships_guard
  before insert or update on public.friendships
  for each row execute function public.friendships_guard();

create or replace function public.user_blocks_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.friendships f
   where (f.requester_id = new.blocker_id and f.addressee_id = new.blocked_id)
      or (f.requester_id = new.blocked_id and f.addressee_id = new.blocker_id);
  return new;
end$$;
drop trigger if exists trg_user_blocks_after_insert on public.user_blocks;
create trigger trg_user_blocks_after_insert
  after insert on public.user_blocks
  for each row execute function public.user_blocks_after_insert();

create or replace view public.friends_view
with (security_invoker = on) as
select requester_id as user_id, addressee_id as friend_id, responded_at as since
  from public.friendships where status = 'accepted'
union all
select addressee_id as user_id, requester_id as friend_id, responded_at as since
  from public.friendships where status = 'accepted';

-- 3. Visibility helper ----------------------------------------------
-- NOTE: viewer is always pinned to auth.uid() internally to prevent the
-- function from being used as a relationship-probing oracle via PostgREST RPC.
-- The `viewer` argument is kept for backward-compatibility with the RLS
-- policies (which call is_visible_to(user_id, auth.uid())) but is ignored
-- when it does not match auth.uid().
create or replace function public.is_visible_to(owner uuid, viewer uuid)
returns boolean
language sql
stable parallel safe
security definer
set search_path = public
as $$
  select
    case
      when auth.uid() is null then false
      -- Pin viewer to auth.uid(): refuse to evaluate for any other viewer.
      when viewer is distinct from auth.uid() then false
      when owner = auth.uid() then true
      when exists (
        select 1 from public.user_blocks b
        where (b.blocker_id = owner       and b.blocked_id = auth.uid())
           or (b.blocker_id = auth.uid()  and b.blocked_id = owner)
      ) then false
      when exists (
        select 1 from public.profiles p
        where p.id = owner and p.visibility = 'public'
      ) then true
      when exists (
        select 1 from public.profiles p
        where p.id = owner and p.visibility = 'friends'
      ) and exists (
        select 1 from public.friendships f
        where f.status = 'accepted'
          and ((f.requester_id = owner and f.addressee_id = auth.uid())
            or (f.addressee_id = owner and f.requester_id = auth.uid()))
      ) then true
      else false
    end
$$;
revoke all on function public.is_visible_to(uuid, uuid) from public;
grant execute on function public.is_visible_to(uuid, uuid) to authenticated;

-- 4. Per-user progress tables ---------------------------------------
create table if not exists public.user_trick_progress (
  user_id        uuid not null references auth.users(id) on delete cascade,
  trick_id       uuid not null references public.tricks(id) on delete cascade,
  rate           smallint,
  rate_l         smallint,
  rate_r         smallint,
  last_practiced date,
  status         text not null default 'Not Started',
  fav            boolean not null default false,
  lr_enabled     boolean not null default false,
  updated_at     timestamptz not null default now(),
  primary key (user_id, trick_id)
);
create index if not exists utp_user_idx  on public.user_trick_progress(user_id);
create index if not exists utp_trick_idx on public.user_trick_progress(trick_id);

create table if not exists public.user_transition_progress (
  user_id        uuid not null references auth.users(id) on delete cascade,
  transition_id  uuid not null references public.transitions(id) on delete cascade,
  rate           smallint,
  last_practiced date,
  updated_at     timestamptz not null default now(),
  primary key (user_id, transition_id)
);
create index if not exists uxp_user_idx on public.user_transition_progress(user_id);

create table if not exists public.user_sequence_progress (
  user_id        uuid not null references auth.users(id) on delete cascade,
  sequence_id    uuid not null references public.sequences(id) on delete cascade,
  rate           smallint,
  last_practiced date,
  updated_at     timestamptz not null default now(),
  primary key (user_id, sequence_id)
);
create index if not exists usp_user_idx on public.user_sequence_progress(user_id);

drop trigger if exists trg_utp_touch on public.user_trick_progress;
create trigger trg_utp_touch before update on public.user_trick_progress
  for each row execute function public.touch_updated_at();
drop trigger if exists trg_uxp_touch on public.user_transition_progress;
create trigger trg_uxp_touch before update on public.user_transition_progress
  for each row execute function public.touch_updated_at();
drop trigger if exists trg_usp_touch on public.user_sequence_progress;
create trigger trg_usp_touch before update on public.user_sequence_progress
  for each row execute function public.touch_updated_at();

create or replace function public.utp_lr_check()
returns trigger language plpgsql as $$
begin
  if (new.rate_l is not null or new.rate_r is not null) then
    if not exists (select 1 from public.tricks t where t.id = new.trick_id and t.lr = true) then
      raise exception 'trick % does not support L/R sides', new.trick_id;
    end if;
  end if;
  return new;
end$$;
drop trigger if exists trg_utp_lr on public.user_trick_progress;
create trigger trg_utp_lr before insert or update on public.user_trick_progress
  for each row execute function public.utp_lr_check();

-- 5. Backfill from existing global rows ------------------------------
insert into public.user_trick_progress
  (user_id, trick_id, rate, rate_l, rate_r, last_practiced, status, fav, lr_enabled, updated_at)
select
  current_setting('app.legacy_owner')::uuid,
  t.id, t.rate, t.rate_l, t.rate_r, t.last_practiced,
  coalesce(t.status,'Not Started'), coalesce(t.fav,false),
  coalesce(t.lr,false),
  now()
from public.tricks t
on conflict (user_id, trick_id) do nothing;

insert into public.user_transition_progress
  (user_id, transition_id, rate, last_practiced, updated_at)
select
  current_setting('app.legacy_owner')::uuid,
  x.id, x.rate, x.last_practiced, now()
from public.transitions x
on conflict (user_id, transition_id) do nothing;

insert into public.user_sequence_progress
  (user_id, sequence_id, rate, last_practiced, updated_at)
select
  current_setting('app.legacy_owner')::uuid,
  s.id, s.rate, s.last_practiced, now()
from public.sequences s
on conflict (user_id, sequence_id) do nothing;

-- 6. practice_log: add user_id, backfill, NOT NULL ------------------
alter table public.practice_log
  add column if not exists user_id uuid references auth.users(id) on delete cascade;
update public.practice_log
   set user_id = current_setting('app.legacy_owner')::uuid
 where user_id is null;
alter table public.practice_log
  alter column user_id set not null;
create index if not exists practice_log_user_idx on public.practice_log(user_id);

create or replace function public.practice_log_stamp_user()
returns trigger language plpgsql as $$
begin
  if new.user_id is null then new.user_id := auth.uid(); end if;
  if new.user_id is null then raise exception 'user_id required'; end if;
  return new;
end$$;
drop trigger if exists trg_practice_log_user on public.practice_log;
create trigger trg_practice_log_user
  before insert on public.practice_log
  for each row execute function public.practice_log_stamp_user();

-- 7. Drop now-per-user columns from catalog tables ------------------
alter table public.tricks       drop column if exists rate;
alter table public.tricks       drop column if exists rate_l;
alter table public.tricks       drop column if exists rate_r;
alter table public.tricks       drop column if exists last_practiced;
alter table public.tricks       drop column if exists status;
alter table public.tricks       drop column if exists fav;
alter table public.transitions  drop column if exists rate;
alter table public.transitions  drop column if exists last_practiced;
alter table public.sequences    drop column if exists rate;
alter table public.sequences    drop column if exists last_practiced;
alter table public.sequences    add column if not exists created_by uuid references auth.users(id);

create unique index if not exists tricks_name_uidx on public.tricks (lower(name));
create unique index if not exists transitions_edge_uidx
  on public.transitions (from_trick, to_trick, coalesce(from_side,''), coalesce(to_side,''));

-- 8. Enable RLS + policies ------------------------------------------
alter table public.profiles                 enable row level security;
alter table public.friendships              enable row level security;
alter table public.user_blocks              enable row level security;
alter table public.user_trick_progress      enable row level security;
alter table public.user_transition_progress enable row level security;
alter table public.user_sequence_progress   enable row level security;
alter table public.practice_log             enable row level security;
alter table public.tricks                   enable row level security;
alter table public.transitions              enable row level security;
alter table public.sequences                enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (true);
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated with check (auth.uid() = id);
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles
  for delete to authenticated using (auth.uid() = id);

drop policy if exists friendships_select on public.friendships;
create policy friendships_select on public.friendships
  for select to authenticated
  using (auth.uid() in (requester_id, addressee_id));
drop policy if exists friendships_insert on public.friendships;
create policy friendships_insert on public.friendships
  for insert to authenticated
  with check (
    auth.uid() = requester_id
    and status = 'pending'
    and not exists (
      select 1 from public.friendships f
      where (f.requester_id = auth.uid() and f.addressee_id = addressee_id)
         or (f.addressee_id = auth.uid() and f.requester_id = addressee_id)
    )
  );
drop policy if exists friendships_update on public.friendships;
create policy friendships_update on public.friendships
  for update to authenticated
  using (auth.uid() in (requester_id, addressee_id))
  with check (auth.uid() in (requester_id, addressee_id));
drop policy if exists friendships_delete on public.friendships;
create policy friendships_delete on public.friendships
  for delete to authenticated
  using (auth.uid() in (requester_id, addressee_id));

drop policy if exists user_blocks_select on public.user_blocks;
create policy user_blocks_select on public.user_blocks
  for select to authenticated
  using (auth.uid() = blocker_id);
drop policy if exists user_blocks_insert on public.user_blocks;
create policy user_blocks_insert on public.user_blocks
  for insert to authenticated
  with check (auth.uid() = blocker_id);
drop policy if exists user_blocks_delete on public.user_blocks;
create policy user_blocks_delete on public.user_blocks
  for delete to authenticated
  using (auth.uid() = blocker_id);

drop policy if exists utp_select on public.user_trick_progress;
create policy utp_select on public.user_trick_progress
  for select to authenticated
  using (auth.uid() = user_id or public.is_visible_to(user_id, auth.uid()));
drop policy if exists utp_modify on public.user_trick_progress;
create policy utp_modify on public.user_trick_progress
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists uxp_select on public.user_transition_progress;
create policy uxp_select on public.user_transition_progress
  for select to authenticated
  using (auth.uid() = user_id or public.is_visible_to(user_id, auth.uid()));
drop policy if exists uxp_modify on public.user_transition_progress;
create policy uxp_modify on public.user_transition_progress
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists usp_select on public.user_sequence_progress;
create policy usp_select on public.user_sequence_progress
  for select to authenticated
  using (auth.uid() = user_id or public.is_visible_to(user_id, auth.uid()));
drop policy if exists usp_modify on public.user_sequence_progress;
create policy usp_modify on public.user_sequence_progress
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists practice_log_select on public.practice_log;
create policy practice_log_select on public.practice_log
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists practice_log_insert on public.practice_log;
create policy practice_log_insert on public.practice_log
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists practice_log_update on public.practice_log;
create policy practice_log_update on public.practice_log
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists practice_log_delete on public.practice_log;
create policy practice_log_delete on public.practice_log
  for delete to authenticated using (auth.uid() = user_id);

drop policy if exists tricks_select on public.tricks;
create policy tricks_select on public.tricks for select to authenticated using (true);
drop policy if exists tricks_insert on public.tricks;
create policy tricks_insert on public.tricks for insert to authenticated with check (true);
drop policy if exists tricks_update on public.tricks;
create policy tricks_update on public.tricks for update to authenticated using (true) with check (true);
drop policy if exists tricks_no_delete on public.tricks;
create policy tricks_no_delete on public.tricks for delete to authenticated using (false);

drop policy if exists transitions_select on public.transitions;
create policy transitions_select on public.transitions for select to authenticated using (true);
drop policy if exists transitions_insert on public.transitions;
create policy transitions_insert on public.transitions for insert to authenticated with check (true);
drop policy if exists transitions_update on public.transitions;
create policy transitions_update on public.transitions for update to authenticated using (true) with check (true);
drop policy if exists transitions_no_delete on public.transitions;
create policy transitions_no_delete on public.transitions for delete to authenticated using (false);

drop policy if exists sequences_select on public.sequences;
create policy sequences_select on public.sequences for select to authenticated using (true);
drop policy if exists sequences_insert on public.sequences;
create policy sequences_insert on public.sequences for insert to authenticated with check (true);
drop policy if exists sequences_update on public.sequences;
create policy sequences_update on public.sequences for update to authenticated using (true) with check (true);
drop policy if exists sequences_no_delete on public.sequences;
create policy sequences_no_delete on public.sequences for delete to authenticated using (false);

-- 9. Realtime publication ------------------------------------------
alter publication supabase_realtime add table public.user_trick_progress;
alter publication supabase_realtime add table public.user_transition_progress;
alter publication supabase_realtime add table public.user_sequence_progress;
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.friendships;
alter publication supabase_realtime add table public.user_blocks;

-- 10. Record migration ---------------------------------------------
insert into public.schema_migrations (version) values ('m3_5_social');

commit;
