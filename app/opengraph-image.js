import { ImageResponse } from "next/og";

export const alt = "JEaLiFe Stock — images libres de droits et gratuites";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Image de partage générée par le site lui-même.
 *
 * Les balises Open Graph pointaient vers une photo hébergée sur le CDN
 * d'Unsplash : chaque partage de JEaLiFe Stock sur WhatsApp ou Facebook
 * affichait donc une image appartenant à un autre service, dont rien ne
 * garantissait la disponibilité dans le temps.
 */
export default function OpenGraphImage() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    justifyContent: "center",
                    padding: "80px",
                    background: "linear-gradient(135deg, #0b3d2e 0%, #0f172a 60%, #000000 100%)",
                    color: "#ffffff",
                    fontFamily: "sans-serif",
                }}
            >
                <div
                    style={{
                        fontSize: 26,
                        letterSpacing: 8,
                        textTransform: "uppercase",
                        color: "#6ee7b7",
                        marginBottom: 28,
                    }}
                >
                    JEaLiFe Stock
                </div>

                <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.1, maxWidth: 900 }}>
                    Images libres de droits, gratuites à télécharger
                </div>

                <div style={{ fontSize: 32, color: "rgba(255,255,255,0.75)", marginTop: 32 }}>
                    Une sélection soignée · De belles images du continent
                </div>
            </div>
        ),
        size
    );
}
