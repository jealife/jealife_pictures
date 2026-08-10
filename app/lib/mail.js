import nodemailer from "nodemailer";
import { REJECTION_REASONS } from "./moderation-reasons";

/**
 * Transport Nodemailer partagé.
 *
 * Configuration Gmail (App Password) :
 *   1. Activer la validation en 2 étapes sur le compte Gmail
 *   2. Créer un mot de passe d'application :
 *      myaccount.google.com → Sécurité → Mots de passe des applications
 *      → Autre (nom : « JEaLiFe Stock ») → Copier les 16 caractères
 *   3. Renseigner MAIL_USER et MAIL_PASS dans .env.local
 */
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // SSL/TLS (port 465)
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
});

/** Adresse et nom affichés dans le champ « De : » de tous les emails. */
const FROM = `"JEaLiFe Stock" <${process.env.MAIL_USER || "notifications@stock.jealife.com"}>`;

/** URL de base du site, sans slash final. */
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://stock.jealife.com").replace(/\/$/, "");

// ─────────────────────────────────────────────────────────────────────────────
// Template de base respectant la charte graphique Noir & Blanc JEaLiFe Stock
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Enveloppe HTML haute fidélité monochrome (Noir & Blanc strict).
 * Intègre le logo officiel du site (JEaLiFe-Stock-Logo-transparent-blanc.png).
 */
function wrap(body, previewText = "") {
    const logoUrl = `${SITE_URL}/JEaLiFe-Stock-Logo-transparent-blanc.png`;

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>JEaLiFe Stock</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  ${previewText ? `<div style="display:none;font-size:1px;color:#f4f4f5;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${previewText}</div>` : ""}
  
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);border:1px solid #e4e4e7;">

          <!-- Header Noir & Blanc avec Logo du site -->
          <tr>
            <td style="background-color:#09090b;padding:28px 36px;border-bottom:1px solid #27272a;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <a href="${SITE_URL}" style="text-decoration:none;display:inline-block;">
                      <img src="${logoUrl}" alt="JEaLiFe Stock" height="34" style="height:34px;width:auto;display:block;border:0;" />
                    </a>
                  </td>
                  <td align="right">
                    <span style="font-size:11px;font-weight:700;color:#a1a1aa;text-transform:uppercase;letter-spacing:1px;background:rgba(255,255,255,0.1);padding:5px 12px;border-radius:20px;">Modération</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Contenu Principal -->
          <tr>
            <td style="padding:36px;">
              ${body}
            </td>
          </tr>

          <!-- Footer Monochrome Officiel -->
          <tr>
            <td style="padding:24px 36px;border-top:1px solid #f4f4f5;background-color:#fafafa;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:12px;color:#71717a;line-height:1.6;">
                    <p style="margin:0 0 6px;font-weight:600;color:#18181b;">JEaLiFe Stock — Banque d'images & Médias</p>
                    <p style="margin:0;">Vous recevez ce message automatique concernant vos contributions sur <a href="${SITE_URL}" style="color:#09090b;text-decoration:underline;">stock.jealife.com</a>.</p>
                  </td>
                </tr>
              </table>
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
 * Email de félicitations envoyé à la publication d'un média (Style Noir & Blanc).
 */
export function buildApprovedEmail({ title, photoUrl, mediaPageUrl }) {
    const subject = `[JEaLiFe Stock] Votre photo « ${title || "Sans titre"} » est en ligne`;
    const previewText = "Votre contenu a passé la modération et est désormais visible par tous sur JEaLiFe Stock.";

    const html = wrap(`
      <div style="margin-bottom:24px;">
        <span style="display:inline-block;padding:6px 14px;background-color:#09090b;color:#ffffff;border-radius:20px;font-size:11px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;margin-bottom:16px;">
          ✓ PUBLIÉE SUR LE FEED
        </span>
        <h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:#09090b;letter-spacing:-0.5px;line-height:1.2;">
          Félicitations, votre photo est en ligne !
        </h1>
        <p style="margin:0;font-size:15px;color:#52525b;line-height:1.6;">
          Votre contribution a été examinée avec succès par notre équipe. Elle figure désormais dans le catalogue officiel de JEaLiFe Stock et est accessible au public.
        </p>
      </div>

      ${photoUrl ? `
      <div style="margin:24px 0;border-radius:12px;overflow:hidden;background-color:#f4f4f5;border:1px solid #e4e4e7;">
        <img src="${photoUrl}" alt="${title || "Photo"}" width="508" style="width:100%;max-width:508px;height:auto;display:block;object-fit:cover;" />
      </div>` : ""}

      <div style="background-color:#fafafa;border:1px solid #e4e4e7;border-radius:12px;padding:16px 20px;margin-bottom:28px;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.8px;">Titre de l'image</p>
        <p style="margin:0;font-size:16px;font-weight:700;color:#09090b;">${title || "Sans titre"}</p>
      </div>

      <div style="text-align:center;margin-top:32px;">
        <a href="${mediaPageUrl}" style="display:inline-block;padding:14px 32px;background-color:#09090b;color:#ffffff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:700;letter-spacing:0.2px;box-shadow:0 2px 8px rgba(0,0,0,0.15);">
          Voir la photo sur le site →
        </a>
      </div>
    `, previewText);

    const text = `Félicitations ! Votre photo "${title}" a été publiée sur JEaLiFe Stock.\nVoir votre photo : ${mediaPageUrl}`;

    return { subject, html, text };
}

