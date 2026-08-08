"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, XCircle, Trash2, Loader2, ExternalLink } from "lucide-react";
import {
    getPendingMedia, getOpenReports,
    approveMedia, rejectMedia, removeMedia, resolveReport,
} from "../../lib/database";
import { mediaUrl } from "../../lib/media";

const REASON_LABELS = {
    droits: "Droits non respectés",
    personne: "Personne non consentante",
    "contenu-inapproprie": "Contenu inapproprié",
    spam: "Spam",
    autre: "Autre",
};

export default function ModerationPage() {
    const [pending, setPending] = useState(null);
    const [reports, setReports] = useState(null);
    const [busyKey, setBusyKey] = useState(null);

    const load = useCallback(() => {
        getPendingMedia({ limit: 50 }).then(setPending);
        getOpenReports({ limit: 50 }).then(setReports);
    }, []);

    useEffect(() => { load(); }, [load]);

    const runAction = async (key, action) => {
        setBusyKey(key);
        await action();
        setBusyKey(null);
        load();
    };

    return (
        <div className="space-y-16">
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
                                <div key={item.id} className="flex items-center gap-4 p-3 border border-gray-100 dark:border-zinc-800 rounded-xl">
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
                                        onClick={() => runAction(key, () => approveMedia(item.id))}
                                        className="px-3 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-bold rounded-lg hover:bg-gray-800 dark:hover:bg-zinc-200 disabled:opacity-50 flex items-center gap-1.5"
                                    >
                                        <CheckCircle2 className="w-4 h-4" /> Publier
                                    </button>
                                    <button
                                        disabled={busyKey === key}
                                        onClick={() => runAction(key, () => rejectMedia(item.id))}
                                        className="px-3 py-2 border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 text-xs font-bold rounded-lg hover:border-red-300 dark:hover:border-red-800 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50 flex items-center gap-1.5"
                                    >
                                        <XCircle className="w-4 h-4" /> Rejeter
                                    </button>
                                </div>
                            );
                        })}
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
                                <div key={report.id} className="flex items-start gap-4 p-3 border border-gray-100 dark:border-zinc-800 rounded-xl">
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
                                        onClick={() => runAction(key, () => resolveReport(report.id))}
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
                                            });
                                        }}
                                        className="px-3 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-1.5"
                                    >
                                        <Trash2 className="w-4 h-4" /> Retirer
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}
