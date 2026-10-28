-- Hoot: je account zelf verwijderen (de App Store eist dat dit in de app kan).
-- Uitvoeren in Supabase → SQL Editor (één keer).
--
-- Weg gaat de gebruiker in auth.users; daarmee via "on delete cascade" ook het profiel, de
-- gesynchroniseerde staat (user_state) en Bewaard (saved_items). Uitnodigingen die je maakte
-- blijven bestaan, zonder maker (on delete set null).
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return; end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
