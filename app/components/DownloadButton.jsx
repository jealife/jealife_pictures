"use client";

import { Download, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { downloadOptionsFor, downloadMedia } from "../lib/media";

/**
 * Téléchargement avec choix de format.
 *
 * Le menu listait « Petit / Moyen / Original » mais les trois options
 * récupéraient le fichier d'origine. Chaque taille est désormais réellement
 * produite avant l'enregistrement — et les options proposées dépendent du
 * type de média : une vidéo ne se redimensionne pas dans un navigateur.
 */
export default function DownloadButton({ media, variant = "compact", onDownloaded }) {
    const options = downloadOptionsFor(media);
    const isVideo = media?.type === "video";
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
            window.dispatchEvent(new CustomEvent("show-thanks-modal", { detail: media }));
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
            {options.map((option) => (
                <button
                    key={option.key}
                    onClick={() => run(option.key)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 text-left transition-colors group/item"
                >
                    <span>
                        <span className="block text-sm font-medium text-gray-900">{option.label}</span>
                        {option.hint && (
                            <span className="block text-[10px] text-gray-400">{option.hint}</span>
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
                    className="h-9 px-3 sm:px-4 bg-green-600 text-white rounded-l-md font-medium text-[13px] hover:bg-green-700 transition-all shadow-sm flex items-center gap-2 disabled:opacity-70"
                >
                    {busy ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <>
                            <span className="hidden sm:inline">
                                {isVideo ? "Télécharger la vidéo" : "Télécharger gratuitement"}
                            </span>
                            <span className="sm:hidden">Télécharger</span>
                        </>
                    )}
                </button>
                <div className="h-9 w-px bg-green-700/30" />
                <button
                    onClick={() => setOpen(!open)}
                    className="h-9 px-2 bg-green-600 text-white rounded-r-md hover:bg-green-700 transition-all shadow-sm flex items-center"
                    aria-label="Choisir une taille de téléchargement"
                    aria-expanded={open}
                >
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
                </button>

                {open && (
                    <div className="absolute right-0 top-12 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                        <div className="p-2">
                            {options.map((option) => (
                                <button
                                    key={option.key}
                                    onClick={() => run(option.key)}
                                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors group"
                                >
                                    <span className="text-left">
                                        <span className="block text-sm font-semibold text-gray-900">{option.label}</span>
                                        {option.hint && (
                                            <span className="block text-[10px] text-gray-400">{option.hint}</span>
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
            {error && (
                <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap bg-red-600 text-white text-[11px] font-medium px-2.5 py-1 rounded-md shadow-lg z-50">
                    {error}
                </span>
            )}
        </div>
    );
}