/**
 * Email d'explications et conseils envoyé lorsqu'un média est refusé (Style Noir & Blanc).
 */
export function buildRejectedEmail({ title, photoUrl, reasonKey = "autre", customNote = "" }) {
    const reasonInfo = REJECTION_REASONS[reasonKey] || REJECTION_REASONS.autre;
    const subject = `[JEaLiFe Stock] Information concernant votre envoi « ${title || "Photo"} »`;
    const previewText = `Votre photo n'a pas été retenue pour la raison suivante : ${reasonInfo.emailTitle}.`;

    const html = wrap(`
      <div style="margin-bottom:24px;">
        <span style="display:inline-block;padding:6px 14px;background-color:#f4f4f5;color:#09090b;border:1px solid #09090b;border-radius:20px;font-size:11px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;margin-bottom:16px;">
          • MODÉRATION ÉDITORIALE
        </span>
        <h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:#09090b;letter-spacing:-0.5px;line-height:1.2;">
          Votre envoi n'a pas été retenu
        </h1>
        <p style="margin:0;font-size:15px;color:#52525b;line-height:1.6;">
          Merci pour votre proposition sur JEaLiFe Stock. Après examen par notre équipe, cette photo n'a pas été sélectionnée pour figurer sur la plateforme.
        </p>
      </div>

      ${photoUrl ? `
      <div style="margin:24px 0;border-radius:12px;overflow:hidden;background-color:#18181b;border:1px solid #e4e4e7;">
        <img src="${photoUrl}" alt="${title || "Photo"}" width="508" style="width:100%;max-width:508px;height:auto;display:block;object-fit:cover;opacity:0.75;" />
      </div>` : ""}

      <!-- Bloc d'explications monochrome -->
      <div style="background-color:#fafafa;border:1px solid #e4e4e7;border-left:4px solid #09090b;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
        <p style="margin:0 0 6px;font-size:12px;font-weight:800;color:#09090b;text-transform:uppercase;letter-spacing:0.6px;">
          Motif principal : ${reasonInfo.emailTitle}
        </p>
        <p style="margin:0 0 ${customNote ? "14px" : "0"};font-size:14px;color:#3f3f46;line-height:1.6;">
          ${reasonInfo.advice}
        </p>

        ${customNote ? `
        <div style="padding-top:12px;border-top:1px dashed #e4e4e7;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#09090b;text-transform:uppercase;">Note de l'équipe de modération :</p>
          <p style="margin:0;font-size:13px;font-style:italic;color:#27272a;line-height:1.5;">« ${customNote} »</p>
        </div>` : ""}
      </div>

      <p style="margin:0 0 24px;font-size:14px;color:#71717a;line-height:1.6;">
        Cela ne remet nullement en cause vos qualités de photographe. N'hésitez pas à proposer d'autres réalisations respectant ces recommandations !
      </p>

      <div style="text-align:center;margin-top:32px;">
        <a href="${SITE_URL}/submit" style="display:inline-block;padding:14px 32px;background-color:#09090b;color:#ffffff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:700;letter-spacing:0.2px;box-shadow:0 2px 8px rgba(0,0,0,0.15);">
          Soumettre une autre photo →
        </a>
      </div>
    `, previewText);

    const text = `Votre photo "${title}" n'a pas été retenue sur JEaLiFe Stock.\nMotif : ${reasonInfo.emailTitle}\nConseil : ${reasonInfo.advice}${customNote ? `\nNote : ${customNote}` : ""}\n\nSoumettre une nouvelle photo : ${SITE_URL}/submit`;

    return { subject, html, text };
}

// ─────────────────────────────────────────────────────────────────────────────
// Fonction d'envoi principal
// ─────────────────────────────────────────────────────────────────────────────

export async function sendMail({ to, subject, html, text }) {
    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
        console.warn("[mail] MAIL_USER ou MAIL_PASS manquant — email non envoyé.");
        return { ok: false, error: "Configuration email manquante." };
    }

    try {
        const info = await transporter.sendMail({ from: FROM, to, subject, html, text });
        console.log(`[mail] Envoyé avec succès à ${to} — ID: ${info.messageId}`);
        return { ok: true, messageId: info.messageId };
    } catch (err) {
        console.error("[mail] Échec lors de l'envoi de l'email :", err.message);
        return { ok: false, error: err.message };
    }
}
