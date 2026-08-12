"use client";

import { Search, TrendingUp } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getPlatformStats } from "../lib/database";
import { formatCount } from "../lib/media";

const TRENDING = ["Nature", "Portrait", "Forêt", "Océan", "Ville", "Marché"];

export default function Hero({ background }) {
    const router = useRouter();
    const [stats, setStats] = useState(null);
    const [term, setTerm] = useState("");

    useEffect(() => { getPlatformStats().then(setStats); }, []);

    const submitSearch = (event) => {
        event.preventDefault();
        const value = term.trim();
        router.push(value ? `/?q=${encodeURIComponent(value)}` : "/");
    };

    const totalPhotos = stats?.total_photos || 0;
    const totalContributors = stats?.total_contributors || 0;

    return (
        <div className="relative h-[65vh] min-h-[500px] w-full flex flex-col items-center justify-center text-white mb-8 overflow-hidden">
            <div className="absolute inset-0 z-0">
                <Image
                    src={background.url}
                    alt=""
                    fill
                    priority
                    unoptimized
                    className="object-cover animate-in fade-in duration-1000"
                    sizes="100vw"
                />
                <div className="absolute inset-0 bg-black/35" />
                <div className="absolute inset-0 bg-linear-to-b from-black/50 via-transparent to-black/60" />
            </div>

            <div className="relative z-10 w-full max-w-4xl px-6 text-center space-y-8 animate-in slide-in-from-bottom-5 fade-in duration-700">
                <div className="flex flex-col items-center gap-4 mb-2">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight drop-shadow-2xl text-balance">
                        Images libres de droits, gratuites à télécharger
                    </h1>
                    <p className="text-lg text-white/90 max-w-2xl mx-auto font-medium drop-shadow-md">
                        {/* Les compteurs viennent de la base : on n'annonce un
                            volume que lorsqu'il existe vraiment. */}
                        {totalPhotos > 0 ? (
                            <>
                                {formatCount(totalPhotos)} image{totalPhotos > 1 ? "s" : ""} en haute
                                résolution, partagée{totalPhotos > 1 ? "s" : ""} par{" "}
                                {formatCount(totalContributors)} photographe
                                {totalContributors > 1 ? "s" : ""}.
                            </>
                        ) : (
                            <>
                                Une sélection soignée, où l&apos;on trouve de belles images du continent.
                            </>
                        )}
                    </p>
                </div>

                <div className="w-full max-w-3xl mx-auto space-y-4">
                    <div className="flex items-center justify-center gap-2 md:gap-4 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                        <Link href="/" className="px-4 py-2 rounded-full text-sm font-semibold bg-white text-black">
                            Photos
                        </Link>
                        <Link
                            href="/illustrations"
                            className="px-4 py-2 rounded-full text-sm font-semibold bg-black/30 text-white hover:bg-black/50 border border-white/20 backdrop-blur-md transition-colors"
                        >
                            Illustrations
                        </Link>
                        <Link
                            href="/videos"
                            className="px-4 py-2 rounded-full text-sm font-semibold bg-black/30 text-white hover:bg-black/50 border border-white/20 backdrop-blur-md transition-colors"
                        >
                            Vidéos
                        </Link>
                    </div>

                    <form onSubmit={submitSearch} className="relative">
                        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                            <Search className="h-6 w-6 text-gray-500" />
                        </div>
                        <label htmlFor="hero-search" className="sr-only">Rechercher une image</label>
                        <input
                            id="hero-search"
                            type="search"
                            value={term}
                            onChange={(e) => setTerm(e.target.value)}
                            placeholder="Forêt, marché, portrait, coucher de soleil…"
                            /* Le bouton étant posé par-dessus le champ, la
                               réserve à droite doit suivre sa largeur — sinon
                               il recouvre le texte saisi sur petit écran. */
                            className="w-full h-16 pl-14 pr-16 sm:pr-36 rounded-full bg-white shadow-2xl text-base sm:text-lg text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/30 transition-all border-none"
                        />
                        <div className="absolute inset-y-0 right-2 flex items-center">
                            <button
                                type="submit"
                                className="bg-gray-900 hover:bg-black text-white p-3 sm:px-5 sm:py-2.5 rounded-full text-sm font-bold transition-colors"
                                aria-label="Rechercher"
                            >
                                <Search className="w-5 h-5 sm:hidden" aria-hidden="true" />
                                <span className="hidden sm:inline">Rechercher</span>
                            </button>
                        </div>
                    </form>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-white/90 font-medium">
                    <span className="opacity-70 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> Tendances :
                    </span>
                    {TRENDING.map((tag) => (
                        <Link
                            key={tag}
                            href={`/?q=${encodeURIComponent(tag.toLowerCase())}`}
                            className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 transition-colors"
                        >
                            {tag}
                        </Link>
                    ))}
                </div>
            </div>

            <div className="absolute bottom-6 left-6 text-xs text-white/70 z-10 hidden md:flex items-center gap-2">
                <span>Photo par</span>
                {background.photographer_url ? (
                    <Link href={background.photographer_url} className="text-white hover:underline font-medium">
                        {background.photographer}
                    </Link>
                ) : (
                    <span className="text-white font-medium">{background.photographer}</span>
                )}
            </div>
        </div>
    );
}
