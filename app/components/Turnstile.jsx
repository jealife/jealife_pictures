"use client";

import { forwardRef, useEffect, useImperativeHandle, useId, useRef } from "react";
import { useTheme } from "../contexts/ThemeContext";

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

// Un seul <script> pour toute la page, même si plusieurs widgets Turnstile
// sont montés (aucun cas aujourd'hui, mais évite le piège si ça change).
let scriptPromise = null;
function loadTurnstileScript() {
    if (typeof window === "undefined") return Promise.resolve();
    if (window.turnstile) return Promise.resolve();
    if (!scriptPromise) {
        scriptPromise = new Promise((resolve, reject) => {
            const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
            if (existing) {
                existing.addEventListener("load", () => resolve());
                existing.addEventListener("error", reject);
                return;
            }
            const script = document.createElement("script");
            script.src = SCRIPT_SRC;
            script.async = true;
            script.defer = true;
            script.onload = () => resolve();
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    return scriptPromise;
}

/**
 * Widget Turnstile (protection anti-bot des formulaires d'authentification).
 *
 * Le jeton renvoyé par `onVerify` est à usage unique : une fois envoyé à
 * Supabase (options.captchaToken), il ne peut pas être réutilisé si la
 * requête échoue ensuite pour une autre raison (email déjà pris, mauvais
 * mot de passe, etc.). `reset()` (exposé via ref) redemande un jeton frais
 * avant une nouvelle tentative.
 */
const Turnstile = forwardRef(function Turnstile({ onVerify, onExpire, onError }, ref) {
    const containerId = useId().replace(/:/g, "");
    const widgetId = useRef(null);
    const { resolvedTheme } = useTheme();

    useImperativeHandle(ref, () => ({
        reset() {
            if (widgetId.current != null && window.turnstile) {
                window.turnstile.reset(widgetId.current);
            }
        },
    }));

    useEffect(() => {
        const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
        if (!siteKey) {
            console.warn("NEXT_PUBLIC_TURNSTILE_SITE_KEY manquant : widget Turnstile non affiché.");
            return;
        }

        let cancelled = false;

        loadTurnstileScript().then(() => {
            if (cancelled || !window.turnstile) return;
            widgetId.current = window.turnstile.render(`#${containerId}`, {
                sitekey: siteKey,
                theme: resolvedTheme,
                callback: onVerify,
                "expired-callback": onExpire,
                "error-callback": onError,
            });
        });

        return () => {
            cancelled = true;
            if (widgetId.current != null && window.turnstile) {
                window.turnstile.remove(widgetId.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [containerId, resolvedTheme]);

    return <div id={containerId} />;
});

export default Turnstile;
