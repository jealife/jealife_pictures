// ---------------------------------------------------------------------------
// Traduction des erreurs techniques en messages compréhensibles.
//
// Supabase (Auth, Postgres, Storage) et l'API fetch du navigateur renvoient
// systématiquement leurs erreurs en anglais et dans un vocabulaire de bas
// niveau (« duplicate key value violates unique constraint », « Failed to
// fetch »...). Les afficher telles quelles à une personne qui essaie juste
// de publier une photo n'aide personne. Cette table reconnaît les cas les
// plus courants et les remplace par une phrase en français.
// ---------------------------------------------------------------------------

const ERROR_MESSAGES = [
    // Authentification
    [/invalid login credentials/i, 'Adresse e-mail ou mot de passe incorrect.'],
    [/email not confirmed/i, "Votre adresse e-mail n'a pas encore été confirmée. Vérifiez votre boîte de réception."],
    [/user already registered|already been registered/i, 'Un compte existe déjà avec cette adresse e-mail.'],
    [/password should be at least/i, 'Le mot de passe doit contenir au moins 6 caractères.'],
    [/unable to validate email|invalid email/i, "Cette adresse e-mail n'est pas valide."],
    [/only request this after|rate limit|too many requests/i, 'Trop de tentatives. Patientez une minute avant de réessayer.'],
    [/provider is not enabled|unsupported provider/i, "Ce mode de connexion n'est pas encore activé."],
    [/jwt expired|invalid jwt|invalid token|session missing|refresh token/i, 'Votre session a expiré. Reconnectez-vous.'],

    // Réseau
    [/failed to fetch|network|load failed/i, 'Connexion au serveur impossible. Vérifiez votre connexion internet.'],
    [/timeout|timed out/i, 'Le serveur met trop de temps à répondre. Réessayez.'],

    // Base de données (Postgres / RLS)
    [/compte a été suspendu/i, 'Ce compte a été suspendu et ne peut plus publier.'],
    [/row-level security/i, "Vous n'avez pas la permission d'effectuer cette action."],
    [/duplicate key value violates unique constraint/i, 'Cet élément existe déjà.'],
    [/violates foreign key constraint/i, "Action impossible : un élément lié est introuvable."],
    [/violates not-null constraint/i, 'Certaines informations obligatoires sont manquantes.'],

    // Stockage de fichiers
    [/the resource already exists/i, 'Un fichier avec ce nom existe déjà.'],
    [/payload too large|exceeded the maximum allowed size|maximum allowed size/i, 'Le fichier est trop volumineux.'],
    [/invalid mime type|mime type not supported/i, "Ce type de fichier n'est pas accepté."],
];

const DEFAULT_FALLBACK = 'Une erreur est survenue. Réessayez dans un instant.';

// Nos propres messages (levés côté client ou renvoyés par nos routes API)
// sont toujours rédigés en français ; ceux de Supabase/Postgres/du
// navigateur sont toujours en anglais sans accent. Ce test évite d'écraser
// un message déjà correct par le message générique ci-dessous.
const LOOKS_ALREADY_FRENCH = /[àâäéèêëïîôöùûüçÀÂÄÉÈÊËÏÎÔÖÙÛÜÇ]/;

/**
 * Traduit une erreur technique en phrase lisible. Si elle ne correspond à
 * aucun cas connu mais ressemble déjà à un message écrit pour l'utilisateur
 * (le nôtre), elle est renvoyée telle quelle plutôt que d'être remplacée.
 */
export function friendlyErrorMessage(error, fallback = DEFAULT_FALLBACK) {
    const raw = typeof error === 'string' ? error : error?.message || '';
    const match = ERROR_MESSAGES.find(([pattern]) => pattern.test(raw));
    if (match) return match[1];
    if (raw && LOOKS_ALREADY_FRENCH.test(raw)) return raw;
    return fallback;
}
