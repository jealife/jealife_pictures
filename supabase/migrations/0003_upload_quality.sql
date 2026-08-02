-- ============================================================================
-- JEaLiFe Pictures — contrôle qualité automatique à l'envoi
--   · `phash` stocke une empreinte perceptuelle (dHash 64 bits, en hexa) de
--     chaque média, calculée côté serveur dans /api/moderate-upload. Elle
--     sert à repérer les doublons (même photo renvoyée deux fois, par le
--     même auteur ou par un autre) sans comparer les fichiers eux-mêmes.
-- ============================================================================

alter table public.media add column if not exists phash char(16);

-- Pas un index de similarité (la distance de Hamming se calcule en
-- application, pas en SQL) : juste un accès rapide aux empreintes déjà
-- publiées, utilisé pour construire l'ensemble de comparaison à chaque envoi.
create index if not exists media_phash_idx
  on public.media (phash)
  where phash is not null;
