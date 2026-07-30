"use client";

import { Plus, Check, Loader2, FolderPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
    addMediaToCollection,
    createCollection,
    getUserCollections,
} from "../lib/database";

/**
 * Ajout à une collection.
 *
 * Le bouton « + » des cartes était un décor : aucun gestionnaire de clic, et
 * les collections n'étaient consultables nulle part. C'est pourtant la
 * fonction qui transforme une galerie en outil de travail — un journaliste ou
 * un graphiste gabonais a besoin de mettre de côté ce qu'il repère.
 */
export default function SaveToCollectionButton({ mediaId, variant = "overlay" }) {
    const { user } = useAuth();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(false);
    const [savedIn, setSavedIn] = useState(new Set());
    const [creating, setCreating] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const containerRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setOpen(false);
                setCreating(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    const openPanel = async (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (!user) {
            router.push(`/login?redirect=/photos/${mediaId}`);
            return;
        }

        const next = !open;
        setOpen(next);
        if (!next) return;

        setLoading(true);
        setCollections(await getUserCollections(user.id));
        setLoading(false);
    };

    const save = async (collectionId) => {
        const ok = await addMediaToCollection(collectionId, mediaId);
        if (ok) setSavedIn((prev) => new Set(prev).add(collectionId));
    };

    const handleCreate = async (event) => {
        event.preventDefault();
        const title = newTitle.trim();
        if (!title) return;

        const { success, collection } = await createCollection(user.id, { title });
        if (success && collection) {
            setCollections((prev) => [collection, ...prev]);
            setNewTitle("");
            setCreating(false);
            await save(collection.id);
        }
    };

    const triggerClass =
        variant === "overlay"
            ? "bg-white/20 backdrop-blur-md hover:bg-white text-white hover:text-black p-2.5 rounded-full transition-all active:scale-95 border border-white/10"
            : "flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:text-black hover:border-black transition-all";

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={openPanel}
                className={triggerClass}
                aria-label="Ajouter à une collection"
                aria-expanded={open}
            >
                <Plus className={variant === "overlay" ? "w-5 h-5" : "w-4 h-4"} />
                {variant !== "overlay" && <span>Collection</span>}
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    <p className="px-4 pt-3 pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Enregistrer dans
                    </p>

                    {loading ? (
                        <div className="flex justify-center py-6">
                            <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
                        </div>
                    ) : (
                        <div className="max-h-56 overflow-y-auto">
                            {collections.length === 0 && !creating && (
                                <p className="px-4 py-3 text-sm text-gray-500">
                                    Aucune collection pour le moment.
                                </p>
                            )}
                            {collections.map((collection) => (
                                <button
                                    key={collection.id}
                                    onClick={() => save(collection.id)}
                                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 text-left transition-colors"
                                >
                                    <span className="text-sm font-medium text-gray-900 truncate">
                                        {collection.title}
                                    </span>
                                    {savedIn.has(collection.id) && (
                                        <Check className="w-4 h-4 text-green-600 shrink-0" />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}

                    {creating ? (
                        <form onSubmit={handleCreate} className="p-3 border-t border-gray-100">
                            <input
                                autoFocus
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                placeholder="Nom de la collection"
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-black"
                            />
                            <button
                                type="submit"
                                className="mt-2 w-full py-2 bg-black text-white rounded-lg text-sm font-bold hover:bg-gray-800 transition-colors"
                            >
                                Créer et enregistrer
                            </button>
                        </form>
                    ) : (
                        <button
                            onClick={() => setCreating(true)}
                            className="w-full flex items-center gap-2 px-4 py-3 border-t border-gray-100 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-black transition-colors"
                        >
                            <FolderPlus className="w-4 h-4" />
                            Nouvelle collection
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
