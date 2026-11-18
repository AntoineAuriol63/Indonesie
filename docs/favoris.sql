-- Table des favoris du site : une ligne par étape aimée, la même liste pour tous les visiteurs.
-- À coller une fois dans l'éditeur SQL du projet Supabase (SQL Editor > New query > Run).

create table if not exists public.favoris (
  place text primary key check (place ~ '^[a-z0-9-]{1,60}$'),
  created_at timestamptz not null default now()
);

alter table public.favoris enable row level security;

-- Le site (clé publique, rôle « anon ») peut lire la liste, y ajouter une étape et en retirer une. Rien d'autre.
grant select, insert, delete on public.favoris to anon;

drop policy if exists "favoris : lecture" on public.favoris;
drop policy if exists "favoris : ajout" on public.favoris;
drop policy if exists "favoris : retrait" on public.favoris;
create policy "favoris : lecture" on public.favoris for select to anon using (true);
create policy "favoris : ajout" on public.favoris for insert to anon with check (true);
create policy "favoris : retrait" on public.favoris for delete to anon using (true);
