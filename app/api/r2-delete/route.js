import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { deleteR2Objects, r2PublicUrl } from "../../lib/r2";

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

        // Token de l'appelant attaché : la vérification ci-dessous doit voir
        // ses médias quel que soit leur statut (un envoi en attente de
        // modération reste invisible pour un client anonyme).
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
            global: { headers: { Authorization: `Bearer ${token}` } },
        });
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

        // Cette route ne sert qu'à ramasser des fichiers orphelins, jamais à
        // vider une publication existante. Le seul contrôle de propriété
        // laissait pourtant un membre supprimer les fichiers de ses propres
        // photos en ligne : la ligne `media` survivait, la page restait
        // accessible, et l'image y était définitivement cassée. On refuse donc
        // tout chemin encore référencé par un média. Une requête par colonne
        // plutôt qu'un `.or()` assemblé à la main : les URL contiennent des
        // caractères que la syntaxe de filtre PostgREST interprète.
        const urls = paths.map(r2PublicUrl);
        const lookups = await Promise.all(
            ["url", "thumbnail_url", "original_url"].map((column) =>
                supabase.from("media").select("id").in(column, urls).limit(1)
            )
        );

        const lookupError = lookups.find((result) => result.error)?.error;
        if (lookupError) throw lookupError;

        if (lookups.some((result) => (result.data || []).length > 0)) {
            return NextResponse.json(
                { error: "Ces fichiers appartiennent à un média publié. Supprimez le média lui-même." },
                { status: 409 }
            );
        }

        await deleteR2Objects(paths);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Erreur de nettoyage R2 :", error);
        return NextResponse.json({ error: "Impossible de nettoyer les fichiers." }, { status: 500 });
    }
}
