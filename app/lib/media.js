import { incrementDownloads } from "./database";
import { resizeRemoteImage } from "./images";

/**
 * Slug ASCII côté client — miroir de la fonction SQL `slugify()`.
 * « Forêt d'Ivindo » → « foret-d-ivindo ».
 */
export function slugifyClient(text) {
    return (text || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/-{2,}/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80);
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

        author: {
            id: profile.id || row.user_id || null,
            name: profile.full_name || profile.username || "Anonyme",
            username,
            avatar: profile.avatar_url || avatarFallback(profile.id || row.user_id || username),
            bio: profile.bio || null,
            location: profile.location || null,
            isVerified: !!profile.is_verified,
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
    const size = DOWNLOAD_SIZES.find((s) => s.key === sizeKey) || DOWNLOAD_SIZES[3];
    const source = size.key === "original" ? media.originalUrl || media.url : media.url;

    const blob = size.width
        ? await resizeRemoteImage(source, size.width)
        : await (await fetch(source)).blob();

    const extension = blob.type === "image/webp" ? "webp" : "jpg";
    const filename = `jealife-${slugifyForFilename(media.title || media.author?.username)}-${size.key}.${extension}`;

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

/** Libellé de lieu affichable : « Libreville, Gabon ». */
export function locationLabel(media) {
    if (!media) return null;
    const parts = [media.city, media.country?.name_fr].filter(Boolean);
    if (parts.length > 0) return parts.join(", ");
    return media.location || null;
}
