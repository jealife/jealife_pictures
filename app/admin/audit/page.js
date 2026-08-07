"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { History, Loader2 } from "lucide-react";
import { getAdminAuditLog } from "../../lib/database";

const ACTION_LABELS = {
    "media.approve": "Photo approuvée",
    "media.reject": "Photo rejetée",
    "media.remove": "Photo retirée",
    "report.resolve": "Signalement traité",
    "user.role": "Rôle modifié",
    "user.is_verified": "Statut vérifié modifié",
    "user.is_contributor": "Statut contributeur modifié",
    "user.is_suspended": "Suspension modifiée",
    "setting.update": "Réglage modifié",
};

function describe(entry) {
    const label = ACTION_LABELS[entry.action] || entry.action;
    if (entry.action === "user.role") return `${label} → ${entry.details?.role}`;
    if (entry.action === "user.is_suspended") return entry.details?.value ? "Compte suspendu" : "Compte réactivé";
    if (entry.action === "user.is_verified") return entry.details?.value ? "Vérifié" : "Vérification retirée";
    if (entry.action === "user.is_contributor") return entry.details?.value ? "Contributeur" : "Contributeur retiré";
    if (entry.action === "setting.update") return `${label} : ${entry.target_id} = ${entry.details?.value}`;
    return label;
}

/**
 * Journal des actions admin (migration 0011) : le seul endroit d'où on peut
 * répondre à « qui a suspendu ce compte / rejeté cette photo / changé ce
 * réglage, et quand ? ». Ne trace que les actions qui engagent la
 * responsabilité de l'équipe (modération, comptes, réglages) — pas les
 * opérations de contenu courantes (thèmes, collections).
 */
export default function AdminAuditPage() {
    const [entries, setEntries] = useState(null);

    const load = useCallback(() => {
        getAdminAuditLog({ limit: 100 }).then(setEntries);
    }, []);

    useEffect(() => { load(); }, [load]);

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                <History className="w-5 h-5" /> Journal d&apos;audit
            </h2>
            <p className="text-gray-500 text-sm mb-6">
                Les 100 dernières actions de modération, sur les comptes et sur les réglages.
            </p>

            {entries === null ? (
                <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
            ) : entries.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Aucune action journalisée pour l&apos;instant.</p>
            ) : (
                <div className="space-y-2">
                    {entries.map((entry) => (
                        <div key={entry.id} className="flex items-center gap-4 p-3 border border-gray-100 rounded-xl text-sm">
                            <span className="text-gray-400 shrink-0 w-40">
                                {new Date(entry.created_at).toLocaleString("fr-FR")}
                            </span>
                            <span className="font-semibold text-gray-900 shrink-0 w-56 truncate">
                                {describe(entry)}
                            </span>
                            <span className="text-gray-500 shrink-0">
                                {entry.target_type} #{entry.target_id}
                            </span>
                            <span className="ml-auto text-gray-500 truncate">
                                {entry.admin ? (
                                    <Link href={`/@${entry.admin.username}`} target="_blank" className="hover:underline">
                                        @{entry.admin.username}
                                    </Link>
                                ) : (
                                    "Compte supprimé"
                                )}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
