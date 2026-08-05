"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { supabase } from "../../lib/supabase";
import { upsertProfile } from "../../lib/auth";

/**
 * Retour de connexion Google (et de tout autre fournisseur OAuth).
 *
 * Cette page n'existait pas : `signInWithOAuth` renvoyait vers /auth/callback,
 * qui répondait 404. La connexion Google était donc totalement cassée en
 * production, alors même que GOOGLE_OAUTH_SETUP.md décrit sa configuration.
 *
 * C'est une page client et non un route handler : le client Supabase de ce
 * projet gère la session côté navigateur (`detectSessionInUrl: true`), et le
 * vérificateur PKCE vit dans le localStorage — un handler serveur n'y a pas
 * accès.
 */
function AuthCallback() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;

        async function finalize() {
            const oauthError = searchParams.get("error_description") || searchParams.get("error");
            if (oauthError) {
                if (!cancelled) setError(oauthError);
                return;
            }

            // Laisse à supabase-js le temps de lire le code ou le fragment
            // d'URL et d'établir la session.
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (cancelled) return;

            if (sessionError || !session) {
                setError("Session introuvable. Merci de réessayer la connexion.");
                return;
            }

            // Filet de sécurité : si le trigger `handle_new_user` n'a pas pu
            // créer le profil, on le crée ici plutôt que de laisser
            // l'utilisateur avec un compte sans profil.
            const { data: profile } = await supabase
                .from("profiles")
                .select("id")
                .eq("id", session.user.id)
                .maybeSingle();

            if (!profile) {
                const meta = session.user.user_metadata || {};
                const base = (meta.full_name || session.user.email.split("@")[0] || "photographe")
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-+|-+$/g, "");

                await upsertProfile(session.user.id, {
                    username: `${base || "photographe"}-${session.user.id.slice(0, 4)}`,
                    full_name: meta.full_name || null,
                    avatar_url: meta.avatar_url || null,
                });
            }

            // Même garde qu'en page de connexion : sans elle, une URL absolue
            // glissée dans `?redirect=` transformerait ce retour OAuth en
            // redirection ouverte vers un site tiers.
            const rawRedirect = searchParams.get("redirect") || "/";
            const redirectTo = rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
                ? rawRedirect
                : "/";
            router.replace(redirectTo);
            router.refresh();
        }

        finalize();
        return () => { cancelled = true; };
    }, [router, searchParams]);

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 text-center">
                <h1 className="text-2xl font-bold text-gray-900 mb-3">Connexion impossible</h1>
                <p className="text-gray-500 max-w-md mb-8">{error}</p>
                <a
                    href="/login"
                    className="px-6 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-colors"
                >
                    Revenir à la connexion
                </a>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mb-6" />
            <p className="text-gray-500">Connexion en cours…</p>
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black" />
            </div>
        }>
            <AuthCallback />
        </Suspense>
    );
}
