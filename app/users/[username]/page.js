import { cache } from "react";
import { getUserProfile, getUserStats } from "../../lib/database";
import { absoluteUrl, SITE_NAME } from "../../lib/site";
import { avatarFallback } from "../../lib/media";
import UserPhotos from "./UserPhotos";

export const revalidate = 600;

const loadProfile = cache(async (username) => getUserProfile(username));

/**
 * Métadonnées d'un profil.
 *
 * Ces pages figurent dans le plan de site mais héritaient du titre par défaut
 * du site : chaque photographe apparaissait dans Google sous « JEaLiFe Stock |
 * Images libres de droits et gratuites ». Autant de titres identiques, donc
 * autant de pages que Google considère comme des doublons sans intérêt.
 */
export async function generateMetadata({ params }) {
    const { username } = await params;
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

    return {
        title: `${name}, photographe`,
        description: description.replace(/\s+/g, " ").trim(),
        alternates: { canonical: `/users/${profile.username}` },
        openGraph: {
            title: `${name} sur ${SITE_NAME}`,
            description,
            type: "profile",
            images: [{ url: profile.avatar_url || avatarFallback(profile.id), width: 400, height: 400, alt: name }],
        },
    };
}

export default async function UserPhotosPage({ params }) {
    const { username } = await params;
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
            url: absoluteUrl(`/users/${profile.username}`),
            image: profile.avatar_url || undefined,
            description: profile.bio || undefined,
            homeLocation: profile.location ? { "@type": "Place", name: profile.location } : undefined,
            sameAs: [
                profile.website,
                profile.instagram_username && `https://instagram.com/${profile.instagram_username}`,
                profile.twitter_username && `https://x.com/${profile.twitter_username}`,
            ].filter(Boolean),
        },
    };

    return (
        <>
            {jsonLd && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
            )}
            <UserPhotos />
        </>
    );
}
