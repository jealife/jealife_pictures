-- ============================================================================
-- JEaLiFe Pictures — détails techniques de prise de vue (EXIF)
--
--   Jusqu'ici une seule colonne `camera` en texte libre concentrait tout
--   (boîtier, objectif, focale, ouverture), ce qui la rendait illisible et
--   inexploitable. Les données existent pourtant déjà dans le fichier source :
--   `exifreader` les lit côté navigateur au moment du dépôt, il suffisait de
--   les conserver séparément.
--
--   `camera` garde le boîtier seul (« SONY, ZV-E10M2 ») ; les quatre autres
--   colonnes portent ce que l'appareil a enregistré au déclenchement. Les
--   dimensions ne sont pas ajoutées : `width`/`height` existent déjà et
--   contiennent bien celles de l'original, pas de la version web.
--
--   Colonnes en texte plutôt qu'en numérique (sauf l'ISO) : ce sont des
--   valeurs d'affichage déjà formatées par l'appareil (« 1/750s », « f/2.4 »,
--   « 35.0mm »), et les reformater à partir de fractions n'apporterait rien
--   tant qu'aucun filtre de recherche ne s'appuie dessus.
--
--   Rien à changer côté RLS : les politiques de `media` portent sur les
--   lignes, pas sur les colonnes, et couvrent donc déjà celles-ci.
-- ============================================================================

alter table public.media
  add column if not exists lens          text,
  add column if not exists focal_length  text,
  add column if not exists aperture      text,
  add column if not exists shutter_speed text,
  add column if not exists iso           integer;

comment on column public.media.lens is 'Objectif tel que rapporté par l''EXIF (LensModel).';
comment on column public.media.focal_length is 'Focale à la prise de vue, formatée (ex : « 35.0mm »).';
comment on column public.media.aperture is 'Ouverture, formatée (ex : « f/2.4 »).';
comment on column public.media.shutter_speed is 'Vitesse d''obturation, formatée (ex : « 1/750s »).';
comment on column public.media.iso is 'Sensibilité ISO à la prise de vue.';
