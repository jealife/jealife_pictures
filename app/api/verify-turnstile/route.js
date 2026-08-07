import { NextResponse } from "next/server";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Vérifie côté serveur un jeton Turnstile avant de laisser passer une
 * inscription. Le widget seul ne prouve rien : sans cet appel, un bot peut
 * simplement ignorer le widget et poster directement sur Supabase.
 */
export async function POST(request) {
    try {
        const secret = process.env.TURNSTILE_SECRET;
        if (!secret) {
            console.error("TURNSTILE_SECRET manquant : vérification Turnstile impossible.");
            return NextResponse.json({ success: false, error: "Vérification anti-bot indisponible pour le moment." }, { status: 500 });
        }

        const { token } = await request.json();
        if (!token) {
            return NextResponse.json({ success: false, error: "Vérification anti-bot manquante." }, { status: 400 });
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

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Erreur de vérification Turnstile :", error);
        // On échoue fermé : une erreur réseau vers Cloudflare ne doit pas
        // laisser passer une inscription non vérifiée.
        return NextResponse.json({ success: false, error: "Vérification anti-bot indisponible, réessayez." }, { status: 503 });
    }
}
