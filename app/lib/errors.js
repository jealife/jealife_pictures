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

    // Génération IA (Gemini / Google GenAI)
    // Quota journalier Google épuisé (RESOURCE_EXHAUSTED avec mention PerDay).
    [/PerDay|per.*day.*quota|quota.*per.*day/i, "Quota de génération IA atteint pour aujourd'hui. Décrivez l'image vous-même, ou réessayez plus tard."],
    // Quota par minute / rafale (RESOURCE_EXHAUSTED sans mention PerDay).
    [/RESOURCE_EXHAUSTED|resource.?exhausted|rateLimitExceeded|quota.*exceeded|exceeded.*quota/i, 'Trop de demandes de génération IA en ce moment. Réessayez dans quelques minutes.'],
    // Entrée invalide (image corrompue, format non supporté, taille dépassée côté Gemini).
    [/INVALID_ARGUMENT|invalid.?argument|image.*corrupt|unsupported.*image|image.*too large/i, "L'image n'a pas pu être analysée par l'IA (format non supporté ou fichier corrompu)."],
    // Filtre de sécurité ou récitation déclenché par le contenu du média.
    [/SAFETY|RECITATION|finish.?reason.*safety|blocked.*safety|content.*blocked/i, "La génération a été bloquée : le média ne respecte pas les politiques de contenu de l'IA."],
    // Modèle ou service Gemini temporairement indisponible.
    [/UNAVAILABLE|SERVICE_UNAVAILABLE|model.*unavailable|server.*unavailable/i, "Le service de génération IA est temporairement indisponible. Réessayez dans quelques instants."],
    // Réponse JSON malformée (Gemini a répondu mais pas au format attendu).
    [/JSON|parse.*error|unexpected token|invalid.*json/i, "L'IA a renvoyé une réponse inattendue. Réessayez ou décrivez l'image manuellement."],
    // Clé API absente ou invalide (erreur de configuration).
    [/API_KEY_INVALID|api.?key.*invalid|invalid.?api.?key|PERMISSION_DENIED/i, "La génération IA n'est pas disponible pour le moment (configuration du service)."],
    // Catch-all Gemini : toute erreur mentionnant l'API Google GenAI.
    [/genai|gemini|google.*ai|GoogleGenerativeAI/i, "La génération automatique a échoué. Décrivez l'image vous-même ou réessayez."],
];

const DEFAULT_FALLBACK = 'Une erreur est survenue. Réessayez dans un instant.';

// Nos propres messages (levés côté client ou renvoyés par nos routes API)
// sont toujours rédigés en français ; ceux de Supabase/Postgres/du
// navigateur sont toujours en anglais. Ce test évite d'écraser un message
// déjà correct par le message générique ci-dessous.
//
// La seule présence d'un accent ne suffit pas : repéré en test réel sur
// « Image trop petite (2700×1800px, 4.9 Mpx) : 5 Mpx minimum. » — une
// phrase française sans le moindre accent, donc silencieusement remplacée
// par « Une erreur est survenue » malgré son information précise et utile.
// Plusieurs autres messages du même fichier (image floue, fichier trop
// volumineux…) sont construits sans accent pour la même raison — mots
// courts, gabarit avec un nombre. On ajoute donc la présence de mots
// grammaticaux français comme second signal.
const LOOKS_ALREADY_FRENCH =
    /[àâäéèêëïîôöùûüçÀÂÄÉÈÊËÏÎÔÖÙÛÜÇ]|\b(le|la|les|un|une|des|du|est|sont|dans|pour|avec|sur|vous|votre|ne|pas|plus|trop|doit|cette|ce)\b/i;

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
