// Portail d'entrée du site (façon Unsplash) : une vérification Turnstile
// unique par session plutôt qu'à chaque page, posée sur /verify et lue par
// middleware.js. Distinct de la protection Supabase sur les formulaires
// d'authentification (voir app/lib/auth.js), qui reste exigée séparément à
// chaque connexion/inscription/réinitialisation.
export const GATE_COOKIE = "gate_ok";
export const GATE_TTL_SECONDS = 60 * 60 * 6; // 6 heures, comme une session de navigation
