import Link from "next/link";
import Image from "next/image";
import { Layers, TrendingUp } from "lucide-react";
import { getDiscoverableCollections, getMedia } from "../lib/database";

/**
 * Panneau de découverte, inspiré de la rangée « Collections / Tendances »
 * qu'Unsplash affiche en haut de son accueil.
 *
 * Composant serveur : les deux blocs sont du contenu réel (collections
 * éditoriales gérées depuis /admin/collections, photos les plus
 * téléchargées) — pas de cartes promotionnelles inventées sans équivalent
 * chez nous.
 *
 * Cartes calées sur le gabarit de `CategorySection` juste au-dessus (même
 * bordure, même arrondi, même badge d'icône colorée) pour que les deux
 * sections lisent comme un seul système plutôt que deux styles concurrents.
 * `items-start` est essentiel : sans lui, une grille à 2 colonnes étire la
 * carte la plus courte à la hauteur de l'autre, laissant un grand vide sous
 * une liste de 4 lignes à côté d'une mosaïque plus haute.
 */
export default async function DiscoveryPanel() {
    const [collections, trending] = await Promise.all([
        getDiscoverableCollections({ limit: 4 }),
        getMedia({ type: "photo", sort: "populaire", limit: 4 }),
    ]);

    if (collections.length === 0 && trending.length === 0) return null;

    return (
        <section className="w-full max-w-[1600px] mx-auto px-4 pb-16">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {collections.length > 0 && (
                    <div className="border border-gray-100 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-3">
                                <span className="p-2 rounded-lg bg-amber-50 text-amber-700">
                                    <Layers className="w-5 h-5" />
                                </span>
                                <h2 className="font-bold text-lg text-gray-900">Collections</h2>
                            </div>
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
                        <div className="flex items-center gap-3 mb-5">
                            <span className="p-2 rounded-lg bg-red-50 text-red-600">
                                <TrendingUp className="w-5 h-5" />
                            </span>
                            <h2 className="font-bold text-lg text-gray-900">Tendances de la semaine</h2>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {trending.map((photo) => (
                                <Link
                                    key={photo.id}
                                    href={`/photos/${photo.id}`}
                                    className="relative w-11 h-11 rounded-lg overflow-hidden bg-gray-100 shrink-0 group"
                                >
                                    <Image
                                        src={photo.thumbnail_url || photo.url}
                                        alt=""
                                        fill
                                        sizes="44px"
                                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
