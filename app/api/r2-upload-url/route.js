import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getR2UploadUrl, r2PublicUrl, r2Configured } from "../../lib/r2";

// Doit rester aligné sur MAX_FILE_SIZE côté formulaire (app/submit/SubmitForm.jsx).
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Émet une URL signée pour un envoi direct navigateur → R2.
 *
 * Même règle que l'ancienne policy de stockage Supabase (migration 0001,
 * section 11) : chaque membre n'écrit que dans son propre dossier
 * (`media/<uid>/...`). Cette route est le seul endroit qui peut désormais le
 * garantir, puisque R2 n'a pas de RLS — la vérification se fait donc ici,
 * côté serveur, avant de signer quoi que ce soit.
 */
export async function POST(request) {
    try {
        if (!r2Configured) {
            return NextResponse.json({ error: "Cloudflare R2 n'est pas encore configuré côté serveur." }, { status: 500 });
        }
        if (!SUPABASE_URL || !SUPABASE_KEY) {
            return NextResponse.json({ error: "Configuration Supabase manquante." }, { status: 500 });
        }

        const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
        if (!token) {
            return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return NextResponse.json({ error: "Session invalide, reconnectez-vous." }, { status: 401 });
        }

        // Un envoi groupé demande 3 URL par image (vignette, version web,
        // original), soit 30 pour un lot plein. 150 laisse cinq lots par
        // fenêtre tout en fermant la boucle infinie : sans plafond, cette
        // route signait des URL sans fin. Échoue ouvert si la table de
        // comptage manque, comme les autres appels à check_rate_limit.
        const { data: withinLimit, error: rateLimitError } = await supabase.rpc("check_rate_limit", {
            p_key: user.id,
            p_bucket: "r2-upload-url",
            p_max_count: 150,
            p_window_seconds: 300,
        });
        if (rateLimitError) {
            console.error("Vérification de limite de débit impossible :", rateLimitError);
        } else if (!withinLimit) {
            return NextResponse.json(
                { error: "Trop d'envois en peu de temps. Patientez quelques minutes avant de réessayer." },
                { status: 429 }
            );
        }

        const { path, contentType, contentLength } = await request.json();
        if (!path || !contentType) {
            return NextResponse.json({ error: "Chemin ou type de fichier manquant." }, { status: 400 });
        }

        // Le plafond de 50 Mo était jusqu'ici purement déclaratif : il vivait
        // dans le formulaire, que rien n'oblige à utiliser. Il est désormais
        // vérifié ici puis scellé dans la signature (voir getR2UploadUrl).
        const size = Number(contentLength);
        if (!Number.isInteger(size) || size <= 0) {
            return NextResponse.json({ error: "Taille de fichier manquante ou invalide." }, { status: 400 });
        }
        if (size > MAX_UPLOAD_BYTES) {
            return NextResponse.json({ error: "Le fichier dépasse la taille maximale de 50 Mo." }, { status: 413 });
        }
        if (!path.startsWith(`${user.id}/`)) {
            return NextResponse.json({ error: "Chemin non autorisé." }, { status: 403 });
        }
        // Sans ce contrôle, n'importe quel type MIME pouvait être signé (ex:
        // text/html) puis servi depuis le domaine public R2 — cette route
        // n'existe que pour des photos, illustrations et vidéos.
        if (!/^(image|video)\//.test(contentType)) {
            return NextResponse.json({ error: "Type de fichier non autorisé." }, { status: 400 });
        }

        const uploadUrl = await getR2UploadUrl(path, contentType, size);
        return NextResponse.json({ uploadUrl, publicUrl: r2PublicUrl(path) });
    } catch (error) {
        console.error("Erreur de signature R2 :", error);
        return NextResponse.json({ error: "Impossible de préparer l'envoi." }, { status: 500 });
    }
}
