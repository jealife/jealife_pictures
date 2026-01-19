
"use client";

import { Download, Heart, Plus } from "lucide-react";
import Link from "next/link";

export default function PhotoCard({ photo }) {
    return (
        <div className="relative group mb-6 break-inside-avoid">
            {/* Card Container */}
            <div className="relative w-full overflow-hidden rounded-2xl bg-gray-200 shadow-sm transition-all duration-500 hover:shadow-xl hover:-translate-y-1">
                <Link href={`/photos/${photo.id}`}>
                    <img
                        src={photo.url}
                        alt={photo.alt}
                        className="w-full h-auto block object-cover transform transition-transform duration-700 group-hover:scale-110 cursor-zoom-in"
                        loading="lazy"
                    />
                </Link>

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/0 to-black/30 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

                {/* Top Actions */}
                <div className="absolute top-4 right-4 flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 translate-y-0 md:translate-y-2 md:group-hover:translate-y-0 z-20">
                    <button className="bg-white/20 backdrop-blur-md hover:bg-white text-white hover:text-red-500 p-2.5 rounded-full transition-all active:scale-95 border border-white/10" title="J'aime">
                        <Heart className="w-5 h-5" />
                    </button>
                    <button className="bg-white/20 backdrop-blur-md hover:bg-white text-white hover:text-black p-2.5 rounded-full transition-all active:scale-95 border border-white/10" title="Ajouter">
                        <Plus className="w-5 h-5" />
                    </button>
                </div>

                {/* Bottom Info */}
                <div className="absolute bottom-0 left-0 right-0 p-5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 translate-y-0 md:translate-y-2 md:group-hover:translate-y-0 z-20">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <img
                                src={photo.author.avatar}
                                alt={photo.author.name}
                                className="w-9 h-9 rounded-full border-2 border-white/20 object-cover shadow-sm"
                            />
                            <div>
                                <p className="text-white font-medium text-sm leading-tight drop-shadow-md">{photo.author.name}</p>
                                {photo.location && (
                                    <p className="text-xs text-white/80 mt-0.5 font-light truncate max-w-[120px]">{photo.location}</p>
                                )}
                            </div>
                        </div>

                        <button className="bg-white hover:bg-gray-100 text-gray-900 p-2.5 rounded-full transition-all shadow-lg active:scale-95" title="Télécharger">
                            <Download className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
