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

    return {
        title: `Images ${topic.name}`,
        description:
            topic.description ||
            `Photos libres de droits sur le thème « ${topic.name} », par les photographes de JEaLiFe Stock.`,
        alternates: { canonical: `/themes/${topic.slug}` },
    };
}

export default async function TopicPage({ params }) {
    const { slug } = await params;
    const topic = await getTopicBySlug(slug);

    if (!topic) notFound();

    const initialItems = await getMediaByTopic(topic.slug, { limit: PAGE_SIZE });

    return (
        <main className="min-h-screen bg-white">
            <Suspense fallback={<div className="h-16 border-b border-gray-100" />}>
                <TopicBar activeTopic={topic.slug} />
            </Suspense>

            <header className="max-w-[1600px] mx-auto px-4 pt-10 pb-4">
                <h1 className="text-3xl font-extrabold text-gray-900">{topic.name}</h1>
                {topic.description && (
                    <p className="text-gray-500 mt-2 max-w-2xl">{topic.description}</p>
                )}
                <p className="text-sm text-gray-400 mt-3 font-medium">
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
