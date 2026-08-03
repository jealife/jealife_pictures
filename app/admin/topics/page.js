"use client";

import { useEffect, useState } from "react";
import { Plus, Star, Trash2, Loader2, Check, X } from "lucide-react";
import { getAdminTopics, createTopic, updateTopic, deleteTopic } from "../../lib/database";

export default function AdminTopicsPage() {
    const [topics, setTopics] = useState(null);
    const [name, setName] = useState("");
    const [creating, setCreating] = useState(false);
    const [busyId, setBusyId] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [editDraft, setEditDraft] = useState({ name: "", description: "" });

    const load = () => getAdminTopics().then(setTopics);
    useEffect(() => { load(); }, []);

    const submitCreate = async (event) => {
        event.preventDefault();
        if (!name.trim() || creating) return;
        setCreating(true);
        await createTopic({ name: name.trim() });
        setName("");
        setCreating(false);
        load();
    };

    const toggleFeatured = async (topic) => {
        setBusyId(topic.id);
        await updateTopic(topic.id, { is_featured: !topic.is_featured });
        setBusyId(null);
        load();
    };

    const startEdit = (topic) => {
        setEditingId(topic.id);
        setEditDraft({ name: topic.name, description: topic.description || "" });
    };

    const saveEdit = async (topic) => {
        setBusyId(topic.id);
        await updateTopic(topic.id, { name: editDraft.name, description: editDraft.description });
        setEditingId(null);
        setBusyId(null);
        load();
    };

    const remove = async (topic) => {
        if (!confirm(`Supprimer le thème « ${topic.name} » ? Il sera détaché de tous les médias qui l'utilisent.`)) return;
        setBusyId(topic.id);
        await deleteTopic(topic.id);
        setBusyId(null);
        load();
    };

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Thèmes</h2>
            <p className="text-gray-500 text-sm mb-6">
                Les thèmes mis en avant apparaissent dans la navigation ; les autres se remplissent au fil des
                mots-clés saisis par les contributeurs.
            </p>

            <form onSubmit={submitCreate} className="flex gap-3 mb-8 max-w-lg">
                <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Nouveau thème…"
                    className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black outline-none"
                />
                <button
                    type="submit"
                    disabled={creating || !name.trim()}
                    className="px-4 py-2.5 bg-black text-white rounded-xl text-sm font-bold hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Créer
                </button>
            </form>

            {topics === null ? (
                <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
            ) : (
                <div className="space-y-2">
                    {topics.map((topic) => (
                        <div key={topic.id} className="flex items-center gap-4 p-3 border border-gray-100 rounded-xl">
                            <button
                                disabled={busyId === topic.id}
                                onClick={() => toggleFeatured(topic)}
                                title={topic.is_featured ? "Retirer de la navigation" : "Mettre en avant"}
                                className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                                    topic.is_featured ? "text-amber-500 bg-amber-50" : "text-gray-300 hover:text-gray-500"
                                }`}
                            >
                                <Star className="w-4 h-4" fill={topic.is_featured ? "currentColor" : "none"} />
                            </button>

                            <div className="min-w-0 flex-1">
                                {editingId === topic.id ? (
                                    <div className="flex flex-col gap-2">
                                        <input
                                            value={editDraft.name}
                                            onChange={(event) => setEditDraft((d) => ({ ...d, name: event.target.value }))}
                                            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-semibold"
                                        />
                                        <input
                                            value={editDraft.description}
                                            onChange={(event) => setEditDraft((d) => ({ ...d, description: event.target.value }))}
                                            placeholder="Description"
                                            className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600"
                                        />
                                    </div>
                                ) : (
                                    <button onClick={() => startEdit(topic)} className="text-left w-full">
                                        <p className="font-semibold text-gray-900">{topic.name}</p>
                                        <p className="text-xs text-gray-500">
                                            /{topic.slug} · {topic.total_media} média{topic.total_media > 1 ? "s" : ""}
                                        </p>
                                    </button>
                                )}
                            </div>

                            {editingId === topic.id ? (
                                <>
                                    <button
                                        disabled={busyId === topic.id}
                                        onClick={() => saveEdit(topic)}
                                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg disabled:opacity-50"
                                    >
                                        <Check className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => setEditingId(null)} className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg">
                                        <X className="w-4 h-4" />
                                    </button>
                                </>
                            ) : (
                                <button
                                    disabled={busyId === topic.id}
                                    onClick={() => remove(topic)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
