import { Suspense } from "react";
import { notFound } from "next/navigation";
import MasonryGrid from "../../components/MasonryGrid";
import TopicBar from "../../components/TopicBar";
import GridFallback from "../../components/GridFallback";
import { getTopicBySlug, getMediaByTopic, PAGE_SIZE } from "../../lib/database";
import { formatCount } from "../../lib/media";

export const revalidate = 300;

export async function generateMetadata({ params }) {
    const { slug } = await params;
    const topic = await getTopicBySlug(slug);

    if (!topic) return { title: "Thème introuvable" };

    const description =
        topic.description ||
        `Découvrez notre sélection de photos et d'illustrations de haute qualité libres de droits sur le thème « ${topic.name} » du continent africain.`;

    return {
        title: `Images ${topic.name}`,
        description,
        alternates: { canonical: `/themes/${topic.slug}` },
        openGraph: {
            title: `Images ${topic.name} | JEaLiFe Stock`,
            description,
            type: "website",
        },
        twitter: {
            card: "summary_large_image",
            title: `Images ${topic.name} | JEaLiFe Stock`,
            description,
        },
    };
}

export default async function TopicPage({ params, searchParams }) {
    const { slug } = await params;
    const query = await searchParams;
    const topic = await getTopicBySlug(slug);

    if (!topic) notFound();

    // Sans ces deux filtres, une entrée directe sur une URL déjà filtrée
    // (lien partagé, retour en arrière) affichait toutes les images du
    // thème le temps d'un aller-retour client, alors que TopicBar affiche
    // aussitôt le filtre comme actif — voir MasonryGrid/CountryFilter.
    const country = query?.pays || null;
    const orientation = query?.orientation || null;

    const initialItems = await getMediaByTopic(topic.slug, { limit: PAGE_SIZE, country, orientation });

    return (
        <main className="min-h-screen bg-white dark:bg-zinc-950">
            <Suspense fallback={<div className="h-16 border-b border-gray-100 dark:border-zinc-800" />}>
                <TopicBar activeTopic={topic.slug} />
            </Suspense>

            <header className="max-w-[1600px] mx-auto px-4 pt-10 pb-4">
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-zinc-100">{topic.name}</h1>
                {topic.description && (
                    <p className="text-gray-500 dark:text-zinc-400 mt-2 max-w-2xl">{topic.description}</p>
                )}
                <p className="text-sm text-gray-400 dark:text-zinc-500 mt-3 font-medium">
                    {formatCount(topic.total_media)} image{topic.total_media > 1 ? "s" : ""}
                </p>
            </header>

            <Suspense fallback={<GridFallback />}>
                <MasonryGrid
                    topic={topic.slug}
                    initialItems={initialItems}
                    emptyMessage={`Aucune image sur « ${topic.name} » pour l'instant. Publiez la première.`}
                />
            </Suspense>
        </main>
    );
}
