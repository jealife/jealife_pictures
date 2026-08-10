"use client";

import { useEffect, useState } from "react";
import {
    Loader2, CheckCircle2, Plus, Pencil, Check, X, Banknote, Power,
} from "lucide-react";
import {
    getSetting, setSetting,
    getPremiumPricing, setPremiumPricing,
    getCreditPacks, saveCreditPack,
    getAdminPayoutsQueue, markPayoutPaid,
} from "../../lib/database";

const MEDIA_TYPE_LABELS = { photo: "Photo", illustration: "Illustration", video: "Vidéo" };
const MEDIA_TYPE_ORDER = ["photo", "illustration", "video"];

const fcfa = (n) => `${Number(n || 0).toLocaleString("fr-FR")} FCFA`;

/**
 * Tout ce que l'admin doit pouvoir régler avant même que le paiement Mobile
 * Money ne soit branché : l'interrupteur général, le partage des revenus, le
 * prix par type de média, les lots de crédits, et la file des versements dus
 * aux contributeurs. Rien ici ne dépend de `payments_enabled` — l'admin doit
 * pouvoir tout préparer à l'avance, seule l'interface publique attend
 * l'interrupteur.
 */
export default function AdminMonetizationPage() {
    // Un seul objet d'état pour tout ce qui vient du chargement initial : une
    // seule mise à jour d'état à la fois, jamais plusieurs `setX()` d'affilée
    // dans un effet (même convention que `AdminReportsPage`).
    const [state, setState] = useState(null);
    const [savingKey, setSavingKey] = useState(null);
    const [savedKey, setSavedKey] = useState(null);

    const load = () => Promise.all([
        getSetting("payments_enabled"),
        getSetting("contributor_share_percent"),
        getSetting("credit_value_fcfa"),
        getPremiumPricing(),
        getCreditPacks(),
        getAdminPayoutsQueue(),
    ]).then(([enabled, share, value, pricingRows, packRows, payoutRows]) => {
        setState({
            paymentsEnabled: enabled === "true",
            sharePercent: share || "35",
            creditValue: value || "500",
            pricing: Object.fromEntries(pricingRows.map((r) => [r.media_type, String(r.credits_cost)])),
            packs: packRows,
            payouts: payoutRows,
        });
    });

    useEffect(() => { load(); }, []);

    const flashSaved = (key) => {
        setSavedKey(key);
        setTimeout(() => setSavedKey((k) => (k === key ? null : k)), 2500);
    };

    const togglePayments = async () => {
        if (savingKey || !state) return;
        const next = !state.paymentsEnabled;
        setSavingKey("payments_enabled");
        const { success } = await setSetting("payments_enabled", next ? "true" : "false");
        if (success) {
            setState((s) => ({ ...s, paymentsEnabled: next }));
            flashSaved("payments_enabled");
        }
        setSavingKey(null);
    };

    const saveRevenueShare = async () => {
        setSavingKey("share");
        const results = await Promise.all([
            setSetting("contributor_share_percent", String(state.sharePercent)),
            setSetting("credit_value_fcfa", String(state.creditValue)),
        ]);
        if (results.every((r) => r.success)) flashSaved("share");
        setSavingKey(null);
    };

    const savePricing = async (mediaType) => {
        const cost = Number(state.pricing[mediaType]);
        if (!Number.isFinite(cost) || cost <= 0) return;
        setSavingKey(`pricing:${mediaType}`);
        const { success } = await setPremiumPricing(mediaType, cost);
        if (success) flashSaved(`pricing:${mediaType}`);
        setSavingKey(null);
    };

    if (!state) {
        return <Loader2 className="w-6 h-6 animate-spin text-gray-300 dark:text-zinc-600" />;
    }

    const { paymentsEnabled, sharePercent, creditValue, pricing, packs, payouts } = state;

    return (
        <div className="space-y-16">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 mb-1">Monétisation</h2>
                <p className="text-gray-500 dark:text-zinc-400 text-sm">
                    Configurez tout dès maintenant : tant que « Paiements activés » est désactivé, les
                    visiteurs voient un état « Bientôt disponible » à la place des boutons d&apos;achat.
                </p>
            </div>

            {/* Interrupteur général */}
            <section className="max-w-xl">
                <button
                    type="button"
                    onClick={togglePayments}
                    disabled={savingKey === "payments_enabled"}
                    className={`w-full flex items-center gap-4 p-5 border rounded-2xl transition-all disabled:opacity-60 ${
                        paymentsEnabled
                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                            : "border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600"
                    }`}
                >
                    <Power className={`w-5 h-5 shrink-0 ${paymentsEnabled ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400 dark:text-zinc-500"}`} />
                    <div className="text-left flex-1">
                        <p className="font-bold text-gray-900 dark:text-zinc-100">
                            Paiements {paymentsEnabled ? "activés" : "désactivés"}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-zinc-400">
                            {paymentsEnabled
                                ? "Les visiteurs peuvent acheter des crédits et débloquer du contenu Premium."
                                : "Le contenu Premium affiche « Bientôt disponible » sur tout le site."}
                        </p>
                    </div>
                    {savedKey === "payments_enabled" && <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                </button>
            </section>

            {/* Répartition des revenus */}
            <section className="max-w-xl">
                <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100 mb-1">Répartition des revenus</h3>
                <p className="text-gray-500 dark:text-zinc-400 text-sm mb-5">
                    À chaque téléchargement Premium, le contributeur touche ce pourcentage, calculé sur la
                    valeur de référence d&apos;UN crédit — indépendante du prix d&apos;un lot particulier,
                    qui peut varier avec des rabais au volume.
                </p>

                <div className="flex flex-wrap items-end gap-4">
                    <label className="block">
                        <span className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 mb-1.5">Part du contributeur (%)</span>
                        <input
                            type="number" min="0" max="100" step="1"
                            value={sharePercent}
                            onChange={(e) => setState((s) => ({ ...s, sharePercent: e.target.value }))}
                            className="w-36 px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 rounded-xl text-sm focus:ring-2 focus:ring-black dark:focus:ring-white outline-none"
                        />
                    </label>
                    <label className="block">
                        <span className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 mb-1.5">Valeur d&apos;un crédit (FCFA)</span>
                        <input
                            type="number" min="0" step="1"
                            value={creditValue}
                            onChange={(e) => setState((s) => ({ ...s, creditValue: e.target.value }))}
                            className="w-36 px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 rounded-xl text-sm focus:ring-2 focus:ring-black dark:focus:ring-white outline-none"
                        />
                    </label>
                    <button
                        type="button"
                        onClick={saveRevenueShare}
                        disabled={savingKey === "share"}
                        className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-bold hover:bg-gray-800 dark:hover:bg-zinc-200 disabled:opacity-50"
                    >
                        Enregistrer
                    </button>
                    {savedKey === "share" && <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
                </div>
            </section>

            {/* Prix Premium par type de média */}
            <section className="max-w-xl">
                <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100 mb-1">Prix Premium par type</h3>
                <p className="text-gray-500 dark:text-zinc-400 text-sm mb-5">
                    Coût en crédits pour débloquer un téléchargement, selon le type de média.
                </p>

                <div className="space-y-2">
                    {MEDIA_TYPE_ORDER.map((mediaType) => (
                        <div key={mediaType} className="flex items-center gap-4 p-3 border border-gray-100 dark:border-zinc-800 rounded-xl">
                            <span className="flex-1 font-semibold text-gray-900 dark:text-zinc-100">{MEDIA_TYPE_LABELS[mediaType]}</span>
                            <input
                                type="number" min="1" step="1"
                                value={pricing[mediaType] ?? ""}
                                onChange={(e) => setState((s) => ({ ...s, pricing: { ...s.pricing, [mediaType]: e.target.value } }))}
                                className="w-24 px-3 py-1.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 rounded-lg text-sm focus:ring-2 focus:ring-black dark:focus:ring-white outline-none"
                            />
                            <span className="text-xs text-gray-400 dark:text-zinc-500">crédit{Number(pricing[mediaType]) > 1 ? "s" : ""}</span>
                            <button
                                type="button"
                                onClick={() => savePricing(mediaType)}
                                disabled={savingKey === `pricing:${mediaType}`}
                                className="px-3 py-1.5 bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 rounded-lg text-xs font-bold hover:bg-gray-200 dark:hover:bg-zinc-700 disabled:opacity-50"
                            >
                                Enregistrer
                            </button>
                            {savedKey === `pricing:${mediaType}` && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                        </div>
                    ))}
                </div>
            </section>

            {/* Lots de crédits */}
            <CreditPacksSection packs={packs} onChanged={load} />

            {/* Versements aux contributeurs */}
            <PayoutsSection payouts={payouts} onChanged={load} />
        </div>
    );
}

function CreditPacksSection({ packs, onChanged }) {
    const [newPack, setNewPack] = useState({ credits: "", priceFcfa: "" });
    const [creating, setCreating] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editDraft, setEditDraft] = useState({ credits: "", priceFcfa: "" });
    const [busyId, setBusyId] = useState(null);

    const submitCreate = async (event) => {
        event.preventDefault();
        const credits = Number(newPack.credits);
        const priceFcfa = Number(newPack.priceFcfa);
        if (!credits || !priceFcfa || creating) return;
        setCreating(true);
        await saveCreditPack({ credits, priceFcfa, isActive: true });
        setNewPack({ credits: "", priceFcfa: "" });
        setCreating(false);
        onChanged();
    };

    const startEdit = (pack) => {
        setEditingId(pack.id);
        setEditDraft({ credits: String(pack.credits), priceFcfa: String(pack.price_fcfa) });
    };

    const saveEdit = async (pack) => {
        setBusyId(pack.id);
        await saveCreditPack({
            id: pack.id,
            credits: Number(editDraft.credits),
            priceFcfa: Number(editDraft.priceFcfa),
            isActive: pack.is_active,
        });
        setEditingId(null);
        setBusyId(null);
        onChanged();
    };

    const toggleActive = async (pack) => {
        setBusyId(pack.id);
        await saveCreditPack({
            id: pack.id, credits: pack.credits, priceFcfa: pack.price_fcfa, isActive: !pack.is_active,
        });
        setBusyId(null);
        onChanged();
    };

    return (
        <section className="max-w-xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100 mb-1">Lots de crédits</h3>
            <p className="text-gray-500 dark:text-zinc-400 text-sm mb-5">
                Ce que les visiteurs achètent. Désactivez un lot plutôt que de le supprimer : les achats
                déjà effectués y font toujours référence.
            </p>

            <form onSubmit={submitCreate} className="flex flex-wrap items-end gap-3 mb-6">
                <label className="block">
                    <span className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 mb-1.5">Crédits</span>
                    <input
                        type="number" min="1" step="1"
                        value={newPack.credits}
                        onChange={(e) => setNewPack((p) => ({ ...p, credits: e.target.value }))}
                        className="w-28 px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 rounded-xl text-sm focus:ring-2 focus:ring-black dark:focus:ring-white outline-none"
                    />
                </label>
                <label className="block">
                    <span className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 mb-1.5">Prix (FCFA)</span>
                    <input
                        type="number" min="1" step="1"
                        value={newPack.priceFcfa}
                        onChange={(e) => setNewPack((p) => ({ ...p, priceFcfa: e.target.value }))}
                        className="w-32 px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 rounded-xl text-sm focus:ring-2 focus:ring-black dark:focus:ring-white outline-none"
                    />
                </label>
                <button
                    type="submit"
                    disabled={creating || !newPack.credits || !newPack.priceFcfa}
                    className="px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-bold hover:bg-gray-800 dark:hover:bg-zinc-200 disabled:opacity-50 flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Ajouter
                </button>
            </form>

            {packs.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-zinc-500 italic">Aucun lot pour l&apos;instant.</p>
            ) : (
                <div className="space-y-2">
                    {packs.map((pack) => (
                        <div key={pack.id} className={`flex items-center gap-4 p-3 border rounded-xl ${pack.is_active ? "border-gray-100 dark:border-zinc-800" : "border-gray-100 dark:border-zinc-800 opacity-50"}`}>
                            {editingId === pack.id ? (
                                <div className="flex-1 flex items-center gap-2">
                                    <input
                                        type="number" min="1"
                                        value={editDraft.credits}
                                        onChange={(e) => setEditDraft((d) => ({ ...d, credits: e.target.value }))}
                                        className="w-20 px-2 py-1.5 border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 rounded-lg text-sm"
                                    />
                                    <span className="text-xs text-gray-400">crédits pour</span>
                                    <input
                                        type="number" min="1"
                                        value={editDraft.priceFcfa}
                                        onChange={(e) => setEditDraft((d) => ({ ...d, priceFcfa: e.target.value }))}
                                        className="w-24 px-2 py-1.5 border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 rounded-lg text-sm"
                                    />
                                    <span className="text-xs text-gray-400">FCFA</span>
                                </div>
                            ) : (
                                <button onClick={() => startEdit(pack)} className="flex-1 text-left">
                                    <p className="font-semibold text-gray-900 dark:text-zinc-100">
                                        {pack.credits} crédits — {fcfa(pack.price_fcfa)}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-zinc-400">
                                        {pack.is_active ? "Actif" : "Désactivé"}
                                    </p>
                                </button>
                            )}

                            {editingId === pack.id ? (
                                <>
                                    <button
                                        disabled={busyId === pack.id}
                                        onClick={() => saveEdit(pack)}
                                        className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950 rounded-lg disabled:opacity-50"
                                    >
                                        <Check className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => setEditingId(null)} className="p-2 text-gray-400 dark:text-zinc-500 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg">
                                        <X className="w-4 h-4" />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        disabled={busyId === pack.id}
                                        onClick={() => startEdit(pack)}
                                        className="p-2 text-gray-400 dark:text-zinc-500 hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg disabled:opacity-50"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                        disabled={busyId === pack.id}
                                        onClick={() => toggleActive(pack)}
                                        className="px-3 py-1.5 text-xs font-bold rounded-lg disabled:opacity-50 text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800"
                                    >
                                        {pack.is_active ? "Désactiver" : "Réactiver"}
                                    </button>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

function PayoutsSection({ payouts, onChanged }) {
    const [drafts, setDrafts] = useState({});
    const [busyId, setBusyId] = useState(null);

    const confirmPayout = async (row) => {
        const draft = drafts[row.user_id] || {};
        const amount = Number(draft.amount ?? row.earnings_balance_fcfa);
        if (!Number.isFinite(amount) || amount <= 0) return;

        const label = row.profiles?.full_name || row.profiles?.username || "ce contributeur";
        if (!confirm(`Confirmez-vous avoir déjà envoyé ${fcfa(amount)} à ${label} par Mobile Money ? Ceci ne fait qu'enregistrer le versement, sans envoyer d'argent.`)) return;

        setBusyId(row.user_id);
        await markPayoutPaid(row.user_id, amount, draft.note || null);
        setBusyId(null);
        onChanged();
    };

    return (
        <section className="max-w-xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100 mb-1">Versements à effectuer</h3>
            <p className="text-gray-500 dark:text-zinc-400 text-sm mb-5">
                Envoyez l&apos;argent vous-même par Mobile Money, puis enregistrez-le ici pour mettre à
                jour le solde du contributeur.
            </p>

            {payouts.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-zinc-500 italic">Aucun versement en attente.</p>
            ) : (
                <div className="space-y-3">
                    {payouts.map((row) => {
                        const draft = drafts[row.user_id] || {};
                        return (
                            <div key={row.user_id} className="p-4 border border-gray-100 dark:border-zinc-800 rounded-xl">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2.5">
                                        <img
                                            src={row.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${row.user_id}`}
                                            alt=""
                                            className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-zinc-700"
                                        />
                                        <div>
                                            <p className="font-semibold text-gray-900 dark:text-zinc-100 text-sm">
                                                {row.profiles?.full_name || row.profiles?.username}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-zinc-400">@{row.profiles?.username}</p>
                                        </div>
                                    </div>
                                    <span className="flex items-center gap-1.5 text-sm font-bold text-gray-900 dark:text-zinc-100">
                                        <Banknote className="w-4 h-4 text-gray-400 dark:text-zinc-500" /> {fcfa(row.earnings_balance_fcfa)}
                                    </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <input
                                        type="number" min="1" max={row.earnings_balance_fcfa}
                                        placeholder={String(row.earnings_balance_fcfa)}
                                        value={draft.amount ?? ""}
                                        onChange={(e) => setDrafts((d) => ({ ...d, [row.user_id]: { ...draft, amount: e.target.value } }))}
                                        className="w-32 px-3 py-1.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 rounded-lg text-sm focus:ring-2 focus:ring-black dark:focus:ring-white outline-none"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Référence Mobile Money (optionnel)"
                                        value={draft.note ?? ""}
                                        onChange={(e) => setDrafts((d) => ({ ...d, [row.user_id]: { ...draft, note: e.target.value } }))}
                                        className="flex-1 min-w-[10rem] px-3 py-1.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 rounded-lg text-sm focus:ring-2 focus:ring-black dark:focus:ring-white outline-none"
                                    />
                                    <button
                                        type="button"
                                        disabled={busyId === row.user_id}
                                        onClick={() => confirmPayout(row)}
                                        className="px-4 py-1.5 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-bold hover:bg-gray-800 dark:hover:bg-zinc-200 disabled:opacity-50"
                                    >
                                        Marquer comme versé
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
