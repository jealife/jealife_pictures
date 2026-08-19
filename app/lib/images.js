/**
 * Préparation des images avant envoi.
 *
 * Jusqu'ici le fichier source partait tel quel vers le stockage, et c'est ce
 * même fichier — souvent 10 à 20 Mo sortis d'un reflex — qui était ensuite
 * servi dans la grille d'accueil. Sur une connexion mobile facturée au
 * mégaoctet, une seule page d'accueil pouvait coûter plusieurs centaines de
 * francs à un visiteur.
 *
 * On produit donc trois dérivés dans le navigateur, avant tout envoi :
 *   · `display`   — version web (2400 px max) pour l'affichage ;
 *   · `thumbnail` — vignette (600 px max) pour les grilles ;
 *   · `blurDataURL` — miniature floue en base64, pour supprimer le décalage
 *     de mise en page pendant le chargement.
 * L'original est conservé à part pour le téléchargement haute définition.
 *
 * Tout se fait côté client : cela évite un aller-retour serveur, et surtout
 * cela divise par vingt ce que le photographe doit lui-même téléverser.
 */

export const DISPLAY_MAX_EDGE = 2400;
export const THUMBNAIL_MAX_EDGE = 800;
const BLUR_MAX_EDGE = 16;

let cachedWebpSupport = null;

function supportsWebp() {
    if (cachedWebpSupport !== null) return cachedWebpSupport;
    try {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        cachedWebpSupport = canvas.toDataURL("image/webp").startsWith("data:image/webp");
    } catch {
        cachedWebpSupport = false;
    }
    return cachedWebpSupport;
}

function targetSize(width, height, maxEdge) {
    const longest = Math.max(width, height);
    if (longest <= maxEdge) return { width, height };
    const ratio = maxEdge / longest;
    return {
        width: Math.round(width * ratio),
        height: Math.round(height * ratio),
    };
}

function canvasToBlob(canvas, mimeType, quality) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error("Conversion de l'image impossible"))),
            mimeType,
            quality
        );
    });
}

function drawResized(bitmap, width, height) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, width, height);

    return canvas;
}

const WATERMARK_TEXT = "JEALIFE STOCK";

/**
 * Fusionne le filigrane directement dans les pixels du canevas — même motif
 * (rotation -28°, texte répété) que le calque CSS de Watermark.jsx, mais
 * cette fois dans le fichier lui-même. Un clic droit → « Enregistrer
 * l'image » sur une vignette Premium récupère donc une image déjà
 * filigranée, pas le fichier nu ; un calque posé dans le navigateur ne
 * protège jamais que l'écran, pas le fichier réel.
 */
function drawWatermarkTile(canvas) {
    const context = canvas.getContext("2d");
    const { width, height } = canvas;
    const stepX = 190;
    const stepY = 100;

    context.save();
    context.translate(width / 2, height / 2);
    context.rotate((-28 * Math.PI) / 180);
    context.font = "800 19px sans-serif";
    context.textBaseline = "alphabetic";
    context.fillStyle = "rgba(255,255,255,0.55)";
    context.strokeStyle = "rgba(0,0,0,0.35)";
    context.lineWidth = 0.6;

    // Le canevas pivote autour de son centre : il faut carreler une zone au
    // moins aussi large que sa diagonale pour ne laisser aucun coin nu une
    // fois la rotation appliquée.
    const diag = Math.ceil(Math.sqrt(width * width + height * height));
    for (let y = -diag; y < diag; y += stepY) {
        for (let x = -diag; x < diag; x += stepX) {
            context.strokeText(WATERMARK_TEXT, x, y);
            context.fillText(WATERMARK_TEXT, x, y);
        }
    }
    context.restore();
}

/**
 * Charge un fichier sous une forme dessinable sur un canvas.
 *
 * Renvoie toujours `{ source, duration }` : pour une vidéo, la durée est lue
 * au passage. Elle était jusqu'ici calculée pour choisir l'instant de la
 * capture, puis jetée — d'où des vidéos enregistrées sans durée, et le badge
 * de durée absent sur toutes les cartes.
 */
async function loadBitmap(file) {
    if (file.type.startsWith("video/")) {
        return new Promise((resolve, reject) => {
            const video = document.createElement("video");
            video.preload = "metadata";
            video.muted = true;
            video.playsInline = true;

            const url = URL.createObjectURL(file);
            video.src = url;

            video.onloadeddata = () => {
                // On se place à 25 % pour éviter les premières images noires.
                video.currentTime = Math.max(0, Math.min(1, video.duration * 0.25));
            };

            video.onseeked = () => {
                const canvas = document.createElement("canvas");
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                const duration = Number.isFinite(video.duration) ? video.duration : null;
                URL.revokeObjectURL(url);
                resolve({ source: canvas, duration });
            };

            video.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error("Fichier vidéo illisible"));
            };
        });
    }

    // `imageOrientation: "from-image"` applique la rotation EXIF : sans cela,
    // les photos prises en portrait au téléphone arrivaient couchées.
    if (typeof createImageBitmap === "function") {
        try {
            return { source: await createImageBitmap(file, { imageOrientation: "from-image" }), duration: null };
        } catch {
            // Certains navigateurs refusent l'option ; on retente sans.
            try {
                return { source: await createImageBitmap(file), duration: null };
            } catch {
                /* on bascule sur <img> ci-dessous */
            }
        }
    }

    return new Promise((resolve, reject) => {
        const image = new Image();
        const url = URL.createObjectURL(file);
        image.onload = () => {
            URL.revokeObjectURL(url);
            resolve({ source: image, duration: null });
        };
        image.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Fichier image illisible"));
        };
        image.src = url;
    });
}

