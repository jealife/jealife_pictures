"use client";

import Link from "next/link";
import { Check, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUpWithEmail, signInWithOAuth, upsertProfile } from "../lib/auth";
import AuthBackground from "../components/AuthBackground";

export default function JoinPage() {
    const router = useRouter();
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
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

        const result = await signUpWithEmail(email, password, {
            first_name: firstName,
            last_name: lastName,
            full_name: `${firstName} ${lastName}`.trim(),
            username: username.toLowerCase(),
        });

        if (result.success) {
            // Créer le profil utilisateur avec le username choisi
            if (result.user) {
                await upsertProfile(result.user.id, {
                    username: username.toLowerCase(),
                    full_name: `${firstName} ${lastName}`.trim(),
                });
            }

            setSuccess(true);
            setTimeout(() => {
                router.push("/");
                router.refresh();
            }, 2000);
        } else {
            setError(result.error || "Erreur lors de la création du compte.");
        }

        setLoading(false);
    };

    const handleOAuthSignUp = async (provider) => {
        setError("");
        const result = await signInWithOAuth(provider);

        if (!result.success) {
            setError(result.error || "Erreur de connexion OAuth.");
        }
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
                            Vous avez déjà un compte ? <Link href="/login" className="underline text-[#767676] hover:text-[#111] transition-colors">Connexion</Link>
                        </p>
                    </div>

                    <div className="mb-8">
                        <button
                            onClick={() => handleOAuthSignUp('facebook')}
                            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-[#1877F2] text-white rounded-md font-medium hover:bg-[#166fe5] transition-colors mb-3"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 fill-current">
                                <path d="M24 12.0733C24 5.4054 18.6274 0 12 0C5.37258 0 0 5.4054 0 12.0733C0 18.1009 4.38823 23.0955 10.125 24V15.561H7.07813V12.0733H10.125V9.42398C10.125 6.4178 11.9165 4.75704 14.6576 4.75704C15.9705 4.75704 17.3438 4.99139 17.3438 4.99139V7.94098H15.8306C14.341 7.94098 13.875 8.86541 13.875 9.8145V12.0733H17.2031L16.6711 15.561H13.875V24C19.6118 23.0955 24 18.1009 24 12.0733Z" />
                            </svg>
                            S&apos;inscrire avec Facebook
                        </button>
                        <button
                            onClick={() => handleOAuthSignUp('google')}
                            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white text-[#767676] border border-[#d1d1d1] rounded-md font-medium hover:border-[#111] hover:text-[#111] transition-all"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            S&apos;inscrire avec Google
                        </button>
                    </div>

                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-[#d1d1d1]"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-white text-[#767676]">OU</span>
                        </div>
                    </div>

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

                        <button
                            type="submit"
                            disabled={loading}
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
