import crypto from "node:crypto";

/**
 * Accès Google Drive pour la sauvegarde nocturne de la base de données
 * (voir app/api/cron/backup-database/route.js). Un compte de service
 * n'a pas d'espace de stockage à lui : il ne peut écrire que dans un
 * dossier qu'un vrai compte Google lui a explicitement partagé — voir
 * docs/SAUVEGARDE.md pour la mise en place complète.
 *
 * Pas de dépendance `googleapis` (lourde, pensée pour un usage bien plus
 * large que "envoyer un fichier et lister/supprimer dans un dossier") :
 * un jeton signé à la main avec `node:crypto` plus quelques appels REST
 * suffisent, et restent lisibles d'un bout à l'autre.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3/files";

function base64url(input) {
    return Buffer.from(input)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

/**
 * Échange la clé privée du compte de service contre un jeton d'accès de
 * courte durée (1h), selon le flux JWT-bearer standard de Google — voir
 * https://developers.google.com/identity/protocols/oauth2/service-account.
 */
async function getAccessToken(serviceAccountJson) {
    const { client_email, private_key } = JSON.parse(serviceAccountJson);

    const now = Math.floor(Date.now() / 1000);
    const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const claims = base64url(
        JSON.stringify({
            iss: client_email,
            scope: "https://www.googleapis.com/auth/drive",
            aud: TOKEN_URL,
            iat: now,
            exp: now + 3600,
        })
    );

    const signature = crypto
        .createSign("RSA-SHA256")
        .update(`${header}.${claims}`)
        .sign(private_key, "base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

    const assertion = `${header}.${claims}.${signature}`;

    const response = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion,
        }),
    });

    if (!response.ok) {
        throw new Error(`Authentification Google refusée (${response.status}) : ${await response.text()}`);
    }

    const { access_token } = await response.json();
    return access_token;
}

/** Envoie un fichier dans le dossier partagé, sans dépendance de mise en forme multipart tierce. */
export async function uploadToFolder({ serviceAccountJson, folderId, filename, mimeType, content }) {
    const accessToken = await getAccessToken(serviceAccountJson);
    const boundary = `jealife-backup-${crypto.randomBytes(8).toString("hex")}`;

    const metadata = JSON.stringify({ name: filename, parents: [folderId] });
    const body = Buffer.concat([
        Buffer.from(
            `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
                `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`
        ),
        content,
        Buffer.from(`\r\n--${boundary}--`),
    ]);

    const response = await fetch(`${DRIVE_UPLOAD_API}?uploadType=multipart&fields=id`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body,
    });

    if (!response.ok) {
        throw new Error(`Envoi vers Google Drive échoué (${response.status}) : ${await response.text()}`);
    }

    return response.json();
}

/** Liste les fichiers d'un dossier, avec leur date de création (pour la purge). */
export async function listFolder({ serviceAccountJson, folderId }) {
    const accessToken = await getAccessToken(serviceAccountJson);
    const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);

    const response = await fetch(
        `${DRIVE_API}/files?q=${query}&fields=files(id,name,createdTime)&pageSize=1000`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
        throw new Error(`Lecture du dossier Google Drive échouée (${response.status}) : ${await response.text()}`);
    }

    const { files } = await response.json();
    return files || [];
}

/** Supprime définitivement un fichier (pas juste la corbeille, qui compte encore dans le quota). */
export async function deleteFile({ serviceAccountJson, fileId }) {
    const accessToken = await getAccessToken(serviceAccountJson);
    const response = await fetch(`${DRIVE_API}/files/${fileId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok && response.status !== 404) {
        throw new Error(`Suppression Google Drive échouée (${response.status}) : ${await response.text()}`);
    }
}
