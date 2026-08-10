"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { getUserProfile, getUserStats } from "../lib/database";
import { MapPin, Globe, Mail, Image as ImageIcon, Heart, Layers, BarChart3, Coins, Edit2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function UserProfileLayout({ children }) {
    const params = useParams();
    const pathname = usePathname();
    const { user: currentUser, loading: authLoading } = useAuth();
    // `useParams()` renvoie le segment encodé côté client (`%40handle`, pas
    // `@handle`) — contrairement à `params` côté serveur, déjà décodé.
    const decodedHandle = params.handle ? decodeURIComponent(params.handle) : "";
    const username = decodedHandle.startsWith("@") ? decodedHandle.slice(1) : null;

    const [profileUser, setProfileUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showConnect, setShowConnect] = useState(false);

    useEffect(() => {
        const fetchProfileAndStats = async () => {
            if (!username) return;
            setLoading(true);
            try {
                // 1. Get basic profile (case-insensitive)
                const profileData = await getUserProfile(username);

                if (profileData) {
                    // 2. Get live stats (counts)
                    const stats = await getUserStats(profileData.id);
                    setProfileUser({ ...profileData, ...stats });
                } else {
                    setProfileUser(null);
                }
            } catch (err) {
                console.error("Error in UserProfileLayout:", err);
                setProfileUser(null);
            } finally {
                setLoading(false);
            }
        };
        fetchProfileAndStats();
    }, [username]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black dark:border-white"></div>
            </div>
        );
    }

    if (!profileUser) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 mb-2">Profil introuvable</h2>
                <p className="text-gray-500 dark:text-zinc-400">L&apos;utilisateur @{username} n&apos;existe pas ou a été supprimé.</p>
                <Link href="/" className="mt-6 text-blue-600 dark:text-blue-400 hover:underline">Retour à l&apos;accueil</Link>
            </div>
        );
    }

    // Attend que l'état d'authentification soit résolu : sinon, sur son
    // propre profil, un premier rendu avec `currentUser` encore `null`
    // affichait brièvement les boutons publics ("Suivre") réservés aux
    // visiteurs avant de basculer sur les actions propriétaire.
    const isOwnProfile = !authLoading && currentUser?.id === profileUser?.id;

    // Tab logic with privacy: only public tabs (Photos, Collections) if not authenticated
    const publicTabs = [
        { id: '', label: 'Photos', icon: ImageIcon, count: profileUser.total_photos || 0, path: `/@${username}` },
        { id: 'collections', label: 'Collections', icon: Layers, count: profileUser.total_collections || 0, path: `/@${username}/collections` },
    ];

    const privateTabs = [
        // `total_likes` était ambigu : il comptait les j'aime *donnés* par
        // l'utilisateur, alors qu'affiché sur un profil public il se lisait
        // comme les j'aime reçus. Les deux sont désormais distincts.
        { id: 'likes', label: 'J\'aime', icon: Heart, count: profileUser.total_likes_given || 0, path: `/@${username}/likes` },
        { id: 'stats', label: 'Statistiques', icon: BarChart3, count: null, path: `/@${username}/stats` },
        { id: 'gains', label: 'Gains', icon: Coins, count: null, path: `/@${username}/gains` },
    ];

    const tabs = isOwnProfile ? [...publicTabs, ...privateTabs] : publicTabs;

    // Determine active tab:
    // - /@foo -> active ''
    // - /@foo/stats -> active 'stats'
    const lastSegment = pathname.split('/').pop();
    const currentTabId = lastSegment === `@${username}` ? '' : lastSegment;

    return (
        <div className="min-h-screen bg-white dark:bg-zinc-950">

            {/* 1. Header Area - Unsplash Style */}
            <div className="max-w-[1320px] mx-auto px-4 sm:px-6 pt-12 pb-8 md:pt-20 md:pb-16">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-12">

                    {/* Avatar */}
                    <div className="shrink-0 mx-auto md:mx-0">
                        <div className="w-32 h-32 md:w-[150px] md:h-[150px] rounded-full overflow-hidden border border-gray-100 dark:border-zinc-800 shadow-sm">
                            <img
                                src={profileUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileUser.username}`}
                                alt={profileUser.full_name || profileUser.username}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 text-center md:text-left space-y-4 w-full">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-zinc-100 tracking-tight">{profileUser.full_name || profileUser.username}</h1>
                                <div className="mt-2 md:mt-3 max-w-2xl">
                                    <p className="text-gray-600 dark:text-zinc-400 text-[15px] leading-relaxed">
                                        {profileUser.bio || `Téléchargez de superbes photos haute qualité sélectionnées par ${profileUser.full_name || profileUser.username}.`}
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-3 text-sm text-gray-500 dark:text-zinc-400">
                                    {/* Ne concerne que les contributeurs qui l'ont explicitement activé
                                        dans leurs réglages — jamais le compte JEaLiFe Stock lui-même, qui
                                        est le compte de l'entreprise, pas un photographe indépendant. */}
                                    {profileUser.is_available_for_hire && profileUser.role !== 'admin' && (
                                        <button
                                            type="button"
                                            onClick={(e) => { e.preventDefault(); setShowConnect(!showConnect); }}
                                            className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                                        >
                                            <CheckBadgeIcon className="w-4 h-4" /> Disponible à l&apos;embauche
                                        </button>
                                    )}
                                    {profileUser.location && (
                                        // Cliquable seulement quand un pays est rattaché : la
                                        // localisation reste du texte libre (ex. « Parc de la
                                        // Lopé »), rien ne garantit qu'elle corresponde à un pays
                                        // du site tant que ce lien structuré n'existe pas.
                                        profileUser.countries ? (
                                            <Link
                                                href={`/pays/${profileUser.countries.slug}`}
                                                className="flex items-center gap-1.5 hover:text-black dark:hover:text-white transition-colors"
                                                title={`Voir les photos du ${profileUser.countries.name_fr}`}
                                            >
                                                <MapPin className="w-4 h-4 text-gray-400 dark:text-zinc-500" /> {profileUser.location}
                                            </Link>
                                        ) : (
                                            <span className="flex items-center gap-1.5">
                                                <MapPin className="w-4 h-4 text-gray-400 dark:text-zinc-500" /> {profileUser.location}
                                            </span>
                                        )
                                    )}
                                    <div className="relative">
                                        <button
                                            onClick={(e) => { e.preventDefault(); setShowConnect(!showConnect); }}
                                            className="flex items-center gap-1.5 hover:text-black dark:hover:text-white transition-colors"
                                        >
                                            <Mail className="w-4 h-4 text-gray-400 dark:text-zinc-500" /> Connectez-vous avec {(profileUser.full_name || profileUser.username || "cet utilisateur").split(' ')[0]}
                                        </button>

                                        {showConnect && (
                                            <>
                                                <div className="fixed inset-0 z-40" onClick={() => setShowConnect(false)} />
                                                <div className="absolute left-0 top-full mt-2 w-56 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-xl rounded-md overflow-hidden z-50 py-1 text-left">
                                                    <div className="px-4 py-2 text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider bg-gray-50/50 dark:bg-zinc-800/50">
                                                        Connectez-vous avec {(profileUser.full_name || profileUser.username).split(' ')[0]}
                                                    </div>
                                                    {profileUser.email && (
                                                        <a href={`mailto:${profileUser.email}`} className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                                                            <Mail className="w-4 h-4 text-gray-400 dark:text-zinc-500" /> Envoyer un email
                                                        </a>
                                                    )}
                                                    {profileUser.website && (
                                                        <a href={profileUser.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                                                            <Globe className="w-4 h-4 text-gray-400 dark:text-zinc-500" /> Site web
                                                        </a>
                                                    )}
                                                    {profileUser.instagram_username && (
                                                        <a href={`https://instagram.com/${profileUser.instagram_username}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                                                            <ImageIcon className="w-4 h-4 text-gray-400 dark:text-zinc-500" /> Instagram
                                                        </a>
                                                    )}
                                                    {profileUser.facebook_username && (
                                                        <a href={`https://facebook.com/${profileUser.facebook_username}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                                                            <Mail className="w-4 h-4 text-gray-400 dark:text-zinc-500" /> Facebook
                                                        </a>
                                                    )}
                                                    {!profileUser.email && !profileUser.website && !profileUser.instagram_username && !profileUser.facebook_username && (
                                                        <div className="px-4 py-3 text-[13px] text-gray-500 dark:text-zinc-400 italic">
                                                            Aucun lien de contact renseigné.
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Actions Buttons */}
                            <div className="flex items-center justify-center md:justify-start gap-3 shrink-0">
                                {isOwnProfile ? (
                                    <>
                                        <Link
                                            href="/settings"
                                            className="px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-md text-gray-500 dark:text-zinc-400 font-medium hover:text-black dark:hover:text-white hover:border-gray-400 dark:hover:border-zinc-500 transition-colors text-sm flex items-center gap-2"
                                        >
                                            <Edit2 className="w-4 h-4" /> Modifier le profil
                                        </Link>
                                    </>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Navigation Tabs */}
            <div className="sticky top-16 z-30 bg-white dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800">
                <div className="max-w-[1320px] mx-auto px-4 sm:px-6">
                    <div className="flex gap-8 overflow-x-auto scrollbar-hide">
                        {tabs.map(tab => {
                            const isActive = currentTabId === tab.id;
                            return (
                                <Link
                                    key={tab.id}
                                    href={tab.path}
                                    className={`flex items-center gap-2 py-4 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${isActive ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-gray-500 dark:text-zinc-400 hover:text-black dark:hover:text-white'}`}
                                >
                                    {tab.icon && <tab.icon className={`w-4 h-4 ${isActive ? 'text-black dark:text-white' : 'text-gray-400 dark:text-zinc-500 group-hover:text-black dark:group-hover:text-white'}`} />}
                                    {tab.label}
                                    {tab.count !== null && (
                                        <span className="text-gray-400 dark:text-zinc-500 ml-1">{tab.count}</span>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* 3. Page Content */}
            <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-8 md:py-12">
                {children}
            </div>
        </div>
    );
}

// Simple Icon component helper
function CheckBadgeIcon({ className }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
            <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
        </svg>
    );
}
