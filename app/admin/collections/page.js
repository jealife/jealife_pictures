"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus, Loader2, Images, Lock } from "lucide-react";
import { getAdminEditorialCollections, createEditorialCollection } from "../../lib/database";
import { useAuth } from "../../contexts/AuthContext";

export default function AdminCollectionsPage() {
    const { user } = useAuth();
    const [collections, setCollections] = useState(null);
    const [title, setTitle] = useState("");
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState(null);

    const load = () => getAdminEditorialCollections().then(setCollections);
    useEffect(() => { load(); }, []);

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
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Collections éditoriales</h2>
            <p className="text-gray-500 text-sm mb-6">
                Des sélections publiées au nom de JEaLiFe Stock — « Libreville en images », « Le
                Gabon »… Visibles sur <Link href="/collections" className="underline hover:text-black">/collections</Link>.
            </p>

            <form onSubmit={submitCreate} className="flex gap-3 mb-8 max-w-lg">
                <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Titre de la nouvelle collection…"
                    className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black outline-none"
                />
                <button
                    type="submit"
                    disabled={creating || !title.trim()}
                    className="px-4 py-2.5 bg-black text-white rounded-xl text-sm font-bold hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Créer
                </button>
            </form>

            {error && <p className="text-sm text-red-600 mb-6">{error}</p>}

            {collections === null ? (
                <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
            ) : collections.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Aucune collection éditoriale pour l&apos;instant.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {collections.map((collection) => (
                        <Link
                            key={collection.id}
                            href={`/admin/collections/${collection.id}`}
                            className="group border border-gray-100 rounded-xl overflow-hidden hover:border-gray-300 transition-colors"
                        >
                            <div className="relative h-32 bg-gray-100">
                                {collection.cover ? (
                                    <Image src={collection.cover} alt="" fill unoptimized className="object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                        <Images className="w-8 h-8" />
                                    </div>
                                )}
                            </div>
                            <div className="p-4">
                                <p className="font-semibold text-gray-900 flex items-center gap-1.5">
                                    {collection.title}
                                    {collection.is_private && <Lock className="w-3.5 h-3.5 text-gray-400" />}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {collection.total_photos} image{collection.total_photos > 1 ? "s" : ""}
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
