-- ============================================================================
-- JEaLiFe Pictures — mise en avant des collections de la communauté
--
--   Jusqu'ici, `/collections` et le panneau d'accueil ne montraient que les
--   collections éditoriales (`is_editorial`). Un photographe peut pourtant
--   déjà curer n'importe quelle photo publiée dans sa propre collection
--   (policy `collection_media` de la migration 0001) — rien ne la rendait
--   jamais visible au-delà de son propre profil.
--
--   `is_admin_featured` donne la main pour promouvoir une collection
--   précise, au même titre que `is_editorial` : même déclencheur de
--   protection (un non-admin ne peut jamais se l'accorder lui-même), même
--   logique. Le critère *automatique* (publique, non-éditoriale, au moins 3
--   photos) vit côté application (`getDiscoverableCollections`), pas ici —
--   il n'a besoin d'aucune colonne supplémentaire.
-- ============================================================================

alter table public.collections
  add column if not exists is_admin_featured boolean not null default false;

create or replace function public.protect_collection_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if tg_op = 'UPDATE' then
      new.is_editorial := old.is_editorial;
      new.is_admin_featured := old.is_admin_featured;
    else
      new.is_editorial := false;
      new.is_admin_featured := false;
    end if;
  end if;
  return new;
end;
$$;
