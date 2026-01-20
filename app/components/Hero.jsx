
"use client";

import { Search, TrendingUp } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { AUTH_IMAGES } from "../lib/auth-images";

export default function Hero() {
    const router = useRouter();
    const [backgroundImage, setBackgroundImage] = useState(AUTH_IMAGES[0]);

    useEffect(() => {
        // Sélectionner une image aléatoire au montage pour varier l'expérience
        const randomIndex = Math.floor(Math.random() * AUTH_IMAGES.length);
        setBackgroundImage(AUTH_IMAGES[randomIndex]);
    }, []);

    const handleSearch = (e) => {
        if (e.key === 'Enter') {
            router.push(`/?q=${e.target.value}`);
        }
    };

    return (
        <div className="relative h-[65vh] min-h-[500px] w-full flex flex-col items-center justify-center text-white mb-8 overflow-hidden">
            {/* Immersive Background */}
            <div className="absolute inset-0 z-0">
                <Image
                    src={backgroundImage.url}
                    alt="Hero Background"
                    fill
                    priority
                    quality={75}
                    className="object-cover animate-in fade-in zoom-in duration-1000 scale-105"
                    sizes="100vw"
                />
                <div className="absolute inset-0 bg-black/30"></div>
                <div className="absolute inset-0 bg-linear-to-b from-black/50 via-transparent to-black/60"></div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 w-full max-w-4xl px-6 text-center space-y-8 animate-in slide-in-from-bottom-5 fade-in duration-700">

                <div className="flex flex-col items-center gap-4 mb-2">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight drop-shadow-2xl">
                        Images libres de droits & gratuites à télécharger
                    </h1>
                    <p className="text-lg text-white/90 max-w-2xl mx-auto font-medium drop-shadow-md">
                        Plus de 5 millions de photos, illus et vidéos de haute qualité partagées par notre communauté.
                    </p>
                </div>

                {/* Search Container */}
                <div className="w-full max-w-3xl mx-auto space-y-4">
                    {/* Media Type Tabs */}
                    <div className="flex items-center justify-center gap-2 md:gap-4 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
                        {["Photos", "Illustrations", "Vidéos",].map((type, i) => (
                            <button
                                key={type}
                                className={`px-4 py-2 rounded-full text-sm font-semibold backdrop-blur-md transition-all ${i === 0 ? 'bg-white text-black' : 'bg-black/30 text-white hover:bg-black/50 border border-white/20'}`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>

                    {/* Big Search Bar */}
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                            <Search className="h-6 w-6 text-gray-500" />
                        </div>
                        <input
                            type="text"
                            placeholder="Rechercher des images, vecteurs, vidéos..."
                            className="w-full h-16 pl-14 pr-6 rounded-full bg-white shadow-2xl text-lg text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-500/30 transition-all border-none"
                            onKeyDown={handleSearch}
                        />
                        <div className="absolute inset-y-0 right-2 flex items-center">
                            <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm font-bold transition-colors mr-1">
                                Explorer
                            </button>
                        </div>
                    </div>
                </div>

                {/* Trending Tags */}
                <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-white/90 font-medium">
                    <span className="opacity-70 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Tendances:</span>
                    {["Nature", "Gabon", "Plage", "Ville", "Portrait", "Texture"].map((tag) => (
                        <a
                            key={tag}
                            href={`/?q=${tag.toLowerCase()}`}
                            className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 transition-colors"
                        >
                            {tag}
                        </a>
                    ))}
                </div>
            </div>

            {/* Footer Credit */}
            <div className="absolute bottom-6 left-6 text-xs text-white/70 z-10 hidden md:flex items-center gap-2">
                <span>Photo par</span>
                <a
                    href={backgroundImage.photographer_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white hover:underline font-medium"
                >
                    {backgroundImage.photographer}
                </a>
            </div>
        </div>
    );
}
