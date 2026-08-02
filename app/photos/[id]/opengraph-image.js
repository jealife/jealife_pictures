import { ImageResponse } from "next/og";
import { getMediaById } from "../../lib/database";
import { parseMediaId } from "../../lib/media";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Image OpenGraph dynamique pour une fiche photo/vidéo.
 *
 * La photo elle-même sert de fond, avec le titre dans une barre de recherche
 * stylisée (style Unsplash). Pour les vidéos, on utilise la miniature.
 */
export default async function OpenGraphImage({ params }) {
    const { id } = await params;
    const photo = await getMediaById(parseMediaId(id));

    const title =
        photo?.title ||
        photo?.alt_text ||
        (photo?.type === "video" ? "Vidéo" : "Photo");
    const author =
        photo?.profiles?.full_name || photo?.profiles?.username || "";

    // URL de l'image de fond (miniature pour les vidéos, url sinon)
    const bgUrl = photo?.thumbnail_url || photo?.url || null;

    let bgImageData = null;
    if (bgUrl) {
        try {
            const res = await fetch(bgUrl);
            if (res.ok) {
                const buf = await res.arrayBuffer();
                const b64 = Buffer.from(buf).toString("base64");
                const mime = res.headers.get("content-type") || "image/jpeg";
                bgImageData = `data:${mime};base64,${b64}`;
            }
        } catch {
            // Silencieux
        }
    }

    // Logo blanc
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
        // Silencieux
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
                {/* ── Fond ── */}
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

                {/* ── Overlay ── */}
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        background:
                            "linear-gradient(to bottom, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.55) 100%)",
                    }}
                />

                {/* ── Logo ── */}
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
                        <span style={{ color: "#fff", fontSize: 20, fontWeight: 700 }}>
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
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0 80px",
                        gap: 0,
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
                            boxShadow: "0 8px 40px rgba(0,0,0,0.25)",
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
                                fontSize: 38,
                                fontWeight: 500,
                                color: "#111",
                                letterSpacing: "-0.5px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                flex: 1,
                            }}
                        >
                            {title}
                        </span>
                    </div>

                    {/* Auteur en dessous de la barre, si disponible */}
                    {author && (
                        <div
                            style={{
                                marginTop: 20,
                                color: "rgba(255,255,255,0.90)",
                                fontSize: 22,
                                fontWeight: 400,
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                            }}
                        >
                            <span style={{ opacity: 0.7 }}>par</span>
                            <span style={{ fontWeight: 600 }}>{author}</span>
                            <span style={{ opacity: 0.7 }}>· JEaLiFe Stock</span>
                        </div>
                    )}
                </div>
            </div>
        ),
        size
    );
}
