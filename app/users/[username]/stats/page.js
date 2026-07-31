"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getUserProfile, getUserStats } from "../../../lib/database";
import { useAuth } from "../../../contexts/AuthContext";
import { BarChart3, Download, Info, TrendingUp, Globe } from "lucide-react";

export default function UserStatsPage() {
    const { username } = useParams();
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const [isOwner, setIsOwner] = useState(false);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total_views: 0, total_downloads: 0 });

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
                        <h3 className="font-bold text-gray-900">Les plus vues sur</h3>
                        <Info className="w-4 h-4 text-gray-400" />
                    </div>

                    <div className="space-y-2">
                        {[
                            { name: 'Unsplash', icon: 'https://images.unsplash.com/apple-touch-icon.png', photos: ['https://images.unsplash.com/photo-1547471080-165f61765106?w=100', 'https://images.unsplash.com/photo-1548695602-0e447b2c556b?w=100'] },
                            { name: 'Notion', icon: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png', photos: ['https://images.unsplash.com/photo-1533167649158-6d508895b680?w=100'] },
                            { name: 'Figma', icon: 'https://cdn.sanity.io/images/599r6htc/localized/46a76c802176eb17b06e1240bd0f2aa77f631db6-1024x1024.png?w=200&h=200&fit=crop', photos: [] }
                        ].map((platform, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <img src={platform.icon} className="w-6 h-6 rounded bg-white shadow-xs p-0.5 object-contain" />
                                    <span className="font-medium text-sm text-gray-900">{platform.name}</span>
                                </div>
                                <div className="flex -space-x-2">
                                    {platform.photos.map((url, j) => (
                                        <img key={j} src={url} className="w-10 h-10 rounded-md border-2 border-white object-cover" />
                                    ))}
                                    {platform.photos.length === 0 && <span className="text-xs text-gray-400 italic">--</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Downloads */}
                <div>
                    <div className="flex items-center gap-2 mb-6">
                        <h3 className="font-bold text-gray-900">Les plus téléchargées sur</h3>
                        <Info className="w-4 h-4 text-gray-400" />
                    </div>

                    <div className="space-y-2">
                        {[
                            { name: 'Unsplash', icon: 'https://images.unsplash.com/apple-touch-icon.png', photos: ['https://images.unsplash.com/photo-1548695602-0e447b2c556b?w=100', 'https://images.unsplash.com/photo-1547471080-165f61765106?w=100'] },
                            { name: 'Notion', icon: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png', photos: ['https://images.unsplash.com/photo-1502920514313-52581002a659?w=100'] },
                            { name: 'Squarespace', icon: 'https://static-00.iconduck.com/assets.00/squarespace-icon-2048x2048-0br388v1.png', photos: ['https://images.unsplash.com/photo-1628173516164-3e911470438d?w=100'] }
                        ].map((platform, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <img src={platform.icon} className="w-6 h-6 rounded bg-white shadow-xs p-0.5 object-contain" />
                                    <span className="font-medium text-sm text-gray-900">{platform.name}</span>
                                </div>
                                <div className="flex -space-x-2">
                                    {platform.photos.map((url, j) => (
                                        <img key={j} src={url} className="w-10 h-10 rounded-md border-2 border-white object-cover" />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
