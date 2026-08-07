"use client";

import Link from "next/link";
import { Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signUpWithEmail, upsertProfile } from "../lib/auth";
import OAuthButtons from "../components/OAuthButtons";
import AuthBackground from "../components/AuthBackground";
import Turnstile from "../components/Turnstile";

function JoinForm() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Même garde qu'en page de connexion : /login envoie ici avec
    // `?redirect=`, sans quoi quelqu'un qui s'inscrit depuis « Publier une
    // image » retombait sur l'accueil au lieu de reprendre son parcours.
    const rawRedirect = searchParams.get("redirect") || "/";
    const redirectPath = rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
        ? rawRedirect
        : "/";

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [usernameWarning, setUsernameWarning] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState(null);
    const turnstileRef = useRef(null);

    const handleSignUp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess(false);

        // Validation
        if (password.length < 8) {
            setError("Le mot de passe doit contenir au moins 8 caractères.");
            setLoading(false);
            return;
        }

        // Basic username validation (letters, numbers, underscores, hyphens)
        const usernameRegex = /^[a-zA-Z0-9_-]+$/;
        if (!usernameRegex.test(username)) {
            setError("Le nom d'utilisateur ne doit contenir que des lettres, des chiffres, des tirets ou des underscores.");
            setLoading(false);
            return;
        }

        if (!turnstileToken) {
            setError("Merci de valider la vérification anti-bot avant de continuer.");
            setLoading(false);
            return;
        }

        // Le jeton Turnstile part directement vers Supabase (options.captchaToken) :
        // la protection anti-bot est activée côté projet Supabase, qui fait
        // lui-même l'appel à Cloudflare. Un jeton Turnstile étant à usage
        // unique, le vérifier nous-mêmes avant l'appel ferait échouer celui
        // de Supabase (jeton déjà consommé).
        const result = await signUpWithEmail(email, password, {
            first_name: firstName,
            last_name: lastName,
            full_name: `${firstName} ${lastName}`.trim(),
            username: username.toLowerCase(),
        }, turnstileToken);

        if (result.success) {
            // Créer le profil utilisateur avec le username choisi. Un
            // déclencheur serveur en a déjà créé un par défaut (username de
            // repli en cas de collision) : si cette tentative échoue à son
            // tour (ex: le username choisi est déjà pris), le compte reste
            // fonctionnel mais avec le username de repli — sans ce
            // signalement, l'utilisateur croyait avoir obtenu celui qu'il
            // avait tapé.
            let profileWarning = false;
            if (result.user) {
                const profileResult = await upsertProfile(result.user.id, {
                    username: username.toLowerCase(),
                    full_name: `${firstName} ${lastName}`.trim(),
                });
                profileWarning = !profileResult.success;
            }

            setUsernameWarning(profileWarning);
            setSuccess(true);
            setTimeout(() => {
                router.push(redirectPath);
                router.refresh();
            }, 2000);
        } else {
            setError(result.error || "Erreur lors de la création du compte.");
            setTurnstileToken(null);
            turnstileRef.current?.reset();
        }

        setLoading(false);
    };

    return (
        <div className="min-h-screen flex bg-white font-sans text-[#111]">
            <div className="relative hidden lg:block lg:w-[40%]">
                <AuthBackground
                    imageIndex={3}
                    title="La création commence ici"
                    quote="Des images libres de droits que vous ne trouverez nulle part ailleurs."
                />
                <div className="absolute top-8 left-8 z-20">
                    <Link href="/" className="text-white hover:opacity-90 transition-opacity">
                        <span className="font-bold text-xl tracking-tight">JEaLiFe Stock</span>
                    </Link>
                </div>
            </div>

            {/* Right: Form */}
            <div className="w-full lg:w-[60%] flex flex-col justify-center items-center px-4 sm:px-12 md:px-24 py-12 lg:py-0 overflow-y-auto">
                <div className="w-full max-w-[560px]">
                    <div className="text-center mb-10">
                        <h1 className="text-5xl font-bold text-[#111] mb-4">S&apos;inscrire à JEaLiFe</h1>
                        <p className="text-[#111]">
                            Vous avez déjà un compte ?{" "}
                            <Link
                                href={redirectPath === "/" ? "/login" : `/login?redirect=${encodeURIComponent(redirectPath)}`}
                                className="underline text-[#767676] hover:text-[#111] transition-colors"
                            >
                                Connexion
                            </Link>
                        </p>
                    </div>

                    <OAuthButtons redirectPath={redirectPath} onError={setError} action="S'inscrire" />

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md text-green-600 text-sm">
                            Compte créé avec succès ! Redirection...
                        </div>
                    )}

                    {success && usernameWarning && (
                        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-md text-amber-700 text-sm">
                            Le nom d&apos;utilisateur choisi était déjà pris : un autre a été attribué.
                            Vous pourrez le changer dans vos paramètres.
                        </div>
                    )}

                    <form onSubmit={handleSignUp} className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm text-[#111] mb-1.5">Prénom</label>
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    required
                                    className="w-full h-10 px-3 rounded-[4px] border border-[#d1d1d1] text-[#111] focus:border-[#767676] outline-none transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-[#111] mb-1.5">Nom</label>
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    required
                                    className="w-full h-10 px-3 rounded-[4px] border border-[#d1d1d1] text-[#111] focus:border-[#767676] outline-none transition-colors"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm text-[#111] mb-1.5">E-mail</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full h-10 px-3 rounded-[4px] border border-[#d1d1d1] text-[#111] focus:border-[#767676] outline-none transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-[#111] mb-1.5">
                                Nom d&apos;utilisateur <span className="text-[#767676] font-normal">(n&apos;utilisez que des lettres, des chiffres ou des tirets)</span>
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                                required
                                pattern="[a-zA-Z0-9_-]+"
                                className="w-full h-10 px-3 rounded-[4px] border border-[#d1d1d1] text-[#111] focus:border-[#767676] outline-none transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-[#111] mb-1.5">
                                Mot de passe <span className="text-[#767676] font-normal">(8 car. minimum)</span>
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    className="w-full h-10 px-3 pr-10 rounded-[4px] border border-[#d1d1d1] text-[#111] focus:border-[#767676] outline-none transition-colors"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
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
                            disabled={loading || !turnstileToken}
                            className="w-full bg-[#111] text-white h-11 rounded-[4px] font-medium hover:bg-black transition-all active:scale-[0.99] mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Création en cours..." : "S'inscrire"}
                        </button>
                    </form>

                    <p className="mt-8 text-center text-[#767676] text-xs leading-relaxed max-w-[400px] mx-auto">
                        En vous inscrivant, vous acceptez les <Link href="#" className="underline hover:text-[#111]">Conditions</Link> et la <Link href="#" className="underline hover:text-[#111]">Charte de protection des données</Link>.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function JoinPageClient() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-white">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
                </div>
            }
        >
            <JoinForm />
        </Suspense>
    );
}
