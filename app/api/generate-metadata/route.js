import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

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

        const response = await ai.models.generateContent({
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

        let text = response.text;
        
        // Supprimer le bloc de code markdown si présent
        if (text && text.startsWith("```json")) {
            text = text.replace(/^```json\n?/, "").replace(/\n?```$/, "");
        } else if (text && text.startsWith("```")) {
            text = text.replace(/^```\n?/, "").replace(/\n?```$/, "");
        }
        
        const data = JSON.parse(text);

        return NextResponse.json(data);
    } catch (error) {
        console.error("Erreur génération métadonnées:", error);
        return NextResponse.json(
            { error: "Impossible de générer les métadonnées avec l'IA." },
            { status: 500 }
        );
    }
}
