"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Layers, Loader2, Lock, Share2, Check } from "lucide-react";
import PhotoCard from "../../components/PhotoCard";
import VideoCard from "../../components/VideoCard";
import { getCollection } from "../../lib/database";
import { normalizeMediaList, avatarFallback } from "../../lib/media";

/**
 * Page d'une collection.
 *
 * Plusieurs endroits du site pointaient déjà vers `/collections/<id>` — la
 * section « collections sélectionnées » de l'accueil, l'onglet collections
 * d'un profil — mais la route n'existait pas : tous ces liens tombaient en 404.
 *
 * Le rendu vit ici, côté client (comme `PhotoDetail`) ; les métadonnées et le
 * JSON-LD, eux, sont produits par `page.js` côté serveur — voir ce fichier
 * pour pourquoi ça ne peut pas être fait ici.
 */
export default function CollectionDetail() {
    const { id } = useParams();
    const [collection, setCollection] = useState(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    const copyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    useEffect(() => {
        if (!id) return;
        let cancelled = false;

        getCollection(id).then((data) => {
            if (cancelled) return;
            setCollection(data);
            setLoading(false);
        });

        return () => { cancelled = true; };
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
            </div>
        );
    }

    if (!collection) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                    <Layers className="w-8 h-8 text-gray-300" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-3">Collection introuvable</h1>
                <p className="text-gray-500 mb-8 max-w-sm">
                    Elle a peut-être été supprimée, ou son auteur l&apos;a rendue privée.
                </p>
                <Link href="/" className="px-6 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-colors">
                    Retour à l&apos;accueil
                </Link>
            </div>
        );
    }

    const items = normalizeMediaList(collection.media);
    const author = collection.profiles;

    return (
        <main className="min-h-screen bg-white">
            <header className="max-w-[1600px] mx-auto px-4 pt-12 pb-6">
                <h1 className="text-4xl font-extrabold text-gray-900 flex items-center gap-3">
                    {collection.title}
                    {collection.is_private && (
                        <Lock className="w-6 h-6 text-gray-400" aria-label="Collection privée" />
                    )}
                </h1>

                {collection.description && (
                    <p className="text-gray-500 mt-3 max-w-2xl">{collection.description}</p>
                )}

                <div className="flex items-center justify-between gap-4 mt-6">
                    {author && (
                        <Link href={`/users/${author.username}`} className="flex items-center gap-3 group">
                            <Image
                                src={author.avatar_url || avatarFallback(author.id)}
                                alt=""
                                width={40}
                                height={40}
                                unoptimized
                                className="w-10 h-10 rounded-full object-cover border border-gray-200"
                            />
                            <span>
                                <span className="block text-sm font-bold text-gray-900 group-hover:text-black">
                                    {author.full_name || author.username}
                                </span>
                                <span className="block text-xs text-gray-500">
                                    {items.length} image{items.length > 1 ? "s" : ""}
                                </span>
                            </span>
                        </Link>
                    )}

                    <button
                        type="button"
                        onClick={copyLink}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-full text-sm font-medium text-gray-600 hover:border-gray-400 hover:text-black transition-colors"
                    >
                        {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
                        {copied ? "Lien copié" : "Partager"}
                    </button>
                </div>
            </header>

            <div className="max-w-[1600px] mx-auto px-4 pb-16">
                {items.length === 0 ? (
                    <p className="py-24 text-center text-gray-500">
                        Cette collection est encore vide.
                    </p>
                ) : (
                    <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6">
                        {items.map((item) =>
                            item.type === "video" ? (
                                // VideoCard n'a pas ces classes par défaut : dans
                                // MasonryGrid, la colonne flex qui l'entoure s'en
                                // charge déjà, mais ici la mise en page est en
                                // colonnes CSS (comme PhotoCard.jsx), donc il les
                                // faut explicitement pour ne pas couper la carte
                                // entre deux colonnes.
                                <div key={item.id} className="mb-6 break-inside-avoid">
                                    <VideoCard video={item} />
                                </div>
                            ) : (
                                <PhotoCard key={item.id} photo={item} />
                            )
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}
