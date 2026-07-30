import Link from "next/link";
import { getTopics } from "../lib/database";
import { formatCount } from "../lib/media";

export const revalidate = 600;

export const metadata = {
    title: "Tous les thèmes",
    description:
        "Parcourez les images libres de droits de JEaLiFe Stock par thème : nature, culture, portrait, vie quotidienne, architecture et bien d'autres.",
};

export default async function TopicsPage() {
    const topics = await getTopics({ limit: 200 });
    const withMedia = topics.filter((topic) => topic.total_media > 0);
    const empty = topics.filter((topic) => topic.total_media === 0);

    return (
        <main className="min-h-screen bg-white">
            <div className="max-w-[1200px] mx-auto px-4 py-16">
                <h1 className="text-4xl font-extrabold text-gray-900 mb-3">Thèmes</h1>
                <p className="text-gray-500 mb-12 max-w-2xl">
                    Chaque image publiée rejoint automatiquement un ou plusieurs thèmes
                    à partir de ses mots-clés.
                </p>

                {withMedia.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
                        {withMedia.map((topic) => (
                            <Link
                                key={topic.slug}
                                href={`/themes/${topic.slug}`}
                                className="group p-6 border border-gray-100 rounded-2xl hover:border-gray-300 hover:shadow-lg transition-all"
                            >
                                <h2 className="font-bold text-lg text-gray-900 group-hover:text-emerald-700 transition-colors">
                                    {topic.name}
                                </h2>
                                {topic.description && (
                                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                        {topic.description}
                                    </p>
                                )}
                                <p className="text-xs text-gray-400 mt-3 font-medium">
                                    {formatCount(topic.total_media)} image
                                    {topic.total_media > 1 ? "s" : ""}
                                </p>
                            </Link>
                        ))}
                    </div>
                )}

                {empty.length > 0 && (
                    <section>
                        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
                            Thèmes en attente de leurs premières images
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            {empty.map((topic) => (
                                <Link
                                    key={topic.slug}
                                    href={`/themes/${topic.slug}`}
                                    className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm font-medium text-gray-500 hover:text-black hover:border-gray-300 transition-colors"
                                >
                                    {topic.name}
                                </Link>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </main>
    );
}
