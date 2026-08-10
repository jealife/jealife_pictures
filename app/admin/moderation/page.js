"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, XCircle, Trash2, Loader2, ExternalLink, ChevronDown, AlertTriangle, X } from "lucide-react";
import {
    getPendingMedia, getOpenReports,
    approveMedia, rejectMedia, removeMedia, resolveReport,
} from "../../lib/database";
import { mediaUrl } from "../../lib/media";
import { supabase } from "../../lib/supabase";
import { REJECTION_REASONS } from "../../lib/moderation-reasons";

const REASON_LABELS = {
    droits: "Droits non respectés",
    personne: "Personne non consentante",
    "contenu-inapproprie": "Contenu inapproprié",
    spam: "Spam",
    autre: "Autre",
};

const PAGE_SIZE = 20;

/**
 * Notifie le contributeur par email après une décision de modération.
 * Best-effort : un échec d'envoi ne révoque pas la décision.
 * @returns {Promise<string|null>} message d'erreur ou null si succès
 */
async function notifyContributor(mediaId, action, reasonKey, customNote) {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return "Session expirée.";

        const res = await fetch("/api/notify-contributor", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ mediaId, action, reasonKey, customNote }),
        });
        const data = await res.json();
        return data.ok ? null : (data.error || "Erreur inconnue.");
    } catch (err) {
        return err.message || "Erreur réseau.";
    }
}

