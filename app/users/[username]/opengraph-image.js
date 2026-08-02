import { ImageResponse } from "next/og";
import { getUserProfile } from "../../lib/database";
import { supabase } from "../../lib/supabase";
import { SITE_URL } from "../../lib/site";

export const alt = "Profil photographe — JEaLiFe Stock";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Récupère la photo la plus vue (views_count) d'un utilisateur.
 */
async function getMostViewedPhoto(userId) {
    const { data } = await supabase
        .from("media")
        .select("url, thumbnail_url")
        .eq("user_id", userId)
        .eq("status", "published")
        .eq("type", "photo")
        .order("views_count", { ascending: false })
        .limit(1)
        .maybeSingle();

    return data;
}

/**
 * Image OpenGraph dynamique pour les profils utilisateurs.
 *
 * Fond = photo la plus vue de l'utilisateur (ou dégradé de marque).
 * Barre de recherche centrale = nom du photographe.
 *
 * Corrections Satori :
 * - Fond mis via `backgroundImage` + `backgroundSize/Position` sur l'élément racine
 * - `inset` remplacé par top/right/bottom/left explicites
 * - Logo chargé via URL publique du site (import.meta.url non fiable en serverless)
 */
export default async function OpenGraphImage({ params }) {
    const { username } = await params;

    const profile = await getUserProfile(username);
    const displayName = profile?.full_name || profile?.username || username;

    // Photo la plus vue comme fond
    let bgStyle = {
        background: "linear-gradient(135deg, #0b3d2e 0%, #0f4423 25%, #0f172a 65%, #000 100%)",
    };

    if (profile?.id) {
        const photo = await getMostViewedPhoto(profile.id);
        const photoUrl = photo?.thumbnail_url || photo?.url;
        if (photoUrl) {
            try {
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
            } catch {
                // Fallback dégradé
            }
        }
    }

    // Logo blanc depuis l'URL publique du site
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
                    // ── Fond : photo ou dégradé de marque ──
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
                        background: "linear-gradient(to bottom, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.15) 45%, rgba(0,0,0,0.55) 100%)",
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

                {/* ── Barre de recherche + nom, centrés ── */}
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
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 18,
                            background: "rgba(255,255,255,0.93)",
                            borderRadius: 999,
                            padding: "22px 44px",
                            boxShadow: "0 8px 40px rgba(0,0,0,0.30)",
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
                                fontSize: 42,
                                fontWeight: 500,
                                color: "#111",
                                letterSpacing: "-0.5px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                flex: 1,
                            }}
                        >
                            {displayName}
                        </span>
                    </div>
                </div>
            </div>
        ),
        size
    );
}
