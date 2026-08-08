"use client";

import { Calendar, Download, Eye, TrendingUp } from "lucide-react";

// Doit rester synchronisé avec le tableau `tiers` de get_my_milestones()
// (migration 0015) : c'est ce qui détermine le prochain palier à afficher
// tant qu'il n'est pas atteint.
const TIERS = [10, 50, 100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000];

const COLOR_CLASSES = {
    red: { bg: "bg-red-50 dark:bg-red-950", text: "text-red-500 dark:text-red-400" },
    emerald: { bg: "bg-emerald-50 dark:bg-emerald-950", text: "text-emerald-600 dark:text-emerald-400" },
    blue: { bg: "bg-blue-50 dark:bg-blue-950", text: "text-blue-500 dark:text-blue-400" },
    amber: { bg: "bg-amber-50 dark:bg-amber-950", text: "text-amber-500 dark:text-amber-400" },
};

function formatDate(iso) {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

// Le palier le plus haut déjà atteint pour une échelle donnée (vues,
// téléchargements) — `get_my_milestones` ne renvoie que des paliers
// franchis, celui à la valeur `tier` la plus élevée est donc le dernier
// atteint.
function bestTierFor(milestones, metric) {
    const rows = milestones.filter((m) => m.metric === metric);
    if (rows.length === 0) return null;
    return rows.reduce((best, row) => (row.tier > best.tier ? row : best), rows[0]);
}

function nextTierFor(milestones, metric) {
    const best = bestTierFor(milestones, metric);
    const achievedTier = best ? best.tier : 0;
    return TIERS.find((tier) => tier > achievedTier) ?? null;
}

/**
 * « Vos évènements majeurs » — jalons du contributeur, sur le même
 * principe que la section homonyme d'Unsplash (page de statistiques
 * privée). Deux jalons ponctuels (première publication, premier
 * téléchargement reçu) et deux échelles de paliers (vues,
 * téléchargements) ; un palier non encore atteint reste grisé, avec la
 * cible à atteindre plutôt qu'une date.
 */
export default function MilestonesGrid({ milestones }) {
    const firstPublication = milestones.find((m) => m.metric === "first_publication");
    const firstDownload = milestones.find((m) => m.metric === "first_download_received");
    const bestViews = bestTierFor(milestones, "views");
    const bestDownloads = bestTierFor(milestones, "downloads");
    const nextViews = nextTierFor(milestones, "views");
    const nextDownloads = nextTierFor(milestones, "downloads");

    const cards = [
        {
            key: "first_publication",
            icon: Calendar,
            color: "red",
            achieved: !!firstPublication,
            title: "Première publication",
            achievedLabel: firstPublication ? `Publiée le ${formatDate(firstPublication.achieved_at)}` : null,
            lockedLabel: "Publiez votre première photo",
        },
        {
            key: "first_download_received",
            icon: Download,
            color: "emerald",
            achieved: !!firstDownload,
            title: "Premier téléchargement",
            achievedLabel: firstDownload ? `Téléchargée le ${formatDate(firstDownload.achieved_at)}` : null,
            lockedLabel: "En attente du premier téléchargement d'une de vos photos",
        },
        {
            key: "views",
            icon: Eye,
            color: "blue",
            achieved: !!bestViews,
            title: bestViews ? `${bestViews.tier.toLocaleString("fr-FR")} vues` : "Vues",
            achievedLabel: bestViews ? `Atteint le ${formatDate(bestViews.achieved_at)}` : null,
            lockedLabel: nextViews ? `Atteignez ${nextViews.toLocaleString("fr-FR")} vues` : null,
        },
        {
            key: "downloads",
            icon: TrendingUp,
            color: "amber",
            achieved: !!bestDownloads,
            title: bestDownloads ? `${bestDownloads.tier.toLocaleString("fr-FR")} téléchargements` : "Téléchargements",
            achievedLabel: bestDownloads ? `Atteint le ${formatDate(bestDownloads.achieved_at)}` : null,
            lockedLabel: nextDownloads ? `Atteignez ${nextDownloads.toLocaleString("fr-FR")} téléchargements` : null,
        },
    ];

    return (
        <section className="mb-12">
            <h2 className="font-bold text-gray-900 dark:text-zinc-100 mb-4">Vos évènements majeurs</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {cards.map(({ key, icon: Icon, color, achieved, title, achievedLabel, lockedLabel }) => (
                    <div
                        key={key}
                        className="flex flex-col items-center text-center gap-3 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800"
                    >
                        <span
                            className={`w-14 h-14 rounded-full flex items-center justify-center ${
                                achieved ? COLOR_CLASSES[color].bg : "bg-gray-50 dark:bg-zinc-800"
                            }`}
                        >
                            <Icon className={`w-6 h-6 ${achieved ? COLOR_CLASSES[color].text : "text-gray-300 dark:text-zinc-600"}`} />
                        </span>
                        <div>
                            <p className={`font-bold ${achieved ? "text-gray-900 dark:text-zinc-100" : "text-gray-400 dark:text-zinc-500"}`}>
                                {title}
                            </p>
                            <p className={`text-sm mt-1 ${achieved ? "text-gray-500 dark:text-zinc-400" : "text-gray-400 dark:text-zinc-600"}`}>
                                {achieved ? achievedLabel : lockedLabel}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
