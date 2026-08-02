import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { NextResponse } from "next/server";
import { DISPLAY_MAX_EDGE } from "../../lib/images";

/**
 * Porte de qualité automatique, appelée juste avant l'envoi définitif d'un
 * média (voir app/submit/page.js). Bloque à l'envoi plutôt que de publier
 * puis modérer : rien de rejeté ici n'atteint jamais la table `media`.
 *
 * Contrôles, dans l'ordre (du moins cher au plus cher) :
 *   1. Résolution (les dimensions d'origine sont déclarées par le client —
 *      les envoyer en entier serait trop coûteux — mais recoupées avec les
 *      dimensions réelles de la version web reçue : voir le commentaire
 *      près de `expectedLongEdge`)
 *   2. Netteté (variance du Laplacien)
 *   3. Doublon (empreinte perceptuelle comparée aux médias déjà publiés)
 *   4. Modération IA — nsfw / filigrane / capture d'écran — sautée pour les
 *      contributeurs de confiance (voir TRUSTED_PUBLISHED_COUNT).
 */

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Seuils heuristiques, à ajuster une fois qu'on a du recul sur les envois
// réels (faux positifs/négatifs constatés en production).
const MIN_MEGAPIXELS = 5; // aligné sur le minimum affiché par Unsplash
const MIN_SHARPNESS_VARIANCE = 45;
// Volontairement strict (sur 64 bits) : le dHash capture surtout la
// structure de luminance de l'image, pas son contenu fin. Un seuil trop
// large peut confondre deux photos différentes mais visuellement proches
// (même cadrage, mêmes couleurs) — sans file de modération pour rattraper
// un faux positif, on préfère laisser passer un doublon limite plutôt que
// de bloquer une image légitime.
const DUPLICATE_HAMMING_THRESHOLD = 4;
const TRUSTED_PUBLISHED_COUNT = 15;

function hammingDistance(a, b) {
    let x = a ^ b;
    let count = 0n;
    while (x > 0n) {
        count += x & 1n;
        x >>= 1n;
    }
    return Number(count);
}

/**
 * dHash 64 bits : 9×8 en niveaux de gris, un bit par comparaison de deux
 * pixels adjacents sur chaque ligne. Insensible aux petites recompressions,
 * donc plus robuste qu'un hash de fichier pour repérer un doublon.
 */
async function computeDHash(buffer) {
    const { data } = await sharp(buffer)
        .resize(9, 8, { fit: "fill" })
        .greyscale()
        .raw()
        .toBuffer({ resolveWithObject: true });

    let hash = 0n;
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            hash <<= 1n;
            if (data[row * 9 + col] < data[row * 9 + col + 1]) hash |= 1n;
        }
    }
    return hash.toString(16).padStart(16, "0");
}

async function measureSharpness(buffer) {
    const { channels } = await sharp(buffer)
        .greyscale()
        .convolve({ width: 3, height: 3, kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0] })
        .stats();
    return channels[0].stdev ** 2;
}

async function checkContentWithAI(buffer, mimeType) {
    const prompt = `
        Tu es un modérateur pour une banque d'images communautaire (comme Unsplash).
        Analyse cette image et détermine si elle enfreint l'une de ces règles :
        - contenu à caractère sexuel, violent ou choquant (nsfw)
        - filigrane, logo de marque ou texte incrusté visible en surimpression (watermark)
        - capture d'écran plutôt qu'une photo ou illustration originale (screenshot)

        Réponds UNIQUEMENT avec un objet JSON valide suivant ce format exact :
        { "nsfw": false, "watermark": false, "screenshot": false, "reason": "" }
    `;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
            prompt,
            { inlineData: { data: buffer.toString("base64"), mimeType } },
        ],
        config: { responseMimeType: "application/json" },
    });

    let text = response.text || "{}";
    if (text.startsWith("```")) {
        text = text.replace(/^```json?\n?/, "").replace(/\n?```$/, "");
    }
    return JSON.parse(text);
}

