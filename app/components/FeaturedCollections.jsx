import Link from "next/link";
import Image from "next/image";
import { getEditorialCollections } from "../lib/database";

/**
 * Collections éditoriales sur l'accueil.
 *
 * Composant serveur (pas de "use client") : les collections existent déjà
 * côté serveur au moment du rendu de la page, pas besoin d'un aller-retour
 * client supplémentaire — et ça met de vrais liens dans le HTML initial,
 * utile pour l'indexation.
 */
export default async function FeaturedCollections() {
    const collections = await getEditorialCollections({ limit: 4 });
    if (collections.length === 0) return null;

    return (
        <section className="w-full max-w-[1600px] mx-auto px-4 py-16 border-t border-gray-100">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Collections</h2>
                <Link href="/collections" className="text-sm font-bold text-gray-500 hover:text-emerald-700 transition-colors">
                    Toutes les collections
                </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {collections.map((collection) => (
                    <Link
                        key={collection.id}
                        href={`/collections/${collection.id}`}
                        className="group relative h-64 rounded-xl overflow-hidden bg-gray-100"
                    >
                        {collection.cover ? (
                            <Image
                                src={collection.cover}
                                alt=""
                                fill
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                className="object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                        ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 to-teal-700" />
                        )}
                        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />

                        <div className="absolute bottom-0 left-0 p-6 text-white">
                            <h3 className="text-xl font-bold mb-1">{collection.title}</h3>
                            <p className="text-xs text-white/80 font-medium">
                                {collection.total_photos} image{collection.total_photos > 1 ? "s" : ""}
                            </p>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
}
