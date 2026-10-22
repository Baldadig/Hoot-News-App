-- Persoonlijke editie (Hoot 1.28): de eerste samenstelling per dagdeel wordt in je account
-- bewaard, zodat al je toestellen dezelfde editie tonen. Eén kolom erbij in user_state; de
-- bestaande regels (row level security: alleen je eigen rij) en rechten gelden ook hiervoor.
alter table public.user_state add column if not exists edition jsonb;
