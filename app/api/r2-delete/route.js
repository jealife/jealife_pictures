import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { deleteR2Objects } from "../../lib/r2";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Nettoyage best-effort des fichiers déjà envoyés sur R2 quand la publication
 * échoue après l'upload (ex: l'insertion en base échoue) : sans cela, ces
 * fichiers restent orphelins sur R2, non rattachés à aucune ligne `media` et
 * invisibles/supprimables nulle part dans l'admin.
 */
export async function POST(request) {
    try {
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

        const { paths } = await request.json();
        if (!Array.isArray(paths) || paths.length === 0) {
            return NextResponse.json({ error: "Aucun chemin fourni." }, { status: 400 });
        }

        // Même garde-fou que /api/r2-upload-url : personne ne peut faire
        // supprimer un fichier hors de son propre dossier.
        const invalid = paths.find((path) => typeof path !== "string" || !path.startsWith(`${user.id}/`));
        if (invalid) {
            return NextResponse.json({ error: "Chemin non autorisé." }, { status: 403 });
        }

        await deleteR2Objects(paths);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Erreur de nettoyage R2 :", error);
        return NextResponse.json({ error: "Impossible de nettoyer les fichiers." }, { status: 500 });
    }
}
