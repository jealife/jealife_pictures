-- ============================================================================
-- JEaLiFe Pictures — catégories administrables et collections éditoriales
--
--   1. `topics` mélangeait deux usages : une vitrine de catégories fixes
--      (Nature, Portrait, Culture…) et des mots-clés libres créés à chaque
--      envoi par `syncTopics()` (migration 0001). Plutôt que de séparer ces
--      deux usages dans deux tables — ce qui aurait dupliqué toute la
--      mécanique de jointure avec `media_topics`, `/themes`, `TopicBar`,
--      `FeaturedTopics` — un simple champ `kind` distingue les deux :
--        · 'category' : créé par un admin, structure fixe, apparaît dans la
--          navigation si `is_featured`.
--        · 'tag'      : né d'un mot-clé de contributeur, jamais créé depuis
--          l'admin.
--      `syncTopics()` n'a pas besoin de changer : elle ne crée que les
--      thèmes réellement absents (`missing`), qui héritent donc du défaut
--      'tag' ; les catégories existantes ne sont jamais réinsérées, juste
--      réutilisées si un contributeur tape le même mot.
--
--   2. `collections` n'avait aucun moyen de distinguer une collection
--      personnelle d'une sélection publiée au nom de JEaLiFe Stock. Deux
--      colonnes suffisent : `is_editorial` et `cover_image_url`. Le
--      déclencheur qui les protège suit exactement le principe de
--      `protect_profile_privileges` (migration 0004/0005) : un non-admin ne
--      peut jamais se marquer lui-même « éditorial », et une requête directe
--      (SQL Editor, `auth.uid()` nul) reste un accès de confiance.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Catégories vs tags
-- ----------------------------------------------------------------------------
alter table public.topics
  add column if not exists kind text not null default 'tag'
  check (kind in ('category', 'tag'));

-- Thèmes déjà présents qui correspondent à une catégorie de la structure
-- demandée (Nature, Portrait, Culture, Architecture, Vie quotidienne,
-- Voyage, Paysages, Mode, Gastronomie, Animaux) : reclassés sans toucher à
-- leurs médias déjà rattachés, ni à leur slug.
update public.topics
set kind = 'category'
where slug in (
  'nature', 'faune', 'portrait', 'culture', 'plages', 'vie-quotidienne',
  'architecture', 'voyage', 'paysage', 'mode', 'cuisine'
);

-- Catégories du brief sans équivalent existant.
insert into public.topics (slug, name, description, is_featured, kind) values
  ('business',    'Business',    'Bureaux, réunions, entrepreneuriat, commerce.', false, 'category'),
  ('technologie', 'Technologie', 'Numérique, innovation, usages connectés.',      false, 'category'),
  ('evenements',  'Événements',  'Conférences, concerts, rassemblements, cérémonies.', false, 'category'),
  ('sante',       'Santé',       'Soin, bien-être, sport-santé, accès aux soins.', false, 'category'),
  ('education',   'Éducation',   'École, formation, apprentissage, jeunesse.',    false, 'category')
on conflict (slug) do update
  set kind = 'category';

-- ----------------------------------------------------------------------------
-- 2. Collections éditoriales
-- ----------------------------------------------------------------------------
alter table public.collections
  add column if not exists is_editorial boolean not null default false,
  add column if not exists cover_image_url text;

create index if not exists collections_editorial_idx
  on public.collections (is_editorial) where is_editorial = true;

create or replace function public.protect_collection_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.is_editorial := case when tg_op = 'UPDATE' then old.is_editorial else false end;
  end if;
  return new;
end;
$$;

drop trigger if exists on_collections_privilege_guard on public.collections;
create trigger on_collections_privilege_guard
  before insert or update on public.collections
  for each row execute function public.protect_collection_privileges();
