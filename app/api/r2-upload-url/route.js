import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getR2UploadUrl, r2PublicUrl, r2Configured } from "../../lib/r2";

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

        const { path, contentType } = await request.json();
        if (!path || !contentType) {
            return NextResponse.json({ error: "Chemin ou type de fichier manquant." }, { status: 400 });
        }
        if (!path.startsWith(`${user.id}/`)) {
            return NextResponse.json({ error: "Chemin non autorisé." }, { status: 403 });
        }

        const uploadUrl = await getR2UploadUrl(path, contentType);
        return NextResponse.json({ uploadUrl, publicUrl: r2PublicUrl(path) });
    } catch (error) {
        console.error("Erreur de signature R2 :", error);
        return NextResponse.json({ error: "Impossible de préparer l'envoi." }, { status: 500 });
    }
}
