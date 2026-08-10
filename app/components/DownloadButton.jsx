"use client";

import { Download, Loader2, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getSetting, getPremiumPricing, spendCreditsForDownload } from "../lib/database";
import { downloadOptionsFor, downloadMedia, mediaUrl, fetchPhotoAccess } from "../lib/media";

/**
 * Téléchargement avec choix de format.
 *
 * Le menu listait « Petit / Moyen / Original » mais les trois options
 * récupéraient le fichier d'origine. Chaque taille est désormais réellement
 * produite avant l'enregistrement — et les options proposées dépendent du
 * type de média : une vidéo ne se redimensionne pas dans un navigateur.
 *
 * Contenu Premium (migration 0019) : la variante compacte (cartes de grille)
 * n'offre plus jamais le téléchargement gratuit direct — un média premium y
 * renvoie vers sa fiche, seul endroit qui affiche le prix et gère l'achat.
 * Sans ça, le petit bouton de téléchargement des grilles aurait continué à
 * distribuer gratuitement un contenu que son auteur a choisi de vendre.
 */
export default function DownloadButton({ media, variant = "compact", onDownloaded }) {
    if (media?.isPremium) {
        return variant === "primary"
            ? <PremiumDownload media={media} onDownloaded={onDownloaded} />
            : <PremiumCompactLink media={media} />;
    }
    return <FreeDownloadButton media={media} variant={variant} onDownloaded={onDownloaded} />;
}

function PremiumCompactLink({ media }) {
    return (
        <Link
            href={mediaUrl(media)}
            onClick={(event) => event.stopPropagation()}
            title="Contenu Premium — voir la fiche pour le débloquer"
            aria-label="Contenu Premium — voir la fiche pour le débloquer"
            className="bg-white hover:bg-gray-100 text-amber-600 p-2.5 rounded-full transition-all shadow-lg active:scale-95 flex items-center justify-center"
        >
            <Sparkles className="w-4 h-4" />
        </Link>
    );
}

/**
 * Bouton principal (fiche photo) pour un média Premium. Tant que
 * `payments_enabled` est faux (réglage admin, migration 0019), rien n'est
 * cliquable : juste le badge « Bientôt disponible » promis aux contributeurs
 * en attendant un fournisseur Mobile Money. Une fois activé, le clic dépense
 * les crédits avant de déclencher le téléchargement réel — jamais l'inverse.
 */
