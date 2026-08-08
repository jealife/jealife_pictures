"use client";

import { Suspense, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import Turnstile from "../components/Turnstile";

/**
 * Portail d'entrée du site, façon Unsplash : une vérification par session
 * plutôt qu'à chaque page. `middleware.js` redirige ici quiconque n'a pas
 * encore le cookie posé par /api/site-verify, sauf les crawlers reconnus.
 */
function VerifyGate() {
    const searchParams = useSearchParams();
    const [error, setError] = useState("");
    const [verifying, setVerifying] = useState(false);
    const turnstileRef = useRef(null);

    const rawNext = searchParams.get("next") || "/";
    const nextPath = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

    const handleVerify = async (token) => {
        setVerifying(true);
        setError("");

        try {
            const response = await fetch("/api/site-verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token }),
            });
            const result = await response.json();

            if (!result.success) {
                setError(result.error || "Vérification échouée, réessayez.");
                turnstileRef.current?.reset();
                setVerifying(false);
                return;
            }

            // Rechargement complet plutôt qu'une navigation client : le
            // cookie qu'on vient de recevoir doit être présent dès la
            // première requête de la page suivante (lue par middleware.js).
            window.location.href = nextPath;
        } catch {
            setError("Vérification indisponible, réessayez.");
            turnstileRef.current?.reset();
            setVerifying(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white text-center px-6">
            <ShieldCheck className="w-10 h-10 text-gray-300 mb-6" />
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Vérification anti-bot</h1>
            <p className="text-gray-500 max-w-sm mb-8">
                Un instant avant d&apos;accéder à JEaLiFe Stock, le temps de confirmer que vous n&apos;êtes pas un robot.
            </p>

            <Turnstile
                ref={turnstileRef}
                onVerify={handleVerify}
                onExpire={() => setError("")}
                onError={() => setError("Le widget n'a pas pu se charger, rechargez la page.")}
            />

            {verifying && (
                <div className="mt-6 flex items-center gap-2 text-gray-500 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" /> Vérification en cours…
                </div>
            )}

            {error && (
                <div role="alert" className="mt-6 text-red-600 text-sm max-w-sm">
                    {error}
                </div>
            )}
        </div>
    );
}

export default function VerifyPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-white">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
                </div>
            }
        >
            <VerifyGate />
        </Suspense>
    );
}
