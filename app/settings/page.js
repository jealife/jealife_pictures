"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { upsertProfile } from "../lib/auth";
import { getUserProfile } from "../lib/database";
import { Camera, MapPin, Globe, User, Mail, FileText, CheckCircle2, AlertCircle, Loader2, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
    const router = useRouter();
    const { user, loading: authLoading, refreshProfile } = useAuth();

    // States
    const [profile, setProfile] = useState({
        full_name: "",
        username: "",
        bio: "",
        location: "",
        website: "",
        instagram_username: "",
        twitter_username: "",
        avatar_url: ""
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
                    avatar_url: data.avatar_url || ""
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
                avatar_url: finalAvatarUrl
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
            setStatus({ type: "error", message: `Erreur: ${error.message || "Une erreur est survenue"}` });
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-gray-200 animate-spin" />
                    <p className="text-gray-400 text-sm font-medium">Chargement de vos paramètres...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-[1000px] mx-auto px-4 py-12 md:py-20">

                <div className="flex flex-col md:flex-row gap-12">

                    {/* Sidebar Navigation */}
                    <div className="w-full md:w-64 shrink-0">
                        <h1 className="text-3xl font-bold text-gray-900 mb-8">Paramètres</h1>
                        <nav className="space-y-1">
                            <button className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 text-black font-semibold rounded-lg text-sm border-l-4 border-black transition-all">
                                <span className="flex items-center gap-3">
                                    <User className="w-4 h-4" /> Modifier le profil
                                </span>
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                            </button>
                            <button className="w-full flex items-center justify-between px-4 py-3 text-gray-500 hover:text-black hover:bg-gray-50 rounded-lg text-sm transition-all group">
                                <span className="flex items-center gap-3">
                                    <Mail className="w-4 h-4" /> Compte & Sécurité
                                </span>
                                <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                            <button className="w-full flex items-center justify-between px-4 py-3 text-gray-500 hover:text-black hover:bg-gray-50 rounded-lg text-sm transition-all group">
                                <span className="flex items-center gap-3">
                                    <Globe className="w-4 h-4" /> Réseaux Sociaux
                                </span>
                                <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                        </nav>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1">
                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Modifier le profil</h2>
                            <p className="text-gray-500 text-sm mb-10">Gérez vos informations publiques et votre avatar.</p>

                            <form onSubmit={handleSubmit} className="space-y-8">

                                {/* Photo Section */}
                                <div className="flex items-center gap-8 pb-8 border-b border-gray-100">
                                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current.click()}>
                                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
                                            {avatarPreview ? (
                                                <img src={avatarPreview} className="w-full h-full object-cover" alt="Avatar" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-300">
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
                                        <h3 className="font-semibold text-gray-900">Photo de profil</h3>
                                        <p className="text-xs text-gray-500 leading-relaxed max-w-[200px]">
                                            Nous vous recommandons une image carrée de 200x200px minimum.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current.click()}
                                            className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline"
                                        >
                                            Changer la photo
                                        </button>
                                    </div>
                                </div>

                                {/* Form Fields */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-900">Nom Complet</label>
                                        <input
                                            type="text"
                                            value={profile.full_name}
                                            onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                                            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-hidden transition-all text-sm"
                                            placeholder="Ex: Jean Gabon"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-900">Nom d&apos;utilisateur</label>
                                        <input
                                            type="text"
                                            value={profile.username}
                                            onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                                            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-hidden transition-all text-sm"
                                            placeholder="jealife_pictures"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-900 font-sans">Biographie</label>
                                    <textarea
                                        rows={4}
                                        value={profile.bio}
                                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-hidden transition-all text-sm resize-none"
                                        placeholder="Parlez-nous un peu de vous..."
                                    />
                                    <p className="text-[10px] text-gray-400 text-right">{profile.bio.length}/500</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-900">Localisation</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                                            <input
                                                type="text"
                                                value={profile.location}
                                                onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                                                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-hidden transition-all text-sm"
                                                placeholder="Libreville, Gabon"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                                            <Globe className="w-4 h-4 text-gray-400" />
                                            Site web
                                        </label>
                                        <input
                                            type="url"
                                            value={profile.website}
                                            onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                                            placeholder="https://votre-site.com"
                                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-black focus:border-black outline-hidden transition-all text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                                            Instagram
                                        </label>
                                        <div className="flex">
                                            <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-200 bg-gray-50 text-gray-500 text-sm">
                                                @
                                            </span>
                                            <input
                                                type="text"
                                                value={profile.instagram_username}
                                                onChange={(e) => setProfile({ ...profile, instagram_username: e.target.value })}
                                                placeholder="votre_pseudo"
                                                className="w-full px-4 py-3 border border-gray-200 rounded-r-lg focus:ring-1 focus:ring-black focus:border-black outline-hidden transition-all text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                                            Twitter / X
                                        </label>
                                        <div className="flex">
                                            <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-200 bg-gray-50 text-gray-500 text-sm">
                                                @
                                            </span>
                                            <input
                                                type="text"
                                                value={profile.twitter_username}
                                                onChange={(e) => setProfile({ ...profile, twitter_username: e.target.value })}
                                                placeholder="votre_pseudo"
                                                className="w-full px-4 py-3 border border-gray-200 rounded-r-lg focus:ring-1 focus:ring-black focus:border-black outline-hidden transition-all text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Status Messages */}
                                {status.message && (
                                    <div className={`p-4 rounded-lg flex items-center gap-3 text-sm ${status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                        {status.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                                        {status.message}
                                    </div>
                                )}

                                {/* Save Button */}
                                <div className="pt-6">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="w-full md:w-auto px-10 py-3 bg-black text-white rounded-lg font-bold hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm shadow-md active:scale-95"
                                    >
                                        {saving ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" /> Enregistrement...
                                            </>
                                        ) : "Enregistrer les modifications"}
                                    </button>
                                </div>

                                <div className="pt-10 border-t border-gray-100 italic">
                                    <p className="text-xs text-gray-400 text-center">
                                        Membre depuis : {new Date(user?.createdAt || Date.now()).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
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
