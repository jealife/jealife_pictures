"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { updatePassword } from "../lib/auth";

/**
 * Nouveau mot de passe après un lien de récupération.
 *
 * `resetPassword()` renvoyait vers /reset-password, qui n'existait pas :
 * tout utilisateur ayant oublié son mot de passe tombait sur un 404 et
 * perdait définitivement l'accès à son compte.
 */
export default function ResetPasswordPage() {
    const router = useRouter();
    const [ready, setReady] = useState(false);
    const [hasSession, setHasSession] = useState(false);
    const [password, setPassword] = useState("");
    const [confirmation, setConfirmation] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [done, setDone] = useState(false);

    useEffect(() => {
        // Le lien de récupération ouvre une session temporaire ; sans elle,
        // impossible de changer le mot de passe.
        supabase.auth.getSession().then(({ data: { session } }) => {
            setHasSession(!!session);
            setReady(true);
        });

        const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === "PASSWORD_RECOVERY" || session) setHasSession(true);
            setReady(true);
        });

        return () => subscription?.subscription?.unsubscribe?.();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (password.length < 8) {
            setError("Le mot de passe doit contenir au moins 8 caractères.");
            return;
        }
        if (password !== confirmation) {
            setError("Les deux mots de passe ne correspondent pas.");
            return;
        }

        setSaving(true);
        const { success, error: updateError } = await updatePassword(password);
        setSaving(false);

        if (!success) {
            setError(updateError || "Impossible de mettre à jour le mot de passe.");
            return;
        }

        setDone(true);
        setTimeout(() => router.push("/"), 2000);
    };

    if (!ready) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black" />
            </div>
        );
    }

    if (done) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 text-center">
                <CheckCircle2 className="w-14 h-14 text-green-500 mb-6" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Mot de passe mis à jour</h1>
                <p className="text-gray-500">Redirection en cours…</p>
            </div>
        );
    }

    if (!hasSession) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 text-center">
                <h1 className="text-2xl font-bold text-gray-900 mb-3">Lien expiré</h1>
                <p className="text-gray-500 max-w-md mb-8">
                    Ce lien de réinitialisation n&apos;est plus valable. Demandez-en un nouveau
                    depuis la page de connexion.
                </p>
                <Link
                    href="/login"
                    className="px-6 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-colors"
                >
                    Retour à la connexion
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-white px-6">
            <div className="w-full max-w-md">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Nouveau mot de passe</h1>
                <p className="text-gray-500 mb-8">
                    Choisissez un mot de passe d&apos;au moins 8 caractères.
                </p>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label htmlFor="password" className="block text-sm font-bold text-gray-900 mb-2">
                            Mot de passe
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="new-password"
                                className="w-full pl-11 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all font-medium"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="confirmation" className="block text-sm font-bold text-gray-900 mb-2">
                            Confirmation
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                id="confirmation"
                                type={showPassword ? "text" : "password"}
                                value={confirmation}
                                onChange={(e) => setConfirmation(e.target.value)}
                                autoComplete="new-password"
                                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all font-medium"
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full py-4 bg-black text-white font-bold rounded-2xl hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {saving ? "Enregistrement…" : "Enregistrer le mot de passe"}
                    </button>
                </form>
            </div>
        </div>
    );
}
