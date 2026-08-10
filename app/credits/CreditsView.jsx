"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Coins, Loader2, CheckCircle2, Smartphone } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { getSetting, getCreditPacks, getMyWallet, purchaseCredits } from "../lib/database";

const fcfa = (n) => `${Number(n || 0).toLocaleString("fr-FR")} FCFA`;

/**
 * Page publique d'achat de crédits. Les lots (`credit_packs`) et
 * l'interrupteur `payments_enabled` sont entièrement configurés depuis
 * `/admin/monetization` (migration 0019) : tant que le paiement Mobile
 * Money n'est pas branché, cette page reste utile — elle montre déjà les
 * lots et leur prix — sans jamais laisser croire qu'un achat a réellement
 * abouti.
 */
export default function CreditsView() {
    const { user } = useAuth();
    const router = useRouter();
    const [state, setState] = useState(null);
    const [buyingId, setBuyingId] = useState(null);
    const [confirmedId, setConfirmedId] = useState(null);
    const [error, setError] = useState(null);

    const load = () => Promise.all([
        getSetting("payments_enabled"),
        getCreditPacks(),
        user ? getMyWallet() : Promise.resolve(null),
    ]).then(([enabled, packs, wallet]) => {
        setState({ paymentsEnabled: enabled === "true", packs, wallet });
    });

    useEffect(() => { load(); }, [user]);

    const buy = async (pack) => {
        if (!user) {
            router.push("/login?redirect=/credits");
            return;
        }
        setBuyingId(pack.id);
        setError(null);
        const result = await purchaseCredits(pack.id);
        if (result.success) {
            setConfirmedId(pack.id);
        } else {
            setError(result.error);
        }
        setBuyingId(null);
    };

    if (!state) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
                <Loader2 className="w-8 h-8 animate-spin text-gray-300 dark:text-zinc-600" />
            </div>
        );
    }

    const { paymentsEnabled, packs, wallet } = state;

    return (
        <main className="min-h-screen bg-white dark:bg-zinc-950">
            <div className="max-w-3xl mx-auto px-4 py-16 md:py-24">
                <div className="w-14 h-14 bg-amber-50 dark:bg-amber-950 rounded-2xl flex items-center justify-center mb-6">
                    <Sparkles className="w-7 h-7 text-amber-500" />
                </div>

                <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-zinc-100 mb-4">
                    Crédits
                </h1>
                <p className="text-lg text-gray-500 dark:text-zinc-400 mb-10 max-w-xl">
                    Les crédits débloquent les photos, illustrations et vidéos marquées Premium
                    par leurs contributeurs, qui touchent une part de chaque achat sur leur
                    propre contenu.
                </p>

                {user && (
                    <div className="flex items-center gap-3 p-4 mb-10 bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl w-fit">
                        <Coins className="w-5 h-5 text-gray-400 dark:text-zinc-500" />
                        <span className="text-sm text-gray-600 dark:text-zinc-400">
                            Votre solde actuel :{" "}
                            <strong className="text-gray-900 dark:text-zinc-100">
                                {wallet?.credit_balance || 0} crédit{(wallet?.credit_balance || 0) > 1 ? "s" : ""}
                            </strong>
                        </span>
                    </div>
                )}

                {!paymentsEnabled && (
                    <div className="flex gap-3 p-5 mb-10 bg-amber-50 dark:bg-amber-950 border border-amber-100 dark:border-amber-900 rounded-2xl">
                        <Smartphone className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
                            Le paiement en ligne n&apos;est pas encore activé. Bientôt, vous pourrez
                            acheter des crédits directement par Mobile Money et les dépenser sur du
                            contenu Premium — les lots ci-dessous sont déjà prêts.
                        </p>
                    </div>
                )}

                {error && (
                    <p className="mb-6 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 border border-red-100 dark:border-red-900 rounded-xl px-4 py-3">
                        {error}
                    </p>
                )}

                {packs.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-zinc-500 italic">
                        Aucun lot de crédits n&apos;est disponible pour l&apos;instant.
                    </p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {packs.map((pack) => (
                            <div
                                key={pack.id}
                                className="p-6 border border-gray-100 dark:border-zinc-800 rounded-2xl flex flex-col gap-4"
                            >
                                <div>
                                    <p className="text-2xl font-extrabold text-gray-900 dark:text-zinc-100">
                                        {pack.credits} crédit{pack.credits > 1 ? "s" : ""}
                                    </p>
                                    <p className="text-gray-500 dark:text-zinc-400 text-sm">{fcfa(pack.price_fcfa)}</p>
                                </div>

                                {!paymentsEnabled ? (
                                    <div className="mt-auto py-3 px-4 bg-gray-50 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500 rounded-xl text-sm font-bold text-center cursor-default">
                                        Bientôt disponible
                                    </div>
                                ) : confirmedId === pack.id ? (
                                    <div className="mt-auto py-3 px-4 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-xl text-sm font-bold text-center flex items-center justify-center gap-2">
                                        <CheckCircle2 className="w-4 h-4" /> Commande enregistrée
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => buy(pack)}
                                        disabled={buyingId === pack.id}
                                        className="mt-auto py-3 px-4 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-bold hover:bg-gray-800 dark:hover:bg-zinc-200 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                                    >
                                        {buyingId === pack.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Acheter"}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
