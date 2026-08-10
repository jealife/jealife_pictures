"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
    getUserProfile, getUserStats, getUserDownloadsTrend, getUserMilestones,
    getContributorEarnings, getContributorPayouts,
} from "../../lib/database";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import Link from "next/link";
import { BarChart3, Coins, Banknote } from "lucide-react";
import TrendChart from "../../components/charts/TrendChart";
import RankingBars from "../../components/charts/RankingBars";
import MilestonesGrid from "../../components/MilestonesGrid";

const RANGE_OPTIONS = [
    { label: "30 jours", days: 30 },
    { label: "90 jours", days: 90 },
];

// Palette catégorielle validée (skill dataviz, slot 1). Vues et
// téléchargements partagent la même teinte : ce ne sont pas deux séries
// d'un même graphique, mais deux blocs distincts côte à côte.
const COLOR_DOWNLOADS = "#2a78d6";

const sum = (series) => series.reduce((total, d) => total + d.value, 0);

export default function UserStatsPage() {
    const { handle } = useParams();
    const decodedHandle = handle ? decodeURIComponent(handle) : "";
    const username = decodedHandle.startsWith("@") ? decodedHandle.slice(1) : null;
    const { user: currentUser } = useAuth();
    const [isOwner, setIsOwner] = useState(false);
    const [loading, setLoading] = useState(true);
    const [profileId, setProfileId] = useState(null);
    const [stats, setStats] = useState({ total_views: 0, total_downloads: 0 });
    const [topViewed, setTopViewed] = useState([]);
    const [topDownloaded, setTopDownloaded] = useState([]);
    const [rangeDays, setRangeDays] = useState(30);
    const [downloadsTrend, setDownloadsTrend] = useState(null);
    const [milestones, setMilestones] = useState([]);
    const [earnings, setEarnings] = useState({ balance: 0, history: [] });
    const [payouts, setPayouts] = useState([]);

    useEffect(() => {
        const checkOwnership = async () => {
            if (!username || !currentUser) {
                setIsOwner(false);
                setLoading(false);
                return;
            }
            try {
                const profile = await getUserProfile(username);
                if (profile && profile.id === currentUser.id) {
                    setIsOwner(true);
                    setProfileId(profile.id);
                    const userStats = await getUserStats(profile.id);
                    if (userStats) setStats(userStats);

                    getUserMilestones().then(setMilestones);
                    getContributorEarnings(profile.id).then(setEarnings);
                    getContributorPayouts(profile.id).then(setPayouts);

                    const { data: vData } = await supabase
                        .from('media')
                        .select('id, url, thumbnail_url, title, views_count')
                        .eq('user_id', profile.id)
                        .eq('status', 'published')
                        .order('views_count', { ascending: false })
                        .limit(5);
                    if (vData) setTopViewed(vData);

                    const { data: dData } = await supabase
                        .from('media')
                        .select('id, url, thumbnail_url, title, downloads_count')
                        .eq('user_id', profile.id)
                        .eq('status', 'published')
                        .order('downloads_count', { ascending: false })
                        .limit(5);
                    if (dData) setTopDownloaded(dData);
                }
            } catch (err) {
                console.error(err);
            }
            setLoading(false);
        };
        checkOwnership();
    }, [username, currentUser]);

    useEffect(() => {
        if (!profileId) return;
        let cancelled = false;
        // Pas de reset à `null` au changement de période : le graphique
        // précédent reste affiché pendant le rechargement (voir dataviz :
        // "refetch keeps the frame").
        getUserDownloadsTrend(profileId, rangeDays).then((trend) => {
            if (!cancelled) setDownloadsTrend(trend);
        });
        return () => {
            cancelled = true;
        };
    }, [profileId, rangeDays]);

    if (loading) return <div className="py-20 text-center animate-pulse text-gray-400 dark:text-zinc-600">Vérification...</div>;

    if (!isOwner) {
        return (
            <div className="py-[100px] text-center flex flex-col items-center justify-center">
                <div className="w-20 h-20 bg-gray-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-6">
                    <BarChart3 className="w-8 h-8 text-gray-300 dark:text-zinc-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-zinc-100 mb-2">Accès restreint</h3>
                <p className="text-gray-500 dark:text-zinc-400 max-w-sm">Les statistiques sont privées. Vous ne pouvez voir que les vôtres.</p>
            </div>
        );
    }

    return (
        <div className="max-w-[1320px] mx-auto">
            <MilestonesGrid milestones={milestones} />

            <div className="mb-10 flex items-center justify-between flex-wrap gap-4">
                <span className="font-bold text-gray-900 dark:text-zinc-100">Aperçu</span>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {downloadsTrend === null ? (
                    <div className="border border-gray-100 dark:border-zinc-800 rounded-2xl p-5 h-[230px] animate-pulse bg-gray-50 dark:bg-zinc-800/50" />
                ) : (
                    <TrendChart
                        title="Téléchargements"
                        data={downloadsTrend}
                        color={COLOR_DOWNLOADS}
                        total={sum(downloadsTrend)}
                    />
                )}

                {/* Vues : pas d'historique par jour en base (seul un compteur
                    agrégé existe), donc un total plutôt qu'une tendance
                    inventée. */}
                <div className="border border-gray-100 dark:border-zinc-800 rounded-2xl p-5 bg-white dark:bg-zinc-900">
                    <span className="text-sm font-bold text-gray-900 dark:text-zinc-100">Vues</span>
                    <p className="text-2xl font-extrabold text-gray-900 dark:text-zinc-100 mt-1 tabular-nums">
                        {stats.total_views?.toLocaleString('fr-FR') || 0}
                    </p>
                    <p className="text-sm text-gray-400 dark:text-zinc-500 mt-3">
                        Total cumulé, toutes vos photos confondues.
                    </p>
                </div>
            </div>

            <div className="mt-12">
                <div className="flex items-center gap-2 mb-6">
                    <Coins className="w-4 h-4 text-gray-400 dark:text-zinc-500" />
                    <span className="font-bold text-gray-900 dark:text-zinc-100">Gains Premium</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="border border-gray-100 dark:border-zinc-800 rounded-2xl p-5 bg-white dark:bg-zinc-900">
                        <span className="text-sm font-bold text-gray-900 dark:text-zinc-100">Solde en attente</span>
                        <p className="text-2xl font-extrabold text-gray-900 dark:text-zinc-100 mt-1 tabular-nums">
                            {Number(earnings.balance || 0).toLocaleString('fr-FR')} FCFA
                        </p>
                        <p className="text-sm text-gray-400 dark:text-zinc-500 mt-3">
                            Reçu de vos ventes Premium ; versé à la main par Mobile Money, puis
                            enregistré ici par l&apos;équipe.
                        </p>
                    </div>

                    <div className="border border-gray-100 dark:border-zinc-800 rounded-2xl p-5 bg-white dark:bg-zinc-900">
                        <span className="text-sm font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
                            <Banknote className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" /> Versements reçus
                        </span>
                        {payouts.length === 0 ? (
                            <p className="text-sm text-gray-400 dark:text-zinc-500 mt-3">Aucun versement pour l&apos;instant.</p>
                        ) : (
                            <ul className="mt-3 space-y-2.5">
                                {payouts.slice(0, 5).map((payout) => (
                                    <li key={payout.id} className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500 dark:text-zinc-400">
                                            {new Date(payout.paid_at || payout.created_at).toLocaleDateString('fr-FR')}
                                        </span>
                                        <span className="font-semibold text-gray-900 dark:text-zinc-100 tabular-nums">
                                            {Number(payout.amount_fcfa).toLocaleString('fr-FR')} FCFA
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {earnings.history.length > 0 && (
                    <div className="mt-8 border border-gray-100 dark:border-zinc-800 rounded-2xl p-5 bg-white dark:bg-zinc-900">
                        <span className="text-sm font-bold text-gray-900 dark:text-zinc-100">Ventes récentes</span>
                        <ul className="mt-3 divide-y divide-gray-50 dark:divide-zinc-800">
                            {earnings.history.slice(0, 8).map((sale) => (
                                <li key={sale.id} className="flex items-center gap-3 py-2.5">
                                    {sale.media?.thumbnail_url && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={sale.media.thumbnail_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                                    )}
                                    <span className="flex-1 min-w-0 text-sm text-gray-700 dark:text-zinc-300 truncate">
                                        {sale.media?.title || 'Média supprimé'}
                                    </span>
                                    <span className="text-sm font-semibold text-gray-900 dark:text-zinc-100 tabular-nums shrink-0">
                                        +{Number(sale.contributor_earning_fcfa).toLocaleString('fr-FR')} FCFA
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
                <RankingBars
                    title="Vos photos les plus vues"
                    color={COLOR_DOWNLOADS}
                    valueLabel="Vues"
                    emptyLabel="Vous n'avez publié aucune photo."
                    items={topViewed.map((photo) => ({
                        key: photo.id,
                        label: photo.title || `Photo #${photo.id}`,
                        value: photo.views_count || 0,
                        imageUrl: photo.thumbnail_url || photo.url,
                    }))}
                />

                <RankingBars
                    title="Vos photos les plus téléchargées"
                    color={COLOR_DOWNLOADS}
                    valueLabel="Téléchargements"
                    emptyLabel="Vous n'avez publié aucune photo."
                    items={topDownloaded.map((photo) => ({
                        key: photo.id,
                        label: photo.title || `Photo #${photo.id}`,
                        value: photo.downloads_count || 0,
                        imageUrl: photo.thumbnail_url || photo.url,
                    }))}
                />
            </div>

            <p className="text-center mt-12">
                <Link href={`/@${username}`} className="text-sm text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 underline underline-offset-2">
                    Retour au profil
                </Link>
            </p>
        </div>
    );
}
