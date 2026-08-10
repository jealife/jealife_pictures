import { cache } from "react";
import { getMediaById } from "../../lib/database";
import { parseMediaId, mediaUrl, isoDuration, mediaAlt } from "../../lib/media";
import { absoluteUrl } from "../../lib/site";
import PhotoDetail from "./PhotoDetail";

// Les métadonnées sont mises en cache 5 minutes au lieu d'être recalculées à
// chaque requête : un robot qui explore des milliers de fiches recevait
// jusqu'ici une réponse lente à chaque page, ce qui réduit d'autant le nombre
// d'URL qu'il accepte de parcourir.
export const revalidate = 300;

// `generateMetadata` et la page interrogent la même fiche : `cache()` évite
// d'aller la chercher deux fois par requête.
const loadMedia = cache(async (rawId) => getMediaById(parseMediaId(rawId)));

/**
 * Aucune session ici : ce composant serveur interroge Supabase en anonyme
 * (voir PhotoDetail.js), donc il ne peut jamais être le propriétaire d'un
 * média Premium ni prouver un achat. `url`/`original_url` — l'adresse
 * affichée en pleine taille et le fichier original — ne doivent donc jamais
 * quitter le serveur pour un média Premium : ni dans les balises meta, ni
 * dans le JSON-LD, ni dans les props d'hydratation envoyées au client. Le
 * client revérifiera lui-même son droit d'accès via /api/photo-access, avec
 * sa propre session.
 */
function previewImageFor(photo) {
    return photo.is_premium ? photo.thumbnail_url || null : photo.url;
}

function redactPremiumMedia(photo) {
    if (!photo?.is_premium) return photo;
    return { ...photo, url: null, original_url: null };
}

export async function generateMetadata({ params }) {
    const { id } = await params;
    const photo = await loadMedia(id);

    if (!photo) {
        return {
            title: "Contenu introuvable",
            robots: { index: false, follow: true },
        };
    }

    const author = photo.profiles?.full_name || photo.profiles?.username || "un photographe";
    const isVideo = photo.type === "video";

    // Pas de suffixe de marque ici : le gabarit défini dans layout.js ajoute
    // déjà « | JEaLiFe Stock ». Le mettre aux deux endroits produisait des
    // titres du type « … | JEaLiFe Stock | JEaLiFe Stock », tronqués par
    // Google et mauvais pour le classement.
    const title = `${photo.title || photo.alt_text || (isVideo ? "Vidéo" : "Photo")} par ${author}`;

    // La description de résultat de recherche part du texte alternatif, qui
    // décrit réellement l'image, plutôt que d'une phrase générique.
    const description =
        photo.description ||
        photo.alt_text ||
        `${isVideo ? "Vidéo" : "Photo"} de ${author} à télécharger gratuitement sur JEaLiFe Stock.`;

    return {
        title,
        description,
        alternates: { canonical: mediaUrl(photo) },
        keywords: [author, ...(photo.tags || []), "photo gratuite", "libre de droits", "JEaLiFe Stock"],
        openGraph: {
            title,
            description,
            images: [
                {
                    url: previewImageFor(photo),
                    width: photo.width || 1200,
                    height: photo.height || 630,
                    alt: photo.alt_text || photo.title || "Image",
                },
            ],
            type: isVideo ? "video.other" : "article",
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: [previewImageFor(photo)],
        },
    };
}

/**
 * Données structurées rendues côté serveur.
 *
 * Elles vivaient dans le composant client : elles n'apparaissaient donc
 * qu'après hydratation. Google sait exécuter du JavaScript, mais il traite le
 * balisage présent dans le HTML initial de façon nettement plus fiable — et
 * c'est ce balisage qui déclenche le badge « Licence » de Google Images, le
 * signal qui distingue une banque d'images sérieuse d'une simple galerie.
 */
function buildJsonLd(photo) {
    const author = photo.profiles?.full_name || photo.profiles?.username || "Anonyme";
    const username = photo.profiles?.username;
    const isVideo = photo.type === "video";
    const place =
        [photo.city, photo.countries?.name_fr].filter(Boolean).join(", ") || photo.location;
    const label = photo.title || mediaAlt(photo);

    // Un média Premium n'a rien à annoncer comme `contentUrl` réel : c'est
    // précisément l'adresse qu'on protège (voir /api/photo-access). Seule la
    // vignette, publique par construction, sert d'aperçu aux moteurs de
    // recherche et réseaux sociaux.
    const common = {
        name: label,
        description: photo.description || mediaAlt(photo),
        datePublished: photo.created_at,
        thumbnailUrl: photo.thumbnail_url || (photo.is_premium ? null : photo.url),
        license: absoluteUrl("/licence"),
        acquireLicensePage: absoluteUrl("/licence"),
        creditText: author,
        copyrightNotice: author,
        creator: {
            "@type": "Person",
            name: author,
            ...(username ? { url: absoluteUrl(`/@${username}`) } : {}),
        },
        ...(place ? { contentLocation: { "@type": "Place", name: place } } : {}),
        ...(photo.tags?.length ? { keywords: photo.tags.join(", ") } : {}),
        width: photo.width || undefined,
        height: photo.height || undefined,
    };

    const main = isVideo
        ? {
            "@context": "https://schema.org/",
            "@type": "VideoObject",
            ...common,
            ...(photo.is_premium ? {} : { contentUrl: photo.original_url || photo.url }),
            uploadDate: photo.created_at,
            duration: isoDuration(photo.duration),
        }
        : {
            "@context": "https://schema.org/",
            "@type": "ImageObject",
            ...common,
            contentUrl: previewImageFor(photo),
        };

    const canonical = absoluteUrl(mediaUrl({ id: photo.id, title: photo.title, alt: mediaAlt(photo) }));

    const breadcrumb = {
        "@context": "https://schema.org/",
        "@type": "BreadcrumbList",
        itemListElement: [
            { "@type": "ListItem", position: 1, name: "Accueil", item: absoluteUrl("/") },
            {
                "@type": "ListItem",
                position: 2,
                name: isVideo ? "Vidéos" : "Photos",
                item: absoluteUrl(isVideo ? "/videos" : "/"),
            },
            { "@type": "ListItem", position: 3, name: label, item: canonical },
        ],
    };

    return [main, breadcrumb];
}

export default async function Page({ params }) {
    const { id } = await params;
    const photo = await loadMedia(id);

    return (
        <>
            {photo &&
                buildJsonLd(photo).map((schema, index) => (
                    <script
                        key={index}
                        type="application/ld+json"
                        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
                    />
                ))}
            {/* La fiche est déjà chargée ici (métadonnées, JSON-LD) : la
                transmettre évite au navigateur de la redemander après
                hydratation. C'est ce second aller-retour qui faisait passer la
                page par un écran squelette avant même de commencer à
                télécharger l'image. `redactPremiumMedia` retire `url`/
                `original_url` avant que ces props n'atteignent le client :
                ce composant n'a aucune session, il ne peut jamais prouver un
                achat ou une propriété, donc rien de réel ne doit en sortir
                pour un média Premium — PhotoDetail revérifie lui-même via
                /api/photo-access, avec la session du navigateur. */}
            <PhotoDetail initialPhoto={photo && redactPremiumMedia(photo)} />
        </>
    );
}
