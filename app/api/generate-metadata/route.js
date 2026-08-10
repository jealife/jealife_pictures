import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// Le prompt demande déjà un titre court, mais c'est une consigne, pas une
// garantie — Gemini l'a parfois ignorée (jusqu'à 235 caractères observés en
// base). Filet de sécurité côté serveur : coupe à la dernière limite de mot
// avant la limite plutôt qu'en plein milieu, pour ne pas couper un mot.
const MAX_TITLE_LENGTH = 70;

function truncateTitle(title) {
    if (title.length <= MAX_TITLE_LENGTH) return title;
    const cut = title.slice(0, MAX_TITLE_LENGTH);
    const lastSpace = cut.lastIndexOf(" ");
    return `${(lastSpace > 20 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(request) {
    try {
        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json(
                { error: "La clé GEMINI_API_KEY n'est pas configurée côté serveur." },
                { status: 500 }
            );
        }
        if (!SUPABASE_URL || !SUPABASE_KEY) {
            return NextResponse.json({ error: "Configuration Supabase manquante." }, { status: 500 });
        }

        // Sans cette vérification, n'importe quel visiteur non connecté peut
        // appeler cet endpoint en boucle et consommer indéfiniment le quota
        // GEMINI_API_KEY (payant) du site.
        const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
        if (!token) {
            return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return NextResponse.json({ error: "Session invalide, reconnectez-vous." }, { status: 401 });
        }

        // Même garde-fou que moderate-upload : cette route appelle aussi
        // l'API Gemini payante à chaque essai.
        const { data: withinLimit, error: rateLimitError } = await supabase.rpc("check_rate_limit", {
            p_key: user.id,
            p_bucket: "generate-metadata",
            p_max_count: 15,
            p_window_seconds: 300,
        });
        if (rateLimitError) {
            console.error("Vérification de limite de débit impossible :", rateLimitError);
        } else if (!withinLimit) {
            return NextResponse.json(
                { error: "Trop de tentatives en peu de temps. Patientez quelques minutes avant de réessayer." },
                { status: 429 }
            );
        }

        const { image, mimeType, type } = await request.json();

        if (!image) {
            return NextResponse.json({ error: "Aucune image fournie." }, { status: 400 });
        }

        const prompt = `
            Tu es un expert en référencement (SEO) et curation pour une banque d'images et de médias (similaire à Unsplash).
            L'utilisateur vient d'uploader un média de type : "${type}".
            Analyse ce visuel et fournis :
            1. Un titre court, accrocheur et descriptif (max 60 caractères).
            2. Une description détaillée et fluide pour l'accessibilité (alt-text) et le SEO (1 à 2 phrases).
            3. Une liste de 5 à 8 mots-clés (tags) pertinents, séparés par des virgules.
            
            Tout doit être rédigé en FRANÇAIS.

            Réponds UNIQUEMENT avec un objet JSON valide suivant ce format exact :
            {
                "title": "Titre généré",
                "description": "Description générée",
                "tags": ["tag1", "tag2", "tag3"]
            }
        `;

        let response;
        try {
            response = await ai.models.generateContent({
                model: "gemini-flash-latest",
                contents: [
                    prompt,
                    {
                        inlineData: {
                            data: image,
                            mimeType: mimeType || "image/jpeg",
                        }
                    }
                ],
                config: {
                    responseMimeType: "application/json",
                }
            });
        } catch (err) {
            // `ApiError.status` (voir @google/genai) porte le code HTTP réel de
            // Gemini, contrairement à `err.message` qui n'est que le corps JSON
            // de l'erreur mis en chaîne — inutilisable pour un `if` fiable.
            // Un 429 ici n'est pas la limite de débit maison ci-dessus (déjà
            // traitée plus haut) mais celle de Google elle-même. Son quota
            // gratuit se compte par JOUR ("...PerDay..." dans le détail de
            // l'erreur) : le `retryDelay` que Gemini suggère (quelques
            // secondes) n'a de sens que pour une rafale, pas pour un quota
            // journalier déjà épuisé — le client ne doit pas s'y fier pour
            // décider quand réessayer.
            if (err?.status === 429) {
                const isDailyQuota = /PerDay/i.test(err.message || "");
                console.warn("Quota Gemini atteint :", err.message);
                return NextResponse.json(
                    {
                        error: isDailyQuota
                            ? "Quota de génération IA atteint pour aujourd'hui. Décrivez l'image vous-même, ou réessayez plus tard."
                            : "Trop de demandes de génération IA en ce moment. Réessayez dans quelques minutes.",
                        quotaExceeded: true,
                        retryAfterMs: isDailyQuota ? 6 * 60 * 60 * 1000 : 2 * 60 * 1000,
                    },
                    { status: 429 }
                );
            }
            throw err;
        }

        let text = response.text;

        // Supprimer le bloc de code markdown si présent
        if (text && text.startsWith("```json")) {
            text = text.replace(/^```json\n?/, "").replace(/\n?```$/, "");
        } else if (text && text.startsWith("```")) {
            text = text.replace(/^```\n?/, "").replace(/\n?```$/, "");
        }

        const data = JSON.parse(text);
        if (typeof data.title === "string") data.title = truncateTitle(data.title.trim());

        return NextResponse.json(data);
    } catch (error) {
        console.error("Erreur génération métadonnées:", error);
        return NextResponse.json(
            { error: "Impossible de générer les métadonnées avec l'IA." },
            { status: 500 }
        );
    }
}
