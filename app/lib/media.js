import { incrementDownloads } from "./database";
import { resizeRemoteImage } from "./images";
import { supabase } from "./supabase";

/**
 * Vérifie, à l'instant présent et côté serveur, si le visiteur courant a le
 * droit de voir l'adresse réelle d'un média Premium (propriétaire, admin,
 * ou achat déjà effectué) — voir /api/photo-access. Ne renvoie jamais rien
 * pour un média Premium tant que ce n'est pas le cas : `url`/`originalUrl`
 * valent alors `null`, jamais une valeur de repli qui laisserait deviner
 * l'adresse.
 */
export async function fetchPhotoAccess(mediaId) {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch("/api/photo-access", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
            },
            body: JSON.stringify({ mediaId }),
        });
        if (!res.ok) return { url: null, originalUrl: null };
        const data = await res.json();
        return { url: data.url || null, originalUrl: data.originalUrl || null };
    } catch (error) {
        console.error("Vérification d'accès média impossible :", error);
        return { url: null, originalUrl: null };
    }
}

/**
 * Slug ASCII côté client — miroir de la fonction SQL `slugify()`.
 * « Forêt d'Ivindo » → « foret-d-ivindo ».
 */
export function slugifyClient(text) {
    return (text || "")
        .toLowerCase()
        // Les ligatures ne se décomposent pas en NFD : « cœur » devenait
        // « c-ur » dans l'URL, ce qui perd le mot pour la recherche et donne
        // une adresse illisible. `unaccent()`, côté SQL, les traite déjà.
        .replace(/\u0153/g, "oe")
        .replace(/\u00e6/g, "ae")
        .replace(/\u00df/g, "ss")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/-{2,}/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80)
        // Le découpage à 80 caractères peut laisser un tiret orphelin.
        .replace(/-+$/g, "");
}

/**
 * URL canonique d'un média : `/photos/123-paysage-du-gabon`.
 * L'ID reste en tête pour un lookup DB rapide via `parseInt()`.
 */
export function mediaUrl(media) {
    if (!media) return "/";
    const slug = slugifyClient(media.title || media.alt || "photo");
    return `/photos/${media.id}-${slug}`;
}

/**
 * Extrait l'ID numérique d'un paramètre d'URL slugifié.
 * « 123-paysage-du-gabon » → 123, « 123 » → 123.
 */
export function parseMediaId(param) {
    return parseInt(param, 10);
}

/**
 * Forme unique d'un média côté interface.
 *
 * Cette conversion était recopiée à l'identique dans MasonryGrid, la page
 * photo, la page profil et les onglets — avec des différences subtiles (avatar
 * par défaut ici, pas là) qui produisaient des affichages incohérents. Elle
 * vit désormais en un seul endroit.
 */
export function normalizeMedia(row) {
    if (!row) return null;

    const profile = row.profiles || {};
    const username = profile.username || "anonyme";

    return {
        id: row.id,
        type: row.type || "photo",

        // Chaque usage a sa version : vignette en grille, version web en
        // détail, original réservé au téléchargement.
        url: row.url,
        thumbnailUrl: row.thumbnail_url || row.url,
        originalUrl: row.original_url || row.url,
        blurDataURL: row.blur_data_url || null,

        title: row.title || null,
        alt: mediaAlt(row),
        description: row.description || null,

        location: row.location || null,
        city: row.city || null,
        countryCode: row.country_code || null,
        country: row.countries || null,
        geoPriority: row.geo_priority ?? 3,

        width: row.width || null,
        height: row.height || null,
        duration: row.duration || null,
        tags: row.tags || [],

        likes: row.likes_count || 0,
        downloads: row.downloads_count || 0,
        views: row.views_count || 0,
        createdAt: row.created_at || null,
        isPremium: !!row.is_premium,
        // Prix choisi par le contributeur pour CE média précis, dans la
        // fourchette fixée par l'admin (voir migration 0022) ; `null` tant
        // qu'il n'a pas fixé de prix — le tarif par défaut du type
        // s'applique alors (voir premium_pricing).
        customCreditsCost: row.custom_credits_cost ?? null,
        status: row.status || 'published',

        author: {
            id: profile.id || row.user_id || null,
            name: profile.full_name || profile.username || "Anonyme",
            username,
            avatar: profile.avatar_url || avatarFallback(profile.id || row.user_id || username),
            bio: profile.bio || null,
            location: profile.location || null,
            isVerified: !!profile.is_verified,
            // Jamais vrai pour le compte JEaLiFe Stock lui-même (voir
            // [handle]/layout.js) : c'est le compte de l'entreprise, pas un
            // photographe indépendant à la recherche de missions.
            isAvailableForHire: !!profile.is_available_for_hire && profile.role !== 'admin',
            website: profile.website || null,
            instagramUsername: profile.instagram_username || null,
            facebookUsername: profile.facebook_username || null,
        },
    };
}

export function normalizeMediaList(rows) {
    return (rows || []).map(normalizeMedia).filter(Boolean);
}

