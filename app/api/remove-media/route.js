import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { r2Configured, r2KeyFromUrl, deleteR2Objects } from "../../lib/r2";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Retrait admin d'un média publié (résolution d'un signalement) — distinct
 * de /api/delete-media (l'auteur supprime lui-même sa photo) et de
 * /api/reject-media (un envoi encore en attente, jamais rendu public,
 * décliné avant publication — même nettoyage R2, mais la vignette y est
 * volontairement épargnée pour l'email de refus).
 *
 * `removeMedia` ne faisait jusqu'ici qu'un `update status = 'removed'` :
 * la ligne disparaissait des pages publiques (RLS), mais les trois fichiers
 * restaient servis indéfiniment depuis leur URL R2 directe — accessible à
 * quiconque l'avait déjà (moteur de recherche, lien copié, historique) alors
 * même que la raison du retrait est justement un signalement traité. Cette
 * route fait donc les deux : le changement de statut (la ligne reste, pour
 * l'audit et le journal admin) et le nettoyage R2.
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

        // Client attaché au token de l'appelant : la RLS (admin uniquement en
        // écriture sur `media`, voir migration 0004) rejette la mise à jour
        // ci-dessous si le compte n'est pas admin — pas besoin de le revérifier
        // nous-mêmes, la base fait déjà autorité.
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

        const { data: media, error: updateError } = await supabase
            .from("media")
            .update({ status: "removed" })
            .eq("id", mediaId)
            .select("url, thumbnail_url, original_url")
            .maybeSingle();

        if (updateError) throw updateError;
        if (!media) {
            // RLS a filtré silencieusement (pas admin) ou la ligne n'existe pas
            // : dans les deux cas, rien à signaler de plus précis à l'appelant.
            return NextResponse.json({ error: "Ce média n'existe pas ou n'est plus accessible." }, { status: 404 });
        }

        if (r2Configured) {
            const keys = [media.url, media.thumbnail_url, media.original_url]
                .map(r2KeyFromUrl)
                .filter(Boolean);
            if (keys.length > 0) await deleteR2Objects(keys);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Erreur de retrait média :", error);
        return NextResponse.json({ error: "Impossible de retirer ce média." }, { status: 500 });
    }
}
