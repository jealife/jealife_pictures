"use client";

/**
 * Anneau de progression affiché pendant l'envoi d'une image.
 *
 * Le fichier original peut peser jusqu'à 50 Mo : sur une connexion mobile,
 * l'envoi prend parfois de longues secondes. Un bouton figé sans retour
 * donne l'impression que la publication a planté ; ce plein écran montre
 * qu'il se passe bien quelque chose, et où on en est.
 */
export default function UploadProgress({ percent = 0, label }) {
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const clamped = Math.min(100, Math.max(0, percent));
    const offset = circumference - (clamped / 100) * circumference;

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
                <p className="text-xs text-gray-400">Ne fermez pas cette page pendant l&apos;envoi.</p>
            </div>
        </div>
    );
}
