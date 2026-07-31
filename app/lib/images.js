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
                // Seek to 25% of the video to avoid black frames at the beginning
                video.currentTime = Math.max(0, Math.min(1, video.duration * 0.25));
            };

            video.onseeked = () => {
                const canvas = document.createElement("canvas");
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                URL.revokeObjectURL(url);
                resolve(canvas); // Canvas is a valid ImageImageSource for canvas drawing
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
            return await createImageBitmap(file, { imageOrientation: "from-image" });
        } catch {
            // Certains navigateurs refusent l'option ; on retente sans.
            try {
                return await createImageBitmap(file);
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
            resolve(image);
        };
        image.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Fichier image illisible"));
        };
        image.src = url;
    });
}

/**
 * @param {File} file
 * @returns {Promise<{
 *   width: number, height: number, extension: string, mimeType: string,
 *   display: Blob, thumbnail: Blob, blurDataURL: string
 * }>}
 */
export async function processImage(file) {
    const bitmap = await loadBitmap(file);
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
        extension,
        mimeType,
        display,
        thumbnail,
        blurDataURL,
    };
}

/**
 * Redimensionne une image déjà en ligne à la largeur demandée, pour que les
 * choix « Petit / Moyen / Grand » du menu de téléchargement produisent
 * réellement des fichiers différents. Auparavant, les trois options
 * téléchargeaient exactement le même fichier original.
 */
export async function resizeRemoteImage(url, maxWidth) {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Téléchargement du fichier impossible");

    const blob = await response.blob();
    if (!maxWidth) return blob;

    const bitmap = await loadBitmap(blob);
    const width = bitmap.width || bitmap.naturalWidth;
    const height = bitmap.height || bitmap.naturalHeight;

    if (!width || width <= maxWidth) {
        bitmap.close?.();
        return blob;
    }

    const size = targetSize(width, height, Math.max(maxWidth, Math.round((maxWidth * height) / width)));
    const scaled = {
        width: maxWidth,
        height: Math.round((height * maxWidth) / width),
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
