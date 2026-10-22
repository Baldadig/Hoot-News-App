-- Hoot: accounts, synchroniseren en uitnodigingen.
-- Uitvoeren in Supabase → SQL Editor (één keer). Veilig opnieuw uit te voeren is het niet:
-- nieuwe wijzigingen komen in een volgend bestand.
--
-- Principe: elke gebruiker ziet en wijzigt alleen zijn eigen rijen (row level security).
-- Lid worden kan alleen met een geldige uitnodiging (functie redeem_invite).

-- ---------- Uitnodigingen ----------
create table public.invites (
  code        text primary key,
  created_by  uuid references auth.users on delete set null,
  note        text,
  max_uses    int  not null default 1 check (max_uses between 1 and 50),
  uses        int  not null default 0,
  make_admin  boolean not null default false,
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);

-- ---------- Leden ----------
create table public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  invited_with  text references public.invites (code) on delete set null,
  is_admin      boolean not null default false,
  created_at    timestamptz not null default now()
);

-- ---------- Wat de app synchroniseert ----------
-- Instellingen, gelezen berichten en geziene verhalen: één rij per lid.
create table public.user_state (
  user_id       uuid primary key references public.profiles (id) on delete cascade,
  prefs         jsonb not null default '{}'::jsonb,
  read_ids      jsonb not null default '[]'::jsonb,
  stories_seen  jsonb not null default '{}'::jsonb,
  updated_at    timestamptz not null default now()
);

-- Bewaard: één rij per bewaard bericht of verhaal.
create table public.saved_items (
  user_id   uuid not null references public.profiles (id) on delete cascade,
  key       text not null,
  entry     jsonb not null,
  saved_at  timestamptz not null default now(),
  primary key (user_id, key)
);

-- ---------- Toegang ----------
alter table public.invites     enable row level security;
alter table public.profiles    enable row level security;
alter table public.user_state  enable row level security;
alter table public.saved_items enable row level security;

grant select on public.profiles to authenticated;
grant select, insert, update on public.user_state to authenticated;
grant select, insert, update, delete on public.saved_items to authenticated;
grant select on public.invites to authenticated;

create policy "eigen profiel lezen" on public.profiles
  for select to authenticated using (id = (select auth.uid()));

create policy "eigen staat" on public.user_state
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "eigen bewaard" on public.saved_items
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "eigen uitnodigingen lezen" on public.invites
  for select to authenticated using (created_by = (select auth.uid()));

-- ---------- Functies ----------
-- Is deze code (nog) geldig? Mag iedereen vragen, ook zonder account.
create function public.check_invite(p_code text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.invites
    where code = p_code and uses < max_uses and (expires_at is null or expires_at > now())
  );
$$;

-- Word lid met een uitnodiging (na inloggen). Al lid? Dan gebeurt er niets.
create function public.redeem_invite(p_code text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  inv public.invites;
begin
  if auth.uid() is null then return false; end if;
  if exists (select 1 from public.profiles where id = auth.uid()) then return true; end if;
  select * into inv from public.invites
    where code = p_code and uses < max_uses and (expires_at is null or expires_at > now())
    for update;
  if not found then return false; end if;
  update public.invites set uses = uses + 1 where code = inv.code;
  insert into public.profiles (id, invited_with, is_admin) values (auth.uid(), inv.code, inv.make_admin);
  insert into public.user_state (user_id) values (auth.uid());
  return true;
end;
$$;

-- Nieuwe uitnodiging maken (alleen beheerders). Geldig 30 dagen.
create function public.create_invite(p_note text default null, p_max_uses int default 1) returns text
language plpgsql security definer set search_path = '' as $$
declare
  c text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    raise exception 'not_admin';
  end if;
  insert into public.invites (code, created_by, note, max_uses, expires_at)
    values (c, auth.uid(), p_note, greatest(1, least(coalesce(p_max_uses, 1), 50)), now() + interval '30 days');
  return c;
end;
$$;

revoke execute on function public.check_invite(text), public.redeem_invite(text), public.create_invite(text, int) from public, anon, authenticated;
grant execute on function public.check_invite(text) to anon, authenticated;
grant execute on function public.redeem_invite(text), public.create_invite(text, int) to authenticated;

-- ---------- De eerste uitnodiging: voor jezelf, als beheerder ----------
-- De code die hieronder verschijnt is je startlink: https://hootnewsapp.netlify.app/?uitnodiging=<code>
insert into public.invites (code, note, max_uses, make_admin, expires_at)
  values (substr(replace(gen_random_uuid()::text, '-', ''), 1, 16), 'start: beheerder', 1, true, now() + interval '30 days')
  returning code as jouw_startcode;
