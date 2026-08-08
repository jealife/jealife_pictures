"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { signInWithEmail } from "../lib/auth";
import { useAuth } from "../contexts/AuthContext";
import AuthBackground from "../components/AuthBackground";
import OAuthButtons from "../components/OAuthButtons";
import Turnstile from "../components/Turnstile";

/**
 * Page de connexion.
 *
 * Trois défauts corrigés ici :
 *   · le paramètre `?redirect=` était ignoré — cinq endroits du site
 *     l'envoient pourtant (publication, j'aime, collections, réglages,
 *     modification d'image), et l'utilisateur retombait à chaque fois sur
 *     l'accueil après s'être connecté ;
 *   · les boutons Google et Facebook étaient codés en dur alors qu'aucun des
 *     deux fournisseurs n'est activé côté Supabase ;
 *   · les erreurs s'affichaient dans la langue et le vocabulaire de Supabase
 *     (« Invalid login credentials »).
 */
function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, loading: authLoading } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [turnstileToken, setTurnstileToken] = useState(null);
    const turnstileRef = useRef(null);

    // On n'accepte qu'un chemin interne : une URL absolue transformerait la
    // page de connexion en redirection ouverte vers un site tiers.
    const rawRedirect = searchParams.get("redirect") || "/";
    const redirectPath = rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
        ? rawRedirect
        : "/";

    // Déjà connecté : rester sur un formulaire de connexion n'a pas de sens.
    useEffect(() => {
        if (!authLoading && user) router.replace(redirectPath);
    }, [authLoading, user, redirectPath, router]);

    const handleEmailLogin = async (event) => {
        event.preventDefault();
        setSubmitting(true);
        setError("");

        if (!turnstileToken) {
            setError("Merci de valider la vérification anti-bot avant de continuer.");
            setSubmitting(false);
            return;
        }

        const result = await signInWithEmail(email.trim(), password, turnstileToken);

        if (result.success) {
            router.push(redirectPath);
            router.refresh();
            // Navigation normalement immédiate, mais si elle est lente ou
            // interrompue (retour arrière, connexion capricieuse), le
            // bouton ne doit pas rester bloqué en "Connexion…" indéfiniment.
            setSubmitting(false);
        } else {
            setError(result.error);
            // Le jeton Turnstile est à usage unique : qu'il ait été
            // consommé par une tentative refusée par Supabase (mauvais mot
            // de passe) ou rejeté par Cloudflare, il faut en redemander un
            // avant de pouvoir réessayer.
            setTurnstileToken(null);
            turnstileRef.current?.reset();
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-white dark:bg-zinc-950 font-sans text-[#111] dark:text-zinc-100">
            <div className="relative hidden lg:block lg:w-[40%]">
                <AuthBackground
                    imageIndex={0}
                    title="Bon retour"
                    quote="La photographie est une histoire que je ne peux pas dire avec des mots."
                />
                <div className="absolute top-8 left-8 z-20">
                    <Link href="/" className="text-white hover:opacity-90 transition-opacity">
                        <span className="font-bold text-xl tracking-tight">JEaLiFe Stock</span>
                    </Link>
                </div>
            </div>

            <div className="w-full lg:w-[60%] flex flex-col justify-center items-center px-4 sm:px-12 md:px-24 py-12 lg:py-0 overflow-y-auto">
                <div className="w-full max-w-[560px]">
                    <div className="text-center mb-10">
                        <h1 className="text-4xl sm:text-5xl font-bold text-[#111] dark:text-zinc-100 mb-4">Connexion</h1>
                        <p className="text-[#767676] dark:text-zinc-400">
                            {redirectPath === "/submit"
                                ? "Connectez-vous pour publier vos images."
                                : "Bon retour parmi nous."}
                        </p>
                    </div>

                    <OAuthButtons redirectPath={redirectPath} onError={setError} action="Connexion" />

                    {error && (
                        <div
                            role="alert"
                            className="mb-6 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-md text-red-700 dark:text-red-400 text-sm"
                        >
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleEmailLogin} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm text-[#111] dark:text-zinc-100 mb-1.5">
                                Adresse e-mail
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                                autoFocus
                                className="w-full h-11 px-3 rounded-[4px] border border-[#d1d1d1] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[#111] dark:text-zinc-100 focus:border-[#111] dark:focus:border-white focus:ring-1 focus:ring-[#111] dark:focus:ring-white outline-none transition-colors"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1.5 gap-4">
                                <label htmlFor="password" className="block text-sm text-[#111] dark:text-zinc-100">
                                    Mot de passe
                                </label>
                                <Link
                                    href="/forgot-password"
                                    className="text-sm text-[#767676] dark:text-zinc-400 hover:text-[#111] dark:hover:text-white underline transition-colors"
                                >
                                    Mot de passe oublié ?
                                </Link>
                            </div>
                            <div className="relative">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                    className="w-full h-11 px-3 pr-11 rounded-[4px] border border-[#d1d1d1] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[#111] dark:text-zinc-100 focus:border-[#111] dark:focus:border-white focus:ring-1 focus:ring-[#111] dark:focus:ring-white outline-none transition-colors"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 transition-colors"
                                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-center">
                            <Turnstile
                                ref={turnstileRef}
                                onVerify={setTurnstileToken}
                                onExpire={() => setTurnstileToken(null)}
                                onError={() => setTurnstileToken(null)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting || !turnstileToken}
                            className="w-full bg-[#111] dark:bg-white text-white dark:text-black h-11 rounded-[4px] font-medium hover:bg-black dark:hover:bg-zinc-200 transition-all active:scale-[0.99] mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            {submitting ? "Connexion…" : "Se connecter"}
                        </button>
                    </form>

                    <p className="mt-10 text-center text-[#111] dark:text-zinc-100 text-sm">
                        Vous n&apos;avez pas de compte ?{" "}
                        <Link
                            href={redirectPath === "/" ? "/join" : `/join?redirect=${encodeURIComponent(redirectPath)}`}
                            className="underline text-[#767676] dark:text-zinc-400 hover:text-[#111] dark:hover:text-white transition-colors"
                        >
                            Créer un compte
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function LoginPageClient() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-300 dark:text-zinc-600" />
                </div>
            }
        >
            <LoginForm />
        </Suspense>
    );
}
