-- ============================================================================
-- JEaLiFe Pictures — durcissement suite à l'audit de sécurité du 2026-08-19
--
--   1. Régression introduite par la migration 0022 : `protect_profile_privileges`
--      avait perdu la protection de `is_suspended` (présente depuis la 0011)
--      en même temps qu'elle gagnait `can_price_premium`. Un compte suspendu
--      pouvait donc lever sa propre suspension par un simple UPDATE direct
--      sur son profil (le client Supabase reste accessible avec la clé
--      publique + son propre jeton, même hors de l'app). On en profite pour
--      protéger aussi les compteurs `total_*`/`total_*_baseline`, jusqu'ici
--      oubliés du même déclencheur.
--
--   2. `media_before_write` ne forçait le statut et ne bloquait la
--      suspension qu'à l'INSERT (`if tg_op = 'INSERT'`) : un UPDATE direct
--      pouvait publier soi-même un envoi en attente ou rejeté, changer le
--      propriétaire d'une photo, ou gonfler ses propres vues/j'aime/
--      téléchargements affichés (utilisés pour le classement "populaire").
--
--   3. `check_rate_limit` acceptait une clé (`p_key`) entièrement fournie
--      par l'appelant, y compris pour un compte connecté : n'importe qui
--      pouvait épuiser le compteur d'un AUTRE compte (son identifiant est
--      visible sur son profil) avant même qu'il n'agisse, le bloquant à
--      volonté sur l'envoi, la modération ou les signalements.
--
--   4. `set_setting` n'avait jamais reçu le `revoke ... from public, anon`
--      appliqué systématiquement depuis la migration 0017 : sans risque
--      aujourd'hui (la fonction vérifie `is_admin()` elle-même), mais on
--      aligne sur le même filet de sécurité que les autres fonctions
--      `security definer`.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. profiles — protéger is_suspended et les compteurs totaux
-- ----------------------------------------------------------------------------
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
    new.can_price_premium := old.can_price_premium;
    new.is_suspended := old.is_suspended;
    new.total_views := old.total_views;
    new.total_downloads := old.total_downloads;
    new.total_views_baseline := old.total_views_baseline;
    new.total_downloads_baseline := old.total_downloads_baseline;
  end if;
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 2. media — verrouiller statut, propriétaire et compteurs à la modification,
--    pas seulement à la création ; bloquer aussi la modification (pas
--    seulement la publication) pour un compte suspendu.
-- ----------------------------------------------------------------------------
create or replace function public.media_before_write()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if exists (select 1 from public.profiles where id = new.user_id and is_suspended) then
      raise exception 'Ce compte a été suspendu et ne peut plus publier.' using errcode = '42501';
    end if;

    if not public.is_admin() then
      new.status := case
        when public.get_setting('moderation_mode') = 'manual' then 'pending'::public.media_status
        else 'published'::public.media_status
      end;
    end if;
  end if;

  if tg_op = 'UPDATE' and not public.is_admin() then
    if exists (select 1 from public.profiles where id = old.user_id and is_suspended) then
      raise exception 'Ce compte a été suspendu et ne peut plus modifier ses envois.' using errcode = '42501';
    end if;

    new.status := old.status;
    new.user_id := old.user_id;
    new.likes_count := old.likes_count;
    new.views_count := old.views_count;
    new.downloads_count := old.downloads_count;
    new.views_count_baseline := old.views_count_baseline;
    new.downloads_count_baseline := old.downloads_count_baseline;
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

-- ----------------------------------------------------------------------------
-- 3. check_rate_limit — un appelant connecté ne peut plus agir que sur SA
--    PROPRE clé. Tous les appels authentifiés de l'app passent déjà
--    `p_key: user.id` (leur propre identifiant) : ce verrou ne change rien
--    pour un usage normal, il empêche seulement de viser un AUTRE compte.
--    Un appelant anonyme n'a pas d'identité fiable côté base — sa clé (IP)
--    reste celle fournie par la route appelante, comme avant.
-- ----------------------------------------------------------------------------
create or replace function public.check_rate_limit(
  p_key text,
  p_bucket text,
  p_max_count int,
  p_window_seconds int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_count int;
  v_key text;
begin
  v_key := case when auth.uid() is not null then auth.uid()::text else p_key end;

  if v_key is null or v_key = '' then
    return false;
  end if;

  v_window_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into public.api_rate_limits (rate_key, bucket, window_start, count)
  values (v_key, p_bucket, v_window_start, 1)
  on conflict (rate_key, bucket, window_start)
  do update set count = api_rate_limits.count + 1
  returning count into v_count;

  return v_count <= p_max_count;
end;
$$;

-- ----------------------------------------------------------------------------
-- 4. set_setting — alignement sur le filet de sécurité systématique depuis
--    la migration 0017 (Supabase accorde EXECUTE à PUBLIC par défaut à la
--    création d'une fonction).
-- ----------------------------------------------------------------------------
revoke all on function public.set_setting(text, text) from public, anon;
grant execute on function public.set_setting(text, text) to authenticated;
