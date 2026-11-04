-- Hoot: accounts voor iedereen (fase A, 4 november 2026).
-- Uitvoeren in Supabase → SQL Editor, als geheel. Veilig opnieuw uit te voeren (alles is
-- "or replace", "if exists" of "on conflict do nothing").
--
-- WAT HET DOET
-- 1. Trigger op auth.users: wie voor het eerst inlogt (Google of Apple), krijgt meteen een profiel
--    en een user_state-rij. Een profielrij = lid; web én app (ook build 38) kijken alleen daarnaar.
--    Een uitnodigingscode is dus niet meer nodig. redeem_invite blijft bestaan: build 38 roept hem
--    aan als iemand toch een code plakt, en voor een lid geeft hij gewoon true.
-- 2. Eenmalige aanvulling: wie al ingelogd was zonder uitnodiging ("Nog geen lid"), is nu ook lid.
-- 3. Vangnet public."join"(): maakt profiel + user_state voor jezelf (auth.uid()). Het web roept
--    hem aan als er na inloggen tóch geen profiel is (trigger weggehaald of mislukt).
-- 4. Groottegrenzen, tegen misbruik nu iedereen een account kan maken:
--    - user_state: elke jsonb-kolom heeft een ruim maximum (zie hieronder);
--    - saved_items: hooguit 64 kB per bewaard stuk en 5000 stuks per gebruiker.
--    De check-constraints staan op NOT VALID: bestaande rijen worden niet gecontroleerd (dus de
--    migratie kan niet falen op oude gegevens), nieuwe en gewijzigde rijen wel. De grenzen liggen
--    ver boven wat de app zelf ooit schrijft (gelezen: hooguit 1500 id's, geziene verhalen: 300).
--
-- Let op: een fout in de trigger op auth.users laat élke nieuwe inlog falen ("Database error saving
-- new user"). Daarom: security definer, lege search_path, on conflict do nothing. Eerst testen.
--
-- HOE TESTEN (eerst): draai supabase/proef/20261104_open_accounts_proef.sql als geheel in de SQL Editor.
-- Dat is deze migratie in één do-blok met een nep-gebruiker en de grootte-telling vooraf; het eindigt
-- met een (bedoelde) foutmelding waarin de tellingen staan, en draait daardoor alles terug. Verwacht:
--   HOOT-PROEF (alles teruggedraaid) te_groot=0 profiel=1 staat=1 zonder_profiel=0 join=true join_profiel=1
-- Echt uitvoeren: dit bestand ongewijzigd draaien. Controle daarna:
--   select count(*) from auth.users u where not exists (select 1 from public.profiles p where p.id = u.id); -- 0
-- en een nieuw (test)account dat inlogt op hootnews.nl of in de app is meteen lid.
--
-- HOE TERUGDRAAIEN (accounts weer op uitnodiging in de app; wie al lid werd, blijft lid).
-- Let op het web: daar is het codeveld weg. Zonder join() blijft een nieuwe web-gebruiker op "Je account
-- is er bijna"; alleen de trigger weghalen (noodrem) laat het web via join() nog wel accounts maken.
--   drop trigger if exists on_auth_user_created on auth.users;
--   drop function if exists public.handle_new_user();
--   drop function if exists public."join"();
-- Groottegrenzen weghalen (los daarvan, alleen als ze in de weg zitten):
--   alter table public.user_state drop constraint if exists user_state_prefs_size,
--     drop constraint if exists user_state_read_ids_size, drop constraint if exists user_state_stories_seen_size,
--     drop constraint if exists user_state_edition_size;
--   alter table public.saved_items drop constraint if exists saved_items_entry_size;
--   drop trigger if exists saved_items_limit on public.saved_items;
--   drop function if exists public.saved_items_limit();

begin;

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

commit;
