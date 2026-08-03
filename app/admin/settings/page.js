"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { getAdminOverview, setSetting } from "../../lib/database";

const MODES = [
    {
        key: "auto",
        label: "Automatique",
        description:
            "Un envoi qui passe les contrôles de qualité (résolution, netteté, doublon, modération IA) est publié immédiatement, sans intervention humaine. C'est le comportement actuel du site.",
    },
    {
        key: "manual",
        label: "Manuel",
        description:
            "Un envoi qui passe les contrôles automatiques reste en attente jusqu'à ce qu'un membre de l'équipe le publie ou le rejette depuis la file de modération.",
    },
];

export default function AdminSettingsPage() {
    const [mode, setMode] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        getAdminOverview().then((data) => setMode(data.moderationMode));
    }, []);

    const choose = async (key) => {
        if (key === mode || saving) return;
        setSaving(true);
        setSaved(false);
        const { success } = await setSetting("moderation_mode", key);
        if (success) {
            setMode(key);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        }
        setSaving(false);
    };

    if (mode === null) {
        return <Loader2 className="w-6 h-6 animate-spin text-gray-300" />;
    }

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Réglages</h2>
            <p className="text-gray-500 text-sm mb-10">
                Décide de ce qui se passe une fois qu&apos;un envoi a passé les contrôles de qualité automatiques.
            </p>

            <div className="space-y-4 max-w-xl">
                {MODES.map(({ key, label, description }) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => choose(key)}
                        disabled={saving}
                        className={`w-full text-left p-5 border rounded-2xl transition-all disabled:opacity-60 ${
                            mode === key ? "border-black bg-gray-50" : "border-gray-200 hover:border-gray-300"
                        }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-gray-900">{label}</span>
                            {mode === key && <CheckCircle2 className="w-5 h-5 text-black" />}
                        </div>
                        <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
                    </button>
                ))}
            </div>

            {saved && <p className="mt-6 text-sm text-emerald-600 font-medium">Réglage enregistré.</p>}
        </div>
    );
}
