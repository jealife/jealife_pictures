-- ============================================================================
-- JEaLiFe Pictures — limitation de débit et anti-spam des signalements
--   · `moderate-upload` et `generate-metadata` appellent l'API Gemini
--     (payante) à chaque envoi, sans aucune limite : un compte compromis ou
--     un client qui boucle pouvait faire exploser la facture. `media_reports`
--     n'avait ni contrainte d'unicité ni limite de débit : un même compte
--     (voire un visiteur anonyme, `reporter_id` peut être `null`) pouvait
--     signaler indéfiniment le même média, noyant la file de modération.
--   · Le compteur vit en base plutôt qu'en mémoire du serveur Next.js : sur
--     Vercel, chaque requête peut atterrir sur une instance serverless
--     différente — une limite en mémoire locale ne compterait jamais le même
--     total et ne protégerait donc rien en pratique.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Compteur générique par fenêtre fixe
--
--    `rate_key` est décidé par l'appelant (id utilisateur pour un appel
--    authentifié, adresse IP pour un visiteur anonyme) : la fonction elle-
--    même n'a pas d'avis sur ce qu'est un « appelant », ce qui permet de
--    l'utiliser aussi bien pour un endpoint authentifié qu'anonyme.
-- ----------------------------------------------------------------------------
create table public.api_rate_limits (
  rate_key     text not null,
  bucket       text not null,
  window_start timestamptz not null,
  count        int not null default 1,
  primary key (rate_key, bucket, window_start)
);

-- Sert à purger les fenêtres expirées (voir note de maintenance plus bas) ;
-- utile aussi pour un diagnostic manuel en cas d'abus constaté.
create index api_rate_limits_window_idx on public.api_rate_limits (window_start);

alter table public.api_rate_limits enable row level security;
-- Aucune policy publique : la table n'est lue/écrite que par la fonction
-- `security definer` ci-dessous, jamais directement depuis PostgREST.

-- Incrémente le compteur de la fenêtre courante et renvoie si l'appelant est
-- encore dans la limite. Fenêtre fixe (pas glissante) : plus simple, et
-- largement suffisant pour dissuader un abus en boucle plutôt que de lisser
-- un trafic légitime au comportement irrégulier.
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
begin
  if p_key is null or p_key = '' then
    return false;
  end if;

  v_window_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into public.api_rate_limits (rate_key, bucket, window_start, count)
  values (p_key, p_bucket, v_window_start, 1)
  on conflict (rate_key, bucket, window_start)
  do update set count = api_rate_limits.count + 1
  returning count into v_count;

  return v_count <= p_max_count;
end;
$$;

grant execute on function public.check_rate_limit(text, text, int, int) to anon, authenticated;

-- Note de maintenance : chaque appel ne crée qu'une ligne par (clé, bucket,
-- fenêtre) — au volume de ce site, la table reste minuscule pendant des mois.
-- Le jour où ça vaut la peine d'y penser, purger simplement :
--   delete from public.api_rate_limits where window_start < now() - interval '7 days';

-- ----------------------------------------------------------------------------
-- 2. Un signalement par personne et par média
--
--    N'empêche que les doublons d'un même compte identifié : un `null`
--    (signalement anonyme) n'est jamais égal à un autre `null` en SQL, donc
--    cette contrainte ne déduplique pas les signalements anonymes — c'est le
--    rôle de `check_rate_limit` (par IP) côté route `/api/report-media`.
-- ----------------------------------------------------------------------------
create unique index media_reports_one_per_reporter_idx
  on public.media_reports (media_id, reporter_id)
  where reporter_id is not null;
