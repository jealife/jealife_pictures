import Link from "next/link";
import { getTopics } from "../lib/database";
import { formatCount } from "../lib/media";

export const revalidate = 600;

export const metadata = {
    title: "Tous les thèmes",
    description:
        "Parcourez les images libres de droits de JEaLiFe Stock par thème : nature, culture, portrait, vie quotidienne, architecture et bien d'autres.",
};

// Gradients de fallback par thème (si pas de cover_image_url)
const FALLBACK_GRADIENTS = [
    "from-emerald-900 to-teal-700",
    "from-amber-900 to-orange-700",
    "from-violet-900 to-purple-700",
    "from-sky-900 to-blue-700",
    "from-rose-900 to-pink-700",
    "from-lime-900 to-green-700",
    "from-indigo-900 to-cyan-700",
    "from-red-900 to-orange-800",
    "from-slate-800 to-gray-600",
];

export default async function TopicsPage() {
    // `kind: 'category'` : cette page reste la vitrine choisie par l'équipe
    // (voir /admin/topics), pas une liste de tous les mots-clés jamais tapés
    // par un contributeur — sinon elle grossirait sans fin (migration 0006).
    const topics = await getTopics({ limit: 200, kind: "category" });
    const withMedia = topics.filter((topic) => topic.total_media > 0);
    const empty = topics.filter((topic) => topic.total_media === 0);

    return (
        <main className="min-h-screen bg-white dark:bg-zinc-950">
            <div className="max-w-[1200px] mx-auto px-4 py-16">
                <h1 className="text-4xl font-extrabold text-gray-900 dark:text-zinc-100 mb-3">Thèmes</h1>
                <p className="text-gray-500 dark:text-zinc-400 mb-12 max-w-2xl">
                    La structure choisie par JEaLiFe Stock pour parcourir le catalogue :
                    chaque image publiée y est rattachée selon ses mots-clés.
                </p>

                {withMedia.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
                        {withMedia.map((topic, i) => {
                            const fallback = FALLBACK_GRADIENTS[i % FALLBACK_GRADIENTS.length];
                            return (
                                <Link
                                    key={topic.slug}
                                    href={`/themes/${topic.slug}`}
                                    className="group relative overflow-hidden rounded-2xl aspect-[4/3] flex items-end shadow-sm hover:shadow-xl transition-all duration-300"
                                >
                                    {/* Image de fond */}
                                    {topic.cover_image_url ? (
                                        <img
                                            src={topic.cover_image_url}
                                            alt={topic.name}
                                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className={`absolute inset-0 bg-gradient-to-br ${fallback}`} />
                                    )}

                                    {/* Overlay gradient sombre */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

                                    {/* Contenu */}
                                    <div className="relative z-10 p-5 w-full">
                                        <h2 className="font-bold text-xl text-white drop-shadow group-hover:text-emerald-300 transition-colors">
                                            {topic.name}
                                        </h2>
                                        {topic.description && (
                                            <p className="text-sm text-white/70 mt-1 line-clamp-1">
                                                {topic.description}
                                            </p>
                                        )}
                                        <p className="text-xs text-white/50 mt-2 font-medium">
                                            {formatCount(topic.total_media)} image
                                            {topic.total_media > 1 ? "s" : ""}
                                        </p>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}

                {empty.length > 0 && (
                    <section>
                        <h2 className="text-sm font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-4">
                            Thèmes en attente de leurs premières images
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            {empty.map((topic) => (
                                <Link
                                    key={topic.slug}
                                    href={`/themes/${topic.slug}`}
                                    className="px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-lg text-sm font-medium text-gray-500 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:border-gray-300 dark:hover:border-zinc-500 transition-colors"
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
