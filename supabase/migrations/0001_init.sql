-- ============================================================================
-- JEaLiFe Pictures — schéma initial unifié
-- Remplace supabase_schema.sql, supabase_setup.sql, update_media_schema.sql
-- et update_profiles_schema.sql (archivés dans supabase/legacy/).
--
-- Principes :
--   1. Afrique d'abord : chaque média porte un pays structuré, et un
--      `geo_priority` calculé (Gabon → CEMAC → Afrique → reste du monde)
--      qui pilote le classement par défaut de tout le site.
--   2. Recherche réelle : `search_vector` en français, insensible aux
--      accents, alimenté par titre + description + lieu + pays + mots-clés.
--   3. Prêt à monétiser : colonnes de licence en place dès maintenant pour
--      ne pas avoir à remigrer quand la licence commerciale arrivera.
-- ============================================================================

create schema if not exists extensions;
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists unaccent with schema extensions;

-- ----------------------------------------------------------------------------
-- 0. Recherche plein texte française, insensible aux accents
--    « foret » doit trouver « forêt », « ivindo » doit trouver « Ivindo ».
-- ----------------------------------------------------------------------------
drop text search configuration if exists public.fr_unaccent cascade;
create text search configuration public.fr_unaccent (copy = french);

-- `unaccent` peut déjà être installé dans `public` ou dans `extensions` selon
-- l'historique du projet. On résout donc son schéma au lieu de le supposer :
-- un nom non qualifié échouerait dès que le search_path ne le couvre pas.
do $$
declare
  dict_schema text;
begin
  select n.nspname into strict dict_schema
    from pg_ts_dict d
    join pg_namespace n on n.oid = d.dictnamespace
   where d.dictname = 'unaccent';

  execute format(
    'alter text search configuration public.fr_unaccent '
    'alter mapping for hword, hword_part, word with %I.unaccent, french_stem',
    dict_schema
  );
end $$;

-- ----------------------------------------------------------------------------
-- 1. Utilitaires
-- ----------------------------------------------------------------------------
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Slug ASCII à partir d'un texte libre : « Forêt d'Ivindo » → « foret-d-ivindo »
--
-- `stable` et non `immutable` : `unaccent()` dépend d'un dictionnaire, donc son
-- résultat n'est pas garanti constant dans le temps. Le `search_path` est figé
-- pour que la fonction trouve `unaccent` quel que soit l'appelant.
create or replace function public.slugify(value text)
returns text
language sql
stable
set search_path = public, extensions
as $$
  select trim(both '-' from
    regexp_replace(
      regexp_replace(lower(unaccent(coalesce(value, ''))), '[^a-z0-9]+', '-', 'g'),
      '-{2,}', '-', 'g'
    )
  );
$$;

-- ----------------------------------------------------------------------------
-- 2. Pays — la table de référence qui rend le « Afrique d'abord » possible
-- ----------------------------------------------------------------------------
create table public.countries (
  code        char(2) primary key,          -- ISO 3166-1 alpha-2
  name_fr     text not null,
  slug        text unique not null,
  region      text not null,                -- afrique-centrale, afrique-de-l-ouest, ...
  is_african  boolean not null default false,
  is_cemac    boolean not null default false,
  emoji       text
);

alter table public.countries enable row level security;

create policy "Les pays sont publics."
  on public.countries for select using (true);

-- Priorité géographique : plus le chiffre est bas, plus le contenu remonte.
--   0 = Gabon · 1 = CEMAC · 2 = reste de l'Afrique · 3 = inconnu · 4 = hors Afrique
create or replace function public.geo_priority_for(p_code char(2))
returns smallint
language sql
stable
as $$
  select case
    when p_code is null then 3::smallint
    when p_code = 'GA' then 0::smallint
    else coalesce(
      (select case
                when c.is_cemac   then 1::smallint
                when c.is_african then 2::smallint
                else 4::smallint
              end
       from public.countries c where c.code = p_code),
      3::smallint)
  end;
$$;

