import { Suspense } from "react";
import TopicBar from "../components/TopicBar";
import MasonryGrid from "../components/MasonryGrid";
import GridFallback from "../components/GridFallback";

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
export default function IllustrationsPage() {
    return (
        <main className="min-h-screen bg-white">
            <Suspense fallback={<div className="h-16 border-b border-gray-100" />}>
                <TopicBar />
            </Suspense>

            <header className="max-w-[1600px] mx-auto px-4 pt-10 pb-4">
                <h1 className="text-3xl font-extrabold text-gray-900">Illustrations</h1>
                <p className="text-gray-500 mt-2">
                    Créations graphiques libres de droits, à télécharger gratuitement.
                </p>
            </header>

            <Suspense fallback={<GridFallback />}>
                <MasonryGrid
                    type="illustration"
                    emptyMessage="Aucune illustration publiée pour l'instant. Si vous dessinez, la place est libre."
                />
            </Suspense>
        </main>
    );
}
