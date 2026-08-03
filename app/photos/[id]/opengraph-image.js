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
            const mime = res.headers.get("content-type") || "";
            // `res.ok` ne suffit pas : un CDN en panne peut répondre 200 avec
            // une page d'erreur HTML à la place de l'image.
            if (res.ok && mime.startsWith("image/")) {
                const buf = await res.arrayBuffer();
                const b64 = Buffer.from(buf).toString("base64");
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
        const logoMime = logoRes.headers.get("content-type") || "";
        if (logoRes.ok && logoMime.startsWith("image/")) {
            const buf = await logoRes.arrayBuffer();
            logoData = `data:image/png;base64,${Buffer.from(buf).toString("base64")}`;
        }
    } catch {
        // Silencieux
    }

    // `ImageResponse` diffère son rendu (Satori) au streaming du corps de la
    // réponse, pas à sa construction : `renderImage` force ce rendu via
    // `arrayBuffer()` pour qu'une éventuelle erreur de décodage d'image soit
    // rattrapable ici plutôt que de faire planter la route en 500 (vécu en
    // production — voir app/opengraph-image.js pour le détail).
    try {
        return await renderImage(bgStyle, logoData);
    } catch (error) {
        console.error("OpenGraph image (photo) : rendu impossible, repli sans image.", error?.message || error);
        return renderImage(
            { background: "linear-gradient(135deg, #0b3d2e 0%, #0f172a 60%, #000 100%)" },
            null
        );
    }
}

async function renderImage(bgStyle, logoData) {
    const response = new ImageResponse(
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

    const buffer = await response.arrayBuffer();
    return new Response(buffer, {
        headers: { "content-type": "image/png" },
    });
}
