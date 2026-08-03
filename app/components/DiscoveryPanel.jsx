import Link from "next/link";
import Image from "next/image";
import { Layers } from "lucide-react";
import { getEditorialCollections, getMedia } from "../lib/database";
import { formatCount } from "../lib/media";

/**
 * Panneau de découverte, inspiré de la rangée « Collections / Tendances »
 * qu'Unsplash affiche en haut de son accueil.
 *
 * Composant serveur : les deux blocs sont du contenu réel (collections
 * éditoriales gérées depuis /admin/collections, photos les plus
 * téléchargées) — pas de cartes promotionnelles inventées sans équivalent
 * chez nous.
 */
export default async function DiscoveryPanel() {
    const [collections, trending] = await Promise.all([
        getEditorialCollections({ limit: 4 }),
        getMedia({ type: "photo", sort: "populaire", limit: 4 }),
    ]);

    if (collections.length === 0 && trending.length === 0) return null;

    return (
        <section className="w-full max-w-[1600px] mx-auto px-4 pt-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {collections.length > 0 && (
                    <div className="border border-gray-100 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-bold text-gray-900">Collections</h2>
                            <Link href="/collections" className="text-xs font-bold text-gray-500 hover:text-emerald-700 transition-colors">
                                Voir tout
                            </Link>
                        </div>
                        <ul className="space-y-3">
                            {collections.map((collection) => (
                                <li key={collection.id}>
                                    <Link href={`/collections/${collection.id}`} className="flex items-center gap-3 group">
                                        <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                                            {collection.cover && (
                                                <Image src={collection.cover} alt="" fill sizes="44px" className="object-cover" />
                                            )}
                                        </div>
                                        <span className="min-w-0">
                                            <span className="block text-sm font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors truncate">
                                                {collection.title}
                                            </span>
                                            <span className="block text-xs text-gray-500">
                                                {collection.total_photos} image{collection.total_photos > 1 ? "s" : ""}
                                            </span>
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {trending.length > 0 && (
                    <div className="border border-gray-100 rounded-2xl p-6">
                        <h2 className="font-bold text-gray-900 mb-4">Tendances de la semaine</h2>
                        <div className="grid grid-cols-2 gap-2">
                            {trending.map((photo) => (
                                <Link
                                    key={photo.id}
                                    href={`/photos/${photo.id}`}
                                    className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group"
                                >
                                    <Image
                                        src={photo.thumbnail_url || photo.url}
                                        alt=""
                                        fill
                                        sizes="180px"
                                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                </Link>
                            ))}
                        </div>
                        {trending[0]?.downloads_count > 0 && (
                            <p className="text-xs text-gray-400 mt-3">
                                {formatCount(trending[0].downloads_count)} téléchargements pour la plus populaire.
                            </p>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}
