import { Suspense } from "react";
import TopicBar from "../components/TopicBar";
import MasonryGrid from "../components/MasonryGrid";
import GridFallback from "../components/GridFallback";
import { getMedia, countMedia, PAGE_SIZE } from "../lib/database";

export const metadata = {
    title: "Illustrations libres de droits",
    description:
        "Illustrations et créations graphiques libres de droits et gratuites, partagées par la communauté JEaLiFe Stock.",
    alternates: { canonical: "/illustrations" },
};

/**
 * La page affichait quatre illustrations codées en dur — des photos Unsplash,
 * en réalité — dupliquées « pour la démo ». Elle lit maintenant la base.
 */
export const revalidate = 300;

export default async function IllustrationsPage({ searchParams }) {
    const params = await searchParams;
    const query = params?.q;
    const country = params?.pays || null;
    const orientation = params?.orientation || null;

    // Comme sur l'accueil : une recherche reste côté client (MasonryGrid),
    // sans quoi le HTML servi par le serveur affiche toutes les
    // illustrations le temps d'un aller-retour, au lieu de celles qui
    // correspondent réellement à la recherche.
    const initialItems = query
        ? null
        : await getMedia({ type: "illustration", limit: PAGE_SIZE, country, orientation });

    const resultsCount = query
        ? await countMedia({ query, type: "illustration", country, orientation })
        : null;

    return (
        <main className="min-h-screen bg-white dark:bg-zinc-950">
            <Suspense fallback={<div className="h-16 border-b border-gray-100 dark:border-zinc-800" />}>
                <TopicBar />
            </Suspense>

            <header className="max-w-[1600px] mx-auto px-4 pt-10 pb-4">
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-zinc-100">
                    {query ? `Illustrations « ${query} »` : "Illustrations"}
                </h1>
                <p className="text-gray-500 dark:text-zinc-400 mt-2">
                    {query
                        ? `${resultsCount} illustration${resultsCount > 1 ? "s" : ""} trouvée${resultsCount > 1 ? "s" : ""}.`
                        : "Créations graphiques libres de droits, à télécharger gratuitement."}
                </p>
            </header>

            <Suspense fallback={<GridFallback />}>
                <MasonryGrid
                    type="illustration"
                    initialItems={initialItems}
                    emptyMessage="Aucune illustration publiée pour l'instant. Si vous dessinez, la place est libre."
                />
            </Suspense>
        </main>
    );
}
