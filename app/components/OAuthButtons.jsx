"use client";

import { useEffect, useState } from "react";
import { getEnabledOAuthProviders, signInWithOAuth } from "../lib/auth";

const PROVIDERS = {
    google: {
        label: "Google",
        className:
            "bg-white text-[#3c4043] border border-[#dadce0] hover:bg-[#f8f9fa] hover:border-[#d2e3fc]",
        icon: (
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
        ),
    },
    facebook: {
        label: "Facebook",
        className: "bg-[#1877F2] text-white hover:bg-[#166fe5] border border-transparent",
        icon: (
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M24 12.0733C24 5.4054 18.6274 0 12 0C5.37258 0 0 5.4054 0 12.0733C0 18.1009 4.38823 23.0955 10.125 24V15.561H7.07813V12.0733H10.125V9.42398C10.125 6.4178 11.9165 4.75704 14.6576 4.75704C15.9705 4.75704 17.3438 4.99139 17.3438 4.99139V7.94098H15.8306C14.341 7.94098 13.875 8.86541 13.875 9.8145V12.0733H17.2031L16.6711 15.561H13.875V24C19.6118 23.0955 24 18.1009 24 12.0733Z" />
            </svg>
        ),
    },
    apple: {
        label: "Apple",
        className: "bg-black text-white hover:bg-[#1a1a1a] border border-transparent",
        icon: (
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
        ),
    },
    github: {
        label: "GitHub",
        className: "bg-[#24292f] text-white hover:bg-[#1b1f23] border border-transparent",
        icon: (
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3z" />
            </svg>
        ),
    },
};

/**
 * Boutons de connexion externe.
 *
 * Ils ne sont affichés que si le fournisseur est réellement activé sur le
 * projet Supabase. Les pages affichaient jusqu'ici Google et Facebook en dur
 * alors qu'aucun des deux n'était configuré : cliquer menait à une page
 * d'erreur du fournisseur, sans explication.
 */
export default function OAuthButtons({ redirectPath = "/", onError, action = "Connexion" }) {
    const [providers, setProviders] = useState(null);
    const [pending, setPending] = useState(null);

    useEffect(() => {
        let cancelled = false;
        getEnabledOAuthProviders().then((list) => {
            if (!cancelled) setProviders(list);
        });
        return () => { cancelled = true; };
    }, []);

    // `null` = on ne sait pas encore ; `[]` = aucun fournisseur activé.
    if (providers === null) {
        return <div className="h-[52px] mb-8 rounded-md bg-gray-50 dark:bg-zinc-800 animate-pulse" aria-hidden="true" />;
    }
    if (providers.length === 0) return null;

    const start = async (provider) => {
        onError?.("");
        setPending(provider);
        const result = await signInWithOAuth(provider, redirectPath);
        if (!result.success) {
            onError?.(result.error);
            setPending(null);
        }
        // En cas de succès le navigateur part chez le fournisseur : inutile de
        // relâcher l'état, la page va être quittée.
    };

    return (
        <>
            <div className="mb-8 space-y-3">
                {providers.map((key) => {
                    const provider = PROVIDERS[key];
                    return (
                        <button
                            key={key}
                            type="button"
                            onClick={() => start(key)}
                            disabled={pending !== null}
                            className={`w-full flex items-center justify-center gap-3 py-3 px-4 rounded-md font-medium transition-colors disabled:opacity-60 ${provider.className}`}
                        >
                            {provider.icon}
                            {pending === key ? "Redirection…" : `${action} avec ${provider.label}`}
                        </button>
                    );
                })}
            </div>

            <div className="relative my-8">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-[#d1d1d1] dark:border-zinc-700" />
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white dark:bg-zinc-950 text-[#767676] dark:text-zinc-500">OU</span>
                </div>
            </div>
        </>
    );
}
