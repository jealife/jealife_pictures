import { Suspense } from "react";
import TopicBar from "../components/TopicBar";
import VideoGrid from "../components/VideoGrid";
import { getMedia, PAGE_SIZE } from "../lib/database";

export const metadata = {
    title: "Vidéos libres de droits",
    description:
        "Séquences vidéo libres de droits et gratuites, partagées par la communauté JEaLiFe Stock.",
    alternates: { canonical: "/videos" },
};

/**
 * La page listait trois vidéos de démonstration hébergées chez Pexels, chacune
 * répétée trois fois pour remplir la grille. Elle lit maintenant la base.
 */
export const revalidate = 300;

export default async function VideosPage() {
    const initialItems = await getMedia({ type: "video", limit: PAGE_SIZE });

    return (
        <main className="min-h-screen bg-white">
            <Suspense fallback={<div className="h-16 border-b border-gray-100" />}>
                <TopicBar />
            </Suspense>

            <header className="max-w-[1600px] mx-auto px-4 pt-10 pb-4">
                <h1 className="text-3xl font-extrabold text-gray-900">Vidéos</h1>
                <p className="text-gray-500 mt-2">
                    Séquences libres de droits, à télécharger gratuitement.
                </p>
            </header>

            <Suspense fallback={<div className="py-20" />}>
                <VideoGrid initialItems={initialItems} />
            </Suspense>
        </main>
    );
}
