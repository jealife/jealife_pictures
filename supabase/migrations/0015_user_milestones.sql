-- ============================================================================
-- JEaLiFe Pictures — jalons du contributeur (« Vos évènements majeurs »)
--
--   Reprend le principe de la section du même nom chez Unsplash, sur la
--   page de statistiques privée d'un contributeur (déjà réservée au
--   propriétaire, voir migration 0004 et la page /@handle/stats).
--
--   Deux jalons ponctuels (première publication, premier téléchargement
--   reçu) et deux échelles de paliers (vues, téléchargements). Les dates
--   d'atteinte des paliers viennent directement des journaux d'événements
--   ajoutés en migration 0014 (media_views, media_downloads) : le Nème
--   événement chronologique EST le moment exact où le total a atteint N —
--   inutile de les horodater séparément.
--
--   Prérequis : media_views RLS restreignait la lecture à l'admin ; cette
--   migration l'étend au propriétaire du média, comme media_downloads
--   depuis la migration 0013. get_my_milestones() reste security definer
--   et toujours strictement bornée à auth.uid() — aucun paramètre
--   utilisateur en entrée, donc aucun moyen de consulter les jalons de
--   quelqu'un d'autre.
-- ============================================================================

drop policy "Un admin peut consulter le journal des vues." on public.media_views;

create policy "Le propriétaire du média et un admin peuvent consulter le journal des vues."
  on public.media_views for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.media m
      where m.id = media_views.media_id and m.user_id = auth.uid()
    )
  );

create or replace function public.get_my_milestones()
returns table (metric text, tier bigint, achieved_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  with view_events as (
    select mv.created_at, row_number() over (order by mv.created_at) as n
    from public.media_views mv
    join public.media m on m.id = mv.media_id
    where m.user_id = auth.uid()
  ),
  download_events as (
    select md.created_at, row_number() over (order by md.created_at) as n
    from public.media_downloads md
    join public.media m on m.id = md.media_id
    where m.user_id = auth.uid()
  ),
  tiers as (
    select unnest(array[10,50,100,500,1000,5000,10000,50000,100000,500000,1000000]::bigint[]) as tier
  ),
  rows as (
    select 'views'::text as metric, t.tier, ve.created_at as achieved_at
    from tiers t join view_events ve on ve.n = t.tier
    union all
    select 'downloads'::text, t.tier, de.created_at
    from tiers t join download_events de on de.n = t.tier
    union all
    select 'first_publication'::text, 1::bigint,
      (select min(created_at) from public.media where user_id = auth.uid() and status = 'published')
    union all
    select 'first_download_received'::text, 1::bigint,
      (select min(created_at) from download_events)
  )
  select metric, tier, achieved_at from rows where achieved_at is not null;
$$;

grant execute on function public.get_my_milestones() to authenticated;
