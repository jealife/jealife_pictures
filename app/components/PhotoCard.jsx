"use client";

import { Download, Heart, Plus, Loader2, ChevronRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { incrementDownloads } from "../lib/database";

export default function PhotoCard({ photo, hideActions = false }) {
    const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const menuRef = useRef(null);

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setDownloadMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleDownload = async (size = 'original') => {
        setIsDownloading(true);
        setDownloadMenuOpen(false);

        try {
            const filename = `jealife-${photo.author?.username || 'photo'}-${size}.jpg`;
            const response = await fetch(photo.url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            // Increment stats in background
            await incrementDownloads(photo.id);
        } catch (err) {
            console.error("Quick download failed:", err);
        } finally {
            setIsDownloading(false);
        }
    };

    const sizes = [
        { label: 'Petit', key: 'small', width: 640 },
        { label: 'Moyen', key: 'medium', width: 1920 },
        { label: 'Original', key: 'original', width: null }
    ];

    return (
        <div className="relative group mb-6 break-inside-avoid" ref={menuRef}>
            {/* Card Container */}
            <div className="relative w-full overflow-hidden rounded-2xl bg-gray-100 shadow-sm transition-all duration-500 hover:shadow-xl hover:-translate-y-1">
                <Link href={`/photos/${photo.id}`}>
                    <img
                        src={photo.url}
                        alt={photo.alt || photo.title || "Photo"}
                        className="w-full h-auto block object-cover transform transition-transform duration-700 group-hover:scale-105 cursor-zoom-in"
                        loading="lazy"
                    />
                </Link>

                {/* Gradient Overlay */}
                {!hideActions && (
                    <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/0 to-black/30 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                )}

                {/* Top Actions */}
                {!hideActions && (
                    <div className="absolute top-4 right-4 flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 translate-y-0 md:translate-y-2 md:group-hover:translate-y-0 z-20">
                        <button className="bg-white/20 backdrop-blur-md hover:bg-white text-white hover:text-red-500 p-2.5 rounded-full transition-all active:scale-95 border border-white/10" title="J'aime">
                            <Heart className="w-5 h-5 transition-transform active:scale-125" />
                        </button>
                        <button className="bg-white/20 backdrop-blur-md hover:bg-white text-white hover:text-black p-2.5 rounded-full transition-all active:scale-95 border border-white/10" title="Ajouter">
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {/* Bottom Info */}
                {!hideActions && (
                    <div className="absolute bottom-0 left-0 right-0 p-5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 translate-y-0 md:translate-y-2 md:group-hover:translate-y-0 z-20">
                        <div className="flex items-center justify-between">
                            <Link href={`/users/${photo.author.username}`} className="flex items-center gap-3 group/author">
                                <Image
                                    src={photo.author.avatar}
                                    alt={photo.author.name}
                                    width={36}
                                    height={36}
                                    className="w-9 h-9 rounded-full border-2 border-white/20 object-cover shadow-sm group-hover/author:border-white transition-colors"
                                />
                                <div className="drop-shadow-md">
                                    <p className="text-white font-medium text-sm leading-tight">{photo.author.name}</p>
                                    {photo.location && (
                                        <p className="text-[10px] text-white/80 mt-0.5 font-light truncate max-w-[120px]">{photo.location}</p>
                                    )}
                                </div>
                            </Link>

                            <div className="relative">
                                <button
                                    onClick={() => setDownloadMenuOpen(!downloadMenuOpen)}
                                    disabled={isDownloading}
                                    className={`bg-white hover:bg-gray-100 text-gray-900 p-2.5 rounded-full transition-all shadow-lg active:scale-95 flex items-center justify-center ${downloadMenuOpen ? 'ring-4 ring-black/10' : ''}`}
                                    title="Télécharger"
                                >
                                    {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Floating Size Menu - Moved outside overflow-hidden container */}
            {downloadMenuOpen && (
                <div className="absolute bottom-20 right-5 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 py-1.5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="px-3 py-2 border-b border-gray-50 mb-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Choisir la taille</p>
                    </div>
                    {sizes.map((size) => (
                        <button
                            key={size.key}
                            onClick={() => handleDownload(size.key)}
                            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 text-left transition-colors group/item"
                        >
                            <div>
                                <p className="text-sm font-medium text-gray-900 group-hover/item:text-black">{size.label}</p>
                                {size.width && <p className="text-[10px] text-gray-400">{size.width} px</p>}
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover/item:text-gray-900 transition-colors" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
