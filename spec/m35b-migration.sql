-- =====================================================================
-- M3.5b: per-user transitions/sequences + RLS hardening
-- Run as a single submission in Supabase SQL editor.
-- =====================================================================
begin;

-- Idempotency sentinel
do $$
begin
  if exists (select 1 from public.schema_migrations where version = 'm3_5b_per_user_edges') then
    raise exception 'Migration m3_5b_per_user_edges already applied';
  end if;
end$$;

-- ---------------------------------------------------------------------
-- 1) Backfill rate/last_practiced from progress tables back onto rows,
--    then drop the progress tables.
-- ---------------------------------------------------------------------

-- transitions: add rate + last_practiced columns
alter table public.transitions add column if not exists rate           smallint;
alter table public.transitions add column if not exists last_practiced date;

-- Re-key transitions by (user_id, from, to, sides): one row per user-edge.
-- Today all 26 transitions belong to kirill. Each user_transition_progress
-- row points to a transition row. Backfill that progress onto the row.
update public.transitions t
set rate = p.rate, last_practiced = p.last_practiced
from public.user_transition_progress p
where p.transition_id = t.id and p.user_id = t.user_id;

-- sequences: add rate + last_practiced
alter table public.sequences add column if not exists rate           smallint;
alter table public.sequences add column if not exists last_practiced date;

update public.sequences s
set rate = p.rate, last_practiced = p.last_practiced
from public.user_sequence_progress p
where p.sequence_id = s.id and p.user_id = s.created_by;

-- Promote created_by to user_id on sequences (and require NOT NULL)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='sequences' and column_name='created_by'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='sequences' and column_name='user_id'
  ) then
    alter table public.sequences rename column created_by to user_id;
  end if;
end$$;

-- Both transitions.user_id and sequences.user_id exist now. Backfill
-- nulls to legacy owner (set in m3_5 migration), then mark NOT NULL.
update public.transitions set user_id = (select id from auth.users limit 1)
  where user_id is null and (select count(*) from auth.users) = 1;
update public.sequences   set user_id = (select id from auth.users limit 1)
  where user_id is null and (select count(*) from auth.users) = 1;
-- If multi-user with NULLs left, abort loudly:
do $$
declare cnt int;
begin
  select count(*) into cnt from public.transitions where user_id is null;
  if cnt > 0 then raise exception 'transitions has % rows with user_id is null', cnt; end if;
  select count(*) into cnt from public.sequences where user_id is null;
  if cnt > 0 then raise exception 'sequences has % rows with user_id is null', cnt; end if;
end$$;

alter table public.transitions alter column user_id set not null;
alter table public.sequences   alter column user_id set not null;
alter table public.transitions alter column user_id set default auth.uid();
alter table public.sequences   alter column user_id set default auth.uid();

-- Drop the now-redundant progress tables
drop table if exists public.user_transition_progress;
drop table if exists public.user_sequence_progress;

-- ---------------------------------------------------------------------
-- 2) Drop dead policies and the old wide-open *_update policies on
--    catalog tables. Transitions & sequences become per-user; tricks
--    stays shared with permissive INSERT/UPDATE (catalog).
-- ---------------------------------------------------------------------

-- Tricks (shared catalog) — remove the dead per-user policy and the
-- pre-M3.5 user_id column.
drop policy if exists "own rows"        on public.tricks;
alter table public.tricks drop column if exists user_id;
-- Keep tricks_insert/update/select/no_delete as-is (collaborative catalog).

-- Transitions (per-user) — drop both dead and wide-open policies.
drop policy if exists "own rows"             on public.transitions;
drop policy if exists transitions_insert     on public.transitions;
drop policy if exists transitions_update     on public.transitions;
drop policy if exists transitions_select     on public.transitions;
drop policy if exists transitions_no_delete  on public.transitions;

create policy transitions_select on public.transitions
  for select to authenticated
  using (auth.uid() = user_id or is_visible_to(user_id, auth.uid()));

create policy transitions_insert on public.transitions
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy transitions_update on public.transitions
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy transitions_delete on public.transitions
  for delete to authenticated
  using (auth.uid() = user_id);

-- Sequences (per-user) — same shape.
drop policy if exists "own rows"           on public.sequences;
drop policy if exists sequences_insert     on public.sequences;
drop policy if exists sequences_update     on public.sequences;
drop policy if exists sequences_select     on public.sequences;
drop policy if exists sequences_no_delete  on public.sequences;

create policy sequences_select on public.sequences
  for select to authenticated
  using (auth.uid() = user_id or is_visible_to(user_id, auth.uid()));

create policy sequences_insert on public.sequences
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy sequences_update on public.sequences
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy sequences_delete on public.sequences
  for delete to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 3) Enable RLS on schema_migrations + reserved_nicknames (advisor).
--    schema_migrations: deny-all to clients (only service role).
--    reserved_nicknames: allow SELECT to authenticated so the
--    SECURITY INVOKER trigger functions (after we tighten them) can
--    still read it. Today the nickname trigger is SECURITY DEFINER so
--    it already bypasses RLS; we still add the policy for defensive depth.
-- ---------------------------------------------------------------------
alter table public.schema_migrations  enable row level security;
alter table public.reserved_nicknames enable row level security;
-- (no policies on schema_migrations -> deny-all for authenticated/anon)
drop policy if exists reserved_nicknames_select on public.reserved_nicknames;
create policy reserved_nicknames_select on public.reserved_nicknames
  for select to authenticated using (true);

-- ---------------------------------------------------------------------
-- 4) Tighten functions: set immutable search_path on the warnable ones,
--    revoke EXECUTE from anon on trigger functions that don't need RPC.
-- ---------------------------------------------------------------------
alter function public.check_nickname_reserved()   set search_path = public, pg_temp;
alter function public.touch_updated_at()          set search_path = public, pg_temp;
alter function public.friendships_guard()         set search_path = public, pg_temp;
alter function public.utp_lr_check()              set search_path = public, pg_temp;
alter function public.practice_log_stamp_user()   set search_path = public, pg_temp;
alter function public.create_profile_for_new_user() set search_path = public, pg_temp;
alter function public.user_blocks_after_insert()  set search_path = public, pg_temp;
alter function public.is_visible_to(uuid, uuid)   set search_path = public, pg_temp;

-- Revoke RPC reach from anon (they can't be authenticated when calling
-- these anyway). Keep authenticated execute so triggers and RLS evals
-- still work. The advisor will still warn for authenticated, accepted.
revoke execute on function public.create_profile_for_new_user() from anon;
revoke execute on function public.user_blocks_after_insert()    from anon;
revoke execute on function public.is_visible_to(uuid, uuid)     from anon;

-- ---------------------------------------------------------------------
-- Done.
-- ---------------------------------------------------------------------
insert into public.schema_migrations (version) values ('m3_5b_per_user_edges');

commit;
