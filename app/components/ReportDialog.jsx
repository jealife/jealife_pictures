"use client";

import { useState } from "react";
import { X, Flag, Check } from "lucide-react";
import { reportMedia } from "../lib/database";

const REASONS = [
    { key: "droits", label: "Cette image ne m'appartient pas / droits non respectés" },
    { key: "personne", label: "Une personne y figure sans son accord" },
    { key: "contenu-inapproprie", label: "Contenu choquant ou inapproprié" },
    { key: "spam", label: "Spam ou contenu hors sujet" },
    { key: "autre", label: "Autre raison" },
];

/**
 * Signalement d'un média.
 *
 * Le site publiait immédiatement tout ce qui était envoyé, sans revue et sans
 * aucun moyen d'alerter. Pour une banque d'images qui s'adresse à des
 * photographes, l'absence de recours en cas de vol d'image est un problème de
 * confiance autant que de droit.
 */
export default function ReportDialog({ mediaId, userId, onClose }) {
    const [reason, setReason] = useState(REASONS[0].key);
    const [details, setDetails] = useState("");
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState(null);

    const submit = async (event) => {
        event.preventDefault();
        setSending(true);
        setError(null);

        const { success, error: reportError } = await reportMedia(mediaId, {
            reason,
            details: details.trim(),
            reporterId: userId,
        });

        setSending(false);
        if (success) setSent(true);
        else setError(reportError || "L'envoi a échoué. Réessayez.");
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label="Signaler cette image"
        >
            <div
                className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                onClick={(event) => event.stopPropagation()}
            >
                {sent ? (
                    <div className="text-center py-6">
                        <Check className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Signalement envoyé</h2>
                        <p className="text-gray-500 text-sm mb-6">
                            Nous examinons chaque signalement. Merci d&apos;aider à garder la
                            plateforme saine.
                        </p>
                        <button
                            onClick={onClose}
                            className="px-6 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-colors"
                        >
                            Fermer
                        </button>
                    </div>
                ) : (
                    <form onSubmit={submit}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
                                <Flag className="w-5 h-5 text-red-500" /> Signaler
                            </h2>
                            <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full" aria-label="Fermer">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <fieldset className="space-y-2 mb-5">
                            <legend className="sr-only">Motif du signalement</legend>
                            {REASONS.map((item) => (
                                <label
                                    key={item.key}
                                    className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${
                                        reason === item.key
                                            ? "border-black bg-gray-50"
                                            : "border-gray-200 hover:border-gray-300"
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="reason"
                                        value={item.key}
                                        checked={reason === item.key}
                                        onChange={() => setReason(item.key)}
                                        className="mt-1"
                                    />
                                    <span className="text-sm text-gray-700">{item.label}</span>
                                </label>
                            ))}
                        </fieldset>

                        <label htmlFor="report-details" className="block text-sm font-bold text-gray-900 mb-2">
                            Précisions <span className="font-normal text-gray-400">(facultatif)</span>
                        </label>
                        <textarea
                            id="report-details"
                            rows={3}
                            value={details}
                            onChange={(event) => setDetails(event.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all text-sm resize-none mb-4"
                            placeholder="Tout élément qui nous aidera à traiter le signalement."
                        />

                        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

                        <button
                            type="submit"
                            disabled={sending}
                            className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                            {sending ? "Envoi…" : "Envoyer le signalement"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