-- ----------------------------------------------------------------------------
-- 3. Profils
-- ----------------------------------------------------------------------------
create table public.profiles (
  id                  uuid primary key references auth.users on delete cascade,
  username            text unique not null,
  full_name           text,
  avatar_url          text,
  bio                 text,
  location            text,
  country_code        char(2) references public.countries(code),
  website             text,
  instagram_username  text,
  twitter_username    text,
  -- Parcours photographe : un contributeur vérifié est mis en avant.
  is_verified         boolean default false,
  is_contributor      boolean default false,
  total_views         bigint default 0,
  total_downloads     bigint default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint username_length check (char_length(username) >= 3)
);

create index profiles_username_lower_idx on public.profiles (lower(username));
create index profiles_country_idx on public.profiles (country_code);

alter table public.profiles enable row level security;

create policy "Les profils sont publics."
  on public.profiles for select using (true);

create policy "Chacun crée son propre profil."
  on public.profiles for insert with check (auth.uid() = id);

create policy "Chacun modifie son propre profil."
  on public.profiles for update using (auth.uid() = id);

create trigger on_profiles_updated
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- Création automatique du profil à l'inscription (email comme OAuth Google).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  final_username text;
  suffix int := 0;
begin
  base_username := public.slugify(coalesce(
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1)
  ));

  if char_length(base_username) < 3 then
    base_username := 'photographe';
  end if;

  final_username := base_username;

  -- On garde un pseudo lisible : jean, jean-2, jean-3… plutôt qu'un hash.
  while exists (select 1 from public.profiles where username = final_username) loop
    suffix := suffix + 1;
    final_username := base_username || '-' || suffix;
  end loop;

  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    final_username,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 4. Médias
-- ----------------------------------------------------------------------------
create type public.media_type as enum ('photo', 'illustration', 'video');
create type public.media_status as enum ('pending', 'published', 'rejected', 'removed');

