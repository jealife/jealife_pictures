"use client";

import Link from "next/link";
import { Camera, PenTool, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { getPlatformStats } from "../lib/database";
import { formatCount } from "../lib/media";

/**
 * Les trois types de contenu, avec leurs volumes réels.
 *
 * Cette section annonçait « 5.2M+ photos », « 800K+ illustrations » et
 * « 100K+ vidéos » sur une base qui n'en contenait aucune. Les compteurs
 * viennent maintenant de la vue `platform_stats`, et une catégorie vide le dit
 * franchement plutôt que d'inventer un chiffre.
 */
export default function CategorySection() {
    const [stats, setStats] = useState(null);

    useEffect(() => { getPlatformStats().then(setStats); }, []);

    const categories = [
        {
            title: "Photos",
            count: stats?.total_photos,
            icon: Camera,
            href: "/",
            color: "bg-emerald-50 text-emerald-700",
        },
        {
            title: "Illustrations",
            count: stats?.total_illustrations,
            icon: PenTool,
            href: "/illustrations",
            color: "bg-purple-50 text-purple-600",
        },
        {
            title: "Vidéos",
            count: stats?.total_videos,
            icon: Video,
            href: "/videos",
            color: "bg-red-50 text-red-600",
        },
    ];

    const label = (count) => {
        if (stats === null) return "Chargement…";
        if (!count) return "Rien encore, soyez le premier";
        return `${formatCount(count)} disponible${count > 1 ? "s" : ""}`;
    };

    return (
        <section className="w-full max-w-[1600px] mx-auto px-4 py-16">
            <h2 className="text-2xl font-bold mb-8 text-gray-900">
                Des ressources libres pour vos projets
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {categories.map((category) => (
                    <Link
                        key={category.title}
                        href={category.href}
                        className="group relative overflow-hidden rounded-2xl h-28 flex items-center p-6 transition-all hover:shadow-lg hover:border-gray-300 border border-gray-100 bg-white"
                    >
                        <div className="flex flex-col justify-center h-full">
                            <div className="flex items-center gap-3 mb-1">
                                <span className={`p-2 rounded-lg ${category.color} group-hover:scale-110 transition-transform`}>
                                    <category.icon className="w-5 h-5" />
                                </span>
                                <h3 className="font-bold text-lg text-gray-900">{category.title}</h3>
                            </div>
                            <p className="text-xs text-gray-500 font-medium pl-1">
                                {label(category.count)}
                            </p>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
}
