-- Base du site Indonésie : contenus (régions, étapes, itinéraire, réglages), favoris, historique et photos.
--
-- À coller en une fois dans l'éditeur SQL du projet Supabase (SQL Editor > New query > Run).
-- Le script peut être relancé sans risque : il ne supprime aucune donnée.
--
-- Avant de le lancer, créer son compte dans Authentication > Users > Add user (avec « Auto Confirm User »).
-- Tous les comptes qui existent au moment où le script passe deviennent éditeurs du site.
-- Pour ajouter un éditeur plus tard : créer son compte de la même façon, puis relancer la dernière commande du script.

-- ---------------------------------------------------------------- Tables

-- Une ligne par région. « data » contient tout ce que le back office modifie (nom, couleur, textes, cadrage).
create table if not exists public.regions (
  id text primary key check (id ~ '^[a-z0-9-]{1,60}$'),
  position integer not null default 0,
  data jsonb not null,
  name text generated always as (data ->> 'name') stored,
  updated_at timestamptz not null default now()
);

-- Une ligne par étape : textes, activités, photos, positions.
create table if not exists public.etapes (
  id text primary key check (id ~ '^[a-z0-9-]{1,60}$'),
  position integer not null default 0,
  data jsonb not null,
  name text generated always as (data ->> 'name') stored,
  region text generated always as (data ->> 'region') stored,
  updated_at timestamptz not null default now()
);

-- Contenus uniques : « itineraire » (exemple d'itinéraire) et « site » (titre, date, taux de change).
create table if not exists public.documents (
  id text primary key check (id ~ '^[a-z0-9-]{1,60}$'),
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Version précédente de chaque contenu modifié ou supprimé, pour pouvoir revenir en arrière.
create table if not exists public.historique (
  id bigint generated always as identity primary key,
  source text not null,
  ref text not null,
  data jsonb not null,
  action text not null,
  saved_at timestamptz not null default now(),
  saved_by text
);
create index if not exists historique_ref on public.historique (source, ref, saved_at desc);

-- Comptes autorisés à modifier les contenus.
create table if not exists public.editeurs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  added_at timestamptz not null default now()
);

-- Étapes aimées : une seule liste, commune à tous les visiteurs.
create table if not exists public.favoris (
  place text primary key check (place ~ '^[a-z0-9-]{1,60}$'),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- Fonctions

-- Vrai si le compte connecté est éditeur.
create or replace function public.est_editeur()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.editeurs where user_id = (select auth.uid()));
$$;

-- Avant chaque modification ou suppression : garde l'ancienne version et met la date à jour.
create or replace function public.garder_historique()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.data is distinct from old.data then
      insert into public.historique (source, ref, data, action, saved_by)
      values (tg_table_name, old.id, old.data, 'modification', auth.jwt() ->> 'email');
    end if;
    new.updated_at := now();
    return new;
  end if;
  insert into public.historique (source, ref, data, action, saved_by)
  values (tg_table_name, old.id, old.data, 'suppression', auth.jwt() ->> 'email');
  return old;
end;
$$;

drop trigger if exists historique_regions on public.regions;
create trigger historique_regions before update or delete on public.regions
  for each row execute function public.garder_historique();
drop trigger if exists historique_etapes on public.etapes;
create trigger historique_etapes before update or delete on public.etapes
  for each row execute function public.garder_historique();
drop trigger if exists historique_documents on public.documents;
create trigger historique_documents before update or delete on public.documents
  for each row execute function public.garder_historique();

-- ---------------------------------------------------------------- Droits

alter table public.regions enable row level security;
alter table public.etapes enable row level security;
alter table public.documents enable row level security;
alter table public.historique enable row level security;
alter table public.editeurs enable row level security;
alter table public.favoris enable row level security;

grant select on public.regions, public.etapes, public.documents to anon, authenticated;
grant insert, update, delete on public.regions, public.etapes, public.documents to authenticated;
grant select on public.historique, public.editeurs to authenticated;
grant select, insert, delete on public.favoris to anon, authenticated;
grant execute on function public.est_editeur() to anon, authenticated;

-- Contenus : tout le monde lit, seuls les éditeurs connectés écrivent.
drop policy if exists "regions : lecture" on public.regions;
drop policy if exists "regions : ecriture" on public.regions;
create policy "regions : lecture" on public.regions for select to anon, authenticated using (true);
create policy "regions : ecriture" on public.regions for all to authenticated
  using ((select public.est_editeur())) with check ((select public.est_editeur()));

drop policy if exists "etapes : lecture" on public.etapes;
drop policy if exists "etapes : ecriture" on public.etapes;
create policy "etapes : lecture" on public.etapes for select to anon, authenticated using (true);
create policy "etapes : ecriture" on public.etapes for all to authenticated
  using ((select public.est_editeur())) with check ((select public.est_editeur()));

drop policy if exists "documents : lecture" on public.documents;
drop policy if exists "documents : ecriture" on public.documents;
create policy "documents : lecture" on public.documents for select to anon, authenticated using (true);
create policy "documents : ecriture" on public.documents for all to authenticated
  using ((select public.est_editeur())) with check ((select public.est_editeur()));

-- Historique : réservé aux éditeurs. Les lignes sont ajoutées par la base elle-même.
drop policy if exists "historique : lecture" on public.historique;
create policy "historique : lecture" on public.historique for select to authenticated
  using ((select public.est_editeur()));

-- Chacun peut seulement savoir s'il est lui-même éditeur.
drop policy if exists "editeurs : soi-meme" on public.editeurs;
create policy "editeurs : soi-meme" on public.editeurs for select to authenticated
  using (user_id = (select auth.uid()));

-- Favoris : tout le monde peut lire la liste, y ajouter une étape et en retirer une.
drop policy if exists "favoris : lecture" on public.favoris;
drop policy if exists "favoris : ajout" on public.favoris;
drop policy if exists "favoris : retrait" on public.favoris;
create policy "favoris : lecture" on public.favoris for select to anon, authenticated using (true);
create policy "favoris : ajout" on public.favoris for insert to anon, authenticated with check (true);
create policy "favoris : retrait" on public.favoris for delete to anon, authenticated using (true);

-- ---------------------------------------------------------------- Photos envoyées depuis le back office

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "photos : envoi" on storage.objects;
drop policy if exists "photos : remplacement" on storage.objects;
drop policy if exists "photos : suppression" on storage.objects;
create policy "photos : envoi" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (select public.est_editeur()));
create policy "photos : remplacement" on storage.objects for update to authenticated
  using (bucket_id = 'photos' and (select public.est_editeur()));
create policy "photos : suppression" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (select public.est_editeur()));

-- ---------------------------------------------------------------- Éditeurs

-- Les nouvelles tables sont visibles tout de suite par le site.
notify pgrst, 'reload schema';

-- Tous les comptes existants deviennent éditeurs. À relancer seule après avoir créé un nouveau compte.
insert into public.editeurs (user_id) select id from auth.users on conflict do nothing;
