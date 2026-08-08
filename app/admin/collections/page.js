"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus, Loader2, Images, Lock, Star, Search } from "lucide-react";
import {
    getAdminEditorialCollections, createEditorialCollection,
    getAdminCommunityCollections, updateCollection,
} from "../../lib/database";
import { avatarFallback } from "../../lib/media";
import { useAuth } from "../../contexts/AuthContext";

const MIN_PHOTOS_TO_SURFACE = 3;

export default function AdminCollectionsPage() {
    const { user } = useAuth();
    const [collections, setCollections] = useState(null);
    const [title, setTitle] = useState("");
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState(null);

    const [communitySearch, setCommunitySearch] = useState("");
    const [community, setCommunity] = useState(null);
    const [busyId, setBusyId] = useState(null);

    const load = () => getAdminEditorialCollections().then(setCollections);
    useEffect(() => { load(); }, []);

    const loadCommunity = useCallback((term = "") => {
        getAdminCommunityCollections({ search: term, limit: 100 }).then(setCommunity);
    }, []);
    useEffect(() => { loadCommunity(); }, [loadCommunity]);
    useEffect(() => {
        const timer = setTimeout(() => loadCommunity(communitySearch), 300);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [communitySearch]);

    const toggleFeatured = async (collection) => {
        setBusyId(collection.id);
        await updateCollection(collection.id, { is_admin_featured: !collection.is_admin_featured });
        setBusyId(null);
        loadCommunity(communitySearch);
    };

    const submitCreate = async (event) => {
        event.preventDefault();
        if (!title.trim() || creating || !user) return;
        setCreating(true);
        setError(null);
        const { success, error: createError } = await createEditorialCollection(user.id, { title: title.trim() });
        setCreating(false);
        if (!success) { setError(createError); return; }
        setTitle("");
        load();
    };

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 mb-1">Collections éditoriales</h2>
            <p className="text-gray-500 dark:text-zinc-400 text-sm mb-6">
                Des sélections publiées au nom de JEaLiFe Stock, comme « Libreville en images » ou « Le
                Gabon »… Visibles sur <Link href="/collections" className="underline hover:text-black dark:hover:text-white">/collections</Link>.
            </p>

            <form onSubmit={submitCreate} className="flex gap-3 mb-8 max-w-lg">
                <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Titre de la nouvelle collection…"
                    className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-black dark:focus:ring-white text-gray-900 dark:text-zinc-100 outline-none"
                />
                <button
                    type="submit"
                    disabled={creating || !title.trim()}
                    className="px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-bold hover:bg-gray-800 dark:hover:bg-zinc-200 disabled:opacity-50 flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Créer
                </button>
            </form>

            {error && <p className="text-sm text-red-600 dark:text-red-400 mb-6">{error}</p>}

            {collections === null ? (
                <Loader2 className="w-6 h-6 animate-spin text-gray-300 dark:text-zinc-600" />
            ) : collections.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-zinc-500 italic">Aucune collection éditoriale pour l&apos;instant.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {collections.map((collection) => (
                        <Link
                            key={collection.id}
                            href={`/admin/collections/${collection.id}`}
                            className="group border border-gray-100 dark:border-zinc-800 rounded-xl overflow-hidden hover:border-gray-300 dark:hover:border-zinc-600 transition-colors"
                        >
                            <div className="relative h-32 bg-gray-100 dark:bg-zinc-800">
                                {collection.cover ? (
                                    <Image src={collection.cover} alt="" fill unoptimized className="object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-zinc-600">
                                        <Images className="w-8 h-8" />
                                    </div>
                                )}
                            </div>
                            <div className="p-4">
                                <p className="font-semibold text-gray-900 dark:text-zinc-100 flex items-center gap-1.5">
                                    {collection.title}
                                    {collection.is_private && <Lock className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                                    {collection.total_photos} image{collection.total_photos > 1 ? "s" : ""}
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            <section className="mt-16">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 mb-1">Collections de la communauté</h2>
                <p className="text-gray-500 dark:text-zinc-400 text-sm mb-6">
                    Une collection publique avec au moins {MIN_PHOTOS_TO_SURFACE} photos apparaît
                    déjà seule sur <Link href="/collections" className="underline hover:text-black dark:hover:text-white">/collections</Link>.
                    Mets-en une en avant pour la faire passer devant, même avant ce seuil.
                </p>

                <div className="relative mb-6 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-zinc-500" />
                    <input
                        value={communitySearch}
                        onChange={(event) => setCommunitySearch(event.target.value)}
                        placeholder="Chercher par titre…"
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-black dark:focus:ring-white text-gray-900 dark:text-zinc-100 outline-none"
                    />
                </div>

                {community === null ? (
                    <Loader2 className="w-6 h-6 animate-spin text-gray-300 dark:text-zinc-600" />
                ) : community.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-zinc-500 italic">Aucune collection publique de la communauté pour l&apos;instant.</p>
                ) : (
                    <div className="space-y-2">
                        {community.map((collection) => {
                            const author = collection.profiles;
                            const qualifiesAutomatically = collection.total_photos >= MIN_PHOTOS_TO_SURFACE;
                            return (
                                <div key={collection.id} className="flex items-center gap-4 p-3 border border-gray-100 dark:border-zinc-800 rounded-xl">
                                    <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-gray-100 dark:bg-zinc-800 shrink-0">
                                        {collection.cover && (
                                            <Image src={collection.cover} alt="" fill unoptimized className="object-cover" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-gray-900 dark:text-zinc-100 truncate">{collection.title}</p>
                                        <p className="text-xs text-gray-500 dark:text-zinc-400 flex items-center gap-2">
                                            <span className="flex items-center gap-1.5">
                                                {author && (
                                                    <Image
                                                        src={author.avatar_url || avatarFallback(author.id)}
                                                        alt=""
                                                        width={16}
                                                        height={16}
                                                        unoptimized
                                                        className="w-4 h-4 rounded-full object-cover"
                                                    />
                                                )}
                                                {author?.full_name || author?.username || "auteur inconnu"}
                                            </span>
                                            · {collection.total_photos} image{collection.total_photos > 1 ? "s" : ""}
                                            {qualifiesAutomatically && (
                                                <span className="text-emerald-600 dark:text-emerald-400">· visible automatiquement</span>
                                            )}
                                        </p>
                                    </div>
                                    <button
                                        disabled={busyId === collection.id}
                                        onClick={() => toggleFeatured(collection)}
                                        title={collection.is_admin_featured ? "Retirer la mise en avant" : "Mettre en avant"}
                                        className={`px-3 py-2 text-xs font-bold rounded-lg transition-colors disabled:opacity-40 flex items-center gap-1.5 ${
                                            collection.is_admin_featured
                                                ? "bg-amber-500 dark:bg-amber-600 text-white"
                                                : "border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 hover:border-gray-400 dark:hover:border-zinc-500"
                                        }`}
                                    >
                                        <Star className="w-4 h-4" fill={collection.is_admin_featured ? "currentColor" : "none"} />
                                        {collection.is_admin_featured ? "Mise en avant" : "Mettre en avant"}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}
