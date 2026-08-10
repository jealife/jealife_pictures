-- ============================================================================
-- JEaLiFe Pictures — couverture doublon étendue aux médias « pending »
--
--   En mode de modération « manual », les médias créés restent `pending`
--   jusqu'à validation admin. L'ancienne version de `phash_has_duplicate`
--   ne comparait que les médias `published` : une même photo soumise deux
--   fois rapidement (double-clic, deux onglets, reprise réseau) passait le
--   contrôle les deux fois car aucune des deux n'était encore publiée au
--   moment du second contrôle.
--
--   On étend simplement le filtre à `IN ('published', 'pending')`.
--   Les médias `rejected` sont volontairement exclus : un envoi légitimement
--   retravaillé (recadré, retouché) ne devrait pas être bloqué parce qu'une
--   ancienne version proche a été rejetée.
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
    where m.status in ('published', 'pending')
      and m.phash is not null
      and length(m.phash) = 16
      and bit_count(
            (('x' || m.phash)::bit(64)) # (('x' || p_phash)::bit(64))
          ) <= p_threshold
  );
$$;

-- Les grants ne changent pas (déjà posés en migration 0018), mais on les
-- répète pour garantir l'idempotence si cette migration est rejouée.
revoke all on function public.phash_has_duplicate(text, int) from public, anon;
grant execute on function public.phash_has_duplicate(text, int) to authenticated;
