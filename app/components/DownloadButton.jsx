"use client";

import { Download, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DOWNLOAD_SIZES, downloadMedia } from "../lib/media";

/**
 * Téléchargement avec choix de taille.
 *
 * Le menu listait « Petit / Moyen / Original » mais les trois options
 * récupéraient le fichier d'origine. Ici chaque taille est réellement
 * produite avant l'enregistrement, ce qui change tout quand on télécharge
 * depuis un téléphone en 4G.
 */
export default function DownloadButton({ media, variant = "compact", onDownloaded }) {
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const containerRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    const run = async (sizeKey) => {
        setOpen(false);
        setBusy(true);
        setError(null);
        try {
            await downloadMedia(media, sizeKey);
            onDownloaded?.();
        } catch (err) {
            console.error("Download failed:", err);
            setError("Téléchargement impossible");
        } finally {
            setBusy(false);
        }
    };

    const menu = (
        <div className="absolute right-0 bottom-full mb-2 w-60 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <p className="px-4 pt-3 pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Choisir la taille
            </p>
            {DOWNLOAD_SIZES.map((size) => (
                <button
                    key={size.key}
                    onClick={() => run(size.key)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 text-left transition-colors group/item"
                >
                    <span>
                        <span className="block text-sm font-medium text-gray-900">{size.label}</span>
                        {size.width && (
                            <span className="block text-[10px] text-gray-400">{size.width} px de large</span>
                        )}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover/item:text-gray-900 transition-colors" />
                </button>
            ))}
        </div>
    );

    if (variant === "primary") {
        return (
            <div className="relative flex items-center" ref={containerRef}>
                <button
                    onClick={() => run("original")}
                    disabled={busy}
                    className="h-10 px-5 bg-green-600 text-white rounded-l-lg font-bold text-sm hover:bg-green-700 transition-all shadow-sm flex items-center gap-2 disabled:opacity-70"
                >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Télécharger"}
                </button>
                <div className="h-10 w-px bg-green-700/30" />
                <button
                    onClick={() => setOpen(!open)}
                    className="h-10 px-2 bg-green-600 text-white rounded-r-lg hover:bg-green-700 transition-all shadow-sm flex items-center"
                    aria-label="Choisir une taille de téléchargement"
                    aria-expanded={open}
                >
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
                </button>

                {open && (
                    <div className="absolute right-0 top-12 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                        <div className="p-2">
                            {DOWNLOAD_SIZES.map((size) => (
                                <button
                                    key={size.key}
                                    onClick={() => run(size.key)}
                                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors group"
                                >
                                    <span className="text-left">
                                        <span className="block text-sm font-semibold text-gray-900">{size.label}</span>
                                        {size.width && (
                                            <span className="block text-[10px] text-gray-400">{size.width} px de large</span>
                                        )}
                                    </span>
                                    <Download className="w-4 h-4 text-gray-300 group-hover:text-green-600 transition-colors" />
                                </button>
                            ))}
                        </div>
                        <p className="p-4 bg-gray-50 border-t border-gray-100 text-[10px] text-gray-400 leading-tight">
                            Toutes les images de JEaLiFe Stock sont gratuites, sous licence libre.
                        </p>
                    </div>
                )}

                {error && <span className="ml-3 text-xs text-red-600">{error}</span>}
            </div>
        );
    }

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setOpen(!open)}
                disabled={busy}
                className={`bg-white hover:bg-gray-100 text-gray-900 p-2.5 rounded-full transition-all shadow-lg active:scale-95 flex items-center justify-center ${
                    open ? "ring-4 ring-black/10" : ""
                }`}
                aria-label="Télécharger"
                aria-expanded={open}
            >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            </button>
            {open && menu}
        </div>
    );
}
