import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { r2Configured, r2KeyFromUrl, deleteR2Objects } from "../../lib/r2";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Suppression définitive d'un média : contrairement à la modération admin
 * (qui ne fait que passer `status` à "removed", voir removeMedia côté
 * lib/database.js), ceci retire aussi les fichiers R2 — sans quoi la photo
 * "supprimée" par son auteur restait accessible indéfiniment à qui
 * connaissait déjà son URL.
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

        // Client attaché au token de l'appelant : la RLS (auth.uid() =
        // user_id ou is_admin()) garantit qu'on ne peut ni lire ni supprimer
        // le média de quelqu'un d'autre.
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
            global: { headers: { Authorization: `Bearer ${token}` } },
        });

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return NextResponse.json({ error: "Session invalide, reconnectez-vous." }, { status: 401 });
        }

        const { mediaId } = await request.json();
        if (!mediaId) {
            return NextResponse.json({ error: "Média manquant." }, { status: 400 });
        }

        const { data: media, error: fetchError } = await supabase
            .from("media")
            .select("url, thumbnail_url, original_url")
            .eq("id", mediaId)
            .maybeSingle();

        if (fetchError) throw fetchError;
        if (!media) {
            return NextResponse.json({ error: "Ce média n'existe pas ou n'est plus accessible." }, { status: 404 });
        }

        const { error: deleteError } = await supabase.from("media").delete().eq("id", mediaId);
        if (deleteError) throw deleteError;

        if (r2Configured) {
            const keys = [media.url, media.thumbnail_url, media.original_url]
                .map(r2KeyFromUrl)
                .filter(Boolean);
            if (keys.length > 0) await deleteR2Objects(keys);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Erreur de suppression média :", error);
        return NextResponse.json({ error: "Impossible de supprimer ce média." }, { status: 500 });
    }
}
