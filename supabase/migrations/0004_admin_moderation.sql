-- ============================================================================
-- JEaLiFe Pictures — rôle administrateur et modération
--   · Un rôle `admin` sur `profiles`, gardé par un déclencheur pour qu'aucun
--     compte ne puisse se le donner lui-même via `upsertProfile`.
--   · `site_settings` porte un seul réglage pour l'instant : `moderation_mode`
--     (`auto` ou `manual`). C'est le serveur — pas le navigateur — qui décide
--     du statut d'un envoi : le client demandait jusqu'ici `status: 'published'`
--     en dur, et rien n'empêchait un envoi de tricher sur cette valeur.
--   · La file de signalements (`media_reports`), déjà alimentée depuis la
--     migration 0001, devient enfin consultable et traitable par un admin.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Rôle
-- ----------------------------------------------------------------------------
create type public.user_role as enum ('user', 'admin');

alter table public.profiles
  add column if not exists role public.user_role not null default 'user';

-- `security definer` : sans ça, une policy RLS sur `profiles` qui s'appuierait
-- sur cette fonction devrait elle-même relire `profiles` sous RLS — la policy
-- de lecture est déjà publique donc ça ne bouclerait pas, mais ça évite toute
-- dépendance fragile si cette policy change un jour.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

-- Personne ne doit pouvoir s'octroyer le rôle admin (ou se marquer vérifié /
-- contributeur) via un simple upsert de son propre profil : seul un admin
-- déjà en poste peut faire évoluer ces trois colonnes.
--
-- `auth.uid() is not null` est essentiel : une requête lancée depuis le SQL
-- Editor (ou toute connexion directe à la base, hors PostgREST) n'a pas de
-- session Supabase Auth, donc `auth.uid()` y vaut toujours `null`. Sans cette
-- condition, ce déclencheur bloquerait sa propre commande de bootstrap — le
-- premier admin ne pourrait jamais être nommé.
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role := old.role;
    new.is_verified := old.is_verified;
    new.is_contributor := old.is_contributor;
  end if;
  return new;
end;
$$;

drop trigger if exists on_profiles_privilege_guard on public.profiles;
create trigger on_profiles_privilege_guard
  before update on public.profiles
  for each row execute function public.protect_profile_privileges();

-- Un admin doit pouvoir modifier n'importe quel profil (vérifier un
-- contributeur, promouvoir un autre admin) ; la garde ci-dessus limite déjà
-- ce qu'un compte non-admin peut changer sur lui-même.
drop policy if exists "Chacun modifie son propre profil." on public.profiles;
create policy "Chacun modifie son profil, un admin modifie tous les profils."
  on public.profiles for update
  using (auth.uid() = id or public.is_admin());

-- ----------------------------------------------------------------------------
-- 2. Réglages du site
-- ----------------------------------------------------------------------------
create table if not exists public.site_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

drop policy if exists "Seuls les administrateurs lisent les réglages." on public.site_settings;
create policy "Seuls les administrateurs lisent les réglages."
  on public.site_settings for select using (public.is_admin());

insert into public.site_settings (key, value) values
  ('moderation_mode', 'auto')
on conflict (key) do nothing;

