import Link from "next/link";
import { Layers } from "lucide-react";
import { getEditorialCollections } from "../lib/database";
import CollectionMosaic from "../components/CollectionMosaic";

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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
                        {collections.map((collection) => {
                            const author = collection.profiles?.full_name || collection.profiles?.username;
                            return (
                                <Link key={collection.id} href={`/collections/${collection.id}`} className="group">
                                    <CollectionMosaic
                                        images={collection.previewImages}
                                        alt={collection.title}
                                        className="aspect-[4/3] rounded-xl overflow-hidden"
                                    />
                                    <h2 className="mt-3 font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                                        {collection.title}
                                    </h2>
                                    <p className="text-sm text-gray-500 mt-0.5">
                                        {collection.total_photos} image{collection.total_photos > 1 ? "s" : ""}
                                        {author && <> · Sélection {author}</>}
                                    </p>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </main>
    );
}
