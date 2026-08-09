-- ============================================================================
-- JEaLiFe Pictures — détection de doublon déplacée dans Postgres
--
--   /api/moderate-upload ramenait jusqu'ici les 5 000 dernières empreintes
--   publiées pour comparer la distance de Hamming en JavaScript. Deux défauts :
--
--     · le volume — 5 000 lignes traversent le réseau à CHAQUE image, soit
--       50 000 pour un envoi groupé de dix ;
--     · l'angle mort — passé 5 000 médias publiés, les plus anciens sortent
--       de la fenêtre et leurs doublons ne sont plus jamais détectés.
--
--   La comparaison se fait donc là où vivent les données. Seul un booléen
--   traverse le réseau, et la totalité du catalogue est couverte.
--
--   `bit_count` (Postgres 14+) compte les bits à 1 ; `('x' || hash)::bit(64)`
--   est la conversion usuelle d'une empreinte hexadécimale de 16 caractères
--   en vecteur de bits. `#` est le XOR bit à bit : le nombre de bits à 1 du
--   XOR de deux empreintes EST leur distance de Hamming.
--
--   Pas d'index possible sur une distance de Hamming : c'est un parcours
--   séquentiel des seuls médias publiés porteurs d'une empreinte, ce qui
--   reste négligeable à l'échelle d'un catalogue de dizaines de milliers
--   d'images — et de toute façon bien moins coûteux que de tout transférer.
--
--   `security definer` : la comparaison doit porter sur l'ensemble du
--   catalogue publié, indépendamment de qui appelle. La fonction ne renvoie
--   qu'un booléen, jamais une empreinte ni l'identité du média correspondant.
-- ============================================================================

create or replace function public.phash_has_duplicate(
  p_phash text,
  p_threshold int default 4
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.media m
    where m.status = 'published'
      and m.phash is not null
      and length(m.phash) = 16
      and bit_count(
            (('x' || m.phash)::bit(64)) # (('x' || p_phash)::bit(64))
          ) <= p_threshold
  );
$$;

-- Même précaution qu'en migration 0017 : Supabase accorde EXECUTE à `anon` et
-- `authenticated` par privilèges par défaut, et révoquer PUBLIC ne retire pas
-- ces grants explicites. Seuls les comptes connectés en ont besoin (la porte
-- de qualité n'est atteignable qu'authentifié).
revoke all on function public.phash_has_duplicate(text, int) from public, anon;
grant execute on function public.phash_has_duplicate(text, int) to authenticated;
