"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

/**
 * Écran d'erreur global.
 *
 * Le projet n'en avait aucun : la moindre exception non rattrapée affichait
 * l'écran d'erreur brut de Next, sans issue et en anglais.
 */
export default function GlobalError({ error, reset }) {
    useEffect(() => {
        console.error("Erreur non rattrapée :", error);
    }, [error]);

    return (
        <main className="min-h-[70vh] flex flex-col items-center justify-center bg-white text-center px-6">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
                Quelque chose s&apos;est mal passé
            </h1>
            <p className="text-gray-500 max-w-md mb-8">
                Une erreur est survenue de notre côté. Si votre connexion est
                instable, réessayez dans un instant.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
                <button
                    onClick={reset}
                    className="px-6 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-colors"
                >
                    Réessayer
                </button>
                <Link
                    href="/"
                    className="px-6 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:border-black hover:text-black transition-colors"
                >
                    Retour à l&apos;accueil
                </Link>
            </div>
        </main>
    );
}
