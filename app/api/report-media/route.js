import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Signaler un média — délibérément ouvert aux visiteurs non connectés (baisser
 * la friction du signalement compte plus que l'identité de qui signale).
 *
 * Cette route existe (plutôt qu'un insert direct côté client) pour deux
 * raisons : c'est le seul endroit qui voit l'adresse IP de l'appelant, et
 * c'est ce qui permet de limiter les signalements anonymes en répétition —
 * un `reporter_id` à `null` ne peut pas servir de clé de déduplication en SQL
 * (NULL n'est jamais égal à NULL). Les signalements authentifiés sont en plus
 * dédupliqués en base par média (voir migration 0010).
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

        const { mediaId, reason, details } = await request.json();
        if (!mediaId || !reason) {
            return NextResponse.json({ error: "Média ou motif manquant." }, { status: 400 });
        }

        const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

        let reporterId = null;
        if (token) {
            const { data: { user } } = await supabase.auth.getUser(token);
            reporterId = user?.id || null;
        }

        const rateKey = reporterId || `ip:${clientIp(request)}`;
        const { data: withinLimit, error: rateLimitError } = await supabase.rpc("check_rate_limit", {
            p_key: rateKey,
            p_bucket: "report-media",
            p_max_count: 5,
            p_window_seconds: 600,
        });
        if (rateLimitError) {
            console.error("Vérification de limite de débit impossible :", rateLimitError);
        } else if (!withinLimit) {
            return NextResponse.json(
                { error: "Trop de signalements en peu de temps. Réessayez plus tard." },
                { status: 429 }
            );
        }

        const { error: insertError } = await supabase
            .from("media_reports")
            .insert({ media_id: mediaId, reason, details: details || "", reporter_id: reporterId });

        if (insertError) {
            // Contrainte d'unicité (media_id, reporter_id) : déjà signalé par ce compte.
            if (insertError.code === "23505") {
                return NextResponse.json(
                    { error: "Vous avez déjà signalé ce média." },
                    { status: 409 }
                );
            }
            throw insertError;
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Erreur de signalement :", error);
        return NextResponse.json({ error: "L'envoi du signalement a échoué." }, { status: 500 });
    }
}
