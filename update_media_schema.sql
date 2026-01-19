-- Ajout des colonnes manquantes pour les métadonnées de l'image
ALTER TABLE public.media 
ADD COLUMN IF NOT EXISTS camera text,
ADD COLUMN IF NOT EXISTS tags text[];

-- Assurez-vous que les politiques RLS autorisent toujours l'insertion
-- (Normalement déjà fait, mais bon à vérifier)
