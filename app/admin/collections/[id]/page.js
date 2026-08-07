"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Search, Plus, X, Loader2, Trash2, Save, CheckCircle2 } from "lucide-react";
import {
    getCollection, updateCollection, deleteCollection,
    addMediaToCollection, removeMediaFromCollection, searchMedia,
} from "../../../lib/database";

export default function AdminCollectionDetailPage() {
    const { id } = useParams();
    const router = useRouter();

    const [collection, setCollection] = useState(null);
    const [draft, setDraft] = useState({ title: "", description: "", cover_image_url: "" });
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [busyMediaId, setBusyMediaId] = useState(null);

    const load = useCallback(() => {
        getCollection(id).then((data) => {
            setCollection(data);
            if (data) {
                setDraft({
                    title: data.title || "",
                    description: data.description || "",
                    cover_image_url: data.cover_image_url || "",
                });
            }
        });
    }, [id]);

    useEffect(() => { if (id) load(); }, [id, load]);

    useEffect(() => {
        const term = query.trim();
        const timer = setTimeout(() => {
            if (!term) { setResults([]); return; }
            setSearching(true);
            searchMedia(term, { type: null, limit: 12 }).then((data) => {
                setResults(data);
                setSearching(false);
            });
        }, term ? 300 : 0);
        return () => clearTimeout(timer);
    }, [query]);

    const save = async (event) => {
        event.preventDefault();
        setSaving(true);
        setSaved(false);
        const { success } = await updateCollection(id, {
            title: draft.title.trim(),
            description: draft.description.trim(),
            cover_image_url: draft.cover_image_url.trim() || null,
        });
        setSaving(false);
        if (success) {
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
            load();
        }
    };

    const remove = async () => {
        if (!confirm(`Supprimer la collection « ${collection.title} » ? Cette action est définitive.`)) return;
        setDeleting(true);
        const { success } = await deleteCollection(id);
        if (success) router.push("/admin/collections");
        else setDeleting(false);
    };

    const addPhoto = async (media) => {
        setBusyMediaId(media.id);
        await addMediaToCollection(id, media.id);
        setBusyMediaId(null);
        load();
    };

    const removePhoto = async (mediaId) => {
        setBusyMediaId(mediaId);
        await removeMediaFromCollection(id, mediaId);
        setBusyMediaId(null);
        load();
    };

    if (collection === null) {
        return <Loader2 className="w-6 h-6 animate-spin text-gray-300" />;
    }

    const currentIds = new Set((collection.media || []).map((m) => m.id));

    return (
        <div>
            <Link href="/admin/collections" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black mb-6">
                <ArrowLeft className="w-4 h-4" /> Collections
            </Link>

            <form onSubmit={save} className="space-y-4 max-w-lg mb-12">
                <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">Titre</label>
                    <input
                        value={draft.title}
                        onChange={(event) => setDraft((d) => ({ ...d, title: event.target.value }))}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">Description</label>
                    <textarea
                        rows={3}
                        value={draft.description}
                        onChange={(event) => setDraft((d) => ({ ...d, description: event.target.value }))}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black outline-none resize-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                        URL de couverture <span className="font-normal text-gray-400">(facultatif, sinon la première image sert de couverture)</span>
                    </label>
                    <input
                        value={draft.cover_image_url}
                        onChange={(event) => setDraft((d) => ({ ...d, cover_image_url: event.target.value }))}
                        placeholder="https://…"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black outline-none"
                    />
                </div>

                <div className="flex items-center gap-4 pt-2">
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-5 py-2.5 bg-black text-white rounded-xl text-sm font-bold hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Enregistrer
                    </button>
                    {saved && (
                        <span className="text-sm text-emerald-600 font-medium flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" /> Enregistré
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={remove}
                        disabled={deleting}
                        className="ml-auto px-4 py-2.5 text-red-600 text-sm font-bold rounded-xl hover:bg-red-50 disabled:opacity-50 flex items-center gap-2"
                    >
                        <Trash2 className="w-4 h-4" /> Supprimer la collection
                    </button>
                </div>
            </form>

            <section className="mb-12">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                    Images ({collection.media?.length || 0})
                </h3>
                {(!collection.media || collection.media.length === 0) ? (
                    <p className="text-sm text-gray-400 italic mb-6">Aucune image pour l&apos;instant.</p>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
                        {collection.media.map((item) => (
                            <div key={item.id} className="relative group rounded-lg overflow-hidden bg-gray-100 aspect-square">
                                <Image src={item.thumbnail_url || item.url} alt="" fill unoptimized className="object-cover" />
                                <button
                                    disabled={busyMediaId === item.id}
                                    onClick={() => removePhoto(item.id)}
                                    className="absolute top-1.5 right-1.5 p-1.5 bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                                    title="Retirer de la collection"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <section>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Ajouter des images</h3>
                <div className="relative mb-4 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Chercher par titre, lieu, mot-clé…"
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black outline-none"
                    />
                </div>

                {searching ? (
                    <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
                ) : results.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                        {results.map((media) => {
                            const already = currentIds.has(media.id);
                            return (
                                <div key={media.id} className="relative rounded-lg overflow-hidden bg-gray-100 aspect-square">
                                    <Image src={media.thumbnail_url || media.url} alt="" fill unoptimized className="object-cover" />
                                    <button
                                        disabled={already || busyMediaId === media.id}
                                        onClick={() => addPhoto(media)}
                                        className={`absolute inset-0 flex items-center justify-center transition-colors ${
                                            already ? "bg-black/50" : "bg-black/0 hover:bg-black/50 opacity-0 hover:opacity-100"
                                        }`}
                                    >
                                        {already ? (
                                            <CheckCircle2 className="w-6 h-6 text-white" />
                                        ) : (
                                            <Plus className="w-6 h-6 text-white" />
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                ) : query.trim() ? (
                    <p className="text-sm text-gray-400 italic">Aucun résultat.</p>
                ) : null}
            </section>
        </div>
    );
}
