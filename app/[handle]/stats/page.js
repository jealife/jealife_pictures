"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getUserProfile, getUserStats } from "../../lib/database";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import Link from "next/link";
import { BarChart3, Download, Info, TrendingUp, Globe } from "lucide-react";

export default function UserStatsPage() {
    const { handle } = useParams();
    const decodedHandle = handle ? decodeURIComponent(handle) : "";
    const username = decodedHandle.startsWith("@") ? decodedHandle.slice(1) : null;
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const [isOwner, setIsOwner] = useState(false);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total_views: 0, total_downloads: 0 });
    const [topViewed, setTopViewed] = useState([]);
    const [topDownloaded, setTopDownloaded] = useState([]);

    useEffect(() => {
        const checkOwnership = async () => {
            if (!username || !currentUser) {
                setIsOwner(false);
                setLoading(false);
                return;
            }
            try {
                const profile = await getUserProfile(username);
                if (profile && profile.id === currentUser.id) {
                    setIsOwner(true);
                    const userStats = await getUserStats(profile.id);
                    if (userStats) setStats(userStats);

                    const { data: vData } = await supabase
                        .from('media')
                        .select('id, url, thumbnail_url, title, views_count')
                        .eq('user_id', profile.id)
                        .eq('status', 'published')
                        .order('views_count', { ascending: false })
                        .limit(3);
                    if (vData) setTopViewed(vData);

                    const { data: dData } = await supabase
                        .from('media')
                        .select('id, url, thumbnail_url, title, downloads_count')
                        .eq('user_id', profile.id)
                        .eq('status', 'published')
                        .order('downloads_count', { ascending: false })
                        .limit(3);
                    if (dData) setTopDownloaded(dData);
                }
            } catch (err) {
                console.error(err);
            }
            setLoading(false);
        };
        checkOwnership();
    }, [username, currentUser]);

    // Mock Data for the graph
    const dataPoints = [30, 45, 35, 50, 40, 60, 55, 70, 65, 80, 75, 90, 85, 100, 95, 85, 70, 75, 80, 60, 50, 45, 40, 35, 30, 25, 35, 40, 45, 50];

    // Simple SVG Path generator for the line chart
    const maxVal = Math.max(...dataPoints);
    const minVal = Math.min(...dataPoints);
    const range = maxVal - minVal;

    // Normalize points to viewbox 0-100 height
    const points = dataPoints.map((val, i) => {
        const x = (i / (dataPoints.length - 1)) * 1000; // Width 1000
        const y = 200 - ((val - minVal) / range) * 150; // Height 200, padding
        return `${x},${y}`;
    }).join(" ");

    // Path command
    const pathD = `M ${points}`;
    const fillPathD = `M ${points} L 1000,250 L 0,250 Z`; // Close the path at bottom

    if (loading) return <div className="py-20 text-center animate-pulse text-gray-400">Vérification...</div>;

    if (!isOwner) {
        return (
            <div className="py-[100px] text-center flex flex-col items-center justify-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                    <BarChart3 className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Accès restreint</h3>
                <p className="text-gray-500 max-w-sm">Les statistiques sont privées. Vous ne pouvez voir que les vôtres.</p>
            </div>
        );
    }

    return (
        <div className="max-w-[1320px] mx-auto">
            {/* Title */}
            <div className="mb-10 flex items-center gap-2">
                <span className="font-bold text-gray-900">Aperçu</span>
                <span className="text-gray-400 text-sm">30 derniers jours</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Chart 1: Vues */}
                <div className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow bg-white">
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900">Vues</span>
                        </div>
                        <div className="flex items-baseline gap-3">
                            <h2 className="text-4xl font-bold text-gray-900">{stats.total_views?.toLocaleString('fr-FR') || 0}</h2>
                        </div>
                        <p className="text-sm text-gray-500 mt-2 flex items-center gap-1">
                            Vous faites partie des 10 % de contributeurs les plus importants <span className="text-yellow-500">⭐</span>
                        </p>
                    </div>

                    {/* SVG Chart */}
                    <div className="w-full h-[150px] relative overflow-hidden">
                        <svg viewBox="0 0 1000 250" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                            <path d={pathD} fill="none" stroke="#22c55e" strokeWidth="4" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                            <path d={fillPathD} fill="url(#gradientGreen)" className="opacity-10" />
                            <defs>
                                <linearGradient id="gradientGreen" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor="#22c55e" />
                                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                </div>

                {/* Chart 2: Téléchargements */}
                <div className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow bg-white">
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900">Téléchargements</span>
                        </div>
                        <div className="flex items-baseline gap-3">
                            <h2 className="text-4xl font-bold text-gray-900">{stats.total_downloads?.toLocaleString('fr-FR') || 0}</h2>
                        </div>
                        <p className="text-sm text-gray-500 mt-2 flex items-center gap-1">
                            Vous faites partie des 10 % de contributeurs les plus importants <span className="text-blue-500">🌍</span>
                        </p>
                    </div>

                    {/* SVG Chart */}
                    <div className="w-full h-[150px] relative overflow-hidden">
                        <svg viewBox="0 0 1000 250" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                            <path d={pathD} fill="none" stroke="#22c55e" strokeWidth="4" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                            <path d={fillPathD} fill="url(#gradientGreen)" className="opacity-10" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Top Lists */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">

                {/* Top Views */}
                <div>
                    <div className="flex items-center gap-2 mb-6">
                        <h3 className="font-bold text-gray-900">Vos photos les plus vues</h3>
                        <Info className="w-4 h-4 text-gray-400" />
                    </div>

                    <div className="space-y-3">
                        {topViewed.map((photo, i) => (
                            <Link key={photo.id} href={`/photos/${photo.id}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <div className="flex items-center gap-4 min-w-0">
                                    <span className="font-bold text-gray-400 w-4 text-center">{i + 1}</span>
                                    <img src={photo.thumbnail_url || photo.url} alt={photo.title || "Photo"} className="w-12 h-12 rounded object-cover" />
                                    <span className="font-medium text-sm text-gray-900 truncate max-w-[200px]">{photo.title || `Photo #${photo.id}`}</span>
                                </div>
                                <div className="font-semibold text-gray-900 shrink-0">
                                    {photo.views_count?.toLocaleString('fr-FR') || 0} vues
                                </div>
                            </Link>
                        ))}
                        {topViewed.length === 0 && (
                            <div className="p-4 text-center text-sm text-gray-500 bg-gray-50 rounded-lg">
                                Vous n&apos;avez publié aucune photo.
                            </div>
                        )}
                    </div>
                </div>

                {/* Top Downloads */}
                <div>
                    <div className="flex items-center gap-2 mb-6">
                        <h3 className="font-bold text-gray-900">Vos photos les plus téléchargées</h3>
                        <Info className="w-4 h-4 text-gray-400" />
                    </div>

                    <div className="space-y-3">
                        {topDownloaded.map((photo, i) => (
                            <Link key={photo.id} href={`/photos/${photo.id}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <div className="flex items-center gap-4 min-w-0">
                                    <span className="font-bold text-gray-400 w-4 text-center">{i + 1}</span>
                                    <img src={photo.thumbnail_url || photo.url} alt={photo.title || "Photo"} className="w-12 h-12 rounded object-cover" />
                                    <span className="font-medium text-sm text-gray-900 truncate max-w-[200px]">{photo.title || `Photo #${photo.id}`}</span>
                                </div>
                                <div className="font-semibold text-gray-900 shrink-0">
                                    {photo.downloads_count?.toLocaleString('fr-FR') || 0} tél.
                                </div>
                            </Link>
                        ))}
                        {topDownloaded.length === 0 && (
                            <div className="p-4 text-center text-sm text-gray-500 bg-gray-50 rounded-lg">
                                Vous n&apos;avez publié aucune photo.
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
