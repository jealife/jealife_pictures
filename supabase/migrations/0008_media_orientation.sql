-- ============================================================================
-- JEaLiFe Pictures — filtre par orientation
--
--   `width`/`height` sont déjà enregistrés à l'envoi (app/lib/images.js) mais
--   jamais exploités pour filtrer. PostgREST ne sait pas comparer deux
--   colonnes entre elles dans une requête (`width > height`) sans passer par
--   du SQL — la colonne `orientation` calcule donc ce classement une fois
--   pour toutes, au même endroit que `geo_priority` (le déclencheur
--   `media_before_write`, migration 0004), pour rester filtrable simplement
--   via `.eq('orientation', ...)`.
-- ============================================================================

alter table public.media
  add column if not exists orientation text
  check (orientation in ('paysage', 'portrait', 'carre'));

create index if not exists media_orientation_idx on public.media (orientation);

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

  new.orientation := case
    when new.width is null or new.height is null then null
    when new.width > new.height then 'paysage'
    when new.height > new.width then 'portrait'
    else 'carre'
  end;

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

-- Rétroactif : les médias déjà publiés n'ont jamais traversé ce trigger avec
-- cette colonne. `update ... where true` plutôt qu'un ré-INSERT évite de
-- perturber `created_at` ou de redéclencher la modération.
update public.media
set orientation = case
  when width is null or height is null then null
  when width > height then 'paysage'
  when height > width then 'portrait'
  else 'carre'
end
where orientation is null;
