import { absoluteUrl } from "./lib/site";

export default function robots() {
    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                disallow: [
                    // Espaces privés ou transitoires : les indexer n'apporte
                    // rien et expose des URL à usage unique.
                    "/settings",
                    "/submit",
                    "/auth/",
                    "/reset-password",
                    "/forgot-password",
                    "/login",
                    "/join",
                    "/photos/*/edit",
                    // Les pages de résultats de recherche génèrent une infinité
                    // d'URL quasi identiques et épuisent le budget
                    // d'exploration sans jamais rien apporter au classement.
                    "/*?q=",
                ],
            },
            {
                // Googlebot-Image doit pouvoir atteindre les fichiers eux-mêmes,
                // pas seulement les pages qui les entourent.
                userAgent: "Googlebot-Image",
                allow: "/",
            },
        ],
        sitemap: absoluteUrl("/sitemap.xml"),
        host: absoluteUrl("/"),
    };
}
