-- ============================================================================
-- JEaLiFe Pictures — correctif du bootstrap admin
--
--   La migration 0004 protégeait `profiles.role` (et `is_verified` /
--   `is_contributor`) avec un déclencheur qui annule toute modification
--   venant d'un compte non-admin. Mais une requête lancée depuis le SQL
--   Editor de Supabase n'a pas de session Auth : `auth.uid()` y vaut `null`,
--   `is_admin()` y répond donc toujours faux, et le déclencheur effaçait
--   silencieusement le tout premier `update profiles set role = 'admin'…` —
--   sans erreur, sans avertissement. Personne ne pouvait devenir admin.
--
--   Le correctif : la protection ne s'applique que s'il existe une session
--   Auth authentifiée (`auth.uid() is not null`). Une requête directe sur la
--   base (SQL Editor, migration, service role) reste, comme avant cette
--   fonctionnalité, un accès de confiance.
-- ============================================================================

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
  end if;
  return new;
end;
$$;
