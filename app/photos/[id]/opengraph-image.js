import { ImageResponse } from "next/og";
import { getMediaById } from "../../lib/database";
import { parseMediaId } from "../../lib/media";
import { SITE_URL } from "../../lib/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Image OpenGraph d'une fiche photo/vidéo.
 *
 * La photo remplit toute l'image (1200×630) et le logo blanc JEaLiFe Stock
 * est positionné en haut à gauche — discret mais identifiable.
 */
export default async function OpenGraphImage({ params }) {
    const { id } = await params;
    const photo = await getMediaById(parseMediaId(id));

    const bgUrl = photo?.thumbnail_url || photo?.url || null;

    // ── Fond : la photo encodée en base64 ──
    let bgStyle = {
        background: "linear-gradient(135deg, #0b3d2e 0%, #0f172a 60%, #000 100%)",
    };

    if (bgUrl) {
        try {
            const res = await fetch(bgUrl);
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
            // Fallback dégradé de marque
        }
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
                    position: "relative",
                    fontFamily: "sans-serif",
                    ...bgStyle,
                }}
            >
                {/* ── Logo blanc en haut à gauche ── */}
                {logoData && (
                    <div
                        style={{
                            position: "absolute",
                            top: 36,
                            left: 44,
                            display: "flex",
                            alignItems: "center",
                        }}
                    >
                        <img
                            src={logoData}
                            style={{ height: 36, objectFit: "contain" }}
                        />
                    </div>
                )}
            </div>
        ),
        size
    );
}
