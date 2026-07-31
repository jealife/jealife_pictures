import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

// Initialize with a dummy key just to see the validation error
const ai = new GoogleGenAI({ apiKey: "DUMMY_KEY" });

async function run() {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
                "Tu es un expert",
                {
                    inlineData: {
                        data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
                        mimeType: "image/png",
                    }
                }
            ],
        });
        console.log("Success:", response.text());
    } catch (e) {
        console.error("SDK Error:", e);
    }
}

run();
