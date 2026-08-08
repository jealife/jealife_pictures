"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Loader2, MailCheck, ArrowLeft } from "lucide-react";
import { resetPassword } from "../lib/auth";
import AuthBackground from "../components/AuthBackground";
import Turnstile from "../components/Turnstile";

/**
 * Demande de réinitialisation du mot de passe.
 *
 * La page de connexion pointait déjà vers /forgot-password, mais la route
 * n'existait pas : le lien « Mot de passe oublié ? » menait à un 404, et un
 * compte dont le mot de passe était perdu l'était définitivement.
 *
 * Le couple est maintenant complet : cette page envoie le courriel,
 * /reset-password reçoit le lien et enregistre le nouveau mot de passe.
 */
export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState("");
    const [turnstileToken, setTurnstileToken] = useState(null);
    const turnstileRef = useRef(null);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSending(true);
        setError("");

        if (!turnstileToken) {
            setError("Merci de valider la vérification anti-bot avant de continuer.");
            setSending(false);
            return;
        }

        const result = await resetPassword(email.trim(), turnstileToken);
        setSending(false);

        // On confirme même si l'adresse est inconnue : répondre différemment
        // permettrait de savoir qui possède un compte ici.
        if (result.success) {
            setSent(true);
        } else {
            setError(result.error);
            setTurnstileToken(null);
            turnstileRef.current?.reset();
        }
    };

    return (
        <div className="min-h-screen flex bg-white dark:bg-zinc-950 font-sans text-[#111] dark:text-zinc-100">
            <div className="relative hidden lg:block lg:w-[40%]">
                <AuthBackground
                    imageIndex={6}
                    title="Ça arrive"
                    quote="Un lien de réinitialisation, et vous retrouvez vos images."
                />
                <div className="absolute top-8 left-8 z-20">
                    <Link href="/" className="text-white hover:opacity-90 transition-opacity">
                        <span className="font-bold text-xl tracking-tight">JEaLiFe Stock</span>
                    </Link>
                </div>
            </div>

            <div className="w-full lg:w-[60%] flex flex-col justify-center items-center px-4 sm:px-12 md:px-24 py-12 lg:py-0">
                <div className="w-full max-w-[480px]">
                    {sent ? (
                        <div className="text-center">
                            <MailCheck className="w-14 h-14 text-emerald-600 dark:text-emerald-400 mx-auto mb-6" />
                            <h1 className="text-3xl font-bold mb-4">Vérifiez vos e-mails</h1>
                            <p className="text-[#767676] dark:text-zinc-400 leading-relaxed mb-8">
                                Si un compte existe pour <strong className="text-[#111] dark:text-zinc-100">{email}</strong>,
                                vous recevrez un lien de réinitialisation dans quelques instants.
                                Pensez à regarder dans les indésirables.
                            </p>
                            <Link
                                href="/login"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-[#111] dark:bg-white text-white dark:text-black rounded-[4px] font-medium hover:bg-black dark:hover:bg-zinc-200 transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" /> Retour à la connexion
                            </Link>
                        </div>
                    ) : (
                        <>
                            <Link
                                href="/login"
                                className="inline-flex items-center gap-2 text-sm text-[#767676] dark:text-zinc-400 hover:text-[#111] dark:hover:text-white transition-colors mb-8"
                            >
                                <ArrowLeft className="w-4 h-4" /> Connexion
                            </Link>

                            <h1 className="text-4xl font-bold mb-4">Mot de passe oublié</h1>
                            <p className="text-[#767676] dark:text-zinc-400 mb-10">
                                Indiquez l&apos;adresse e-mail de votre compte. Nous vous
                                enverrons un lien pour en choisir un nouveau.
                            </p>

                            {error && (
                                <div
                                    role="alert"
                                    className="mb-6 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-md text-red-700 dark:text-red-400 text-sm"
                                >
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-6">
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
                                    disabled={sending || !turnstileToken}
                                    className="w-full bg-[#111] dark:bg-white text-white dark:text-black h-11 rounded-[4px] font-medium hover:bg-black dark:hover:bg-zinc-200 transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {sending && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {sending ? "Envoi…" : "Envoyer le lien"}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
