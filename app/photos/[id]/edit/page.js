"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../../contexts/AuthContext";
import { getMediaById, updateMedia } from "../../../lib/database";
import { ArrowLeft, Save, MapPin, Camera, Tag, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function EditPhotoPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState({ type: "", message: "" });

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        location: "",
        camera: "",
        tags: []
    });
    const [newTag, setNewTag] = useState("");
    const [photoUrl, setPhotoUrl] = useState("");

    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                router.push(`/login?redirect=/photos/${id}/edit`);
                return;
            }
            fetchPhoto();
        }
    }, [id, user, authLoading]);

    const fetchPhoto = async () => {
        try {
            setLoading(true);
            const data = await getMediaById(id);
            if (data) {
                // Ensure it's the owner
                if (data.user_id !== user.id) {
                    router.push(`/photos/${id}`);
                    return;
                }
                setFormData({
                    title: data.title || "",
                    description: data.description || "",
                    location: data.location || "",
                    camera: data.camera || "",
                    tags: data.tags || []
                });
                setPhotoUrl(data.url);
            } else {
                router.push('/');
            }
        } catch (error) {
            console.error("Error fetching photo for edit:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddTag = (e) => {
        if (e.key === 'Enter' && newTag.trim()) {
            e.preventDefault();
            if (!formData.tags.includes(newTag.trim())) {
                setFormData({ ...formData, tags: [...formData.tags, newTag.trim()] });
            }
            setNewTag("");
        }
    };

    const removeTag = (tagToRemove) => {
        setFormData({ ...formData, tags: formData.tags.filter(t => t !== tagToRemove) });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setStatus({ type: "", message: "" });

        const result = await updateMedia(id, formData);

        if (result.success) {
            setStatus({ type: "success", message: "Photo mise à jour avec succès !" });
            setTimeout(() => router.push(`/photos/${id}`), 1500);
        } else {
            setStatus({ type: "error", message: "Erreur lors de la mise à jour." });
            setSaving(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="w-10 h-10 animate-spin text-gray-200" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white pb-20">
            <div className="max-w-4xl mx-auto px-4 py-8">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <h1 className="text-2xl font-bold text-gray-900">Modifier les détails</h1>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-12">

                    {/* Preview Image */}
                    <div className="space-y-4">
                        <div className="aspect-4/5 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 shadow-sm">
                            <img src={photoUrl} className="w-full h-full object-cover" alt="Preview" />
                        </div>
                        <p className="text-xs text-gray-400 text-center italic">Aperçu de l'image originale</p>
                    </div>

                    {/* Edit Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-900">Titre de la photo</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-hidden transition-all"
                                placeholder="Donnez un titre accrocheur..."
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-900">Description</label>
                            <textarea
                                rows={4}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-hidden transition-all resize-none"
                                placeholder="Racontez l'histoire de cette photo..."
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                    <MapPin className="w-4 h-4" /> Lieu
                                </label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-hidden transition-all"
                                    placeholder="Libreville, Gabon..."
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                    <Camera className="w-4 h-4" /> Matériel / EXIF
                                </label>
                                <input
                                    type="text"
                                    value={formData.camera}
                                    onChange={(e) => setFormData({ ...formData, camera: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-hidden transition-all"
                                    placeholder="Sony A7III, 85mm f1.8..."
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                <Tag className="w-4 h-4" /> Mots-clés (Entrée pour ajouter)
                            </label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {formData.tags.map(tag => (
                                    <span key={tag} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium animate-in fade-in zoom-in-95 duration-200">
                                        {tag}
                                        <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500 transition-colors">
                                            <Plus className="w-4 h-4 rotate-45" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <input
                                type="text"
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                onKeyDown={handleAddTag}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-hidden transition-all"
                                placeholder="Ajoutez un mot-clé..."
                            />
                        </div>

                        {status.message && (
                            <div className={`p-4 rounded-xl flex items-center gap-3 text-sm animate-in slide-in-from-top-2 duration-300 ${status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                {status.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                                {status.message}
                            </div>
                        )}

                        <div className="pt-4 flex gap-4">
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex-1 py-4 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                Enregistrer les modifications
                            </button>
                            <Link
                                href={`/photos/${id}`}
                                className="px-8 py-4 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all active:scale-95"
                            >
                                Annuler
                            </Link>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
}
