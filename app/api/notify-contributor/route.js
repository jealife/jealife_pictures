import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendMail, buildApprovedEmail, buildRejectedEmail } from "../../lib/mail";
import { mediaUrl, slugifyClient } from "../../lib/media";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Envoie un email de notification au contributeur après une décision de
 * modération (publication ou rejet). Appelée depuis la page admin de
 * modération juste après `approveMedia` / `rejectMedia`.
 *
 * Deux clients Supabase distincts :
 *   · client appelant  (token de l'admin) — vérifie que l'appelant est admin
 *   · client admin     (service_role)      — lit auth.users pour obtenir l'email
 *                                            du contributeur (inaccessible via RLS)
 *
 * L'envoi est best-effort : un échec de notification ne doit pas révoquer
 * la décision de modération déjà enregistrée en base. La route retourne
 * toujours 200 avec { ok, error? } — c'est la page admin qui décide quoi
 * afficher à l'admin en cas d'échec.
 */
export async function POST(request) {
    // ── 1. Vérifications de configuration ───────────────────────────────────
    if (!SUPABASE_URL || !SUPABASE_KEY) {
        return NextResponse.json({ ok: false, error: "Configuration Supabase manquante." }, { status: 500 });
    }
    if (!SERVICE_ROLE_KEY) {
        return NextResponse.json({ ok: false, error: "Clé de service Supabase manquante." }, { status: 500 });
    }

    // ── 2. Authentification de l'appelant (admin uniquement) ────────────────
    const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) {
        return NextResponse.json({ ok: false, error: "Authentification requise." }, { status: 401 });
    }

    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user: caller }, error: authError } = await supabaseUser.auth.getUser(token);
    if (authError || !caller) {
        return NextResponse.json({ ok: false, error: "Session invalide." }, { status: 401 });
    }

    // Vérifie le rôle admin via la fonction Postgres (même que is_admin()).
    const { data: isAdmin } = await supabaseUser.rpc("is_admin");
    if (!isAdmin) {
        return NextResponse.json({ ok: false, error: "Accès réservé aux administrateurs." }, { status: 403 });
    }

    // ── 3. Lecture du corps de la requête ────────────────────────────────────
    const { mediaId, action, reasonKey, customNote } = await request.json();
    if (!mediaId || !["approved", "rejected"].includes(action)) {
        return NextResponse.json({ ok: false, error: "Paramètres invalides (mediaId, action)." }, { status: 400 });
    }

    // ── 4. Récupération du média et de l'email du contributeur ───────────────
    // Le client service_role contourne RLS : seul moyen de lire auth.users.
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: media, error: mediaError } = await supabaseAdmin
        .from("media")
        .select("id, title, alt_text, thumbnail_url, user_id")
        .eq("id", mediaId)
        .single();

    if (mediaError || !media) {
        return NextResponse.json({ ok: false, error: "Média introuvable." }, { status: 404 });
    }

    // `auth.admin.getUserById` requiert la clé de service.
    const { data: { user: contributor }, error: userError } =
        await supabaseAdmin.auth.admin.getUserById(media.user_id);

    if (userError || !contributor?.email) {
        console.warn(`[notify-contributor] Email introuvable pour user ${media.user_id}:`, userError?.message);
        return NextResponse.json({ ok: false, error: "Email du contributeur introuvable." });
    }

    // ── 5. Construction et envoi de l'email ──────────────────────────────────
    const title = media.title || media.alt_text || "Sans titre";
    const photoUrl = media.thumbnail_url || null;

    let emailPayload;
    if (action === "approved") {
        const slug = slugifyClient(title);
        const mediaPageUrl = `${(process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "")}${mediaUrl({ id: media.id, title, alt: media.alt_text })}`;
        emailPayload = buildApprovedEmail({ title, photoUrl, mediaPageUrl });
    } else {
        emailPayload = buildRejectedEmail({ title, photoUrl, reasonKey, customNote });
    }

    const result = await sendMail({ to: contributor.email, ...emailPayload });

    // Best-effort : on logue l'éventuel échec mais on retourne toujours 200
    // pour ne pas faire croire à l'admin que la décision de modération a échoué.
    return NextResponse.json(result);
}
