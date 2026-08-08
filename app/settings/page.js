"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { upsertProfile } from "../lib/auth";
import { getUserProfile } from "../lib/database";
import { friendlyErrorMessage } from "../lib/errors";
import { Camera, MapPin, Globe, User, Mail, FileText, CheckCircle2, AlertCircle, Loader2, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
    const router = useRouter();
    const { user, loading: authLoading, refreshProfile } = useAuth();

    // States
    const [activeTab, setActiveTab] = useState('profile');
    const [profile, setProfile] = useState({
        full_name: "",
        username: "",
        bio: "",
        location: "",
        website: "",
        instagram_username: "",
        twitter_username: "",
        avatar_url: "",
        is_available_for_hire: false
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState({ type: "", message: "" });
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState("");

    const fileInputRef = useRef(null);

    // Protection and Data Fetching
    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                router.push('/login?redirect=/settings');
                return;
            }
            fetchProfile();
        }
    }, [user, authLoading]);

    const fetchProfile = async () => {
        if (!user?.id) return;
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                setProfile({
                    full_name: data.full_name || "",
                    username: data.username || "",
                    bio: data.bio || "",
                    location: data.location || "",
                    website: data.website || "",
                    instagram_username: data.instagram_username || "",
                    twitter_username: data.twitter_username || "",
                    avatar_url: data.avatar_url || "",
                    is_available_for_hire: data.is_available_for_hire || false
                });
                setAvatarPreview(data.avatar_url);
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
            setStatus({ type: "error", message: "Impossible de charger votre profil." });
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (saving) return;

        setSaving(true);
        setStatus({ type: "", message: "" });

        try {
            let finalAvatarUrl = profile.avatar_url;

            // 1. Upload Avatar if changed
            if (avatarFile) {
                const fileExt = avatarFile.name.split('.').pop();
                const fileName = `${user.id}/${Date.now()}.${fileExt}`;
                const filePath = `avatars/${fileName}`;

                // Upload to 'media' bucket
                const { error: uploadError } = await supabase.storage
                    .from('media')
                    .upload(filePath, avatarFile, {
                        cacheControl: '3600',
                        upsert: true
                    });

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('media')
                    .getPublicUrl(filePath);

                finalAvatarUrl = publicUrl;
            }

            // 2. Update Profile
            const profileToUpdate = {
                full_name: profile.full_name,
                username: profile.username.toLowerCase(),
                bio: profile.bio,
                location: profile.location,
                website: profile.website,
                instagram_username: profile.instagram_username,
                twitter_username: profile.twitter_username,
                avatar_url: finalAvatarUrl,
                is_available_for_hire: profile.is_available_for_hire
            };

            const { success, error: updateError } = await upsertProfile(user.id, profileToUpdate);

            if (!success) throw new Error(updateError);

            // Update local state and global context
            setProfile(prev => ({ ...prev, ...profileToUpdate }));
            setAvatarFile(null);

            // This is CRITICAL for the Navbar to update
            await refreshProfile();

            setStatus({ type: "success", message: "Profil mis à jour avec succès !" });

            setTimeout(() => setStatus({ type: "", message: "" }), 5000);

        } catch (error) {
            console.error("Update error:", error);
            setStatus({ type: "error", message: friendlyErrorMessage(error, "La mise à jour a échoué. Réessayez.") });
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-gray-200 dark:text-zinc-700 animate-spin" />
                    <p className="text-gray-400 dark:text-zinc-500 text-sm font-medium">Chargement de vos paramètres...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white dark:bg-zinc-950">
            <div className="max-w-[1000px] mx-auto px-4 py-12 md:py-20">

                <div className="flex flex-col md:flex-row gap-12">

                    {/* Sidebar Navigation */}
                    <div className="w-full md:w-64 shrink-0">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-zinc-100 mb-8">Paramètres</h1>
                        <nav className="space-y-1">
                            <button
                                onClick={() => setActiveTab('profile')}
                                className={`w-full flex items-center justify-between px-4 py-3 font-semibold rounded-lg text-sm transition-all ${activeTab === 'profile' ? 'bg-gray-50 dark:bg-zinc-800 text-black dark:text-white border-l-4 border-black dark:border-white' : 'text-gray-500 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-zinc-800'}`}
                            >
                                <span className="flex items-center gap-3">
                                    <User className="w-4 h-4" /> Modifier le profil
                                </span>
                                {activeTab !== 'profile' && <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />}
                            </button>
                            <button
                                onClick={() => setActiveTab('security')}
                                className={`w-full flex items-center justify-between px-4 py-3 font-semibold rounded-lg text-sm transition-all group ${activeTab === 'security' ? 'bg-gray-50 dark:bg-zinc-800 text-black dark:text-white border-l-4 border-black dark:border-white' : 'text-gray-500 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-zinc-800'}`}
                            >
                                <span className="flex items-center gap-3">
                                    <Mail className="w-4 h-4" /> Compte & Sécurité
                                </span>
                                {activeTab !== 'security' && <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />}
                            </button>
                            <button
                                onClick={() => setActiveTab('social')}
                                className={`w-full flex items-center justify-between px-4 py-3 font-semibold rounded-lg text-sm transition-all group ${activeTab === 'social' ? 'bg-gray-50 dark:bg-zinc-800 text-black dark:text-white border-l-4 border-black dark:border-white' : 'text-gray-500 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-zinc-800'}`}
                            >
                                <span className="flex items-center gap-3">
                                    <Globe className="w-4 h-4" /> Réseaux Sociaux
                                </span>
                                {activeTab !== 'social' && <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />}
                            </button>
                        </nav>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1">
                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 mb-2">
                                {activeTab === 'profile' && 'Modifier le profil'}
                                {activeTab === 'security' && 'Compte & Sécurité'}
                                {activeTab === 'social' && 'Réseaux Sociaux'}
                            </h2>
                            <p className="text-gray-500 dark:text-zinc-400 text-sm mb-10">
                                {activeTab === 'profile' && 'Gérez vos informations publiques et votre avatar.'}
                                {activeTab === 'security' && 'Informations de connexion à votre compte.'}
                                {activeTab === 'social' && 'Ajoutez vos liens vers d\'autres plateformes.'}
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-8">
                                
                                {activeTab === 'profile' && (
                                    <>

                                {/* Photo Section */}
                                <div className="flex items-center gap-8 pb-8 border-b border-gray-100 dark:border-zinc-800">
                                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current.click()}>
                                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700">
                                            {avatarPreview ? (
                                                <img src={avatarPreview} className="w-full h-full object-cover" alt="Avatar" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-zinc-600">
                                                    <User className="w-12 h-12" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Camera className="text-white w-8 h-8" />
                                        </div>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleAvatarChange}
                                            className="hidden"
                                            accept="image/*"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="font-semibold text-gray-900 dark:text-zinc-100">Photo de profil</h3>
                                        <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed max-w-[200px]">
                                            Nous vous recommandons une image carrée de 200x200px minimum.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current.click()}
                                            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline"
                                        >
                                            Changer la photo
                                        </button>
                                    </div>
                                </div>

                                {/* Form Fields */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Nom Complet</label>
                                        <input
                                            type="text"
                                            value={profile.full_name}
                                            onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                                            className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black dark:focus:ring-white outline-hidden transition-all text-sm"
                                            placeholder="Ex: Jean Gabon"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Nom d&apos;utilisateur</label>
                                        <input
                                            type="text"
                                            value={profile.username}
                                            onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                                            className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black dark:focus:ring-white outline-hidden transition-all text-sm"
                                            placeholder="jealife_pictures"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-900 dark:text-zinc-100 font-sans">Biographie</label>
                                    <textarea
                                        rows={4}
                                        value={profile.bio}
                                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black dark:focus:ring-white outline-hidden transition-all text-sm resize-none"
                                        placeholder="Parlez-nous un peu de vous..."
                                    />
                                    <p className="text-[10px] text-gray-400 dark:text-zinc-500 text-right">{profile.bio.length}/500</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Localisation</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-gray-400 dark:text-zinc-500" />
                                            <input
                                                type="text"
                                                value={profile.location}
                                                onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                                                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black dark:focus:ring-white outline-hidden transition-all text-sm"
                                                placeholder="Libreville, Gabon"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between gap-4 p-4 border border-gray-200 dark:border-zinc-700 rounded-lg">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Disponible à l&apos;embauche</p>
                                        <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                                            Affiche un badge sur votre profil public. Les visiteurs pourront vous
                                            contacter directement via les liens renseignés dans l&apos;onglet Réseaux.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={profile.is_available_for_hire}
                                        onClick={() => setProfile({ ...profile, is_available_for_hire: !profile.is_available_for_hire })}
                                        className={`shrink-0 relative w-11 h-6 rounded-full transition-colors ${
                                            profile.is_available_for_hire ? "bg-black dark:bg-white" : "bg-gray-200 dark:bg-zinc-700"
                                        }`}
                                    >
                                        <span
                                            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full shadow transition-transform ${
                                                profile.is_available_for_hire ? "translate-x-5 bg-white dark:bg-zinc-900" : "translate-x-0 bg-white"
                                            }`}
                                        />
                                    </button>
                                </div>
                                </>
                                )}

                                {activeTab === 'social' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1 flex items-center gap-2">
                                            <Globe className="w-4 h-4 text-gray-400 dark:text-zinc-500" />
                                            Site web
                                        </label>
                                        <input
                                            type="url"
                                            value={profile.website}
                                            onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                                            placeholder="https://votre-site.com"
                                            className="w-full px-4 py-3 border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 rounded-lg focus:ring-1 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white outline-hidden transition-all text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1 flex items-center gap-2">
                                            Instagram
                                        </label>
                                        <div className="flex">
                                            <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 text-sm">
                                                @
                                            </span>
                                            <input
                                                type="text"
                                                value={profile.instagram_username}
                                                onChange={(e) => setProfile({ ...profile, instagram_username: e.target.value })}
                                                placeholder="votre_pseudo"
                                                className="w-full px-4 py-3 border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 rounded-r-lg focus:ring-1 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white outline-hidden transition-all text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1 flex items-center gap-2">
                                            Twitter / X
                                        </label>
                                        <div className="flex">
                                            <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 text-sm">
                                                @
                                            </span>
                                            <input
                                                type="text"
                                                value={profile.twitter_username}
                                                onChange={(e) => setProfile({ ...profile, twitter_username: e.target.value })}
                                                placeholder="votre_pseudo"
                                                className="w-full px-4 py-3 border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 rounded-r-lg focus:ring-1 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white outline-hidden transition-all text-sm"
                                            />
                                        </div>
                                    </div>
                                    </div>
                                )}

                                {activeTab === 'security' && (
                                    <div className="space-y-6">
                                        <div className="p-4 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg">
                                            <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 mb-1">Adresse e-mail</h3>
                                            <p className="text-sm text-gray-600 dark:text-zinc-400 mb-3">L&apos;e-mail utilisé pour vous connecter à votre compte.</p>
                                            <div className="flex items-center gap-3">
                                                <Mail className="w-5 h-5 text-gray-400 dark:text-zinc-500" />
                                                <span className="font-medium text-gray-900 dark:text-zinc-100">{user?.email || "Non disponible"}</span>
                                            </div>
                                        </div>
                                        <div className="p-4 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg">
                                            <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 mb-1">Mot de passe</h3>
                                            <p className="text-sm text-gray-600 dark:text-zinc-400">
                                                Votre mot de passe est géré de manière sécurisée. Si vous devez le réinitialiser, veuillez vous déconnecter et utiliser l&apos;option &quot;Mot de passe oublié&quot; sur la page de connexion.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Status Messages */}
                                {status.message && (
                                    <div className={`p-4 rounded-lg flex items-center gap-3 text-sm ${status.type === 'success' ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-900' : 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900'}`}>
                                        {status.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                                        {status.message}
                                    </div>
                                )}

                                {/* Save Button */}
                                <div className="pt-6">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="w-full md:w-auto px-10 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg font-bold hover:bg-gray-800 dark:hover:bg-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm shadow-md active:scale-95"
                                    >
                                        {saving ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" /> Enregistrement...
                                            </>
                                        ) : "Enregistrer les modifications"}
                                    </button>
                                </div>

                                <div className="pt-10 border-t border-gray-100 dark:border-zinc-800 italic">
                                    <p className="text-xs text-gray-400 dark:text-zinc-500 text-center">
                                        Membre depuis : {new Date(user?.created_at || Date.now()).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                                    </p>
                                </div>
                            </form>
                        </section>
                    </div>

                </div>
            </div>
        </div>
    );
}
