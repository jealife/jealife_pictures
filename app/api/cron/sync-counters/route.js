import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Recalcule en bloc les compteurs de vues/téléchargements à partir des
 * journaux d'événements (voir migration 0014) — appelée par le cron Vercel
 * (vercel.json), jamais par un visiteur : `sync_media_counters()` n'est
 * accordée à aucun rôle public, seule la clé de service peut l'exécuter.
 *
 * Vercel Cron ajoute automatiquement `Authorization: Bearer $CRON_SECRET`
 * à ses appels dès que la variable d'environnement `CRON_SECRET` est
 * définie sur le projet — c'est ce qui empêche quiconque d'autre de
 * déclencher ce recalcul à volonté.
 */
export async function GET(request) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        return NextResponse.json({ error: "CRON_SECRET non configuré." }, { status: 500 });
    }

    const authHeader = request.headers.get("authorization") || "";
    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
        return NextResponse.json({ error: "Configuration Supabase (clé de service) manquante." }, { status: 500 });
    }

    try {
        const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
        const { error } = await supabase.rpc("sync_media_counters");
        if (error) throw error;

        return NextResponse.json({ success: true, syncedAt: new Date().toISOString() });
    } catch (error) {
        console.error("Erreur de synchronisation des compteurs :", error);
        return NextResponse.json({ error: "La synchronisation a échoué." }, { status: 500 });
    }
}
