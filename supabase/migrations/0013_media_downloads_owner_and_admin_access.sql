-- ============================================================================
-- JEaLiFe Pictures — accès du propriétaire et de l'admin à l'historique des
-- téléchargements
--   · media_downloads (migration 0009) n'était lisible que par le
--     téléchargeur lui-même (`auth.uid() = user_id`) : un contributeur ne
--     pouvait pas voir combien de fois SES photos avaient été téléchargées
--     dans le temps, seulement le compteur agrégé `media.downloads_count`.
--   · Conséquence passée inaperçue : une requête admin sur cette table ne
--     renvoyait, RLS oblige, que les téléchargements faits PAR l'admin
--     lui-même — jamais ceux de la plateforme. Le graphique de
--     téléchargements du dashboard admin (page /admin/reports) était donc
--     silencieusement vide de sens pour quiconque n'a pas lui-même
--     téléchargé grand-chose.
--   · Cette migration ajoute deux cas à la policy de lecture, sans toucher à
--     l'écriture (toujours réservée à increment_downloads, security
--     definer) : le propriétaire du média téléchargé, et un admin.
-- ============================================================================

drop policy "Chacun voit son propre historique de téléchargements." on public.media_downloads;

create policy "Chacun voit ses téléchargements, un propriétaire voit ceux de ses médias, un admin voit tout."
  on public.media_downloads for select
  using (
    auth.uid() = user_id
    or public.is_admin()
    or exists (
      select 1 from public.media m
      where m.id = media_downloads.media_id and m.user_id = auth.uid()
    )
  );
