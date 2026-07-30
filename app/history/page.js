
"use client";

import { Calendar, Flag, Globe, Camera } from "lucide-react";

export default function HistoryPage() {
    const milestones = [
        {
            year: "2026",
            title: "Voices of Africa",
            description: "Ouverture de la banque à de nouveaux pays et à de nouvelles thématiques.",
            image: "https://images.unsplash.com/photo-1523805009345-7448845a9e53?q=80&w=800",
            icon: <Globe className="w-6 h-6 text-white" />
        },
        {
            year: "2025",
            title: "La Barre des 1M",
            description: "La communauté franchit ses premiers paliers de téléchargements.",
            image: "https://images.unsplash.com/photo-1496568816309-51d7c20e3b21?q=80&w=800",
            icon: <Flag className="w-6 h-6 text-white" />
        },
        {
            year: "2024",
            title: "Première Ligne de Code",
            description: "Lancement de la version Alpha, autour d'une vision simple : partager de belles images, librement.",
            image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=800",
            icon: <Calendar className="w-6 h-6 text-white" />
        },
        {
            year: "2023",
            title: "L'Étincelle",
            description: "Le concept naît lors d'une expédition photo dans le parc de la Lopé. Le besoin d'une banque d'images centralisée devient évident.",
            image: "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?q=80&w=800",
            icon: <Camera className="w-6 h-6 text-white" />
        }
    ];

    return (
        <div className="min-h-screen bg-white text-gray-900 font-sans">

            {/* Hero Section */}
            <div className="max-w-4xl mx-auto px-6 pt-32 pb-20 text-center">
                <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8">Notre Parcours.</h1>
                <p className="text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
                    D&apos;une simple idée à une plateforme ouverte à tous les créateurs. Voici comment nous en sommes arrivés là.
                </p>
            </div>

            {/* Timeline Section */}
            <div className="max-w-5xl mx-auto px-6 pb-32">
                <div className="relative">
                    {/* Center Line (Hidden on mobile, visible on desktop) */}
                    <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-gray-200 transform md:-translate-x-1/2"></div>

                    <div className="space-y-24">
                        {milestones.map((milestone, index) => (
                            <div key={milestone.year} className={`relative flex flex-col md:flex-row items-center ${index % 2 === 0 ? 'md:flex-row-reverse' : ''}`}>

                                {/* Dot on Line */}
                                <div className="absolute left-8 md:left-1/2 w-12 h-12 bg-black rounded-full border-4 border-white transform -translate-x-1/2 flex items-center justify-center z-10 shadow-lg">
                                    {milestone.icon}
                                </div>

                                {/* Content Half */}
                                <div className="w-full md:w-1/2 pl-24 md:pl-0 md:px-16">
                                    <div className="mb-4">
                                        <span className="inline-block px-3 py-1 bg-gray-100 rounded-full text-sm font-bold text-gray-900 mb-2">
                                            {milestone.year}
                                        </span>
                                        <h3 className="text-3xl font-bold mb-3">{milestone.title}</h3>
                                        <p className="text-gray-600 leading-relaxed text-lg">
                                            {milestone.description}
                                        </p>
                                    </div>
                                </div>

                                {/* Image Half */}
                                <div className="w-full md:w-1/2 pl-24 md:pl-0 md:px-16 mt-8 md:mt-0">
                                    <div className="relative group overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500">
                                        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors z-10"></div>
                                        <img
                                            src={milestone.image}
                                            alt={milestone.title}
                                            className="w-full aspect-[4/3] object-cover transform group-hover:scale-105 transition-transform duration-700"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Future Node */}
                    <div className="relative flex justify-center mt-24">
                        <div className="relative z-10 bg-white px-4">
                            <span className="inline-block px-6 py-3 border-2 border-dashed border-gray-300 rounded-full text-gray-400 font-bold tracking-widest uppercase">
                                La suite s&apos;écrit avec vous
                            </span>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
