import { NextResponse } from "next/server";
import { GATE_COOKIE } from "./app/lib/gate";

// Laisse passer les moteurs de recherche et les bots de prévisualisation de
// liens (WhatsApp, X, Facebook, Slack, Discord...) : ils n'exécutent pas de
// JavaScript et ne peuvent pas résoudre Turnstile. Sans cette liste, gater
// tout le site casserait aussi l'indexation Google et les aperçus de
// partage — un choix assumé, pas un oubli (le User-Agent reste usurpable,
// mais c'est le compromis standard pour ce genre de portail).
const CRAWLER_UA_PATTERN = new RegExp(
    [
        "Googlebot", "Bingbot", "DuckDuckBot", "Slurp", "Baiduspider", "YandexBot",
        "Applebot", "facebookexternalhit", "Twitterbot", "LinkedInBot",
        "WhatsApp", "TelegramBot", "Discordbot", "Slackbot", "SkypeUriPreview",
        "Pinterestbot",
    ].join("|"),
    "i"
);

export function middleware(request) {
    const userAgent = request.headers.get("user-agent") || "";
    if (CRAWLER_UA_PATTERN.test(userAgent)) {
        return NextResponse.next();
    }

    if (request.cookies.has(GATE_COOKIE)) {
        return NextResponse.next();
    }

    const url = request.nextUrl.clone();
    const next = `${url.pathname}${url.search}`;
    url.pathname = "/verify";
    url.search = `?next=${encodeURIComponent(next)}`;
    return NextResponse.redirect(url);
}

export const config = {
    matcher: [
        // Tout sauf : assets Next, API, la page de vérification elle-même
        // (sans quoi boucle infinie de redirection), et les fichiers qui
        // doivent rester atteignables sans condition (robots, sitemap,
        // manifest, favicon).
        "/((?!_next/static|_next/image|api/|verify|favicon.ico|robots.txt|sitemap.xml|manifest.json).*)",
    ],
};
