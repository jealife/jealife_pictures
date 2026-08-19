import { Suspense } from "react";
import TopicBar from "../components/TopicBar";
import VideoGrid from "../components/VideoGrid";
import { getMedia, countMedia, PAGE_SIZE } from "../lib/database";

export const metadata = {
    title: "Vidéos libres de droits",
    description:
        "Séquences vidéo libres de droits de haute qualité du continent africain, partagées par la communauté.",
    alternates: { canonical: "/videos" },
    openGraph: {
        title: "Vidéos libres de droits | JEaLiFe Stock",
        description:
            "Séquences vidéo libres de droits de haute qualité du continent africain, partagées par la communauté.",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "Vidéos libres de droits | JEaLiFe Stock",
        description:
            "Séquences vidéo libres de droits de haute qualité du continent africain, partagées par la communauté.",
    },
};

/**
 * La page listait trois vidéos de démonstration hébergées chez Pexels, chacune
 * répétée trois fois pour remplir la grille. Elle lit maintenant la base.
 */
export const revalidate = 300;

export default async function VideosPage({ searchParams }) {
    const params = await searchParams;
    const query = params?.q;
    const country = params?.pays || null;
    const orientation = params?.orientation || null;

    // Comme sur l'accueil : une recherche reste côté client (VideoGrid), sans
    // quoi le HTML servi par le serveur affiche toutes les vidéos le temps
    // d'un aller-retour, au lieu de celles qui correspondent à la recherche.
    const initialItems = query
        ? null
        : await getMedia({ type: "video", limit: PAGE_SIZE, country, orientation });

    const resultsCount = query
        ? await countMedia({ query, type: "video", country, orientation })
        : null;

    return (
        <main className="min-h-screen bg-white dark:bg-zinc-950">
            <Suspense fallback={<div className="h-16 border-b border-gray-100 dark:border-zinc-800" />}>
                <TopicBar />
            </Suspense>

            <header className="max-w-[1600px] mx-auto px-4 pt-10 pb-4">
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-zinc-100">
                    {query ? `Vidéos « ${query} »` : "Vidéos"}
                </h1>
                <p className="text-gray-500 dark:text-zinc-400 mt-2">
                    {query
                        ? `${resultsCount} vidéo${resultsCount > 1 ? "s" : ""} trouvée${resultsCount > 1 ? "s" : ""}.`
                        : "Séquences vidéo libres de droits de haute qualité."}
                </p>
            </header>

            <Suspense fallback={<div className="py-20" />}>
                <VideoGrid initialItems={initialItems} />
            </Suspense>
        </main>
    );
}
