import crypto from "node:crypto";

/**
 * Accès Google Drive pour la sauvegarde nocturne de la base de données
 * (voir app/api/cron/backup-database/route.js).
 *
 * S'authentifie comme un vrai compte Google (jeton de renouvellement
 * obtenu une fois via OAuth Playground, voir docs/SAUVEGARDE.md), pas
 * comme un compte de service : un compte de service n'a aucun espace de
 * stockage propre, y compris dans un dossier partagé avec lui — Google
 * refuse alors tout envoi avec l'erreur "Service Accounts do not have
 * storage quota". S'authentifier comme le compte réel évite ce mur, et
 * dispense au passage de partager quoi que ce soit : le dossier de
 * sauvegarde est simplement un dossier normal dans le Drive du compte.
 *
 * Pas de dépendance `googleapis` (lourde, pensée pour un usage bien plus
 * large que "envoyer un fichier et lister/supprimer dans un dossier") :
 * un échange de jeton avec `fetch` plus quelques appels REST suffisent.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3/files";

/** Échange le jeton de renouvellement longue durée contre un jeton d'accès valable ~1h. */
async function getAccessToken({ clientId, clientSecret, refreshToken }) {
    const response = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: "refresh_token",
        }),
    });

    if (!response.ok) {
        throw new Error(`Authentification Google refusée (${response.status}) : ${await response.text()}`);
    }

    const { access_token } = await response.json();
    return access_token;
}

/** Envoie un fichier dans le dossier de sauvegarde, sans dépendance de mise en forme multipart tierce. */
export async function uploadToFolder({ auth, folderId, filename, mimeType, content }) {
    const accessToken = await getAccessToken(auth);
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
export async function listFolder({ auth, folderId }) {
    const accessToken = await getAccessToken(auth);
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
export async function deleteFile({ auth, fileId }) {
    const accessToken = await getAccessToken(auth);
    const response = await fetch(`${DRIVE_API}/files/${fileId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok && response.status !== 404) {
        throw new Error(`Suppression Google Drive échouée (${response.status}) : ${await response.text()}`);
    }
}