function PremiumDownload({ media, onDownloaded }) {
    const { user } = useAuth();
    const router = useRouter();
    // Le contributeur consulte aussi la fiche de son propre média : la
    // fonction SQL refuse à dessein qu'il s'achète lui-même (voir migration
    // 0019), donc l'achat ne doit même pas lui être proposé — juste un
    // téléchargement direct, comme pour un média gratuit.
    const isOwner = !!user && user.id === media.author?.id;
    const [settings, setSettings] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOwner) return;
        Promise.all([getSetting("payments_enabled"), getPremiumPricing()]).then(([enabled, rows]) => {
            setSettings({
                paymentsEnabled: enabled === "true",
                creditsCost: rows.find((r) => r.media_type === media.type)?.credits_cost || null,
            });
        });
    }, [media.type, isOwner]);

    // `media.url`/`media.originalUrl` sont redactés à la source pour un
    // média Premium (voir page.js) : ni le propriétaire ni l'acheteur ne
    // peuvent s'en servir tels quels. `/api/photo-access` est le seul
    // endroit qui accepte de rendre l'adresse réelle, une fois le droit
    // d'accès vérifié côté serveur.
    const downloadOwnMedia = async () => {
        setBusy(true);
        setError(null);
        try {
            const access = await fetchPhotoAccess(media.id);
            if (!access.originalUrl) throw new Error("Fichier indisponible.");
            const unlocked = { ...media, url: access.url || media.thumbnailUrl, originalUrl: access.originalUrl };
            await downloadMedia(unlocked, "original");
            window.dispatchEvent(new CustomEvent("show-thanks-modal", { detail: unlocked }));
            onDownloaded?.();
        } catch (err) {
            console.error("Download failed:", err);
            setError("Téléchargement impossible");
        } finally {
            setBusy(false);
        }
    };

    const purchase = async () => {
        if (!user) {
            router.push(`/login?redirect=${encodeURIComponent(mediaUrl(media))}`);
            return;
        }
        setBusy(true);
        setError(null);

        const result = await spendCreditsForDownload(media.id);
        if (!result.success) {
            setError(result.error);
            setBusy(false);
            return;
        }

        const access = await fetchPhotoAccess(media.id);
        if (!access.originalUrl) {
            setError("Achat enregistré, mais le fichier est momentanément indisponible.");
            setBusy(false);
            return;
        }

        const unlocked = { ...media, url: access.url || media.thumbnailUrl, originalUrl: access.originalUrl };
        await downloadMedia(unlocked, "original");
        window.dispatchEvent(new CustomEvent("show-thanks-modal", { detail: unlocked }));
        onDownloaded?.();
        setBusy(false);
    };

    if (isOwner) {
        return (
            <div className="flex flex-col items-end gap-1">
                <button
                    onClick={downloadOwnMedia}
                    disabled={busy}
                    className="h-9 px-3 sm:px-4 bg-green-600 text-white rounded-md font-medium text-[13px] hover:bg-green-700 transition-all shadow-sm flex items-center gap-2 disabled:opacity-70"
                >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    <span className="hidden sm:inline">Télécharger votre média</span>
                    <span className="sm:hidden">Télécharger</span>
                </button>
                {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
            </div>
        );
    }

    if (!settings) {
        return (
            <div className="h-9 px-4 bg-gray-100 dark:bg-zinc-800 rounded-md flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400 dark:text-zinc-500" />
            </div>
        );
    }

    if (!settings.paymentsEnabled) {
        return (
            <div
                title="Le paiement en ligne n'est pas encore activé sur JEaLiFe Stock. Vous pourrez bientôt débloquer ce fichier avec des crédits, achetés via Mobile Money."
                className="h-9 px-3 sm:px-4 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900 rounded-md font-medium text-[13px] flex items-center gap-2 cursor-default"
            >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Premium · Bientôt disponible</span>
                <span className="sm:hidden">Bientôt</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-end gap-1.5">
            <button
                onClick={purchase}
                disabled={busy}
                className="h-9 px-3 sm:px-4 bg-amber-500 text-white rounded-md font-medium text-[13px] hover:bg-amber-600 transition-all shadow-sm flex items-center gap-2 disabled:opacity-70"
            >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {settings.creditsCost
                    ? `Télécharger (${settings.creditsCost} crédit${settings.creditsCost > 1 ? "s" : ""})`
                    : "Télécharger"}
            </button>
            {error && (
                <p className="text-[11px] text-red-600 dark:text-red-400 text-right max-w-56">
                    {error}{" "}
                    {error === "Crédits insuffisants." && (
                        <Link href="/credits" className="underline font-semibold">Acheter des crédits</Link>
                    )}
                </p>
            )}
        </div>
    );
}

function FreeDownloadButton({ media, variant = "compact", onDownloaded }) {
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
        <div className="absolute right-0 bottom-full mb-2 w-60 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <p className="px-4 pt-3 pb-2 text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                Choisir la taille
            </p>
            {options.map((option) => (
                <button
                    key={option.key}
                    onClick={() => run(option.key)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-zinc-800 text-left transition-colors group/item"
                >
                    <span>
                        <span className="block text-sm font-medium text-gray-900 dark:text-zinc-100">{option.label}</span>
                        {option.hint && (
                            <span className="block text-[10px] text-gray-400 dark:text-zinc-500">{option.hint}</span>
                        )}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-zinc-600 group-hover/item:text-gray-900 dark:group-hover/item:text-zinc-100 transition-colors" />
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
                    <div className="absolute right-0 top-12 w-64 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                        <div className="p-2">
                            {options.map((option) => (
                                <button
                                    key={option.key}
                                    onClick={() => run(option.key)}
                                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg transition-colors group"
                                >
                                    <span className="text-left">
                                        <span className="block text-sm font-semibold text-gray-900 dark:text-zinc-100">{option.label}</span>
                                        {option.hint && (
                                            <span className="block text-[10px] text-gray-400 dark:text-zinc-500">{option.hint}</span>
                                        )}
                                    </span>
                                    <Download className="w-4 h-4 text-gray-300 dark:text-zinc-600 group-hover:text-green-600 transition-colors" />
                                </button>
                            ))}
                        </div>
                        <p className="p-4 bg-gray-50 dark:bg-zinc-800 border-t border-gray-100 dark:border-zinc-700 text-[10px] text-gray-400 dark:text-zinc-500 leading-tight">
                            Toutes les images de JEaLiFe Stock sont gratuites, sous licence libre.
                        </p>
                    </div>
                )}

                {error && <span className="ml-3 text-xs text-red-600 dark:text-red-400">{error}</span>}
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