/** Durée en secondes → « 1:23 ». Format attendu par la colonne `duration`. */
export function formatDuration(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return null;
    const total = Math.round(seconds);
    const minutes = Math.floor(total / 60);
    return `${minutes}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * @param {File} file
 * @returns {Promise<{
 *   width: number, height: number, duration: string|null, extension: string,
 *   mimeType: string, display: Blob, thumbnail: Blob, blurDataURL: string
 * }>}
 */
export async function processImage(file) {
    const { source: bitmap, duration } = await loadBitmap(file);
    const width = bitmap.width || bitmap.naturalWidth;
    const height = bitmap.height || bitmap.naturalHeight;

    if (!width || !height) {
        throw new Error("Dimensions de l'image introuvables");
    }

    const useWebp = supportsWebp();
    const mimeType = useWebp ? "image/webp" : "image/jpeg";
    const extension = useWebp ? "webp" : "jpg";

    const displaySize = targetSize(width, height, DISPLAY_MAX_EDGE);
    const display = await canvasToBlob(
        drawResized(bitmap, displaySize.width, displaySize.height),
        mimeType,
        0.85
    );

    const thumbSize = targetSize(width, height, THUMBNAIL_MAX_EDGE);
    const thumbnail = await canvasToBlob(
        drawResized(bitmap, thumbSize.width, thumbSize.height),
        mimeType,
        0.85
    );

    const blurSize = targetSize(width, height, BLUR_MAX_EDGE);
    const blurCanvas = drawResized(bitmap, blurSize.width, blurSize.height);
    const blurDataURL = blurCanvas.toDataURL("image/jpeg", 0.5);

    bitmap.close?.();

    return {
        width,
        height,
        duration: formatDuration(duration),
        extension,
        mimeType,
        display,
        thumbnail,
        blurDataURL,
    };
}

/**
 * Reproduit un blob déjà à la taille vignette, filigrane fusionné dans les
 * pixels. Utilisé à la publication (voir SubmitForm.jsx) : le statut
 * Premium peut changer entre la sélection du fichier (où `processImage`
 * produit la vignette de départ) et l'envoi, donc le filigrane ne peut pas
 * être décidé plus tôt.
 */
export async function watermarkThumbnail(blob, mimeType, quality = 0.85) {
    const { source: bitmap } = await loadBitmap(blob);
    const canvas = drawResized(bitmap, bitmap.width || bitmap.naturalWidth, bitmap.height || bitmap.naturalHeight);
    bitmap.close?.();
    drawWatermarkTile(canvas);
    return canvasToBlob(canvas, mimeType, quality);
}

/**
 * Régénère une vignette (filigranée ou non) à partir d'une image source
 * quelconque — utilisé quand un contributeur bascule une photo déjà publiée
 * entre Gratuit et Premium (voir la page de modification) : la vignette
 * envoyée à la publication ne peut pas être « défiligranée » après coup, il
 * faut repartir d'une source propre (`media.url`, jamais la vignette).
 */
export async function makeThumbnail(blob, { watermark = false, mimeType } = {}) {
    const { source: bitmap } = await loadBitmap(blob);
    const width = bitmap.width || bitmap.naturalWidth;
    const height = bitmap.height || bitmap.naturalHeight;
    const size = targetSize(width, height, THUMBNAIL_MAX_EDGE);
    const canvas = drawResized(bitmap, size.width, size.height);
    bitmap.close?.();
    if (watermark) drawWatermarkTile(canvas);

    // Un `mimeType` explicite permet de reproduire exactement le format déjà
    // publié (voir edit/page.js, qui réécrit la vignette en place à la même
    // adresse) : recalculer le support WebP du navigateur donnerait parfois
    // un format différent de celui de l'extension du fichier existant.
    const resolvedMimeType = mimeType || (supportsWebp() ? "image/webp" : "image/jpeg");
    const extension = resolvedMimeType === "image/webp" ? "webp" : "jpg";
    return { blob: await canvasToBlob(canvas, resolvedMimeType, 0.85), mimeType: resolvedMimeType, extension };
}

/**
 * Redimensionne une image déjà en ligne à la largeur demandée, pour que les
 * choix « Petit / Moyen / Grand » du menu de téléchargement produisent
 * réellement des fichiers différents. Auparavant, les trois options
 * téléchargeaient exactement le même fichier original.
 */
export async function resizeRemoteImage(url, maxWidth, forceJpeg = false) {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Téléchargement du fichier impossible");

    const blob = await response.blob();
    
    // Si pas de redimensionnement demandé et (soit on ne force pas le JPEG, soit c'est déjà un JPEG)
    if (!maxWidth && (!forceJpeg || blob.type === "image/jpeg")) return blob;

    const { source: bitmap } = await loadBitmap(blob);
    const width = bitmap.width || bitmap.naturalWidth;
    const height = bitmap.height || bitmap.naturalHeight;

    if (!width || (maxWidth && width <= maxWidth)) {
        // L'image est plus petite que maxWidth, pas besoin de redimensionner.
        // Mais il faut peut-être quand même la convertir en JPEG si demandé.
        if (!forceJpeg || blob.type === "image/jpeg") {
            bitmap.close?.();
            return blob;
        }
    }

    const targetW = maxWidth ? Math.min(width, maxWidth) : width;
    const size = targetSize(width, height, Math.max(targetW, Math.round((targetW * height) / width)));
    const scaled = {
        width: targetW,
        height: Math.round((height * targetW) / width),
    };

    const canvas = drawResized(bitmap, scaled.width || size.width, scaled.height || size.height);
    bitmap.close?.();

    return canvasToBlob(canvas, "image/jpeg", 0.9);
}

/** Poids lisible : « 4,2 Mo » plutôt que « 4404019 ». */
export function formatFileSize(bytes) {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}