export async function POST(request) {
    try {
        if (!SUPABASE_URL || !SUPABASE_KEY) {
            return NextResponse.json({ error: "Configuration Supabase manquante." }, { status: 500 });
        }

        const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
        if (!token) {
            return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
        }

        // Client attaché au token de l'appelant : les requêtes ci-dessous
        // respectent la RLS comme si elles venaient de l'utilisateur lui-même.
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
            global: { headers: { Authorization: `Bearer ${token}` } },
        });

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return NextResponse.json({ error: "Session invalide, reconnectez-vous." }, { status: 401 });
        }

        const { image, mimeType, originalWidth, originalHeight } = await request.json();
        if (!image) {
            return NextResponse.json({ error: "Aucune image fournie." }, { status: 400 });
        }
        if (!originalWidth || !originalHeight) {
            return NextResponse.json({ error: "Dimensions d'origine manquantes." }, { status: 400 });
        }

        const buffer = Buffer.from(image, "base64");

        let metadata;
        try {
            metadata = await sharp(buffer).metadata();
        } catch {
            return NextResponse.json({ error: "Fichier image illisible ou corrompu." }, { status: 400 });
        }

        // La version web envoyée est un redimensionnement direct de
        // l'original (même ratio, bord long plafonné à DISPLAY_MAX_EDGE) :
        // pour un original authentique, son bord long réel correspond donc
        // exactement à cette formule. Un écart trahit des dimensions
        // d'origine falsifiées par le client.
        const expectedLongEdge = Math.min(Math.max(originalWidth, originalHeight), DISPLAY_MAX_EDGE);
        const actualLongEdge = Math.max(metadata.width || 0, metadata.height || 0);
        if (Math.abs(actualLongEdge - expectedLongEdge) > 4) {
            return NextResponse.json({ error: "Les dimensions annoncées ne correspondent pas à l'image envoyée." }, { status: 400 });
        }

        const megapixels = (originalWidth * originalHeight) / 1_000_000;
        if (megapixels < MIN_MEGAPIXELS) {
            return NextResponse.json(
                {
                    error: `Image trop petite (${originalWidth}×${originalHeight}px, ${megapixels.toFixed(1)} Mpx) : ${MIN_MEGAPIXELS} Mpx minimum.`,
                },
                { status: 422 }
            );
        }

        const sharpness = await measureSharpness(buffer);
        if (sharpness < MIN_SHARPNESS_VARIANCE) {
            return NextResponse.json(
                { error: "Cette image semble floue ou mal mise au point. Essayez une prise plus nette." },
                { status: 422 }
            );
        }

        const phash = await computeDHash(buffer);
        const candidateHash = BigInt(`0x${phash}`);

        const { data: existing, error: existingError } = await supabase
            .from("media")
            .select("phash")
            .eq("status", "published")
            .not("phash", "is", null)
            .order("created_at", { ascending: false })
            .limit(5000);

        if (existingError) throw existingError;

        const isDuplicate = (existing || []).some(
            (row) => hammingDistance(candidateHash, BigInt(`0x${row.phash}`)) <= DUPLICATE_HAMMING_THRESHOLD
        );
        if (isDuplicate) {
            return NextResponse.json(
                { error: "Cette image (ou une image très similaire) est déjà présente sur la plateforme." },
                { status: 422 }
            );
        }

        // Confiance progressive : un historique publié solide dispense de
        // l'appel de modération IA (coût, latence, faux positifs) ; les
        // contrôles techniques ci-dessus restent obligatoires pour tous.
        const { count: publishedCount, error: countError } = await supabase
            .from("media")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("status", "published");

        if (countError) throw countError;

        const isTrusted = (publishedCount || 0) >= TRUSTED_PUBLISHED_COUNT;

        if (!isTrusted) {
            if (!process.env.GEMINI_API_KEY) {
                return NextResponse.json({ error: "La modération automatique n'est pas configurée côté serveur." }, { status: 500 });
            }

            let verdict;
            try {
                verdict = await checkContentWithAI(buffer, mimeType || "image/jpeg");
            } catch (err) {
                console.error("Modération IA impossible :", err);
                return NextResponse.json({ error: "La vérification automatique du contenu a échoué. Réessayez." }, { status: 502 });
            }

            if (verdict.nsfw) {
                return NextResponse.json({ error: "Ce contenu ne respecte pas nos règles de publication." }, { status: 422 });
            }
            if (verdict.watermark) {
                return NextResponse.json(
                    { error: "Cette image semble comporter un filigrane, un logo ou du texte incrusté. Envoyez une version sans surimpression." },
                    { status: 422 }
                );
            }
            if (verdict.screenshot) {
                return NextResponse.json(
                    { error: "Les captures d'écran ne sont pas acceptées. Envoyez une photo ou une illustration originale." },
                    { status: 422 }
                );
            }
        }

        return NextResponse.json({ ok: true, phash, trusted: isTrusted });
    } catch (error) {
        console.error("Erreur de contrôle qualité :", error);
        return NextResponse.json({ error: "La vérification de l'image a échoué. Réessayez." }, { status: 500 });
    }
}
