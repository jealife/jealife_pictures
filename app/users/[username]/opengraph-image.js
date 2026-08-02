import { ImageResponse } from "next/og";
import { getUserProfile } from "../../lib/database";
import { supabase } from "../../lib/supabase";

export const alt = "Profil photographe — JEaLiFe Stock";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Récupère la photo la plus vue (views_count) d'un utilisateur.
 * On trie côté Supabase pour éviter de rapatrier toute la galerie.
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

export default async function OpenGraphImage({ params }) {
    const { username } = await params;

    const profile = await getUserProfile(username);
    const displayName = profile?.full_name || profile?.username || username;

    // Photo la plus vue comme fond ; sinon dégradé de marque
    let bgImageData = null;
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
                    bgImageData = `data:${mime};base64,${b64}`;
                }
            } catch {
                // Silencieux : on tombe sur le dégradé
            }
        }
    }

    // Logo blanc en base64 (chargé une seule fois au build/runtime)
    let logoData = null;
    try {
        const logoRes = await fetch(
            new URL("../../../public/JEaLiFe-Stock-Logo-transparent-blanc.png", import.meta.url)
        );
        if (logoRes.ok) {
            const buf = await logoRes.arrayBuffer();
            logoData = `data:image/png;base64,${Buffer.from(buf).toString("base64")}`;
        }
    } catch {
        // pas de logo : on affiche le texte à la place
    }

    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    position: "relative",
                    overflow: "hidden",
                    fontFamily: "sans-serif",
                }}
            >
                {/* ── Fond : photo ou dégradé de marque ── */}
                {bgImageData ? (
                    <img
                        src={bgImageData}
                        style={{
                            position: "absolute",
                            inset: 0,
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            objectPosition: "center",
                        }}
                    />
                ) : (
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            background:
                                "linear-gradient(135deg, #0b3d2e 0%, #0f172a 60%, #000 100%)",
                        }}
                    />
                )}

                {/* ── Overlay sombre pour lisibilité ── */}
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        background:
                            "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.20) 40%, rgba(0,0,0,0.50) 100%)",
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
                        <span
                            style={{
                                color: "#fff",
                                fontSize: 20,
                                fontWeight: 700,
                                letterSpacing: 1,
                            }}
                        >
                            JEaLiFe Stock
                        </span>
                    )}
                </div>

                {/* ── Barre de recherche centrale ── */}
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
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
                            backdropFilter: "blur(12px)",
                            boxShadow: "0 8px 40px rgba(0,0,0,0.25)",
                            maxWidth: 840,
                            width: "100%",
                        }}
                    >
                        {/* Icône loupe */}
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
