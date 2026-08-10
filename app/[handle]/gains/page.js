"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Coins, Banknote } from "lucide-react";
import { getUserProfile, getContributorEarnings, getContributorPayouts } from "../../lib/database";
import { useAuth } from "../../contexts/AuthContext";

export default function UserGainsPage() {
    const { handle } = useParams();
    const decodedHandle = handle ? decodeURIComponent(handle) : "";
    const username = decodedHandle.startsWith("@") ? decodedHandle.slice(1) : null;
    const { user: currentUser } = useAuth();

    const [isOwner, setIsOwner] = useState(false);
    const [loading, setLoading] = useState(true);
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
                    getContributorEarnings(profile.id).then(setEarnings);
                    getContributorPayouts(profile.id).then(setPayouts);
                }
            } catch (err) {
                console.error(err);
            }
            setLoading(false);
        };
        checkOwnership();
    }, [username, currentUser]);

    if (loading) return <div className="py-20 text-center animate-pulse text-gray-400 dark:text-zinc-600">Vérification...</div>;

    if (!isOwner) {
        return (
            <div className="py-[100px] text-center flex flex-col items-center justify-center">
                <div className="w-20 h-20 bg-gray-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-6">
                    <Coins className="w-8 h-8 text-gray-300 dark:text-zinc-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-zinc-100 mb-2">Accès restreint</h3>
                <p className="text-gray-500 dark:text-zinc-400 max-w-sm">Les gains sont privés. Vous ne pouvez voir que les vôtres.</p>
            </div>
        );
    }

    return (
        <div className="max-w-[1320px] mx-auto">
            <p className="text-gray-500 dark:text-zinc-400 text-sm mb-10 max-w-xl">
                Ce que vos ventes Premium vous rapportent. Versé à la main par Mobile Money, puis
                enregistré ici par l&apos;équipe une fois envoyé.
            </p>

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

            {earnings.history.length === 0 ? (
                <div className="mt-8 border border-gray-100 dark:border-zinc-800 rounded-2xl p-10 text-center">
                    <p className="text-sm text-gray-400 dark:text-zinc-500 italic">Aucune vente Premium pour l&apos;instant.</p>
                </div>
            ) : (
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

            <p className="text-center mt-12">
                <Link href={`/@${username}`} className="text-sm text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 underline underline-offset-2">
                    Retour au profil
                </Link>
            </p>
        </div>
    );
}
