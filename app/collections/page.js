import Link from "next/link";
import Image from "next/image";
import { Layers } from "lucide-react";
import { getEditorialCollections } from "../lib/database";

export const revalidate = 600;

export const metadata = {
    title: "Collections",
    description:
        "Des sélections d'images libres de droits construites par JEaLiFe Stock : lieux, thèmes, regards sur le Gabon et l'Afrique.",
    alternates: { canonical: "/collections" },
};

export default async function CollectionsPage() {
    const collections = await getEditorialCollections({ limit: 48 });

    return (
        <main className="min-h-screen bg-white">
            <div className="max-w-[1200px] mx-auto px-4 py-16">
                <h1 className="text-4xl font-extrabold text-gray-900 mb-3">Collections</h1>
                <p className="text-gray-500 mb-12 max-w-2xl">
                    Des sélections construites par l&apos;équipe JEaLiFe Stock, à parcourir d&apos;un
                    seul geste plutôt que thème par thème.
                </p>

                {collections.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-24 text-gray-400">
                        <Layers className="w-10 h-10 mb-4" />
                        <p>Aucune collection publiée pour l&apos;instant.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {collections.map((collection) => (
                            <Link
                                key={collection.id}
                                href={`/collections/${collection.id}`}
                                className="group relative overflow-hidden rounded-2xl aspect-[4/3] flex items-end shadow-sm hover:shadow-xl transition-all duration-300 bg-gray-100"
                            >
                                {collection.cover ? (
                                    <Image
                                        src={collection.cover}
                                        alt=""
                                        fill
                                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 to-teal-700" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                                <div className="relative z-10 p-5 w-full">
                                    <h2 className="font-bold text-xl text-white drop-shadow">{collection.title}</h2>
                                    <p className="text-xs text-white/70 mt-2 font-medium">
                                        {collection.total_photos} image{collection.total_photos > 1 ? "s" : ""}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
