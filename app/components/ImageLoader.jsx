/**
 * Skeleton affiché à la place d'une image de grille tant qu'elle n'a pas
 * fini de charger (voir PhotoCard / VideoCard). Reprend le shimmer déjà
 * utilisé par SkeletonCard pour rester cohérent avec le chargement initial
 * de la page.
 */
export default function ImageLoader() {
    return (
        <div className="absolute inset-0 bg-gray-100 overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-linear-to-r from-transparent via-white/40 to-transparent" />
        </div>
    );
}
