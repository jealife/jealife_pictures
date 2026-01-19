
"use client";

import { Search, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Hero() {
    const router = useRouter();

    const handleSearch = (e) => {
        if (e.key === 'Enter') {
            router.push(`/?q=${e.target.value}`);
        }
    };

    return (
        <div className="relative h-[60vh] min-h-[500px] w-full flex flex-col items-center justify-center text-white mb-8 overflow-hidden">
            {/* Immersive Background */}
            <div className="absolute inset-0 z-0">
                <img
                    src="https://images.unsplash.com/photo-1496317556649-f930d733eea3?q=80&w=2400"
                    alt="Hero Background"
                    className="w-full h-full object-cover animate-in fade-in zoom-in duration-1000 scale-105"
                />
                <div className="absolute inset-0 bg-black/40"></div>
                <div className="absolute inset-0 bg-linear-to-b from-black/50 via-transparent to-black/60"></div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 w-full max-w-4xl px-6 text-center space-y-8 animate-in slide-in-from-bottom-5 fade-in duration-700">

                <h1 className="text-4xl md:text-6xl font-bold tracking-tight drop-shadow-lg">
                    JEaLiFe Pictures
                </h1>
                <p className="text-lg md:text-2xl text-white/90 max-w-2xl mx-auto font-medium drop-shadow-md">
                    La source d’images internet. Propulsée par des créateurs du Gabon .
                </p>

                {/* Big Search Bar */}
                <div className="w-full max-w-2xl mx-auto relative group">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Search className="h-6 w-6 text-gray-400 group-focus-within:text-black transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="Rechercher des photos, des vidéos, des illustrations..."
                        className="w-full h-16 pl-14 pr-6 rounded-2xl bg-white shadow-2xl text-lg text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        onKeyDown={handleSearch}
                    />
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
                <a href="#" className="text-white hover:underline font-medium">Jean N.</a>
                <span className="opacity-50">•</span>
                <span>Libreville, Gabon</span>
            </div>
        </div>
    );
}
