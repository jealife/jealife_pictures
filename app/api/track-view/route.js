import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Enregistre une vue — route serveur (plutôt qu'un appel RPC direct depuis
 * le navigateur, comme avant) parce que c'est le seul endroit qui voit
 * l'adresse IP de l'appelant, nécessaire pour dédupliquer les vues
 * anonymes (voir migration 0014, `record_view`). Sans déduplication,
 * rafraîchir une fiche photo gonflait son compteur de vues à volonté.
 */
function clientIp(request) {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim();
    return request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request) {
    try {
        if (!SUPABASE_URL || !SUPABASE_KEY) {
            return NextResponse.json({ error: "Configuration Supabase manquante." }, { status: 500 });
        }

        const { mediaId } = await request.json();
        if (!mediaId) {
            return NextResponse.json({ error: "Média manquant." }, { status: 400 });
        }

        const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

        let viewerId = null;
        if (token) {
            const { data: { user } } = await supabase.auth.getUser(token);
            viewerId = user?.id || null;
        }

        // Préfère l'identité connectée (stable d'un appareil à l'autre) à
        // l'IP (partagée entre plusieurs visiteurs sur un même réseau,
        // mais c'est le seul repère disponible pour un visiteur anonyme).
        const viewerKey = viewerId ? `user:${viewerId}` : `ip:${clientIp(request)}`;

        // Généreux par rapport aux signalements (5/10 min) : parcourir un
        // catalogue déclenche une vue par photo consultée, un usage normal
        // en déclenche facilement plusieurs dizaines en quelques minutes.
        // Échoue ouvert (log + laisse passer) si la fonction elle-même est
        // indisponible — même logique que moderate-upload/generate-metadata :
        // une vue non comptée est plus anodine qu'une navigation bloquée.
        const { data: withinLimit, error: rateLimitError } = await supabase.rpc("check_rate_limit", {
            p_key: viewerKey,
            p_bucket: "track-view",
            p_max_count: 120,
            p_window_seconds: 300,
        });
        if (rateLimitError) {
            console.error("Vérification de limite de débit impossible :", rateLimitError);
        } else if (!withinLimit) {
            return NextResponse.json({ success: false, throttled: true });
        }

        const { error } = await supabase.rpc("record_view", {
            p_media_id: mediaId,
            p_viewer_key: viewerKey,
        });
        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Erreur d'enregistrement de vue :", error);
        // Une vue manquée ne doit jamais faire échouer le chargement de la
        // page pour le visiteur — 200 avec success:false plutôt que 500.
        return NextResponse.json({ success: false });
    }
}