-- Lecture par tout le monde (y compris un visiteur anonyme) : c'est ce qui
-- permet à `/submit` d'annoncer honnêtement « votre image sera publiée tout
-- de suite » ou « … sera d'abord vérifiée par un membre de l'équipe » avant
-- même d'envoyer le fichier. `security definer` contourne la policy de
-- lecture ci-dessus, réservée aux admins pour l'accès direct à la table.
create or replace function public.get_setting(setting_key text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select value from public.site_settings where key = setting_key;
$$;

grant execute on function public.get_setting(text) to anon, authenticated;

-- Écriture réservée aux admins, vérifiée dans la fonction elle-même plutôt
-- que via une policy RLS sur la table : évite d'avoir à accorder un accès en
-- écriture direct sur `site_settings` depuis le client.
create or replace function public.set_setting(setting_key text, setting_value text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Permission refusée.' using errcode = '42501';
  end if;

  insert into public.site_settings (key, value, updated_at)
  values (setting_key, setting_value, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
end;
$$;

grant execute on function public.set_setting(text, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 3. Statut d'un média décidé côté serveur
--
--    Avant cette migration, `app/submit/page.js` envoyait `status: 'published'`
--    en dur : la colonne existait pour une modération manuelle, mais rien ne
--    l'utilisait jamais, et un client malveillant aurait pu de toute façon
--    écrire n'importe quel statut à l'insertion (la policy RLS ne portait que
--    sur `user_id`). Le statut à la création est désormais entièrement décidé
--    par ce déclencheur : `moderation_mode = 'manual'` → `pending`,
--    sinon → `published`. Un admin garde la main pour importer du contenu déjà
--    publié (utile pour une reprise de catalogue).
-- ----------------------------------------------------------------------------
create or replace function public.media_before_write()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' and not public.is_admin() then
    new.status := case
      when public.get_setting('moderation_mode') = 'manual' then 'pending'::public.media_status
      else 'published'::public.media_status
    end;
  end if;

  new.geo_priority := public.geo_priority_for(new.country_code);

  new.search_vector :=
      setweight(to_tsvector('public.fr_unaccent', coalesce(new.title, '')), 'A')
    || setweight(to_tsvector('public.fr_unaccent', array_to_string(coalesce(new.tags, '{}'), ' ')), 'A')
    || setweight(to_tsvector('public.fr_unaccent', coalesce(new.alt_text, '')), 'B')
    || setweight(to_tsvector('public.fr_unaccent', coalesce(new.location, '')), 'B')
    || setweight(to_tsvector('public.fr_unaccent', coalesce(new.city, '')), 'B')
    || setweight(to_tsvector('public.fr_unaccent',
         coalesce((select c.name_fr from public.countries c where c.code = new.country_code), '')), 'B')
    || setweight(to_tsvector('public.fr_unaccent', coalesce(new.description, '')), 'C')
    || setweight(to_tsvector('public.fr_unaccent', coalesce(new.camera, '')), 'D');

  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 4. Accès admin aux médias et aux signalements
-- ----------------------------------------------------------------------------
drop policy if exists "Seuls les médias publiés sont publics." on public.media;
create policy "Médias publiés publics, admin voit tout."
  on public.media for select
  using (status = 'published' or auth.uid() = user_id or public.is_admin());

drop policy if exists "Chacun modifie ses propres médias." on public.media;
create policy "Chacun modifie ses médias, un admin modifie tous les médias."
  on public.media for update
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Chacun supprime ses propres médias." on public.media;
create policy "Chacun supprime ses médias, un admin supprime tout média."
  on public.media for delete
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Chacun relit ses propres signalements." on public.media_reports;
create policy "Chacun relit ses signalements, un admin les relit tous."
  on public.media_reports for select
  using (auth.uid() = reporter_id or public.is_admin());

-- Policy manquante jusqu'ici : `resolved` ne pouvait être basculé par
-- personne, un signalement envoyé restait ouvert pour toujours.
drop policy if exists "Un admin traite les signalements." on public.media_reports;
create policy "Un admin traite les signalements."
  on public.media_reports for update
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- 5. Gestion des thèmes par un admin
--
--    L'insertion reste ouverte à tout membre connecté (c'est ce qui alimente
--    `syncTopics()` à chaque envoi, voir migration 0001) : un admin ne fait
--    qu'ajouter la possibilité de corriger un nom, une description, la mise
--    en avant, ou de supprimer un thème créé par erreur.
-- ----------------------------------------------------------------------------
drop policy if exists "Un admin modifie les thèmes." on public.topics;
create policy "Un admin modifie les thèmes."
  on public.topics for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Un admin supprime les thèmes." on public.topics;
create policy "Un admin supprime les thèmes."
  on public.topics for delete
  using (public.is_admin());
