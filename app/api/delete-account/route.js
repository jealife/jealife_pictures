import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { r2Configured, r2KeyFromUrl, deleteR2Objects } from "../../lib/r2";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Suppression définitive d'un compte, depuis l'admin.
 *
 * `profiles.id` référence `auth.users` en `on delete cascade`, et tout le
 * reste (media, likes, téléchargements, collections…) référence `profiles`
 * ou `auth.users` de la même façon (voir migration 0001 et suivantes) : un
 * seul appel à `auth.admin.deleteUser` suffit à faire disparaître toutes ses
 * données de la base. Mais ce mécanisme est purement Postgres — aucun code
 * applicatif ne s'exécute pendant une cascade, donc les fichiers R2 des
 * photos de ce compte (ni son avatar, sur Supabase Storage) ne seraient
 * jamais nettoyés. On récupère donc leurs URL AVANT de supprimer le compte,
 * pendant que la ligne existe encore.
 *
 * `auth.admin.deleteUser` exige la clé de service : elle seule contourne la
 * RLS et peut agir sur `auth.users`, un privilège qu'aucun jeton utilisateur
 * n'a — d'où deux clients ici, l'un pour vérifier qui appelle, l'autre pour
 * l'opération elle-même.
 */
export async function POST(request) {
    try {
        if (!SUPABASE_URL || !SUPABASE_KEY) {
            return NextResponse.json({ error: "Configuration Supabase manquante." }, { status: 500 });
        }
        if (!SERVICE_ROLE_KEY) {
            return NextResponse.json({ error: "Clé de service Supabase manquante côté serveur." }, { status: 500 });
        }

        const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
        if (!token) {
            return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
        }

        const caller = createClient(SUPABASE_URL, SUPABASE_KEY, {
            global: { headers: { Authorization: `Bearer ${token}` } },
        });
        const { data: { user: adminUser }, error: authError } = await caller.auth.getUser(token);
        if (authError || !adminUser) {
            return NextResponse.json({ error: "Session invalide, reconnectez-vous." }, { status: 401 });
        }

        const { data: adminProfile, error: adminProfileError } = await caller
            .from("profiles")
            .select("role")
            .eq("id", adminUser.id)
            .maybeSingle();
        if (adminProfileError) throw adminProfileError;
        if (adminProfile?.role !== "admin") {
            return NextResponse.json({ error: "Réservé aux administrateurs." }, { status: 403 });
        }

        const { userId } = await request.json();
        if (!userId) {
            return NextResponse.json({ error: "Compte manquant." }, { status: 400 });
        }
        if (userId === adminUser.id) {
            return NextResponse.json({ error: "Impossible de supprimer votre propre compte depuis cet écran." }, { status: 400 });
        }

        const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

        const { data: target, error: targetError } = await admin
            .from("profiles")
            .select("username, full_name, role, avatar_url")
            .eq("id", userId)
            .maybeSingle();
        if (targetError) throw targetError;
        if (!target) {
            return NextResponse.json({ error: "Ce compte n'existe pas ou plus." }, { status: 404 });
        }
        // Retirer les droits admin (bouton dédié) reste un choix délibéré
        // séparé : ça évite qu'un compte admin disparaisse d'un seul geste
        // pressé, et qu'un site se retrouve sans un seul administrateur.
        if (target.role === "admin") {
            return NextResponse.json(
                { error: "Retirez d'abord les droits admin de ce compte avant de le supprimer." },
                { status: 409 }
            );
        }

        const { data: mediaRows, error: mediaError } = await admin
            .from("media")
            .select("url, thumbnail_url, original_url")
            .eq("user_id", userId);
        if (mediaError) throw mediaError;

        const { error: deleteAuthError } = await admin.auth.admin.deleteUser(userId);
        if (deleteAuthError) throw deleteAuthError;

        // Best-effort à partir d'ici : le compte est déjà supprimé, quoi qu'il
        // arrive en dessous. Un fichier R2 orphelin est rattrapable plus tard ;
        // annoncer un échec de suppression alors que le compte est bel et bien
        // parti tromperait l'admin.
        if (r2Configured && mediaRows?.length) {
            const keys = mediaRows
                .flatMap((m) => [m.url, m.thumbnail_url, m.original_url])
                .map(r2KeyFromUrl)
                .filter(Boolean);
            if (keys.length > 0) {
                await deleteR2Objects(keys).catch((err) =>
                    console.error("Nettoyage R2 après suppression de compte impossible :", err)
                );
            }
        }

        const avatarPrefix = `${SUPABASE_URL}/storage/v1/object/public/media/`;
        if (target.avatar_url?.startsWith(avatarPrefix)) {
            const avatarPath = target.avatar_url.slice(avatarPrefix.length);
            await admin.storage.from("media").remove([avatarPath]).catch((err) =>
                console.error("Suppression de l'avatar impossible :", err)
            );
        }

        // `log_admin_action` vérifie `is_admin()` via `auth.uid()` : ce
        // contexte n'existe pas pour le client à clé de service (il
        // contourne l'authentification, pas seulement la RLS), l'appel y
        // échouerait systématiquement avec « Permission refusée ». On journalise
        // donc avec le client de l'appelant, déjà vérifié admin plus haut — sa
        // session reste valide, seul le compte CIBLE vient d'être supprimé.
        await caller.rpc("log_admin_action", {
            p_action: "user.delete",
            p_target_type: "user",
            p_target_id: userId,
            p_details: { username: target.username, full_name: target.full_name, media_count: mediaRows?.length || 0 },
        }).then(({ error }) => {
            if (error) console.error("Erreur de journalisation admin :", error);
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Erreur de suppression de compte :", error);
        return NextResponse.json({ error: "Impossible de supprimer ce compte." }, { status: 500 });
    }
}