create table public.media (
  id              bigint generated by default as identity primary key,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  type            public.media_type not null default 'photo',

  -- Trois dérivés au lieu d'un seul fichier : indispensable en 4G au Gabon.
  url             text not null,          -- version web optimisée (affichage)
  original_url    text,                   -- fichier source (téléchargement HD)
  thumbnail_url   text,                   -- vignette de grille
  blur_data_url   text,                   -- placeholder base64 anti-décalage

  title           text,
  alt_text        text,
  description     text,
  camera          text,
  tags            text[] default '{}',

  -- Géographie structurée : c'est ce qui permet « images africaines d'abord ».
  location        text,                   -- libellé affiché, saisi par l'auteur
  city            text,
  country_code    char(2) references public.countries(code),
  geo_priority    smallint not null default 3,

  width           int,
  height          int,
  file_size       bigint,
  mime_type       text,
  duration        text,                   -- vidéos, format « 0:00 »

  -- Licence. Aujourd'hui tout est libre ; les colonnes existent pour que
  -- l'arrivée d'une licence commerciale ne demande aucune migration.
  license         text not null default 'jealife-libre',
  allows_commercial boolean not null default true,
  is_premium      boolean not null default false,
  price_xaf       int,

  status          public.media_status not null default 'published',
  views_count     int not null default 0,
  downloads_count int not null default 0,
  likes_count     int not null default 0,

  search_vector   tsvector,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Le classement par défaut du site : Gabon d'abord, puis récent.
create index media_feed_idx
  on public.media (type, status, geo_priority, created_at desc);
create index media_search_idx on public.media using gin (search_vector);
create index media_tags_idx on public.media using gin (tags);
create index media_user_idx on public.media (user_id);
create index media_country_idx on public.media (country_code);
create index media_popular_idx
  on public.media (type, status, downloads_count desc, likes_count desc);

alter table public.media enable row level security;

-- Correction importante : l'ancienne policy `using (true)` exposait
-- publiquement les médias en attente de modération et les rejetés.
create policy "Seuls les médias publiés sont publics."
  on public.media for select
  using (status = 'published' or auth.uid() = user_id);

create policy "Chacun publie ses propres médias."
  on public.media for insert with check (auth.uid() = user_id);

create policy "Chacun modifie ses propres médias."
  on public.media for update using (auth.uid() = user_id);

create policy "Chacun supprime ses propres médias."
  on public.media for delete using (auth.uid() = user_id);

create trigger on_media_updated
  before update on public.media
  for each row execute function public.handle_updated_at();

-- Recherche + priorité géographique, recalculées à chaque écriture.
create or replace function public.media_before_write()
returns trigger
language plpgsql
as $$
begin
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

create trigger media_search_and_geo
  before insert or update on public.media
  for each row execute function public.media_before_write();

-- ----------------------------------------------------------------------------
-- 5. Compteurs — en SECURITY DEFINER, sinon la RLS bloque tout visiteur
--    qui n'est pas propriétaire du média (le bug actuel : les vues et les
--    téléchargements ne s'incrémentaient jamais).
-- ----------------------------------------------------------------------------
create or replace function public.increment_views(media_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.media m
     set views_count = m.views_count + 1
   where m.id = media_id and m.status = 'published';

  update public.profiles p
     set total_views = p.total_views + 1
    from public.media m
   where m.id = media_id and p.id = m.user_id;
end;
$$;

create or replace function public.increment_downloads(media_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.media m
     set downloads_count = m.downloads_count + 1
   where m.id = media_id and m.status = 'published';

  update public.profiles p
     set total_downloads = p.total_downloads + 1
    from public.media m
   where m.id = media_id and p.id = m.user_id;
end;
$$;

grant execute on function public.increment_views(bigint) to anon, authenticated;
grant execute on function public.increment_downloads(bigint) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 6. Thèmes
-- ----------------------------------------------------------------------------
create table public.topics (
  id              bigint generated by default as identity primary key,
  slug            text unique not null,
  name            text not null,
  description     text,
  cover_image_url text,
  is_featured     boolean default false,
  total_media     int not null default 0,
  created_at      timestamptz not null default now()
);

alter table public.topics enable row level security;

create policy "Les thèmes sont publics."
  on public.topics for select using (true);

-- Manquait totalement : sans cette policy, syncTopics() échouait en silence
-- et aucun mot-clé n'était jamais rattaché à un thème.
create policy "Un membre connecté peut créer un thème."
  on public.topics for insert to authenticated with check (true);

create table public.media_topics (
  media_id   bigint not null references public.media(id) on delete cascade,
  topic_id   bigint not null references public.topics(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (media_id, topic_id)
);

create index media_topics_topic_idx on public.media_topics (topic_id);

alter table public.media_topics enable row level security;

create policy "Les liens thème/média sont publics."
  on public.media_topics for select using (true);

create policy "L'auteur rattache ses médias à des thèmes."
  on public.media_topics for insert to authenticated
  with check (exists (
    select 1 from public.media m
    where m.id = media_topics.media_id and m.user_id = auth.uid()
  ));

create policy "L'auteur détache ses médias."
  on public.media_topics for delete to authenticated
  using (exists (
    select 1 from public.media m
    where m.id = media_topics.media_id and m.user_id = auth.uid()
  ));

-- Compteur de médias par thème, tenu à jour automatiquement.
create or replace function public.sync_topic_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.topics set total_media = total_media + 1 where id = new.topic_id;
    return new;
  else
    update public.topics set total_media = greatest(total_media - 1, 0) where id = old.topic_id;
    return old;
  end if;
end;
$$;

create trigger on_media_topic_changed
  after insert or delete on public.media_topics
  for each row execute function public.sync_topic_count();

-- ----------------------------------------------------------------------------
-- 7. J'aime
-- ----------------------------------------------------------------------------
create table public.media_likes (
  user_id    uuid not null references auth.users on delete cascade,
  media_id   bigint not null references public.media(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, media_id)
);

create index media_likes_media_idx on public.media_likes (media_id);

alter table public.media_likes enable row level security;

create policy "Les j'aime sont publics."
  on public.media_likes for select using (true);

create policy "Chacun aime en son nom."
  on public.media_likes for insert with check (auth.uid() = user_id);

create policy "Chacun retire son propre j'aime."
  on public.media_likes for delete using (auth.uid() = user_id);

create or replace function public.sync_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.media set likes_count = likes_count + 1 where id = new.media_id;
    return new;
  else
    update public.media set likes_count = greatest(likes_count - 1, 0) where id = old.media_id;
    return old;
  end if;
end;
$$;

create trigger on_like_changed
  after insert or delete on public.media_likes
  for each row execute function public.sync_like_count();

-- ----------------------------------------------------------------------------
-- 8. Collections
-- ----------------------------------------------------------------------------
create table public.collections (
  id          bigint generated by default as identity primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  slug        text,
  description text,
  is_private  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index collections_user_idx on public.collections (user_id);

alter table public.collections enable row level security;

create policy "Les collections publiques sont visibles."
  on public.collections for select
  using (is_private = false or auth.uid() = user_id);

create policy "Chacun crée ses collections."
  on public.collections for insert with check (auth.uid() = user_id);

create policy "Chacun modifie ses collections."
  on public.collections for update using (auth.uid() = user_id);

create policy "Chacun supprime ses collections."
  on public.collections for delete using (auth.uid() = user_id);

create trigger on_collections_updated
  before update on public.collections
  for each row execute function public.handle_updated_at();

create table public.collection_media (
  collection_id bigint not null references public.collections(id) on delete cascade,
  media_id      bigint not null references public.media(id) on delete cascade,
  added_at      timestamptz not null default now(),
  primary key (collection_id, media_id)
);

alter table public.collection_media enable row level security;

create policy "Le contenu des collections publiques est visible."
  on public.collection_media for select
  using (exists (
    select 1 from public.collections c
    where c.id = collection_media.collection_id
      and (c.is_private = false or c.user_id = auth.uid())
  ));

create policy "Chacun gère le contenu de ses collections."
  on public.collection_media for all
  using (exists (
    select 1 from public.collections c
    where c.id = collection_media.collection_id and c.user_id = auth.uid()
  ));

-- ----------------------------------------------------------------------------
-- 9. Signalements — le minimum vital de modération, absent jusqu'ici :
--    n'importe qui pouvait publier n'importe quoi, immédiatement et
--    définitivement.
-- ----------------------------------------------------------------------------
create table public.media_reports (
  id          bigint generated by default as identity primary key,
  media_id    bigint not null references public.media(id) on delete cascade,
  reporter_id uuid references auth.users on delete set null,
  reason      text not null,   -- droits, contenu-inapproprie, spam, autre
  details     text,
  resolved    boolean not null default false,
  created_at  timestamptz not null default now()
);

create index media_reports_open_idx on public.media_reports (resolved, created_at desc);

alter table public.media_reports enable row level security;

create policy "Chacun peut signaler un contenu."
  on public.media_reports for insert
  with check (reporter_id is null or auth.uid() = reporter_id);

create policy "Chacun relit ses propres signalements."
  on public.media_reports for select using (auth.uid() = reporter_id);

-- ----------------------------------------------------------------------------
-- 10. Statistiques publiques — pour remplacer les « 5 millions de photos »
--     inventés par des chiffres vrais.
-- ----------------------------------------------------------------------------
create or replace view public.platform_stats
with (security_invoker = true) as
  select
    count(*) filter (where type = 'photo')                        as total_photos,
    count(*) filter (where type = 'illustration')                 as total_illustrations,
    count(*) filter (where type = 'video')                        as total_videos,
    count(*) filter (where geo_priority = 0)                      as total_gabon,
    count(*) filter (where geo_priority <= 2)                     as total_africa,
    count(distinct user_id)                                       as total_contributors,
    coalesce(sum(downloads_count), 0)                             as total_downloads
  from public.media
  where status = 'published';

grant select on public.platform_stats to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 11. Stockage
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media', 'media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/avif','image/gif','video/mp4','video/webm']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Les fichiers média sont publics." on storage.objects;
create policy "Les fichiers média sont publics."
  on storage.objects for select
  using (bucket_id = 'media');

-- Chaque membre écrit uniquement dans son propre dossier (media/<uid>/...).
drop policy if exists "Chacun dépose dans son dossier." on storage.objects;
create policy "Chacun dépose dans son dossier."
  on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Chacun remplace ses fichiers." on storage.objects;
create policy "Chacun remplace ses fichiers."
  on storage.objects for update to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Chacun supprime ses fichiers." on storage.objects;
create policy "Chacun supprime ses fichiers."
  on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
