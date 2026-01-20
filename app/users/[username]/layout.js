"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { getUserProfile, getUserStats } from "../../lib/database";
import { MapPin, Globe, Mail, MoreHorizontal, UserPlus, Image as ImageIcon, Heart, Layers, BarChart3, Edit2 } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

export default function UserProfileLayout({ children }) {
    const params = useParams();
    const pathname = usePathname();
    const { user: currentUser } = useAuth();
    const username = params.username;

    const [profileUser, setProfileUser] = useState(null);
    const [loading, setLoading] = useState(true);

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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
            </div>
        );
    }

    if (!profileUser) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Profil introuvable</h2>
                <p className="text-gray-500">L'utilisateur @{username} n'existe pas ou a été supprimé.</p>
                <Link href="/" className="mt-6 text-blue-600 hover:underline">Retour à l'accueil</Link>
            </div>
        );
    }

    const isOwnProfile = currentUser?.id === profileUser?.id;

    // Tab logic with privacy: only public tabs (Photos, Collections) if not authenticated
    const publicTabs = [
        { id: '', label: 'Photos', icon: ImageIcon, count: profileUser.total_photos || 0, path: `/users/${username}` },
        { id: 'collections', label: 'Collections', icon: Layers, count: profileUser.total_collections || 0, path: `/users/${username}/collections` },
    ];

    const privateTabs = [
        { id: 'likes', label: 'J\'aime', icon: Heart, count: profileUser.total_likes || 0, path: `/users/${username}/likes` },
        { id: 'stats', label: 'Statistiques', icon: BarChart3, count: null, path: `/users/${username}/stats` },
    ];

    const tabs = currentUser ? [...publicTabs, ...privateTabs] : publicTabs;

    // Determine active tab
    // Exact match for root, prefix match for others?
    // Actually simpler: 
    // - /users/foo -> active ''
    // - /users/foo/stats -> active 'stats'
    const currentTabId = pathname.split('/').pop() === username ? '' : pathname.split('/').pop();

    return (
        <div className="min-h-screen bg-white">

            {/* 1. Header Area - Unsplash Style */}
            <div className="max-w-[1320px] mx-auto px-4 sm:px-6 pt-12 pb-8 md:pt-20 md:pb-16">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-12">

                    {/* Avatar */}
                    <div className="shrink-0 mx-auto md:mx-0">
                        <div className="w-32 h-32 md:w-[150px] md:h-[150px] rounded-full overflow-hidden border border-gray-100 shadow-sm">
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
                                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">{profileUser.full_name || profileUser.username}</h1>
                                <div className="mt-2 md:mt-3 max-w-2xl">
                                    <p className="text-gray-600 text-[15px] leading-relaxed">
                                        {profileUser.bio || `Téléchargez de superbes photos haute qualité sélectionnées par ${profileUser.full_name || profileUser.username}.`}
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-3 text-sm text-gray-500">
                                    {profileUser.status !== 'unavailable' && (
                                        <span className="flex items-center gap-1.5 text-blue-600 font-medium">
                                            <CheckBadgeIcon className="w-4 h-4" /> Disponible à l'embauche
                                        </span>
                                    )}
                                    {profileUser.location && (
                                        <span className="flex items-center gap-1.5">
                                            <MapPin className="w-4 h-4 text-gray-400" /> {profileUser.location}
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1.5 hover:text-black cursor-pointer transition-colors">
                                        <Mail className="w-4 h-4 text-gray-400" /> Connectez-vous avec {(profileUser.full_name || profileUser.username || "cet utilisateur").split(' ')[0]}
                                    </span>
                                </div>
                            </div>

                            {/* Actions Buttons */}
                            <div className="flex items-center justify-center md:justify-start gap-3 shrink-0">
                                {isOwnProfile ? (
                                    <>
                                        <Link
                                            href="/settings"
                                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-500 font-medium hover:text-black hover:border-gray-400 transition-colors text-sm flex items-center gap-2"
                                        >
                                            <Edit2 className="w-4 h-4" /> Modifier le profil
                                        </Link>
                                    </>
                                ) : (
                                    <>
                                        <button className="h-10 px-6 border border-gray-300 text-gray-500 rounded-md font-medium hover:border-gray-900 hover:text-gray-900 transition-all text-sm">
                                            <MoreHorizontal className="w-5 h-5" />
                                        </button>
                                        <button className="h-10 px-6 bg-[#007fff] text-white rounded-md font-medium hover:bg-[#006aff] transition-colors text-sm shadow-sm">
                                            Suivre
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Navigation Tabs */}
            <div className="sticky top-16 z-30 bg-white border-b border-gray-200">
                <div className="max-w-[1320px] mx-auto px-4 sm:px-6">
                    <div className="flex gap-8 overflow-x-auto scrollbar-hide">
                        {tabs.map(tab => {
                            const isActive = currentTabId === tab.id;
                            return (
                                <Link
                                    key={tab.id}
                                    href={tab.path}
                                    className={`flex items-center gap-2 py-4 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${isActive ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-black'}`}
                                >
                                    {tab.icon && <tab.icon className={`w-4 h-4 ${isActive ? 'text-black' : 'text-gray-400 group-hover:text-black'}`} />}
                                    {tab.label}
                                    {tab.count !== null && (
                                        <span className="text-gray-400 ml-1">{tab.count}</span>
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
