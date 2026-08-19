import { cache } from "react";
import { notFound } from "next/navigation";
import { getUserProfile, getUserStats } from "../lib/database";
import { absoluteUrl, jsonLdScript, SITE_NAME } from "../lib/site";
import { avatarFallback } from "../lib/media";
import UserPhotos from "./UserPhotos";

export const revalidate = 600;

const loadProfile = cache(async (username) => getUserProfile(username));

// `/[handle]` capte tout segment racine non reconnu par une route statique
// (about, submit, collections…) : seul un handle préfixé de `@` désigne un
// profil, le reste doit rester une 404 ordinaire plutôt que de tenter une
// recherche de profil sur un mot au hasard.
function usernameFromHandle(handle) {
    // Le segment arrive encore encodé ici (`%40handle`, pas `@handle`).
    const decoded = handle ? decodeURIComponent(handle) : "";
    if (!decoded.startsWith("@")) return null;
    return decoded.slice(1);
}

/**
 * Métadonnées d'un profil.
 *
 * Ces pages figurent dans le plan de site mais héritaient du titre par défaut
 * du site : chaque photographe apparaissait dans Google sous « JEaLiFe Stock |
 * Images libres de droits et gratuites ». Autant de titres identiques, donc
 * autant de pages que Google considère comme des doublons sans intérêt.
 */
export async function generateMetadata({ params }) {
    const { handle } = await params;
    const username = usernameFromHandle(handle);
    if (!username) return {};
    const profile = await loadProfile(username);

    if (!profile) {
        return { title: "Profil introuvable", robots: { index: false, follow: true } };
    }

    const name = profile.full_name || profile.username;
    const stats = await getUserStats(profile.id);

    const description =
        profile.bio ||
        `Découvrez les ${stats.total_photos || ""} images de ${name} sur ${SITE_NAME}. ` +
        `Photos libres de droits, à télécharger gratuitement.`;

    // `(@identifiant)` reprend le motif qu'utilise Unsplash pour ses pages de
    // profil — utile pour qui cherche directement un pseudo. Google tronque
    // l'affichage autour de 60 caractères ; le modèle "%s | JEaLiFe Stock" du
    // site en consomme déjà 16, il reste donc ~44 caractères pour ce titre.
    // Au-delà, on abandonne l'identifiant plutôt que de risquer un titre
    // coupé au milieu d'un mot.
    const titleWithHandle = `${name} (@${profile.username}), photographe`;
    const title = titleWithHandle.length <= 44 ? titleWithHandle : `${name}, photographe`;

    return {
        title,
        description: description.replace(/\s+/g, " ").trim(),
        alternates: { canonical: `/@${profile.username}` },
        openGraph: {
            title: `${name} sur ${SITE_NAME}`,
            description,
            type: "profile",
            images: [{ url: profile.avatar_url || avatarFallback(profile.id), width: 400, height: 400, alt: name }],
        },
    };
}

export default async function UserPhotosPage({ params }) {
    const { handle } = await params;
    const username = usernameFromHandle(handle);
    if (!username) notFound();
    const profile = await loadProfile(username);

    // ProfilePage relie l'auteur à ses images : c'est ce qui permet à Google
    // d'attribuer une photo à un photographe plutôt qu'à un site anonyme.
    const jsonLd = profile && {
        "@context": "https://schema.org/",
        "@type": "ProfilePage",
        mainEntity: {
            "@type": "Person",
            name: profile.full_name || profile.username,
            alternateName: profile.username,
            url: absoluteUrl(`/@${profile.username}`),
            image: profile.avatar_url || undefined,
            description: profile.bio || undefined,
            homeLocation: profile.location ? { "@type": "Place", name: profile.location } : undefined,
            sameAs: [
                profile.website,
                profile.instagram_username && `https://instagram.com/${profile.instagram_username}`,
                profile.facebook_username && `https://facebook.com/${profile.facebook_username}`,
            ].filter(Boolean),
        },
    };

    return (
        <>
            {jsonLd && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
                />
            )}
            <UserPhotos />
        </>
    );
}
