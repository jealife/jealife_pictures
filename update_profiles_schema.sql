-- Ajout des colonnes manquantes à la table profiles pour correspondre à l'interface Unsplash
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS location text,
ADD COLUMN IF NOT EXISTS total_photos integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_likes integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_collections integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_views bigint DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_downloads bigint DEFAULT 0;

-- Mise à jour des commentaires pour la clarté
COMMENT ON COLUMN public.profiles.bio IS 'Biographie de l''utilisateur';
COMMENT ON COLUMN public.profiles.location IS 'Localisation géographique de l''utilisateur';
