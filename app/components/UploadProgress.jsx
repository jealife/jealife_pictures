"use client";

import { useEffect, useRef, useState } from "react";

// Combien de temps sans changement de palier avant de prévenir que ça traîne.
const SLOW_HINT_DELAY_MS = 8000;
const VERY_SLOW_HINT_DELAY_MS = 20000;

/**
 * Anneau de progression affiché pendant l'envoi d'une image.
 *
 * Le fichier original peut peser jusqu'à 50 Mo : sur une connexion mobile,
 * l'envoi prend parfois de longues secondes, plus encore sur une connexion
 * dégradée. Un bouton figé sans retour donne l'impression que la publication
 * a planté ; ce plein écran montre qu'il se passe bien quelque chose, où on
 * en est, et prévient explicitement quand ça traîne à cause du réseau plutôt
 * que de laisser deviner.
 */
export default function UploadProgress({ percent = 0, label }) {
    const [elapsed, setElapsed] = useState(0);
    const [connectionHint, setConnectionHint] = useState(null);
    const stageStartRef = useRef(null);

    // Un nouveau palier (percent/label change) repart de zéro : c'est une
    // mutation de ref, pas un setState, donc sans effet sur le rendu.
    useEffect(() => {
        stageStartRef.current = Date.now();
    }, [percent, label]);

    // Horloge d'une seconde pour détecter un palier qui traîne. Le setState
    // vit dans le tick, pas dans le corps de l'effet, pour rester une vraie
    // synchronisation avec une horloge externe plutôt qu'un calcul de rendu.
    useEffect(() => {
        const interval = setInterval(() => {
            setElapsed(Date.now() - stageStartRef.current);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Signal proactif via l'API Network Information, quand le navigateur la
    // propose (Chrome/Android surtout ; absente sur Safari, donc simple
    // amélioration progressive, pas le seul mécanisme de détection).
    useEffect(() => {
        const connection =
            typeof navigator !== "undefined" &&
            (navigator.connection || navigator.mozConnection || navigator.webkitConnection);
        if (!connection) return;

        const checkConnection = () => {
            const slow = connection.saveData || ["slow-2g", "2g"].includes(connection.effectiveType);
            setConnectionHint(slow ? "Connexion lente détectée : l'envoi peut prendre plus de temps que d'habitude." : null);
        };

        connection.addEventListener?.("change", checkConnection);
        const timer = setTimeout(checkConnection, 0);
        return () => {
            connection.removeEventListener?.("change", checkConnection);
            clearTimeout(timer);
        };
    }, []);

    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const clamped = Math.min(100, Math.max(0, percent));
    const offset = circumference - (clamped / 100) * circumference;

    const isSlow = elapsed >= SLOW_HINT_DELAY_MS;
    const isVerySlow = elapsed >= VERY_SLOW_HINT_DELAY_MS;

    const hint = isVerySlow
        ? "Ça prend beaucoup plus de temps que prévu. Votre connexion semble très lente, merci de patienter encore un peu."
        : isSlow
        ? "Cela prend plus de temps que d'habitude, votre connexion semble lente. Continuez de patienter."
        : connectionHint;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl px-10 py-12 max-w-sm w-full text-center">
                <div className="relative w-32 h-32 mx-auto mb-6">
                    <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                        <circle cx="60" cy="60" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="8" />
                        <circle
                            cx="60"
                            cy="60"
                            r={radius}
                            fill="none"
                            stroke="#111827"
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            className="transition-all duration-500 ease-out"
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-2xl font-extrabold text-gray-900">
                        {Math.round(clamped)}%
                    </div>
                </div>
                <p className="text-[15px] font-semibold text-gray-900 mb-1">{label || "Envoi en cours…"}</p>
                <p className="text-xs text-gray-400 mb-3">Ne fermez pas cette page pendant l&apos;envoi.</p>
                {hint && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                        {hint}
                    </p>
                )}
            </div>
        </div>
    );
}
