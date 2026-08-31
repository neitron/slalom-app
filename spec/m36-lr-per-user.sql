-- M36 — L/R mode becomes per-user
--
-- Problem: `tricks.lr` is a catalog column, but the UI toggles L/R per user.
-- `tricks_update` RLS only lets the creator write the catalog row, and seed
-- tricks have `created_by IS NULL`, so the toggle never reached the server.
-- The client then pushed rate_l/rate_r for a trick the server still believed
-- had lr = false, and `utp_lr_check` rejected the row forever:
--   "trick <id> does not support L/R sides"
--
-- Fix: `user_trick_progress.lr_enabled` is the per-user answer.
--   NULL  -> inherit the catalog default (`tricks.lr`)
--   true  -> this user rates both legs separately
--   false -> this user rates both legs together
--
-- Backward compatible: an older client that never sends lr_enabled leaves the
-- column NULL, which still resolves to `tricks.lr` exactly as before.

alter table public.user_trick_progress alter column lr_enabled drop not null;
alter table public.user_trick_progress alter column lr_enabled set default null;

-- Existing `false` values were the column default, never a user's choice.
update public.user_trick_progress set lr_enabled = null where lr_enabled = false;

create or replace function public.utp_lr_check()
returns trigger language plpgsql as $$
begin
  if (new.rate_l is not null or new.rate_r is not null) then
    if not coalesce(
      new.lr_enabled,
      (select t.lr from public.tricks t where t.id = new.trick_id),
      false
    ) then
      raise exception 'trick % has L/R disabled for this user', new.trick_id;
    end if;
  end if;
  return new;
end$$;

alter function public.utp_lr_check() set search_path = public, pg_temp;
