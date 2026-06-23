-- M3.5c: drop visibility_requires_nickname CHECK.
-- The constraint produced spurious save failures for the client upsert
-- path (apparently INSERT...ON CONFLICT triggered evaluation against the
-- proposed insert row rather than the post-update merged row). The
-- client now defends against the nicknameless-public state in
-- Settings.vue; the DB constraint was defensive-depth only.
alter table public.profiles drop constraint if exists visibility_requires_nickname;
