/**
 * Filigrane répété façon banque d'images (Shutterstock, Adobe Stock…),
 * posé sur l'aperçu d'un média Premium non débloqué. Toujours sur la
 * vignette publique par construction (voir CARD_SELECT / thumbnail_url) —
 * jamais un rendu de l'adresse réelle, protégée par ailleurs (voir
 * /api/photo-access). L'identifiant du média sert de suffixe d'ID de motif
 * SVG : ça évite toute collision quand plusieurs vignettes filigranées
 * apparaissent sur la même page (grille de recherche, par ex.), sans avoir
 * besoin de `useId()`.
 */
export default function Watermark({ mediaId, className = "" }) {
    const patternId = `jealife-watermark-${mediaId ?? "x"}`;

    return (
        <svg
            className={`absolute inset-0 w-full h-full pointer-events-none select-none ${className}`}
            aria-hidden="true"
        >
            <defs>
                <pattern
                    id={patternId}
                    width="190"
                    height="100"
                    patternUnits="userSpaceOnUse"
                    patternTransform="rotate(-28)"
                >
                    <text
                        x="0"
                        y="55"
                        fontSize="19"
                        fontWeight="800"
                        fontFamily="sans-serif"
                        letterSpacing="1"
                        fill="rgba(255,255,255,0.55)"
                        stroke="rgba(0,0,0,0.35)"
                        strokeWidth="0.6"
                    >
                        JEALIFE STOCK
                    </text>
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#${patternId})`} />
        </svg>
    );
}
