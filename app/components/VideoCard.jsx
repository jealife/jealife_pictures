
"use client";

import Link from "next/link";
import { Download, Heart, Plus, Play } from "lucide-react";

export default function VideoCard({ video }) {
    return (
        <div className="relative group mb-6 break-inside-avoid">
            {/* Card Container */}
            <div className="relative w-full overflow-hidden rounded-2xl bg-gray-900 shadow-sm transition-all duration-500 hover:shadow-xl hover:-translate-y-1">
                <Link href="#">
                    <div className="relative">
                        <img
                            src={video.thumbnail}
                            alt={video.alt}
                            className="w-full h-auto block object-cover transform transition-transform duration-700 group-hover:scale-105 opacity-90 group-hover:opacity-100"
                            loading="lazy"
                        />
                        {/* Play Icon Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:bg-white/40 transition-colors">
                                <Play className="w-5 h-5 text-white fill-white ml-1" />
                            </div>
                        </div>
                        {/* Duration Badge */}
                        <div className="absolute top-3 right-3 bg-black/50 backdrop-blur text-white text-xs font-medium px-2 py-1 rounded">
                            {video.duration}
                        </div>
                    </div>
                </Link>

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/0 to-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

                {/* Top Actions */}
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 z-20">
                    <button className="bg-white/20 backdrop-blur-md hover:bg-white text-white hover:text-red-500 p-2.5 rounded-full transition-all active:scale-95 border border-white/10" title="J'aime">
                        <Heart className="w-5 h-5" />
                    </button>
                    <button className="bg-white/20 backdrop-blur-md hover:bg-white text-white hover:text-black p-2.5 rounded-full transition-all active:scale-95 border border-white/10" title="Ajouter">
                        <Plus className="w-5 h-5" />
                    </button>
                </div>

                {/* Bottom Info */}
                <div className="absolute bottom-0 left-0 right-0 p-5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 z-20">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <img
                                src={video.author.avatar}
                                alt={video.author.name}
                                className="w-8 h-8 rounded-full border-2 border-white/20 object-cover"
                            />
                            <p className="text-white font-medium text-sm drop-shadow-md">{video.author.name}</p>
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
