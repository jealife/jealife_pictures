"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, VideoOff } from "lucide-react";
import VideoCard from "./VideoCard";
import { PAGE_SIZE, getMedia, searchMedia } from "../lib/database";
import { normalizeMediaList } from "../lib/media";

export default function VideoGrid({ initialItems = null }) {
    const seeded = Array.isArray(initialItems) && initialItems.length > 0;
    const searchParams = useSearchParams();
    const query = searchParams.get("q");
    const country = searchParams.get("pays");
    const orientation = searchParams.get("orientation");
    const sort = searchParams.get("tri") ?? "defaut";

    const [items, setItems] = useState(() => (seeded ? normalizeMediaList(initialItems) : []));
    const [loading, setLoading] = useState(!seeded);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(!seeded || initialItems.length === PAGE_SIZE);
    const [error, setError] = useState(null);
    // La première page vient du serveur : la redemander au montage ferait un
    // aller-retour pour rien.
    const useSeedRef = useRef(seeded);
    // Repère une réponse `loadMore` devenue obsolète (filtre changé pendant
    // la requête) — même logique que MasonryGrid, voir son commentaire.
    const requestIdRef = useRef(0);

    const fetchPage = useCallback(
        (offset) => {
            const options = { type: "video", limit: PAGE_SIZE, offset, country, orientation, sort };
            return query ? searchMedia(query, options) : getMedia(options);
        },
        [query, country, orientation, sort]
    );

    useEffect(() => {
        const requestId = ++requestIdRef.current;
        let cancelled = false;

        if (useSeedRef.current) {
            useSeedRef.current = false;
            return;
        }

        async function load() {
            setLoading(true);
            setError(null);
            try {
                const rows = await fetchPage(0);
                if (cancelled || requestId !== requestIdRef.current) return;
                setItems(normalizeMediaList(rows));
                setHasMore(rows.length === PAGE_SIZE);
            } catch (err) {
                if (cancelled) return;
                console.error("Error fetching videos:", err);
                setError("Impossible de charger les vidéos. Vérifiez votre connexion et réessayez.");
            } finally {
                if (!cancelled && requestId === requestIdRef.current) setLoading(false);
            }
        }

        load();
        return () => { cancelled = true; };
    }, [fetchPage]);

    const loadMore = async () => {
        if (loadingMore || !hasMore) return;

        const requestId = requestIdRef.current;
        setLoadingMore(true);
        try {
            const rows = await fetchPage(items.length);
            if (requestId !== requestIdRef.current) return;

            setItems((previous) => {
                const seen = new Set(previous.map((item) => item.id));
                return [...previous, ...normalizeMediaList(rows).filter((item) => !seen.has(item.id))];
            });
            setHasMore(rows.length === PAGE_SIZE);
        } catch (err) {
            if (requestId === requestIdRef.current) {
                console.error("Error loading more videos:", err);
                setHasMore(false);
            }
        } finally {
            setLoadingMore(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-24">
                <Loader2 className="w-6 h-6 animate-spin text-gray-300 dark:text-zinc-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-[1600px] mx-auto px-4 py-20 text-center">
                <p className="text-red-600 dark:text-red-400 text-lg">{error}</p>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="max-w-[1600px] mx-auto px-4 py-24 text-center flex flex-col items-center">
                <div className="w-20 h-20 bg-gray-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-6">
                    <VideoOff className="w-8 h-8 text-gray-300 dark:text-zinc-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-100 mb-2">Pas encore de vidéos</h2>
                <p className="text-gray-500 dark:text-zinc-400 max-w-md">
                    Aucune séquence n&apos;a été publiée pour l&apos;instant. Les vidéastes
                    sont les bienvenus.
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto px-4 py-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((video) => <VideoCard key={video.id} video={video} />)}
            </div>

            {hasMore && (
                <div className="flex justify-center py-10">
                    <button
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="px-6 py-3 border border-gray-200 dark:border-zinc-700 rounded-full text-sm font-bold text-gray-600 dark:text-zinc-400 hover:border-black hover:text-black dark:hover:border-white dark:hover:text-white transition-colors disabled:opacity-50"
                    >
                        {loadingMore ? "Chargement…" : "Afficher plus de vidéos"}
                    </button>
                </div>
            )}
        </div>
    );
}
