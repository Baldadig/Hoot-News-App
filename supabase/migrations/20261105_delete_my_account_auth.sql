-- Hoot: delete_my_account geeft een fout zonder ingelogde gebruiker (voorheen stil niets).
-- Uitvoeren in Supabase → SQL Editor (één keer). Vervangt de functie uit 20261028_delete_account.sql;
-- verder werkt hij precies hetzelfde.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
