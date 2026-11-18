-- Base du site Indonésie : contenus (régions, étapes, itinéraire, réglages), favoris, historique, photos,
-- et accès au back office par un code à 4 chiffres.
--
-- À coller en une fois dans l'éditeur SQL du projet Supabase (SQL Editor > New query > Run).
-- Le script peut être relancé sans risque : il ne supprime aucun contenu.
--
-- Le code à 4 chiffres se choisit ensuite à la première ouverture du back office.
-- Code oublié ? Lancer ici :  select prive.reinitialiser_code();  puis en choisir un nouveau dans le back office.

-- ---------------------------------------------------------------- Contenus (lus par le site)

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

-- Étapes aimées : une seule liste, commune à tous les visiteurs.
create table if not exists public.favoris (
  place text primary key check (place ~ '^[a-z0-9-]{1,60}$'),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- Accès au back office (schéma privé)

-- Ce schéma n'est pas exposé par l'API : on ne peut y toucher que par les fonctions plus bas, ou depuis cet éditeur.
create schema if not exists prive;

-- Le code à 4 chiffres, gardé sous forme d'empreinte.
create table if not exists prive.acces (
  id boolean primary key default true check (id),
  sel text not null,
  empreinte text not null,
  defini_le timestamptz not null default now()
);
-- Sessions ouvertes : un navigateur qui a donné le bon code reçoit un jeton valable 60 jours.
create table if not exists prive.sessions (
  empreinte text primary key,
  cree_le timestamptz not null default now(),
  expire_le timestamptz not null
);
-- Codes faux, pour limiter le nombre d'essais.
create table if not exists prive.tentatives (
  id bigint generated always as identity primary key,
  ip text not null,
  le timestamptz not null default now()
);
-- Photos dont l'envoi vient d'être autorisé (nom de fichier tiré au hasard, valable cinq minutes).
create table if not exists prive.envois (
  nom text primary key,
  expire_le timestamptz not null
);

create or replace function prive.empreinte(texte text)
returns text language sql immutable set search_path = '' as $$
  select encode(sha256(convert_to(texte, 'UTF8')), 'hex');
$$;

create or replace function prive.session_valide(jeton text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from prive.sessions where empreinte = prive.empreinte(jeton) and expire_le > now());
$$;

-- Adresse du visiteur, telle que l'API la transmet.
create or replace function prive.ip()
returns text language plpgsql stable set search_path = '' as $$
declare
  entetes json;
begin
  begin
    entetes := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    entetes := null;
  end;
  return coalesce(nullif(trim(entetes ->> 'cf-connecting-ip'), ''), nullif(trim(split_part(entetes ->> 'x-forwarded-for', ',', 1)), ''), 'inconnue');
end;
$$;

create or replace function prive.nouvelle_session()
returns text language plpgsql security definer set search_path = '' as $$
declare
  jeton text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  delete from prive.sessions where expire_le < now();
  insert into prive.sessions (empreinte, expire_le) values (prive.empreinte(jeton), now() + interval '60 days');
  return jeton;
end;
$$;

-- Efface le code et ferme toutes les sessions. À lancer depuis cet éditeur quand le code est oublié.
create or replace function prive.reinitialiser_code()
returns text language plpgsql security definer set search_path = '' as $$
begin
  delete from prive.acces;
  delete from prive.sessions;
  delete from prive.tentatives;
  return 'Code effacé : ouvrez le back office pour en choisir un nouveau.';
end;
$$;

-- ---------------------------------------------------------------- Fonctions appelées par le back office

-- Le code a-t-il déjà été choisi ?
create or replace function public.etat_acces()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('code_defini', exists (select 1 from prive.acces));
$$;

-- Vérifie le code et ouvre une session. Au plus 5 codes faux par quart d'heure pour une même adresse,
-- et 30 par heure toutes adresses confondues : au-delà, plus aucun essai n'est accepté pendant un moment.
create or replace function public.ouvrir(code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  adresse text := prive.ip();
  acces prive.acces;
  faux_ici integer;
  faux_partout integer;
begin
  perform pg_advisory_xact_lock(7262001);
  select * into acces from prive.acces;
  if not found then
    return jsonb_build_object('ok', false, 'raison', 'pas_de_code');
  end if;
  delete from prive.tentatives where le < now() - interval '1 day';
  select count(*) filter (where ip = adresse and le > now() - interval '15 minutes'), count(*) filter (where le > now() - interval '1 hour')
    into faux_ici, faux_partout from prive.tentatives;
  if faux_ici >= 5 or faux_partout >= 30 then
    return jsonb_build_object('ok', false, 'raison', 'bloque');
  end if;
  if code is null or acces.empreinte <> prive.empreinte(acces.sel || code) then
    insert into prive.tentatives (ip) values (adresse);
    return jsonb_build_object('ok', false, 'raison', 'code', 'essais_restants', greatest(0, 4 - faux_ici));
  end if;
  return jsonb_build_object('ok', true, 'jeton', prive.nouvelle_session());
end;
$$;

-- Choisit le code. Sans code existant, le premier venu le choisit ; ensuite il faut une session ouverte.
create or replace function public.choisir_code(code text, jeton text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  grain text := gen_random_uuid()::text;
  premier boolean;
begin
  perform pg_advisory_xact_lock(7262001);
  if code is null or code !~ '^[0-9]{4}$' then
    return jsonb_build_object('ok', false, 'raison', 'format');
  end if;
  premier := not exists (select 1 from prive.acces);
  if not premier and not prive.session_valide(jeton) then
    return jsonb_build_object('ok', false, 'raison', 'session');
  end if;
  insert into prive.acces (id, sel, empreinte) values (true, grain, prive.empreinte(grain || code))
    on conflict (id) do update set sel = excluded.sel, empreinte = excluded.empreinte, defini_le = now();
  if premier then
    return jsonb_build_object('ok', true, 'jeton', prive.nouvelle_session());
  end if;
  -- Changement de code : les autres navigateurs devront le redonner.
  delete from prive.sessions where empreinte <> prive.empreinte(jeton);
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.session_ouverte(jeton text)
returns boolean language sql stable security definer set search_path = '' as $$
  select prive.session_valide(jeton);
$$;

create or replace function public.fermer(jeton text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  delete from prive.sessions where empreinte = prive.empreinte(jeton);
  return jsonb_build_object('ok', true);
end;
$$;

-- Enregistre un contenu (création ou modification). « attendu » est la date de la version ouverte dans le back office :
-- si le contenu a été modifié ailleurs depuis, rien n'est écrit et la réponse le signale.
create or replace function public.enregistrer(jeton text, source text, ref text, contenu jsonb, rang integer default null, attendu timestamptz default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actuel timestamptz;
  nouveau timestamptz;
begin
  if not prive.session_valide(jeton) then
    return jsonb_build_object('ok', false, 'raison', 'session');
  end if;
  if source is null or source not in ('regions', 'etapes', 'documents') or ref is null or ref !~ '^[a-z0-9-]{1,60}$'
     or contenu is null or jsonb_typeof(contenu) <> 'object' then
    return jsonb_build_object('ok', false, 'raison', 'demande');
  end if;
  execute format('select updated_at from public.%I where id = $1 for update', source) into actuel using ref;
  if actuel is null then
    if source = 'documents' then
      insert into public.documents (id, data) values (ref, contenu) returning updated_at into nouveau;
    else
      execute format('insert into public.%I (id, position, data) values ($1, $2, $3) returning updated_at', source) into nouveau using ref, coalesce(rang, 0), contenu;
    end if;
  else
    if attendu is not null and actuel <> attendu then
      return jsonb_build_object('ok', false, 'raison', 'conflit');
    end if;
    execute format('update public.%I set data = $2 where id = $1 returning updated_at', source) into nouveau using ref, contenu;
  end if;
  return jsonb_build_object('ok', true, 'updated_at', nouveau);
end;
$$;

-- Verse d'un coup des contenus dans la base : { "regions": [{id, position, data}], "etapes": [...], "documents": [{id, data}] }.
create or replace function public.importer(jeton text, contenus jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  ligne jsonb;
begin
  if not prive.session_valide(jeton) then
    return jsonb_build_object('ok', false, 'raison', 'session');
  end if;
  for ligne in select * from jsonb_array_elements(coalesce(contenus -> 'regions', '[]'::jsonb)) loop
    insert into public.regions (id, position, data) values (ligne ->> 'id', coalesce((ligne ->> 'position')::integer, 0), ligne -> 'data')
      on conflict (id) do update set position = excluded.position, data = excluded.data;
  end loop;
  for ligne in select * from jsonb_array_elements(coalesce(contenus -> 'etapes', '[]'::jsonb)) loop
    insert into public.etapes (id, position, data) values (ligne ->> 'id', coalesce((ligne ->> 'position')::integer, 0), ligne -> 'data')
      on conflict (id) do update set position = excluded.position, data = excluded.data;
  end loop;
  for ligne in select * from jsonb_array_elements(coalesce(contenus -> 'documents', '[]'::jsonb)) loop
    insert into public.documents (id, data) values (ligne ->> 'id', ligne -> 'data')
      on conflict (id) do update set data = excluded.data;
  end loop;
  return jsonb_build_object('ok', true, 'regions', (select count(*) from public.regions), 'etapes', (select count(*) from public.etapes));
end;
$$;

-- Change la place d'une étape dans la liste de sa région.
create or replace function public.deplacer(jeton text, ref text, rang integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  nouveau timestamptz;
begin
  if not prive.session_valide(jeton) then
    return jsonb_build_object('ok', false, 'raison', 'session');
  end if;
  update public.etapes set position = rang where id = ref returning updated_at into nouveau;
  return jsonb_build_object('ok', true, 'updated_at', nouveau);
end;
$$;

create or replace function public.supprimer(jeton text, ref text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not prive.session_valide(jeton) then
    return jsonb_build_object('ok', false, 'raison', 'session');
  end if;
  delete from public.etapes where id = ref;
  return jsonb_build_object('ok', true);
end;
$$;

-- Les 30 dernières versions remplacées d'un contenu.
create or replace function public.versions(jeton text, source text, ref text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not prive.session_valide(jeton) then
    return jsonb_build_object('ok', false, 'raison', 'session');
  end if;
  return jsonb_build_object(
    'ok', true,
    'versions', coalesce(
      (select jsonb_agg(v order by v.saved_at desc)
         from (select h.id, h.data, h.action, h.saved_at from public.historique h
                where h.source = versions.source and h.ref = versions.ref order by h.saved_at desc limit 30) v),
      '[]'::jsonb));
end;
$$;

-- Autorise l'envoi d'une photo : renvoie le nom de fichier, tiré au hasard, sous lequel elle peut être déposée.
create or replace function public.autoriser_envoi(jeton text, prefixe text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  nom text;
begin
  if not prive.session_valide(jeton) then
    return jsonb_build_object('ok', false, 'raison', 'session');
  end if;
  if prefixe is null or prefixe !~ '^[a-z0-9-]{1,60}$' then
    return jsonb_build_object('ok', false, 'raison', 'demande');
  end if;
  nom := prefixe || '-' || left(replace(gen_random_uuid()::text, '-', ''), 14) || '.jpg';
  delete from prive.envois where expire_le < now();
  insert into prive.envois (nom, expire_le) values (nom, now() + interval '5 minutes');
  return jsonb_build_object('ok', true, 'nom', nom);
end;
$$;

-- Utilisée par la règle du stockage : ce nom de fichier vient-il d'être autorisé ?
create or replace function public.envoi_autorise(fichier text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from prive.envois where nom = fichier and expire_le > now());
$$;

-- ---------------------------------------------------------------- Historique

-- Avant chaque modification ou suppression : garde l'ancienne version et met la date à jour.
create or replace function public.garder_historique()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.data is distinct from old.data then
      insert into public.historique (source, ref, data, action) values (tg_table_name, old.id, old.data, 'modification');
    end if;
    new.updated_at := now();
    return new;
  end if;
  insert into public.historique (source, ref, data, action) values (tg_table_name, old.id, old.data, 'suppression');
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
alter table public.favoris enable row level security;
alter table prive.acces enable row level security;
alter table prive.sessions enable row level security;
alter table prive.tentatives enable row level security;
alter table prive.envois enable row level security;

-- Restes d'une première version de ce script (connexion par e-mail), s'il a été lancé.
drop policy if exists "regions : ecriture" on public.regions;
drop policy if exists "etapes : ecriture" on public.etapes;
drop policy if exists "documents : ecriture" on public.documents;
drop policy if exists "historique : lecture" on public.historique;
drop policy if exists "photos : remplacement" on storage.objects;
drop policy if exists "photos : suppression" on storage.objects;
drop policy if exists "photos : envoi" on storage.objects;
drop table if exists public.editeurs;
drop function if exists public.est_editeur();

-- Le site lit les contenus. Il n'écrit jamais directement dans ces tables : seules les fonctions ci-dessus le font,
-- après avoir vérifié la session du back office.
revoke all on public.regions, public.etapes, public.documents, public.historique from anon, authenticated;
grant select on public.regions, public.etapes, public.documents to anon, authenticated;
grant select, insert, delete on public.favoris to anon, authenticated;
revoke all on schema prive from anon, authenticated;
revoke all on all tables in schema prive from anon, authenticated;
revoke all on all functions in schema prive from public, anon, authenticated;
revoke all on function public.garder_historique() from public, anon, authenticated;

grant execute on function
  public.etat_acces(), public.ouvrir(text), public.choisir_code(text, text), public.session_ouverte(text), public.fermer(text),
  public.enregistrer(text, text, text, jsonb, integer, timestamptz), public.importer(text, jsonb), public.deplacer(text, text, integer),
  public.supprimer(text, text), public.versions(text, text, text), public.autoriser_envoi(text, text), public.envoi_autorise(text)
  to anon, authenticated;

drop policy if exists "regions : lecture" on public.regions;
create policy "regions : lecture" on public.regions for select to anon, authenticated using (true);
drop policy if exists "etapes : lecture" on public.etapes;
create policy "etapes : lecture" on public.etapes for select to anon, authenticated using (true);
drop policy if exists "documents : lecture" on public.documents;
create policy "documents : lecture" on public.documents for select to anon, authenticated using (true);

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

-- Une photo ne peut être déposée que sous un nom que le back office vient de faire autoriser.
-- Rien ne permet de remplacer ni de supprimer un fichier par l'API.
drop policy if exists "photos : envoi autorise" on storage.objects;
create policy "photos : envoi autorise" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'photos' and public.envoi_autorise(name));

-- Les nouvelles tables et fonctions sont visibles tout de suite par le site.
notify pgrst, 'reload schema';
