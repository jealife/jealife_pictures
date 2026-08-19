import { NextResponse } from "next/server";
import { GATE_COOKIE, GATE_TTL_SECONDS } from "../../lib/gate";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Vérifie le jeton Turnstile de la page /verify (portail d'entrée du site)
 * et pose le cookie qui dispense le reste de la session de repasser par là
 * (voir middleware.js). Sans lien avec la vérification Supabase des
 * formulaires d'authentification, qui reste séparée.
 */
export async function POST(request) {
    try {
        const secret = process.env.TURNSTILE_SECRET;
        if (!secret) {
            console.error("TURNSTILE_SECRET manquant : vérification du portail impossible.");
            return NextResponse.json({ success: false, error: "Vérification indisponible pour le moment." }, { status: 500 });
        }

        const { token } = await request.json();
        if (!token) {
            return NextResponse.json({ success: false, error: "Vérification anti-bot manquante." }, { status: 400 });
        }

        // Cas de secours : Cloudflare Turnstile est inaccessible depuis le
        // réseau de l'utilisateur (ex. certains opérateurs au Maroc bloquent
        // challenges.cloudflare.com). Le widget côté client n'a pas pu charger
        // après 8 s de délai → on pose le cookie directement. Appeler
        // siteverify avec ce token serait de toute façon voué à l'échec.
        if (token === "__widget_unavailable__") {
            const response = NextResponse.json({ success: true });
            response.cookies.set(GATE_COOKIE, "1", {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                path: "/",
                maxAge: GATE_TTL_SECONDS,
            });
            return response;
        }

        const remoteip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

        const verifyResponse = await fetch(SITEVERIFY_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                secret,
                response: token,
                ...(remoteip ? { remoteip } : {}),
            }),
        });

        if (!verifyResponse.ok) {
            throw new Error(`siteverify ${verifyResponse.status}`);
        }

        const result = await verifyResponse.json();
        if (!result.success) {
            return NextResponse.json({ success: false, error: "Vérification anti-bot échouée, réessayez." }, { status: 403 });
        }

        const response = NextResponse.json({ success: true });
        response.cookies.set(GATE_COOKIE, "1", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: GATE_TTL_SECONDS,
        });
        return response;
    } catch (error) {
        console.error("Erreur de vérification du portail :", error);
        // On échoue fermé : une erreur réseau vers Cloudflare ne doit pas
        // poser le cookie et laisser passer une visite non vérifiée.
        return NextResponse.json({ success: false, error: "Vérification indisponible, réessayez." }, { status: 503 });
    }
}
