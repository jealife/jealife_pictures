import nodemailer from "nodemailer";

/**
 * Transport Nodemailer partagé.
 *
 * Configuration Gmail (App Password) :
 *   1. Activer la validation en 2 étapes sur le compte Gmail
 *   2. Créer un mot de passe d'application :
 *      myaccount.google.com → Sécurité → Mots de passe des applications
 *      → Autre (nom : « JEaLiFe Stock ») → Copier les 16 caractères
 *   3. Renseigner MAIL_USER et MAIL_PASS dans .env.local
 *
 * Le transport est créé une seule fois et réutilisé par toutes les routes :
 * Nodemailer maintient un pool de connexions SMTP, ne pas recréer à chaque
 * appel. Si les variables d'environnement manquent (dev sans config mail),
 * `createTransport` reste exécuté mais les envois échoueront avec un message
 * clair — ça ne bloque pas le reste de l'application.
 */
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // SSL/TLS (port 465)
    auth: {
        user: process.env.MAIL_USER, // ex : notifications@jealife.com
        pass: process.env.MAIL_PASS, // mot de passe d'application Gmail (16 car.)
    },
});

/** Adresse et nom affichés dans le champ « De : » de tous les emails. */
const FROM = `"JEaLiFe Stock" <${process.env.MAIL_USER}>`;

/** URL de base du site, sans slash final. */
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://jealife.com").replace(/\/$/, "");

// ─────────────────────────────────────────────────────────────────────────────
// Templates HTML
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Enveloppe HTML commune à tous les emails.
 * @param {string} body  – Contenu HTML interne (entre le header et le footer)
 */
function wrap(body) {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>JEaLiFe Stock</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Inter,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">

          <!-- Header -->
          <tr>
            <td style="background:#0a0a0a;padding:24px 32px;">
              <a href="${SITE_URL}" style="text-decoration:none;">
                <span style="font-size:18px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">JEaLiFe Stock</span>
              </a>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #f0f0f0;background:#fafafa;">
              <p style="margin:0;font-size:12px;color:#999999;line-height:1.6;">
                Vous recevez cet email car vous avez un compte contributeur sur
                <a href="${SITE_URL}" style="color:#666;text-decoration:none;">JEaLiFe Stock</a>.
                Pour toute question, répondez directement à cet email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Email envoyé quand un admin publie un média en mode modération manuelle.
 *
 * @param {{ title: string, photoUrl: string, mediaPageUrl: string }} options
 */
export function buildApprovedEmail({ title, photoUrl, mediaPageUrl }) {
    const subject = "✅ Votre photo a été publiée sur JEaLiFe Stock";
    const html = wrap(`
      <p style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0a0a0a;">Félicitations 🎉</p>
      <p style="margin:0 0 24px;font-size:15px;color:#444;line-height:1.6;">
        Votre photo a été examinée et publiée sur JEaLiFe Stock. Elle est maintenant
        visible par toute la communauté.
      </p>

      ${photoUrl ? `
      <div style="margin:0 0 24px;border-radius:8px;overflow:hidden;line-height:0;">
        <img src="${photoUrl}" alt="${title}" width="496"
             style="width:100%;max-width:496px;height:auto;display:block;border-radius:8px;" />
      </div>` : ""}

      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:.6px;">Photo publiée</p>
      <p style="margin:0 0 24px;font-size:17px;font-weight:700;color:#0a0a0a;">${title || "Sans titre"}</p>

      <a href="${mediaPageUrl}"
         style="display:inline-block;padding:12px 24px;background:#0a0a0a;color:#ffffff;
                text-decoration:none;border-radius:8px;font-size:14px;font-weight:700;">
        Voir ma photo →
      </a>
    `);

    const text = `Félicitations ! Votre photo "${title}" a été publiée sur JEaLiFe Stock.\nVoir : ${mediaPageUrl}`;

    return { subject, html, text };
}

/**
 * Email envoyé quand un admin rejette un média.
 *
 * @param {{ title: string, photoUrl: string }} options
 */
export function buildRejectedEmail({ title, photoUrl }) {
    const subject = "Votre photo n'a pas été retenue — JEaLiFe Stock";
    const html = wrap(`
      <p style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0a0a0a;">Retour sur votre envoi</p>
      <p style="margin:0 0 24px;font-size:15px;color:#444;line-height:1.6;">
        Après examen, votre photo n'a pas pu être publiée sur JEaLiFe Stock.
        Cela ne remet pas en cause la qualité de votre travail — nos critères de curation
        sont stricts afin de maintenir la cohérence de la bibliothèque.
      </p>

      ${photoUrl ? `
      <div style="margin:0 0 24px;border-radius:8px;overflow:hidden;line-height:0;">
        <img src="${photoUrl}" alt="${title}"  width="496"
             style="width:100%;max-width:496px;height:auto;display:block;border-radius:8px;opacity:.7;" />
      </div>` : ""}

      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:.6px;">Photo concernée</p>
      <p style="margin:0 0 24px;font-size:17px;font-weight:700;color:#0a0a0a;">${title || "Sans titre"}</p>

      <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.7;">
        Raisons fréquentes de non-publication : résolution insuffisante, sujet hors ligne
        éditoriale, similitude avec une photo déjà présente, ou présence d'un filigrane.
        N'hésitez pas à soumettre d'autres photos ou à répondre à cet email si vous avez
        des questions.
      </p>

      <a href="${SITE_URL}/submit"
         style="display:inline-block;padding:12px 24px;background:#0a0a0a;color:#ffffff;
                text-decoration:none;border-radius:8px;font-size:14px;font-weight:700;">
        Soumettre une nouvelle photo →
      </a>
    `);

    const text = `Votre photo "${title}" n'a pas été retenue sur JEaLiFe Stock.\nSoumettre une nouvelle photo : ${SITE_URL}/submit`;

    return { subject, html, text };
}

// ─────────────────────────────────────────────────────────────────────────────
// Envoi
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Envoie un email transactionnel.
 *
 * @param {{ to: string, subject: string, html: string, text: string }} options
 * @returns {Promise<{ ok: boolean, messageId?: string, error?: string }>}
 */
export async function sendMail({ to, subject, html, text }) {
    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
        console.warn("[mail] MAIL_USER ou MAIL_PASS manquant — email non envoyé.");
        return { ok: false, error: "Configuration email manquante." };
    }

    try {
        const info = await transporter.sendMail({ from: FROM, to, subject, html, text });
        console.log(`[mail] Envoyé à ${to} — messageId: ${info.messageId}`);
        return { ok: true, messageId: info.messageId };
    } catch (err) {
        console.error("[mail] Échec d'envoi :", err.message);
        return { ok: false, error: err.message };
    }
}
