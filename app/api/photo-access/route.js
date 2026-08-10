import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Seule route qui renvoie l'adresse réelle (affichage pleine taille ou
 * fichier original) d'un média Premium. Partout ailleurs — page photo,
 * plan du site, fiche Open Graph, cartes de grille — l'application ne
 * reçoit jamais ces deux champs pour un média Premium, seulement sa
 * vignette (publique par construction, voir migration 0019 et la fiche
 * photo). Un média gratuit renvoie ses adresses directement : il n'y a rien
 * à protéger, elles sont déjà publiques partout sur le site.
 *
 * Ce choix se décide ici, côté serveur, avec la RLS pour seul arbitre —
 * jamais dans le navigateur, qui ne peut pas être une source de confiance
 * pour « ai-je payé ce fichier ? ».
 */
export async function POST(request) {
    try {
        if (!SUPABASE_URL || !SUPABASE_KEY) {
            return NextResponse.json({ error: "Configuration Supabase manquante." }, { status: 500 });
        }

        const { mediaId } = await request.json();
        if (!mediaId) {
            return NextResponse.json({ error: "mediaId manquant." }, { status: 400 });
        }

        const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
        const supabase = token
            ? createClient(SUPABASE_URL, SUPABASE_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } })
            : createClient(SUPABASE_URL, SUPABASE_KEY);

        const { data: media, error: mediaError } = await supabase
            .from("media")
            .select("id, user_id, is_premium, url, original_url")
            .eq("id", mediaId)
            .eq("status", "published")
            .maybeSingle();

        if (mediaError || !media) {
            return NextResponse.json({ error: "Média introuvable." }, { status: 404 });
        }

        if (!media.is_premium) {
            return NextResponse.json({ url: media.url, originalUrl: media.original_url });
        }

        if (!token) {
            return NextResponse.json({ url: null, originalUrl: null });
        }

        const { data: { user } } = await supabase.auth.getUser(token);
        if (!user) {
            return NextResponse.json({ url: null, originalUrl: null });
        }

        let allowed = user.id === media.user_id;

        if (!allowed) {
            const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
            allowed = profile?.role === "admin";
        }

        if (!allowed) {
            // La RLS de `premium_downloads` (migration 0019) ne laisse un
            // acheteur voir que ses propres achats — `eq('buyer_id', user.id)`
            // n'est donc pas qu'une précaution ici, c'est aussi ce que la
            // base imposerait de toute façon.
            const { data: purchase } = await supabase
                .from("premium_downloads")
                .select("id")
                .eq("media_id", mediaId)
                .eq("buyer_id", user.id)
                .limit(1)
                .maybeSingle();
            allowed = !!purchase;
        }

        if (!allowed) {
            return NextResponse.json({ url: null, originalUrl: null });
        }

        return NextResponse.json({ url: media.url, originalUrl: media.original_url });
    } catch (error) {
        console.error("Erreur photo-access:", error);
        return NextResponse.json({ error: "Impossible de vérifier l'accès à ce média." }, { status: 500 });
    }
}
