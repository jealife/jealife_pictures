-- ============================================================================
-- JEaLiFe Pictures — deux correctifs sur la migration 0014
--
-- 1. `record_view` échouait à chaque appel
--
--    Ses paramètres s'appelaient `media_id` et `viewer_key`, exactement comme
--    les colonnes de `media_views`. Dans l'INSERT, Postgres ne peut pas
--    trancher entre la variable et la colonne et lève 42702 (« column
--    reference "media_id" is ambiguous ») — la qualification
--    `record_view.media_id` ne lève pas l'ambiguïté dans la clause
--    `on conflict`. Résultat : plus AUCUNE vue enregistrée depuis
--    l'application de 0014. Le symptôme était invisible parce que
--    /api/track-view échoue volontairement en silence pour ne jamais casser
--    l'affichage d'une fiche photo.
--
--    Les paramètres reprennent donc le préfixe `p_` déjà utilisé par
--    `check_rate_limit` (migration 0010), qui évite précisément ce piège.
--
-- 2. `sync_media_counters` était appelable par n'importe quel visiteur
--
--    La migration 0014 faisait bien `revoke all ... from public`, mais
--    Supabase accorde EXECUTE à `anon` et `authenticated` par des privilèges
--    par défaut sur le schéma `public` : ce sont des grants explicites, que
--    révoquer PUBLIC ne retire pas. La fonction restait donc exposée en RPC
--    PostgREST — vérifié en anonyme, elle répondait 204, donc s'exécutait.
--    Or elle recalcule les compteurs de TOUTE la base : quiconque connaît
--    l'URL pouvait la déclencher en boucle.
--
--    Même correction préventive sur `get_my_milestones` (migration 0015) :
--    elle ne divulgue rien (elle est bornée à auth.uid(), donc vide pour un
--    visiteur anonyme), mais elle n'a aucune raison d'être appelable sans
--    session.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. record_view — paramètres renommés (un simple `create or replace` ne
--    suffit pas : changer le nom d'un paramètre impose de supprimer d'abord).
-- ----------------------------------------------------------------------------
drop function if exists public.record_view(bigint, text);

create function public.record_view(p_media_id bigint, p_viewer_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.media_views (media_id, viewer_key)
  values (p_media_id, p_viewer_key)
  on conflict (media_id, viewer_key, viewed_on) do nothing;
end;
$$;

grant execute on function public.record_view(bigint, text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. Fermeture des fonctions qui n'ont rien à faire en RPC public
-- ----------------------------------------------------------------------------
revoke all on function public.sync_media_counters() from public, anon, authenticated;
grant execute on function public.sync_media_counters() to service_role;

revoke all on function public.get_my_milestones() from public, anon;
grant execute on function public.get_my_milestones() to authenticated;
