import { createClient } from '@supabase/supabase-js';

/**
 * Supabase a renommé la clé publique : `anon` (JWT hérité) est devenue
 * `publishable` (`sb_publishable_…`). Les deux formes circulent encore, selon
 * l'âge du projet et l'onglet du tableau de bord où l'on copie la valeur.
 * On accepte les deux plutôt que d'imposer un nom : se tromper de variable ne
 * casse rien de visible au build, mais vide silencieusement tout le site.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_KEY =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// On ne lève pas d'erreur ici : cela ferait échouer le build Vercel avant même
// que les variables aient pu être renseignées.
if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn(
        '⚠️ Variables Supabase manquantes. Renseignez NEXT_PUBLIC_SUPABASE_URL et ' +
        'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (ou NEXT_PUBLIC_SUPABASE_ANON_KEY).'
    );
}

export const supabase = createClient(
    SUPABASE_URL || 'https://placeholder-url.supabase.co',
    SUPABASE_KEY || 'placeholder-key',
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
        },
    }
);
