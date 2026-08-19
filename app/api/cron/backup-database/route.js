import { gzipSync } from "node:zlib";
import { Client } from "pg";
import { NextResponse } from "next/server";
import { uploadToFolder, listFolder, deleteFile } from "../../../lib/gdrive";

// Une sauvegarde complète (des dizaines de tables, plus l'export lui-même)
// prend plus de temps qu'une simple requête RPC comme sync-counters ; 60s
// est le plafond du forfait Vercel Hobby, largement suffisant à ce volume.
export const maxDuration = 60;

const RETENTION_DAYS = 30;

/**
 * Sauvegarde nocturne de la base — via Vercel Cron plutôt que GitHub
 * Actions (voir docs/SAUVEGARDE.md) : GitHub exige un moyen de paiement
 * vérifié pour débloquer les Actions sur ce compte, ce que les cartes
 * disponibles ne satisfont pas. Vercel Cron tourne déjà sans cette
 * contrainte (voir /api/cron/sync-counters).
 *
 * Ce n'est pas un pg_dump binaire (absent d'un environnement serverless) :
 * chaque table est exportée en JSON via une connexion directe. La
 * structure (tables, fonctions, déclencheurs, RLS) n'a pas besoin d'être
 * sauvegardée séparément : elle est déjà intégralement versionnée dans
 * supabase/migrations/. Restaurer un jour signifie donc rejouer ces
 * migrations sur une base neuve, puis réinjecter les données de cet
 * export — jamais l'inverse.
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

    const databaseUrl = process.env.BACKUP_DATABASE_URL;
    const auth = {
        clientId: process.env.GDRIVE_CLIENT_ID,
        clientSecret: process.env.GDRIVE_CLIENT_SECRET,
        refreshToken: process.env.GDRIVE_REFRESH_TOKEN,
    };
    const folderId = process.env.GDRIVE_BACKUP_FOLDER_ID;
    if (!databaseUrl || !auth.clientId || !auth.clientSecret || !auth.refreshToken || !folderId) {
        return NextResponse.json({ error: "Configuration de sauvegarde incomplète." }, { status: 500 });
    }

    const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

    try {
        await client.connect();

        const { rows: tableRows } = await client.query(
            `select table_name from information_schema.tables
             where table_schema = 'public' and table_type = 'BASE TABLE'
             order by table_name`
        );

        const tables = {};
        for (const { table_name } of tableRows) {
            // Nom de table venant du catalogue système, jamais d'une entrée
            // utilisateur : l'interpoler dans le SQL ici ne rouvre aucune
            // injection.
            const { rows } = await client.query(`select * from "${table_name}"`);
            tables[table_name] = rows;
        }

        const dump = gzipSync(
            Buffer.from(JSON.stringify({ generatedAt: new Date().toISOString(), tables }))
        );

        const stamp = new Date().toISOString().slice(0, 10);
        await uploadToFolder({
            auth,
            folderId,
            filename: `backup-${stamp}.json.gz`,
            mimeType: "application/gzip",
            content: dump,
        });

        const files = await listFolder({ auth, folderId });
        const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
        const expired = files.filter((file) => new Date(file.createdTime).getTime() < cutoff);
        for (const file of expired) {
            await deleteFile({ auth, fileId: file.id });
        }

        return NextResponse.json({
            success: true,
            tablesBackedUp: Object.keys(tables).length,
            sizeBytes: dump.length,
            deletedOldBackups: expired.length,
        });
    } catch (error) {
        console.error("Erreur de sauvegarde de la base :", error);
        return NextResponse.json({ error: "La sauvegarde a échoué." }, { status: 500 });
    } finally {
        await client.end();
    }
}
