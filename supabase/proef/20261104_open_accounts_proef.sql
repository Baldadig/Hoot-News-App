-- Hoot: PROEF voor supabase/migrations/20261104_open_accounts.sql (4 november 2026).
-- Draai dit in Supabase → SQL Editor → New query, als geheel. Het verandert NIETS blijvends.
--
-- Hoe het werkt: alles staat in één do-blok. Het blok voert de hele migratie uit, maakt een
-- nep-gebruiker, telt, en eindigt met `raise exception`. Een fout draait in Postgres altijd het hele
-- blok terug, wat de editor ook doet. De rode foutmelding IS de uitkomst; er blijft niets achter.
--
-- Verwacht (één regel, in het rood):
--   HOOT-PROEF (alles teruggedraaid) te_groot=0 profiel=1 staat=1 zonder_profiel=0 join=true join_profiel=1
--
--   te_groot       rijen in user_state die nu al boven een nieuwe grens zitten (vooraf, moet 0 zijn)
--   profiel/staat  de trigger maakte voor de nep-gebruiker een profiel en een user_state (1 en 1)
--   zonder_profiel gebruikers zonder profiel na de aanvulling (0)
--   join           het vangnet join() werkt voor een ingelogde gebruiker zonder profiel (true, 1)
-- Ziet het er anders uit, of staat er een andere fout? Dan de migratie NIET uitvoeren.
--
-- Alleen de grootte-telling, los (geeft één getal, verwacht 0):
--   select count(*) as te_groot from public.user_state
--   where pg_column_size(prefs) > 262144 or pg_column_size(read_ids) > 524288
--      or pg_column_size(stories_seen) > 524288 or pg_column_size(edition) > 1048576;
--
-- Dit bestand staat bewust niet in supabase/migrations/: het eindigt altijd met een fout.
-- Het middenstuk is letterlijk de migratie (tests/membership.test.mjs bewaakt dat).

do $proef$
declare
  te_groot int;
  profiel int;
  staat int;
  zonder int;
  joined boolean;
  join_profiel int;
  u1 constant uuid := '00000000-0000-4000-8000-000000000001';
  u2 constant uuid := '00000000-0000-4000-8000-000000000002';
begin
  -- Vooraf: zitten bestaande rijen al boven een nieuwe grens?
  select count(*) into te_groot from public.user_state
  where pg_column_size(prefs) > 262144 or pg_column_size(read_ids) > 524288
     or pg_column_size(stories_seen) > 524288 or pg_column_size(edition) > 1048576;

-- ======== begin migratie (letterlijk) ========
-- ---------- 1. Iedereen die inlogt, is meteen lid ----------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  insert into public.user_state (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- 2. Wie al ingelogd was zonder uitnodiging: nu ook lid ----------
insert into public.profiles (id)
  select id from auth.users on conflict (id) do nothing;
insert into public.user_state (user_id)
  select id from public.profiles on conflict (user_id) do nothing;

-- ---------- 3. Vangnet: zelf lid worden (idempotent) ----------
-- "join" tussen aanhalingstekens: het is ook een SQL-woord. Via de API heet hij gewoon rpc/join.
create or replace function public."join"() returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return false; end if;
  insert into public.profiles (id) values (auth.uid()) on conflict (id) do nothing;
  insert into public.user_state (user_id) values (auth.uid()) on conflict (user_id) do nothing;
  return true;
end;
$$;

revoke execute on function public."join"() from public, anon;
grant execute on function public."join"() to authenticated;

-- ---------- 4. Groottegrenzen ----------
-- pg_column_size = opgeslagen grootte in bytes. NOT VALID: bestaande rijen niet controleren.
alter table public.user_state
  drop constraint if exists user_state_prefs_size,
  drop constraint if exists user_state_read_ids_size,
  drop constraint if exists user_state_stories_seen_size,
  drop constraint if exists user_state_edition_size;
alter table public.user_state
  add constraint user_state_prefs_size        check (pg_column_size(prefs)        <=  262144) not valid, -- 256 kB
  add constraint user_state_read_ids_size     check (pg_column_size(read_ids)     <=  524288) not valid, -- 512 kB
  add constraint user_state_stories_seen_size check (pg_column_size(stories_seen) <=  524288) not valid, -- 512 kB
  add constraint user_state_edition_size      check (edition is null or pg_column_size(edition) <= 1048576) not valid; -- 1 MB

alter table public.saved_items drop constraint if exists saved_items_entry_size;
alter table public.saved_items
  add constraint saved_items_entry_size check (pg_column_size(entry) <= 65536) not valid; -- 64 kB

-- Hooguit 5000 bewaarde stukken per gebruiker. Een bestaand stuk bijwerken (upsert op dezelfde
-- sleutel) mag altijd. De lock per gebruiker voorkomt dat twee toestellen tegelijk over de grens gaan.
create or replace function public.saved_items_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.saved_items where user_id = new.user_id and key = new.key) then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtext('saved_items:' || new.user_id::text));
  if (select count(*) from public.saved_items where user_id = new.user_id) >= 5000 then
    raise exception 'saved_items_limit' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists saved_items_limit on public.saved_items;
create trigger saved_items_limit
  before insert on public.saved_items
  for each row execute function public.saved_items_limit();

-- ======== einde migratie ========

  -- De trigger: een nieuwe gebruiker is meteen lid.
  insert into auth.users (id, aud, role, email) values (u1, 'authenticated', 'authenticated', 'proef1@hoot.invalid');
  select count(*) into profiel from public.profiles where id = u1;
  select count(*) into staat from public.user_state where user_id = u1;
  select count(*) into zonder from auth.users u where not exists (select 1 from public.profiles p where p.id = u.id);

  -- Het vangnet: een ingelogde gebruiker zonder profiel maakt het zelf aan.
  insert into auth.users (id, aud, role, email) values (u2, 'authenticated', 'authenticated', 'proef2@hoot.invalid');
  delete from public.user_state where user_id = u2;
  delete from public.profiles where id = u2;
  perform set_config('request.jwt.claim.sub', u2::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', u2, 'role', 'authenticated')::text, true);
  joined := public."join"();
  select count(*) into join_profiel from public.profiles where id = u2;

  raise exception 'HOOT-PROEF (alles teruggedraaid) te_groot=% profiel=% staat=% zonder_profiel=% join=% join_profiel=%',
    te_groot, profiel, staat, zonder, joined::text, join_profiel;
end
$proef$;
