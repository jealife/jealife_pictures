-- ============================================================================
-- JEaLiFe Pictures — disponibilité à l'embauche
--   Le badge « Disponible à l'embauche » s'affichait sur chaque page de
--   profil, y compris celle du compte JEaLiFe Stock lui-même (compte
--   entreprise, pas un photographe indépendant) — parce qu'il n'y avait
--   littéralement aucune colonne `status` sur `profiles` : la condition
--   `profileUser.status !== 'unavailable'` était donc toujours vraie, pour
--   tout le monde, sans qu'aucun contributeur ne puisse jamais l'éteindre.
-- ============================================================================

alter table public.profiles
  add column if not exists is_available_for_hire boolean not null default false;

-- Auto-géré par chaque contributeur sur son propre profil (comme bio,
-- location, website...) : contrairement à role/is_verified/is_contributor/
-- is_suspended, cette colonne n'a pas besoin d'être protégée par
-- `protect_profile_privileges` — la policy RLS existante (auth.uid() = id)
-- suffit déjà à limiter la modification au propriétaire du profil.
