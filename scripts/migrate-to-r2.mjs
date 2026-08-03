// ============================================================================
// Migration du stockage média : Supabase Storage → Cloudflare R2
//
//   Recopie chaque fichier (thumbnail/display/original) déjà publié vers R2,
//   puis met à jour `media.url` / `thumbnail_url` / `original_url` en base.
//   Les fichiers Supabase ne sont PAS supprimés par ce script : si quelque
//   chose tourne mal, il suffit de repointer les colonnes vers les anciennes
//   URL Supabase pour revenir en arrière. Le nettoyage du bucket Supabase
//   reste une étape manuelle, volontairement séparée.
//
// Prérequis dans .env.local :
//   - CLOUDFLARE_R2_ACCOUNT_ID / ACCESS_KEY_ID / SECRET_ACCESS_KEY / BUCKET_NAME / PUBLIC_URL
//   - SUPABASE_SERVICE_ROLE_KEY (Project Settings → API → service_role — ne
//     JAMAIS exposer cette clé côté navigateur ; elle ne sert qu'ici)
//
// Usage :
//   node --env-file=.env.local scripts/migrate-to-r2.mjs --dry-run   # aperçu, aucune écriture
//   node --env-file=.env.local scripts/migrate-to-r2.mjs             # migration réelle
// ============================================================================

import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const DRY_RUN = process.argv.includes("--dry-run");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const R2_ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME;
const R2_PUBLIC_URL = (process.env.CLOUDFLARE_R2_PUBLIC_URL || "").replace(/\/+$/, "");

function requireEnv() {
    const missing = [
        ["NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL],
        ["SUPABASE_SERVICE_ROLE_KEY", SERVICE_ROLE_KEY],
        ["CLOUDFLARE_R2_ACCOUNT_ID", R2_ACCOUNT_ID],
        ["CLOUDFLARE_R2_ACCESS_KEY_ID", R2_ACCESS_KEY_ID],
        ["CLOUDFLARE_R2_SECRET_ACCESS_KEY", R2_SECRET_ACCESS_KEY],
        ["CLOUDFLARE_R2_BUCKET_NAME", R2_BUCKET_NAME],
        ["CLOUDFLARE_R2_PUBLIC_URL", R2_PUBLIC_URL],
    ].filter(([, value]) => !value);

    if (missing.length > 0) {
        console.error(`Variables manquantes : ${missing.map(([name]) => name).join(", ")}`);
        process.exit(1);
    }
}

requireEnv();

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

/** « https://xxx.supabase.co/storage/v1/object/public/media/<clé> » → « <clé> » */
function keyFromSupabaseUrl(url) {
    const marker = "/object/public/media/";
    const index = url.indexOf(marker);
    if (index === -1) return null;
    return decodeURIComponent(url.slice(index + marker.length));
}

async function migrateFile(supabaseUrl) {
    if (!supabaseUrl) return null;

    const key = keyFromSupabaseUrl(supabaseUrl);
    if (!key) {
        console.warn(`  ! URL inattendue, ignorée : ${supabaseUrl}`);
        return supabaseUrl;
    }

    const newUrl = `${R2_PUBLIC_URL}/${key}`;
    if (DRY_RUN) {
        console.log(`  [dry-run] ${key}`);
        return newUrl;
    }

    const res = await fetch(supabaseUrl);
    if (!res.ok) throw new Error(`téléchargement échoué (${res.status}) pour ${key}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") || "application/octet-stream";

    await r2.send(new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
    }));

    console.log(`  ✓ ${key} (${(buffer.length / 1024).toFixed(0)} Ko)`);
    return newUrl;
}

async function run() {
    console.log(DRY_RUN ? "=== Aperçu (dry-run) — aucune écriture ===" : "=== Migration réelle ===");

    const { data: rows, error } = await supabase
        .from("media")
        .select("id, url, thumbnail_url, original_url")
        .order("id", { ascending: true });

    if (error) {
        console.error("Impossible de lire la table media :", error.message);
        process.exit(1);
    }

    console.log(`${rows.length} média(s) à traiter.\n`);

    let migrated = 0;
    let failed = 0;

    for (const row of rows) {
        console.log(`Média #${row.id}`);
        try {
            const [url, thumbnail_url, original_url] = await Promise.all([
                migrateFile(row.url),
                migrateFile(row.thumbnail_url),
                migrateFile(row.original_url),
            ]);

            if (!DRY_RUN) {
                const { error: updateError } = await supabase
                    .from("media")
                    .update({ url, thumbnail_url, original_url })
                    .eq("id", row.id);
                if (updateError) throw updateError;
            }

            migrated += 1;
        } catch (err) {
            failed += 1;
            console.error(`  ✗ Échec sur le média #${row.id} :`, err.message || err);
        }
    }

    console.log(`\nTerminé : ${migrated} traité(s), ${failed} en échec.`);
    if (DRY_RUN) console.log("Aucune donnée n'a été modifiée (--dry-run).");
}

run();
