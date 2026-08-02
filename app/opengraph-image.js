import { ImageResponse } from "next/og";
import { SITE_URL } from "./lib/site";
import { supabase } from "./lib/supabase";

export const alt = "JEaLiFe Stock — photos & vidéos libres de droits et gratuites";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Force-dynamic : jamais pré-rendu au build (Supabase n'est pas disponible
// pendant le SSG). L'image est générée à la demande, le CDN Vercel la met
// en cache automatiquement à l'edge.
export const dynamic = "force-dynamic";

/**
 * Image OpenGraph de la page d'accueil — style inspiré d'Unsplash.
 *
 * Fond = une photo aléatoire parmi les 20 plus vues du site.
 * Logo en haut à gauche + barre de recherche centrée.
 *
 * Notes Satori :
 * - `inset` n'est pas supporté → top/right/bottom/left explicites
 * - Le fond doit être sur l'élément racine via backgroundImage
 * - Le logo est chargé via l'URL publique (import.meta.url non fiable en serverless)
 */
export default async function OpenGraphImage() {
    // ── Photo aléatoire parmi les 20 plus vues ──
    let bgStyle = {
        background: "linear-gradient(135deg, #0b3d2e 0%, #0f4423 25%, #0f172a 65%, #000 100%)",
    };

    try {
        const { data: photos } = await supabase
            .from("media")
            .select("url, thumbnail_url")
            .eq("status", "published")
            .eq("type", "photo")
            .order("views_count", { ascending: false })
            .limit(20);

        if (photos?.length) {
            const pick = photos[Math.floor(Math.random() * photos.length)];
            const photoUrl = pick.thumbnail_url || pick.url;

            const res = await fetch(photoUrl);
            if (res.ok) {
                const buf = await res.arrayBuffer();
                const b64 = Buffer.from(buf).toString("base64");
                const mime = res.headers.get("content-type") || "image/jpeg";
                bgStyle = {
                    backgroundImage: `url("data:${mime};base64,${b64}")`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                };
            }
        }
    } catch {
        // Fallback dégradé de marque
    }

    // ── Logo blanc depuis l'URL publique du site ──
    let logoData = null;
    try {
        const logoRes = await fetch(`${SITE_URL}/JEaLiFe-Stock-Logo-transparent-blanc.png`);
        if (logoRes.ok) {
            const buf = await logoRes.arrayBuffer();
            logoData = `data:image/png;base64,${Buffer.from(buf).toString("base64")}`;
        }
    } catch {
        // Silencieux
    }

    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    position: "relative",
                    fontFamily: "sans-serif",
                    // ── Fond : photo aléatoire ou dégradé de marque ──
                    ...bgStyle,
                }}
            >
                {/* ── Overlay sombre pour la lisibilité ── */}
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.18) 45%, rgba(0,0,0,0.60) 100%)",
                    }}
                />

                {/* ── Logo en haut à gauche ── */}
                <div
                    style={{
                        position: "absolute",
                        top: 44,
                        left: 52,
                        display: "flex",
                        alignItems: "center",
                    }}
                >
                    {logoData ? (
                        <img src={logoData} style={{ height: 38, objectFit: "contain" }} />
                    ) : (
                        <span style={{ color: "#fff", fontSize: 20, fontWeight: 700, letterSpacing: 1 }}>
                            JEaLiFe Stock
                        </span>
                    )}
                </div>

                {/* ── Barre de recherche + sous-titre, centrés ── */}
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0 80px",
                    }}
                >
                    {/* Barre de recherche */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 18,
                            background: "rgba(255,255,255,0.93)",
                            borderRadius: 999,
                            padding: "22px 44px",
                            boxShadow: "0 8px 40px rgba(0,0,0,0.45)",
                            maxWidth: 840,
                            width: "100%",
                        }}
                    >
                        {/* Loupe */}
                        <svg
                            width="36"
                            height="36"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#111"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <span
                            style={{
                                fontSize: 40,
                                fontWeight: 500,
                                color: "#111",
                                letterSpacing: "-0.5px",
                            }}
                        >
                            Photos & Vidéos libres de droits
                        </span>
                    </div>

                    {/* Sous-titre */}
                    <div
                        style={{
                            marginTop: 24,
                            color: "rgba(255,255,255,0.85)",
                            fontSize: 22,
                            fontWeight: 400,
                            display: "flex",
                        }}
                    >
                        Une sélection soignée · De belles images du continent
                    </div>
                </div>
            </div>
        ),
        size
    );
}