export default function ModerationPage() {
    const [pending, setPending] = useState(null);
    const [pendingOffset, setPendingOffset] = useState(0);
    const [pendingHasMore, setPendingHasMore] = useState(false);
    const [pendingLoading, setPendingLoading] = useState(false);

    const [reports, setReports] = useState(null);
    const [reportsOffset, setReportsOffset] = useState(0);
    const [reportsHasMore, setReportsHasMore] = useState(false);
    const [reportsLoading, setReportsLoading] = useState(false);

    const [busyKey, setBusyKey] = useState(null);
    const [rejectTarget, setRejectTarget] = useState(null); // Média actuellement en cours de rejet via le Modal
    const [mailWarning, setMailWarning] = useState(null);
    const warningTimer = useRef(null);

    // Charge le premier lot au montage.
    useEffect(() => {
        getPendingMedia({ limit: PAGE_SIZE, offset: 0 }).then((data) => {
            setPending(data);
            setPendingHasMore(data.length === PAGE_SIZE);
        });
        getOpenReports({ limit: PAGE_SIZE, offset: 0 }).then((data) => {
            setReports(data);
            setReportsHasMore(data.length === PAGE_SIZE);
        });
    }, []);

    const loadMorePending = async () => {
        setPendingLoading(true);
        const nextOffset = pendingOffset + PAGE_SIZE;
        const data = await getPendingMedia({ limit: PAGE_SIZE, offset: nextOffset });
        setPending((prev) => [...(prev || []), ...data]);
        setPendingOffset(nextOffset);
        setPendingHasMore(data.length === PAGE_SIZE);
        setPendingLoading(false);
    };

    const loadMoreReports = async () => {
        setReportsLoading(true);
        const nextOffset = reportsOffset + PAGE_SIZE;
        const data = await getOpenReports({ limit: PAGE_SIZE, offset: nextOffset });
        setReports((prev) => [...(prev || []), ...data]);
        setReportsOffset(nextOffset);
        setReportsHasMore(data.length === PAGE_SIZE);
        setReportsLoading(false);
    };

    // Retire l'item localement sans recharger toute la liste :
    // préserve la position de scroll et les pages déjà chargées.
    const runAction = async (key, action, removeFromList, notifyArgs) => {
        setBusyKey(key);
        await action();
        setBusyKey(null);
        removeFromList(key);

        // Notification email asynchrone (best-effort).
        if (notifyArgs) {
            const mailError = await notifyContributor(
                notifyArgs.mediaId,
                notifyArgs.action,
                notifyArgs.reasonKey,
                notifyArgs.customNote
            );
            if (mailError) {
                clearTimeout(warningTimer.current);
                setMailWarning(`Email non envoyé : ${mailError}`);
                warningTimer.current = setTimeout(() => setMailWarning(null), 6000);
            }
        }
    };

    const handleConfirmReject = async ({ reasonKey, customNote }) => {
        if (!rejectTarget) return;
        const item = rejectTarget;
        const key = `media-${item.id}`;

        await runAction(
            key,
            () => rejectMedia(item.id),
            (k) => setPending((prev) => prev.filter((i) => `media-${i.id}` !== k)),
            { mediaId: item.id, action: "rejected", reasonKey, customNote }
        );

        setRejectTarget(null);
    };

    return (
        <div className="space-y-16">

            {/* Toast d'avertissement email (best-effort — ne bloque pas l'action) */}
            {mailWarning && (
                <div className="fixed bottom-6 right-6 z-50 flex items-start gap-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 rounded-xl px-4 py-3 shadow-lg max-w-sm text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{mailWarning}</span>
                </div>
            )}

            {/* Modal de Rejet avec sélecteur de raison */}
            {rejectTarget && (
                <RejectModal
                    item={rejectTarget}
                    onClose={() => setRejectTarget(null)}
                    onConfirm={handleConfirmReject}
                    busy={busyKey === `media-${rejectTarget.id}`}
                />
            )}

            <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 mb-1">En attente de publication</h2>
                <p className="text-gray-500 dark:text-zinc-400 text-sm mb-6">
                    Envois retenus par le mode de modération manuel, pas encore visibles sur le site.
                </p>

                {pending === null ? (
                    <Loader2 className="w-6 h-6 animate-spin text-gray-300 dark:text-zinc-600" />
                ) : pending.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-zinc-500 italic">Rien en attente.</p>
                ) : (
                    <div className="space-y-3">
                        {pending.map((item) => {
                            const key = `media-${item.id}`;
                            return (
                                <div
                                    key={item.id}
                                    className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 p-3 border border-gray-100 dark:border-zinc-800 rounded-xl"
                                >
                                    <div className="flex items-center gap-4 min-w-0 flex-1">
                                        <Image
                                            src={item.thumbnail_url || item.url}
                                            alt=""
                                            width={72}
                                            height={72}
                                            unoptimized
                                            className="w-16 h-16 rounded-lg object-cover shrink-0 bg-gray-100 dark:bg-zinc-800"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-gray-900 dark:text-zinc-100 truncate">
                                                {item.title || item.alt_text || "Sans titre"}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-zinc-400">
                                                {item.profiles?.username ? `@${item.profiles.username}` : "auteur inconnu"} ·{" "}
                                                {new Date(item.created_at).toLocaleDateString("fr-FR")}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap sm:shrink-0">
                                        <Link
                                            href={mediaUrl({ id: item.id, title: item.title, alt: item.alt_text })}
                                            target="_blank"
                                            className="p-2 text-gray-400 dark:text-zinc-500 hover:text-black dark:hover:text-white"
                                            title="Voir"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </Link>
                                        <button
                                            disabled={busyKey === key}
                                            onClick={() => runAction(
                                                key,
                                                () => approveMedia(item.id),
                                                (k) => setPending((prev) => prev.filter((i) => `media-${i.id}` !== k)),
                                                { mediaId: item.id, action: "approved" }
                                            )}
                                            className="px-3 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-bold rounded-lg hover:bg-gray-800 dark:hover:bg-zinc-200 disabled:opacity-50 flex items-center gap-1.5"
                                        >
                                            <CheckCircle2 className="w-4 h-4" /> Publier
                                        </button>
                                        <button
                                            disabled={busyKey === key}
                                            onClick={() => setRejectTarget(item)}
                                            className="px-3 py-2 border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 text-xs font-bold rounded-lg hover:border-red-300 dark:hover:border-red-800 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50 flex items-center gap-1.5"
                                        >
                                            <XCircle className="w-4 h-4" /> Rejeter
                                        </button>
                                    </div>
                                </div>
                            );
                        })}

                        {pendingHasMore && (
                            <button
                                onClick={loadMorePending}
                                disabled={pendingLoading}
                                className="mt-2 flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm font-medium text-gray-600 dark:text-zinc-400 hover:border-gray-400 dark:hover:border-zinc-500 hover:text-black dark:hover:text-white disabled:opacity-50 transition-colors"
                            >
                                {pendingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
                                Voir plus
                            </button>
                        )}
                    </div>
                )}
            </section>

            <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 mb-1">Signalements ouverts</h2>
                <p className="text-gray-500 dark:text-zinc-400 text-sm mb-6">
                    Contenus déjà publiés, signalés par la communauté.
                </p>

                {reports === null ? (
                    <Loader2 className="w-6 h-6 animate-spin text-gray-300 dark:text-zinc-600" />
                ) : reports.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-zinc-500 italic">Aucun signalement en attente.</p>
                ) : (
                    <div className="space-y-3">
                        {reports.filter((r) => r.media).map((report) => {
                            const key = `report-${report.id}`;
                            return (
                                <div
                                    key={report.id}
                                    className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4 p-3 border border-gray-100 dark:border-zinc-800 rounded-xl"
                                >
                                    <div className="flex items-start gap-4 min-w-0 flex-1">
                                        <Image
                                            src={report.media.thumbnail_url || report.media.url}
                                            alt=""
                                            width={72}
                                            height={72}
                                            unoptimized
                                            className="w-16 h-16 rounded-lg object-cover shrink-0 bg-gray-100 dark:bg-zinc-800"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-gray-900 dark:text-zinc-100 truncate">
                                                {report.media.title || report.media.alt_text || "Sans titre"}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-zinc-400 mb-1">
                                                Signalé par {report.reporter?.username ? `@${report.reporter.username}` : "un visiteur"} ·{" "}
                                                {REASON_LABELS[report.reason] || report.reason}
                                            </p>
                                            {report.details && (
                                                <p className="text-xs text-gray-600 dark:text-zinc-400 italic">« {report.details} »</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap sm:shrink-0">
                                        <Link
                                            href={mediaUrl({ id: report.media.id, title: report.media.title, alt: report.media.alt_text })}
                                            target="_blank"
                                            className="p-2 text-gray-400 dark:text-zinc-500 hover:text-black dark:hover:text-white"
                                            title="Voir"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </Link>
                                        <button
                                            disabled={busyKey === key}
                                            onClick={() => runAction(
                                                key,
                                                () => resolveReport(report.id),
                                                (k) => setReports((prev) => prev.filter((r) => `report-${r.id}` !== k))
                                            )}
                                            className="px-3 py-2 border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 text-xs font-bold rounded-lg hover:border-gray-400 dark:hover:border-zinc-500 disabled:opacity-50"
                                        >
                                            Ignorer
                                        </button>
                                        <button
                                            disabled={busyKey === key}
                                            onClick={() => {
                                                if (!window.confirm("Retirer ce média de la plateforme ?")) return;
                                                runAction(key, async () => {
                                                    await removeMedia(report.media.id);
                                                    await resolveReport(report.id);
                                                }, (k) => setReports((prev) => prev.filter((r) => `report-${r.id}` !== k)));
                                            }}
                                            className="px-3 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-1.5"
                                        >
                                            <Trash2 className="w-4 h-4" /> Retirer
                                        </button>
                                    </div>
                                </div>
                            );
                        })}

                        {reportsHasMore && (
                            <button
                                onClick={loadMoreReports}
                                disabled={reportsLoading}
                                className="mt-2 flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm font-medium text-gray-600 dark:text-zinc-400 hover:border-gray-400 dark:hover:border-zinc-500 hover:text-black dark:hover:text-white disabled:opacity-50 transition-colors"
                            >
                                {reportsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
                                Voir plus
                            </button>
                        )}
                    </div>
                )}
            </section>
        </div>
    );
}

/**
 * Modal de sélection du motif de rejet et d'ajout d'une note au contributeur.
 */
function RejectModal({ item, onClose, onConfirm, busy }) {
    const [reasonKey, setReasonKey] = useState("quality");
    const [customNote, setCustomNote] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        onConfirm({ reasonKey, customNote });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-6">
                
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                            <XCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-900 dark:text-zinc-100 leading-tight">Rejeter l&apos;image</h3>
                            <p className="text-xs text-gray-500 dark:text-zinc-400">Une notification explicative sera envoyée au photographe.</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={busy}
                        className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Media Preview Mini */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 rounded-2xl">
                    <Image
                        src={item.thumbnail_url || item.url}
                        alt=""
                        width={48}
                        height={48}
                        unoptimized
                        className="w-12 h-12 rounded-xl object-cover shrink-0 bg-gray-200 dark:bg-zinc-700"
                    />
                    <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-gray-900 dark:text-zinc-100 truncate">
                            {item.title || item.alt_text || "Sans titre"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                            {item.profiles?.username ? `@${item.profiles.username}` : "Auteur inconnu"}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
                            Motif principal du rejet <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={reasonKey}
                            onChange={(e) => setReasonKey(e.target.value)}
                            disabled={busy}
                            className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white outline-none transition-all text-sm font-medium cursor-pointer"
                        >
                            {Object.entries(REJECTION_REASONS).map(([key, info]) => (
                                <option key={key} value={key}>
                                    {info.label}
                                </option>
                            ))}
                        </select>
                        <div className="mt-2 p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                            💡 <span className="font-semibold">Conseil envoyé :</span> {REJECTION_REASONS[reasonKey]?.advice}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
                            Note complémentaire <span className="text-gray-400 font-normal">(facultatif)</span>
                        </label>
                        <textarea
                            rows={3}
                            value={customNote}
                            onChange={(e) => setCustomNote(e.target.value)}
                            disabled={busy}
                            placeholder="Ex : 'Mise au point floue sur le sujet principal' ou 'Merci d'exporter votre fichier sans filigrane'..."
                            className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white outline-none transition-all text-sm resize-none"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={busy}
                            className="px-4 py-2.5 border border-gray-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={busy}
                            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
                        >
                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                            Confirmer le rejet & notifier
                        </button>
                    </div>
                </form>

            </div>
        </div>
    );
}
