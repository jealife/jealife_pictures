"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../../contexts/AuthContext";
import { deleteMedia, getMediaById, updateMedia, syncTopics, getCountries } from "../../../lib/database";
import { slugifyClient, parseMediaId } from "../../../lib/media";
import { ArrowLeft, Save, MapPin, Camera, Tag, Loader2, CheckCircle2, AlertCircle, Plus, Trash2, Globe2, Accessibility } from "lucide-react";
import Link from "next/link";

export default function EditPhotoPage() {
    const { id: rawId } = useParams();
    const id = parseMediaId(rawId);
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [status, setStatus] = useState({ type: "", message: "" });
    const [formData, setFormData] = useState({
        title: "",
        // `alt_text` est renseigné à la publication et sert au référencement
        // comme aux lecteurs d'écran : il doit rester modifiable ensuite.
        alt_text: "",
        description: "",
        location: "",
        city: "",
        country_code: "",
        camera: "",
        tags: []
    });
    const [countries, setCountries] = useState([]);
    const [newTag, setNewTag] = useState("");
    const [photoUrl, setPhotoUrl] = useState("");

    useEffect(() => { getCountries().then(setCountries); }, []);

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
                    alt_text: data.alt_text || "",
                    description: data.description || "",
                    location: data.location || "",
                    city: data.city || "",
                    country_code: data.country_code || "",
                    camera: data.camera || "",
                    tags: data.tags || []
                });
                setPhotoUrl(data.thumbnail_url || data.url);
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

        // Une chaîne vide sur `country_code` violerait la clé étrangère vers
        // la table des pays : on envoie NULL.
        const result = await updateMedia(id, {
            ...formData,
            country_code: formData.country_code || null,
            city: formData.city.trim() || null,
        });

        if (result.success) {
            // Synchroniser les mots-clés avec la table topics
            await syncTopics(id, formData.tags);

            setStatus({ type: "success", message: "Photo mise à jour avec succès !" });
            const slug = slugifyClient(formData.title.trim() || formData.alt_text.trim() || "photo");
            setTimeout(() => router.push(`/photos/${id}-${slug}`), 1500);
        } else {
            setStatus({ type: "error", message: "Erreur lors de la mise à jour." });
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        setStatus({ type: "", message: "" });

        const result = await deleteMedia(id);

        if (result.success) {
            setStatus({ type: "success", message: "Photo supprimée avec succès." });
            setTimeout(() => router.push('/'), 1500);
        } else {
            setStatus({ type: "error", message: "Erreur lors de la suppression." });
            setDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    if (authLoading || loading) {
        // ... loading state ...
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
                        <p className="text-xs text-gray-400 text-center italic">Aperçu de l&apos;image originale</p>
                    </div>

                    {/* Edit Form */}
                    <div className="space-y-12">
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
                                <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                    <Accessibility className="w-4 h-4" /> Description de l&apos;image
                                    <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.alt_text}
                                    onChange={(e) => setFormData({ ...formData, alt_text: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-hidden transition-all"
                                    placeholder="Ce que l&apos;on voit sur l&apos;image, en une phrase"
                                    required
                                />
                                <p className="text-xs text-gray-400">
                                    Lu par Google Images et les lecteurs d&apos;écran.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                        <Globe2 className="w-4 h-4" /> Pays
                                    </label>
                                    <select
                                        value={formData.country_code}
                                        onChange={(e) => setFormData({ ...formData, country_code: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-hidden transition-all"
                                    >
                                        <option value="">Non précisé</option>
                                        <optgroup label="Afrique">
                                            {countries.filter(c => c.is_african).map(c => (
                                                <option key={c.code} value={c.code}>{c.name_fr}</option>
                                            ))}
                                        </optgroup>
                                        <optgroup label="Reste du monde">
                                            {countries.filter(c => !c.is_african).map(c => (
                                                <option key={c.code} value={c.code}>{c.name_fr}</option>
                                            ))}
                                        </optgroup>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-900">Ville</label>
                                    <input
                                        type="text"
                                        value={formData.city}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-hidden transition-all"
                                        placeholder="Libreville"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-900">Contexte</label>
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
                                        placeholder="Lieu de prise de vue"
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

                        {/* Delete Section */}
                        <div className="pt-12 border-t border-red-100">
                            <div className="bg-red-50/30 rounded-2xl border border-red-100 p-8">
                                <h3 className="text-lg font-bold text-red-900 mb-2">Supprimer l&apos;image</h3>
                                <p className="text-sm text-red-700/80 mb-6 leading-relaxed">
                                    Lorsqu&apos;une image est supprimée de JEaLiFe Stock, nous faisons tout notre possible pour empêcher sa diffusion.
                                    Néanmoins, la licence JEaLiFe est irrévocable, les copies de l&apos;image qui ont été téléchargées avant la suppression peuvent donc toujours être utilisées.
                                </p>

                                {!showDeleteConfirm ? (
                                    <button
                                        type="button"
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="text-red-600 font-bold text-sm hover:underline flex items-center gap-2"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        J&apos;aimerais supprimer cette image
                                    </button>
                                ) : (
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <p className="text-sm font-bold text-red-600">Êtes-vous absolument sûr ? Cette action est irréversible.</p>
                                        <div className="flex gap-3">
                                            <button
                                                type="button"
                                                onClick={handleDelete}
                                                disabled={deleting}
                                                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-all active:scale-95 disabled:opacity-50"
                                            >
                                                {deleting ? "Suppression..." : "Confirmer la suppression"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setShowDeleteConfirm(false)}
                                                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-200 transition-all active:scale-95"
                                            >
                                                Annuler
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
