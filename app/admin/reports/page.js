"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
    getDownloadsTrend,
    getUploadsTrend,
    getSignupsTrend,
    getTopMedia,
    getTopContributors,
} from "../../lib/database";
import TrendChart from "../../components/charts/TrendChart";
import RankingBars from "../../components/charts/RankingBars";

const RANGE_OPTIONS = [
    { label: "30 jours", days: 30 },
    { label: "90 jours", days: 90 },
];

const MEDIA_METRICS = [
    { key: "downloads_count", label: "Téléchargements" },
    { key: "views_count", label: "Vues" },
    { key: "likes_count", label: "J'aime" },
];

// Palette catégorielle validée (voir skill dataviz), slots 1/2/3 dans l'ordre
// fixe : bleu, orange, aqua. Le classement utilise le bleu (teinte
// séquentielle par défaut) car il compare une magnitude, pas des identités.
const COLOR_DOWNLOADS = "#2a78d6";
const COLOR_UPLOADS = "#eb6834";
const COLOR_SIGNUPS = "#1baf7a";
const COLOR_RANKING = "#2a78d6";

const sum = (series) => series.reduce((total, d) => total + d.value, 0);

export default function AdminReportsPage() {
    const [rangeDays, setRangeDays] = useState(30);
    const [trends, setTrends] = useState(null);
    const [mediaMetric, setMediaMetric] = useState("downloads_count");
    const [topMedia, setTopMedia] = useState(null);
    const [topContributors, setTopContributors] = useState(null);

    useEffect(() => {
        let cancelled = false;
        // Pas de reset à `null` ici : le graphique précédent reste affiché
        // pendant le rechargement plutôt que de clignoter vers un squelette
        // à chaque changement de période (voir dataviz : "refetch keeps the
        // frame").
        Promise.all([
            getDownloadsTrend(rangeDays),
            getUploadsTrend(rangeDays),
            getSignupsTrend(rangeDays),
        ]).then(([downloads, uploads, signups]) => {
            if (!cancelled) setTrends({ downloads, uploads, signups });
        });
        return () => {
            cancelled = true;
        };
    }, [rangeDays]);

    useEffect(() => {
        let cancelled = false;
        getTopMedia({ metric: mediaMetric, limit: 8 }).then((data) => {
            if (!cancelled) setTopMedia(data);
        });
        return () => {
            cancelled = true;
        };
    }, [mediaMetric]);

    useEffect(() => {
        getTopContributors({ limit: 8 }).then(setTopContributors);
    }, []);

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 mb-2">Rapports</h2>
            <p className="text-gray-500 dark:text-zinc-400 text-sm mb-8">
                Données réelles de la plateforme, rien n&apos;est estimé.
            </p>

            <section className="mb-12">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100">Tendances</h3>
                    <div className="flex items-center gap-1 bg-gray-50 dark:bg-zinc-800 rounded-full p-1">
                        {RANGE_OPTIONS.map((opt) => (
                            <button
                                key={opt.days}
                                type="button"
                                onClick={() => setRangeDays(opt.days)}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                                    rangeDays === opt.days
                                        ? "bg-white dark:bg-zinc-900 text-black dark:text-zinc-100 shadow-sm"
                                        : "text-gray-500 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-100"
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {!trends ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-300 dark:text-zinc-600" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <TrendChart title="Téléchargements" data={trends.downloads} color={COLOR_DOWNLOADS} total={sum(trends.downloads)} />
                        <TrendChart title="Envois" data={trends.uploads} color={COLOR_UPLOADS} total={sum(trends.uploads)} />
                        <TrendChart title="Inscriptions" data={trends.signups} color={COLOR_SIGNUPS} total={sum(trends.signups)} />
                    </div>
                )}
            </section>

            <section>
                <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100 mb-4">Classements</h3>
                <p className="text-gray-400 dark:text-zinc-500 text-xs mb-4 -mt-2">
                    Compteurs actuels, toutes périodes confondues (pas d&apos;historique de vues en base).
                </p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {topMedia === null ? (
                        <div className="border border-gray-100 dark:border-zinc-800 rounded-2xl p-5 flex items-center justify-center h-64">
                            <Loader2 className="w-5 h-5 animate-spin text-gray-300 dark:text-zinc-600" />
                        </div>
                    ) : (
                        <RankingBars
                            title="Médias les plus populaires"
                            color={COLOR_RANKING}
                            valueLabel={MEDIA_METRICS.find((m) => m.key === mediaMetric)?.label}
                            items={topMedia.map((m) => ({
                                key: m.id,
                                label: m.title || "Sans titre",
                                value: m[mediaMetric] || 0,
                                imageUrl: m.thumbnail_url || m.url,
                            }))}
                            metricControl={
                                <select
                                    value={mediaMetric}
                                    onChange={(e) => setMediaMetric(e.target.value)}
                                    className="text-xs font-semibold text-gray-600 dark:text-zinc-300 bg-gray-50 dark:bg-zinc-800 rounded-lg px-2 py-1.5 outline-none border-none"
                                >
                                    {MEDIA_METRICS.map((m) => (
                                        <option key={m.key} value={m.key}>{m.label}</option>
                                    ))}
                                </select>
                            }
                        />
                    )}

                    {topContributors === null ? (
                        <div className="border border-gray-100 dark:border-zinc-800 rounded-2xl p-5 flex items-center justify-center h-64">
                            <Loader2 className="w-5 h-5 animate-spin text-gray-300 dark:text-zinc-600" />
                        </div>
                    ) : (
                        <RankingBars
                            title="Contributeurs les plus téléchargés"
                            color={COLOR_RANKING}
                            valueLabel="Téléchargements"
                            items={topContributors.map((p) => ({
                                key: p.id,
                                label: p.full_name || p.username,
                                value: p.total_downloads || 0,
                                imageUrl: p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.id}`,
                            }))}
                        />
                    )}
                </div>
            </section>
        </div>
    );
}
