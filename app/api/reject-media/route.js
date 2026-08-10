import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { r2Configured, r2KeyFromUrl, deleteR2Objects } from "../../lib/r2";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Rejet admin d'un envoi encore en attente (jamais publié).
 *
 * Ne faisait jusqu'ici qu'un `update status = 'rejected'` : les trois
 * fichiers (vignette, version web, original) restaient indéfiniment sur R2,
 * facturés chaque mois, pour un contenu qui ne sera jamais publié. Cette
 * route retire désormais la version web et l'original — ce qui coûte
 * réellement en stockage — mais garde la vignette (~800px, voir images.js) :
 * elle sert d'illustration dans l'email de refus envoyé au contributeur
 * (voir /api/notify-contributor) et reste une trace minimale pour l'audit
 * admin. La ligne `media` elle-même n'est pas supprimée, pour la même
 * raison de journal d'audit (voir /api/remove-media, même logique).
 *
 * `media.url` est `not null` en base (migration 0001) : on ne peut pas la
 * vider après coup. On la fait donc pointer vers la vignette survivante —
 * `url` reste ainsi toujours une adresse réellement chargeable, y compris
 * pour le propriétaire qui reconsulterait sa propre fiche rejetée (page
 * profil, onglet « mes envois »), plutôt que de laisser une adresse morte
 * pointer vers un fichier qu'on vient de supprimer.
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
        // écriture sur `media`, voir migration 0004) rejette les requêtes
        // ci-dessous si le compte n'est pas admin.
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

        // Capturé AVANT la mise à jour : une fois `url` réécrite vers la
        // vignette, l'ancienne adresse (celle à supprimer sur R2) ne serait
        // plus récupérable.
        const { data: before, error: fetchError } = await supabase
            .from("media")
            .select("url, original_url, thumbnail_url")
            .eq("id", mediaId)
            .maybeSingle();

        if (fetchError) throw fetchError;
        if (!before) {
            return NextResponse.json({ error: "Ce média n'existe pas ou n'est plus accessible." }, { status: 404 });
        }

        // Sans vignette (ne devrait pas arriver sur un envoi entièrement
        // traité), on n'a nulle part de sûr où faire pointer `url` : on
        // laisse alors les fichiers en place plutôt que de casser l'affichage.
        const updates = { status: "rejected" };
        if (before.thumbnail_url) {
            updates.url = before.thumbnail_url;
            updates.original_url = null;
        }

        const { error: updateError } = await supabase
            .from("media")
            .update(updates)
            .eq("id", mediaId);

        if (updateError) throw updateError;

        if (r2Configured && before.thumbnail_url) {
            const keys = [before.url, before.original_url].map(r2KeyFromUrl).filter(Boolean);
            if (keys.length > 0) await deleteR2Objects(keys);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Erreur de rejet média :", error);
        return NextResponse.json({ error: "Impossible de rejeter ce média." }, { status: 500 });
    }
}
