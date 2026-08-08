"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Layers, Loader2, Lock } from "lucide-react";
import { getUserCollections, getUserProfile } from "../../lib/database";

/**
 * Onglet « Collections ».
 *
 * La page affichait trois collections codées en dur pour tous les profils,
 * illustrées par des photos Unsplash, avec un commentaire admettant que les
 * données n'existaient pas. Elle lit maintenant les vraies collections.
 */
export default function UserCollectionsPage() {
    const { handle } = useParams();
    const decodedHandle = handle ? decodeURIComponent(handle) : "";
    const username = decodedHandle.startsWith("@") ? decodedHandle.slice(1) : null;
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!username) return;
        let cancelled = false;

        async function load() {
            const profile = await getUserProfile(username);
            if (cancelled) return;

            if (profile) {
                // La politique de sécurité filtre déjà les collections privées
                // dont on n'est pas propriétaire.
                setCollections(await getUserCollections(profile.id));
            }
            if (!cancelled) setLoading(false);
        }

        load();
        return () => { cancelled = true; };
    }, [username]);

    if (loading) {
        return (
            <div className="py-20 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-300 dark:text-zinc-600" />
            </div>
        );
    }

    if (collections.length === 0) {
        return (
            <div className="py-24 text-center flex flex-col items-center">
                <div className="w-20 h-20 bg-gray-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-6">
                    <Layers className="w-8 h-8 text-gray-300 dark:text-zinc-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-zinc-100 mb-2">Aucune collection</h3>
                <p className="text-gray-500 dark:text-zinc-400 max-w-md">
                    Les collections servent à regrouper des images : un reportage, une
                    ambiance, une commande client.
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {collections.map((collection) => (
                <Link key={collection.id} href={`/collections/${collection.id}`} className="group block">
                    <div className="h-64 grid grid-cols-3 gap-0.5 rounded-lg overflow-hidden bg-gray-100 dark:bg-zinc-800 mb-4">
                        {collection.preview_photos.length > 0 ? (
                            <>
                                <div className="col-span-2 relative h-full">
                                    <Image
                                        src={collection.preview_photos[0]}
                                        alt=""
                                        fill
                                        sizes="(max-width: 640px) 66vw, 22vw"
                                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                </div>
                                <div className="col-span-1 grid grid-rows-2 gap-0.5 h-full">
                                    {[1, 2].map((index) => (
                                        <div key={index} className="relative h-full bg-gray-100 dark:bg-zinc-800">
                                            {collection.preview_photos[index] && (
                                                <Image
                                                    src={collection.preview_photos[index]}
                                                    alt=""
                                                    fill
                                                    sizes="11vw"
                                                    className="object-cover"
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="col-span-3 flex items-center justify-center text-gray-300 dark:text-zinc-600">
                                <Layers className="w-8 h-8" />
                            </div>
                        )}
                    </div>

                    <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100 mb-1 flex items-center gap-2">
                        {collection.title}
                        {collection.is_private && (
                            <Lock className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" aria-label="Collection privée" />
                        )}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-zinc-400">
                        {collection.total_photos} image{collection.total_photos > 1 ? "s" : ""}
                    </p>
                </Link>
            ))}
        </div>
    );
}
