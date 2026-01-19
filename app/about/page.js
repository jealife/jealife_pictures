
"use client";

import Link from "next/link";
import { Camera, Heart, Globe, ArrowRight } from "lucide-react";

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-black selection:text-white">
            {/* Hero Section */}
            <div className="relative h-[70vh] flex items-center justify-center overflow-hidden">
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute z-0 w-full h-full object-cover opacity-60 scale-105"
                    poster="https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=2000"
                >
                    <source src="https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_25fps.mp4" type="video/mp4" />
                </video>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/20 to-white"></div>

                <div className="relative z-10 text-center max-w-4xl px-6 mt-20">
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
                        Photos for everyone.
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-700 font-medium max-w-2xl mx-auto leading-relaxed">
                        La plus grande source d'images du Gabon et d'Afrique Centrale. Libres de droits. Pour tous les créateurs.
                    </p>
                </div>
            </div>

            {/* Mission Section */}
            <div className="max-w-7xl mx-auto px-6 py-24">
                <div className="grid md:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 className="text-3xl md:text-4xl font-bold mb-6">Nous construisons l'internet visuel de l'Afrique.</h2>
                        <div className="prose prose-lg text-gray-600 space-y-6">
                            <p>
                                JEaLiFe Pictures est né d'une idée simple : la beauté de notre continent ne devrait pas être enfermée derrière des murs payants.
                            </p>
                            <p>
                                Nous connectons les photographes talentueux du Gabon avec des créateurs du monde entier — designers, écrivains, artistes et entrepreneurs — qui ont besoin d'images authentiques pour raconter leurs histoires.
                            </p>
                            <p>
                                Ce qui a commencé comme une petite collection de photos de Libreville est devenu une plateforme mondiale alimentée par une communauté généreuse.
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <img src="https://images.unsplash.com/photo-1547471080-165f61765106?q=80&w=800" className="rounded-2xl w-full h-64 object-cover mb-8" alt="Gabon landscape" />
                        <img src="https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?q=80&w=800" className="rounded-2xl w-full h-64 object-cover mt-8" alt="African texture" />
                    </div>
                </div>
            </div>

            {/* Stats Section - Unsplash Style */}
            <div className="bg-black text-white py-32">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
                        <div className="p-6">
                            <div className="flex justify-center mb-6">
                                <Camera className="w-10 h-10 text-gray-400" />
                            </div>
                            <div className="text-5xl font-bold mb-2 tracking-tight">10k+</div>
                            <div className="text-gray-400 uppercase tracking-widest text-sm font-semibold">Photos Gratuites</div>
                        </div>
                        <div className="p-6 border-y md:border-y-0 md:border-x border-gray-800">
                            <div className="flex justify-center mb-6">
                                <Heart className="w-10 h-10 text-gray-400" />
                            </div>
                            <div className="text-5xl font-bold mb-2 tracking-tight">54M</div>
                            <div className="text-gray-400 uppercase tracking-widest text-sm font-semibold">Téléchargements</div>
                        </div>
                        <div className="p-6">
                            <div className="flex justify-center mb-6">
                                <Globe className="w-10 h-10 text-gray-400" />
                            </div>
                            <div className="text-5xl font-bold mb-2 tracking-tight">2500+</div>
                            <div className="text-gray-400 uppercase tracking-widest text-sm font-semibold">Contributeurs</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Team CTA */}
            <div className="max-w-4xl mx-auto px-6 py-32 text-center">
                <h2 className="text-4xl md:text-5xl font-bold mb-6">Rejoignez l'équipe</h2>
                <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
                    Nous sommes une petite équipe avec de grandes ambitions. Aidez-nous à construire le futur de la photographie en Afrique.
                </p>
                <Link href="/team" className="inline-flex items-center gap-2 px-8 py-4 bg-black text-white rounded-full font-bold hover:bg-gray-800 transition-all hover:scale-105">
                    Voir les carrières <ArrowRight className="w-5 h-5" />
                </Link>
            </div>
        </div>
    );
}
