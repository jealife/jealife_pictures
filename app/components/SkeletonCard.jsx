export default function SkeletonCard({ index = 0 }) {
    // Hauteurs déterministes basées sur l'index pour éviter les erreurs d'hydratation (SSR)
    const heights = ['h-[300px]', 'h-[450px]', 'h-[350px]', 'h-[500px]', 'h-[400px]'];
    const stableHeight = heights[index % heights.length];

    return (
        <div className={`relative mb-6 break-inside-avoid w-full ${stableHeight} rounded-2xl bg-gray-100 animate-pulse overflow-hidden`}>
            {/* Simulation du dégradé en bas */}
            <div className="absolute bottom-0 left-0 right-0 p-5 space-y-3">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-200"></div>
                    <div className="space-y-2">
                        <div className="w-24 h-3 bg-gray-200 rounded"></div>
                        <div className="w-16 h-2 bg-gray-200 rounded opacity-50"></div>
                    </div>
                </div>
            </div>

            {/* Simulation des boutons en haut */}
            <div className="absolute top-4 right-4 flex gap-2">
                <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                <div className="w-10 h-10 rounded-full bg-gray-200"></div>
            </div>

            {/* Effet de balayage brillant (shimmer) */}
            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-linear-to-r from-transparent via-white/20 to-transparent"></div>
        </div>
    );
}
