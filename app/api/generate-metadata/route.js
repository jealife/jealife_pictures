import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function POST(request) {
    try {
        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json(
                { error: "La clé GEMINI_API_KEY n'est pas configurée côté serveur." },
                { status: 500 }
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