export function avatarFallback(seed) {
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed || "jealife")}`;
}

/**
 * Texte alternatif. Une banque d'images vit du référencement sur Google
 * Images : une image sans `alt` descriptif y est invisible, et illisible pour
 * un lecteur d'écran. On compose donc la meilleure phrase possible à partir de
 * ce que l'auteur a renseigné.
 */
export function mediaAlt(row) {
    if (!row) return "Image";
    if (row.alt_text) return row.alt_text;

    const parts = [row.title].filter(Boolean);
    const place = [row.city, row.location].filter(Boolean)[0];
    if (place) parts.push(`à ${place}`);

    return parts.length > 0 ? parts.join(" ") : "Photo sur JEaLiFe Stock";
}

export const DOWNLOAD_SIZES = [
    { key: "small", label: "Petit", width: 640 },
    { key: "medium", label: "Moyen", width: 1920 },
    { key: "large", label: "Grand", width: 2400 },
    { key: "original", label: "Format original", width: null },
];

/**
 * Options de téléchargement réellement disponibles pour un média.
 *
 * Une vidéo ne peut pas être ré-encodée dans le navigateur. Lui proposer
 * « Petit / Moyen / Grand » revenait à redimensionner son image d'aperçu :
 * qui choisissait « Petit » sur une vidéo repartait avec une photo, sans que
 * rien ne le signale. On n'offre donc pour une vidéo que ce qui existe
 * vraiment — le fichier lui-même, et son aperçu s'il est utile.
 */
export function downloadOptionsFor(media) {
    if (media?.type === "video") {
        return [
            { key: "original", label: "Vidéo", hint: "Fichier d'origine", width: null },
            { key: "poster", label: "Image d'aperçu", hint: "Photogramme, en JPEG", width: null },
        ];
    }
    return DOWNLOAD_SIZES.map((size) => ({
        ...size,
        hint: size.width ? `${size.width} px de large` : null,
    }));
}

const EXTENSION_BY_MIME = {
    "image/webp": "webp",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/avif": "avif",
    "image/gif": "gif",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
};

/** Extension à partir du type MIME, avec repli sur celle de l'URL. */
function extensionFor(blob, sourceUrl) {
    const fromMime = EXTENSION_BY_MIME[blob.type];
    if (fromMime) return fromMime;

    const fromUrl = (sourceUrl || "").split("?")[0].split(".").pop();
    return /^[a-z0-9]{2,4}$/i.test(fromUrl) ? fromUrl.toLowerCase() : "bin";
}

function slugifyForFilename(value) {
    return (value || "photo")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "photo";
}

/**
 * Téléchargement réel à la taille demandée.
 *
 * Le menu proposait « Petit / Moyen / Original » mais les trois entrées
 * appelaient le même fichier : l'utilisateur croyait économiser sa connexion
 * et récupérait quand même l'original.
 */
export async function downloadMedia(media, sizeKey = "original") {
    const options = downloadOptionsFor(media);
    const option = options.find((o) => o.key === sizeKey) || options[0];
    const isVideo = media?.type === "video";

    // Pour une vidéo, `url` est l'image d'aperçu et `originalUrl` le fichier
    // vidéo : les confondre est précisément ce qui produisait une photo à la
    // place du film.
    let source;
    if (isVideo) {
        source = option.key === "poster" ? media.url : media.originalUrl || media.url;
    } else {
        source = option.key === "original" ? media.originalUrl || media.url : media.url;
    }

    let blob;
    if (isVideo && option.key !== "poster") {
        // On ne touche pas au format des vidéos téléchargées
        blob = await (await fetch(source)).blob();
    } else if (!isVideo && option.key === "original") {
        // « Format original » doit livrer le fichier tel qu'envoyé : le
        // reconvertir en JPEG romprait la transparence d'un PNG/WebP tout
        // en contredisant le libellé du bouton.
        const response = await fetch(source);
        if (!response.ok) throw new Error("Téléchargement du fichier impossible");
        blob = await response.blob();
    } else {
        // Petit / Moyen / aperçu vidéo : taille prévisible, on force le JPEG.
        blob = await resizeRemoteImage(source, option.width, true);
    }

    const extension = extensionFor(blob, source);
    const filename = `jealife-${slugifyForFilename(media.title || media.author?.username)}-${option.key}.${extension}`;

    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);

    // Le compteur passe par une RPC : un visiteur non connecté ne peut pas
    // écrire directement dans la table `media`.
    incrementDownloads(media.id);

    return filename;
}

/** « 1 240 » → « 1,2 k ». Compact, et en français. */
export function formatCount(value) {
    const number = Number(value) || 0;
    if (number < 1000) return String(number);
    if (number < 1000000) return `${(number / 1000).toFixed(1).replace(".0", "").replace(".", ",")} k`;
    return `${(number / 1000000).toFixed(1).replace(".0", "").replace(".", ",")} M`;
}

/** Coupe un texte à `maxLength`, sur une limite de mot si possible. */
export function truncateText(text, maxLength = 40) {
    if (!text || text.length <= maxLength) return text || "";
    const cut = text.slice(0, maxLength);
    const lastSpace = cut.lastIndexOf(" ");
    return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** « il y a 5 min », « il y a 3 j »… au-delà d'une semaine, une date courte. */
export function timeAgo(iso) {
    if (!iso) return "";
    const diffMs = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return "à l'instant";
    if (minutes < 60) return `il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `il y a ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `il y a ${days} j`;
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/** Libellé de lieu affichable : « Libreville, Gabon ». */
export function locationLabel(media) {
    if (!media) return null;
    const parts = [media.city, media.country?.name_fr].filter(Boolean);
    if (parts.length > 0) return parts.join(", ");
    return media.location || null;
}

/**
 * « 1:23 » → « PT1M23S ».
 *
 * Schema.org attend une durée au format ISO 8601 ; la base stocke un libellé
 * lisible. Sans conversion, le champ `duration` d'un VideoObject est ignoré.
 */
export function isoDuration(label) {
    if (!label) return undefined;
    const parts = String(label).split(":").map(Number);
    if (parts.some(Number.isNaN)) return undefined;

    const [hours, minutes, seconds] =
        parts.length === 3 ? parts : [0, parts[0] || 0, parts[1] || 0];

    const result = [
        hours ? `${hours}H` : "",
        minutes ? `${minutes}M` : "",
        seconds ? `${seconds}S` : "",
    ].join("");

    return result ? `PT${result}` : undefined;
}
