"use client";

import { useState } from "react";
import { X, AlertTriangle, Loader2 } from "lucide-react";
import { deleteUserAccount } from "../lib/database";

/**
 * Confirmation de suppression de compte, depuis l'admin.
 *
 * Un `window.confirm()` suffit pour suspendre ou promouvoir (réversible en un
 * clic) — pas pour ceci : le compte, son profil et toutes ses photos
 * disparaissent sans corbeille ni restauration possible. On demande donc de
 * retaper le pseudo, comme un forçage de suppression de dépôt sur GitHub : le
 * geste doit coûter un peu plus qu'un simple clic pour qu'il reste
 * intentionnel.
 */
export default function DeleteAccountDialog({ user, onClose, onDeleted }) {
    const [confirmText, setConfirmText] = useState("");
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState(null);

    const canDelete = confirmText === user.username;

    const submit = async (event) => {
        event.preventDefault();
        if (!canDelete || deleting) return;

        setDeleting(true);
        setError(null);
        const { success, error: deleteError } = await deleteUserAccount(user.id);
        setDeleting(false);

        if (success) onDeleted();
        else setError(deleteError || "La suppression a échoué. Réessayez.");
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={deleting ? undefined : onClose}
            role="dialog"
            aria-modal="true"
            aria-label={`Supprimer le compte de @${user.username}`}
        >
            <div
                className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-zinc-100">
                        <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400" /> Supprimer ce compte
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={deleting}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full text-gray-600 dark:text-zinc-400 disabled:opacity-40"
                        aria-label="Fermer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <p className="text-sm text-gray-600 dark:text-zinc-400 mb-1">
                    Le compte <strong className="text-gray-900 dark:text-zinc-100">@{user.username}</strong>,
                    son profil et toutes ses photos (fichiers compris) seront supprimés définitivement.
                </p>
                <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-5">
                    Cette action est irréversible. Il n&apos;existe aucune corbeille.
                </p>

                <form onSubmit={submit}>
                    <label htmlFor="confirm-username" className="block text-sm font-bold text-gray-900 dark:text-zinc-100 mb-2">
                        Tapez <span className="font-mono">{user.username}</span> pour confirmer
                    </label>
                    <input
                        id="confirm-username"
                        type="text"
                        value={confirmText}
                        onChange={(event) => setConfirmText(event.target.value)}
                        disabled={deleting}
                        autoComplete="off"
                        autoFocus
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all text-sm mb-4 disabled:opacity-60"
                    />

                    {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

                    <button
                        type="submit"
                        disabled={!canDelete || deleting}
                        className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        {deleting ? "Suppression…" : "Supprimer définitivement"}
                    </button>
                </form>
            </div>
        </div>
    );
}
