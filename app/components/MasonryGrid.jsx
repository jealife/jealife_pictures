"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ImageOff, Loader2 } from "lucide-react";
import PhotoCard from "./PhotoCard";
import VideoCard from "./VideoCard";
import SkeletonCard from "./SkeletonCard";
import { useAuth } from "../contexts/AuthContext";
import {
    PAGE_SIZE,
    getLikedMediaIds,
    getMedia,
    getMediaByTopic,
    getUserMedia,
    searchMedia,
} from "../lib/database";
import { normalizeMediaList } from "../lib/media";

/**
 * Grille de médias.
 *
 * Trois manques structurels sont corrigés ici :
 *   · la grille chargeait 50 médias, une seule fois, sans aucun moyen d'aller
 *     plus loin — une banque d'images ne peut pas s'arrêter à 50 images ;
 *   · l'état « j'aime » n'était jamais lu, donc un cœur déjà donné
 *     réapparaissait vide à chaque rechargement ;
 *   · tout le contenu n'existait qu'après hydratation. Le HTML servi aux
 *     robots ne contenait aucun lien vers une fiche image : le catalogue
 *     entier était invisible pour qui n'exécute pas le JavaScript. D'où
 *     `initialItems`, la première page rendue par le serveur.
 */
export default function MasonryGrid({
    type = "photo",
    searchQuery: propQuery = null,
    topic = null,
    country = null,
    userId = null,
    sort = null,
    mobileColumns = null,
    hideActions = false,
    emptyMessage = null,
    initialItems = null,
}) {
    const searchParams = useSearchParams();
    const { user } = useAuth();

    const query = propQuery ?? searchParams.get("q");
    const activeCountry = country ?? searchParams.get("pays");
    const activeSort = sort ?? searchParams.get("tri") ?? "defaut";
    const activeOrientation = searchParams.get("orientation");

    const seeded = Array.isArray(initialItems) && initialItems.length > 0;

    const [items, setItems] = useState(() => (seeded ? normalizeMediaList(initialItems) : []));
    const [likedIds, setLikedIds] = useState(new Set());
    const [loading, setLoading] = useState(!seeded);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(!seeded || initialItems.length === PAGE_SIZE);
    const [error, setError] = useState(null);
    const [columnCount, setColumnCount] = useState(3);

    const sentinelRef = useRef(null);
    // Évite qu'un résultat de requête lente écrase un filtre plus récent.
    const requestIdRef = useRef(0);
    // La première page vient du serveur : la redemander au montage ferait un
    // aller-retour pour rien et ferait clignoter la grille.
    const useSeedRef = useRef(seeded);

    useEffect(() => {
        const updateColumns = () => {
            const width = window.innerWidth;
            if (width < 640) setColumnCount(mobileColumns || 1);
            else if (width < 1024) setColumnCount(2);
            else setColumnCount(3);
        };

        updateColumns();
        window.addEventListener("resize", updateColumns);
        return () => window.removeEventListener("resize", updateColumns);
    }, [mobileColumns]);

    const fetchPage = useCallback(
        async (offset) => {
            const options = {
                type, limit: PAGE_SIZE, offset,
                country: activeCountry, sort: activeSort, orientation: activeOrientation,
            };

            if (userId) return getUserMedia(userId, { type, limit: PAGE_SIZE, offset });
            if (topic) return getMediaByTopic(topic, options);
            if (query) return searchMedia(query, options);
            return getMedia(options);
        },
        [type, topic, query, userId, activeCountry, activeSort, activeOrientation]
    );

    // Premier chargement, et rechargement complet à chaque changement de filtre.
    useEffect(() => {
        const requestId = ++requestIdRef.current;
        let cancelled = false;

        if (useSeedRef.current) {
            // Les données du serveur servent au premier rendu ; tout
            // changement de filtre ensuite repasse par une vraie requête.
            useSeedRef.current = false;
            return;
        }

        async function load() {
            setLoading(true);
            setError(null);
            setItems([]);
            setHasMore(true);

            try {
                const rows = await fetchPage(0);
                if (cancelled || requestId !== requestIdRef.current) return;

                const normalized = normalizeMediaList(rows);
                setItems(normalized);
                setHasMore(rows.length === PAGE_SIZE);
            } catch (err) {
                if (cancelled) return;
                console.error("Error fetching media:", err);
                setError("Impossible de charger les images. Vérifiez votre connexion et réessayez.");
            } finally {
                if (!cancelled && requestId === requestIdRef.current) setLoading(false);
            }
        }

        load();
        return () => { cancelled = true; };
    }, [fetchPage]);

    const loadMore = useCallback(async () => {
        if (loadingMore || loading || !hasMore) return;

        // Capturé avant l'attente réseau : si un changement de filtre
        // survient pendant le chargement, le rechargement complet qu'il
        // déclenche incrémente ce compteur, ce qui permet ici de repérer
        // une réponse devenue obsolète et de ne pas la fusionner avec les
        // résultats du nouveau filtre.
        const requestId = requestIdRef.current;
        setLoadingMore(true);
        try {
            const rows = await fetchPage(items.length);
            if (requestId !== requestIdRef.current) return;

            const normalized = normalizeMediaList(rows);
            setItems((previous) => {
                // Le classement peut faire réapparaître un média déjà chargé ;
                // on déduplique plutôt que d'afficher deux fois la même photo.
                const seen = new Set(previous.map((item) => item.id));
                return [...previous, ...normalized.filter((item) => !seen.has(item.id))];
            });
            setHasMore(rows.length === PAGE_SIZE);
        } catch (err) {
            if (requestId === requestIdRef.current) {
                console.error("Error loading more media:", err);
                setHasMore(false);
            }
        } finally {
            setLoadingMore(false);
        }
    }, [fetchPage, hasMore, items.length, loading, loadingMore]);

    // Le callback observé doit toujours voir la dernière version de
    // `loadMore` sans que cela force à reconstruire l'observer : recréer
    // l'observer à chaque page chargée (loadMore change d'identité avec
    // items.length) fait que `observe()` réévalue aussitôt la sentinelle,
    // et si elle est encore dans la marge de 600px (écrans hauts, cartes
    // courtes), redéclenche un chargement en cascade sans scroll de
    // l'utilisateur.
    const loadMoreRef = useRef(loadMore);
    useEffect(() => { loadMoreRef.current = loadMore; }, [loadMore]);

    // Chargement à l'approche du bas de page.
    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel || !hasMore || loading) return;

        const observer = new IntersectionObserver(
            (entries) => { if (entries[0].isIntersecting) loadMoreRef.current(); },
            { rootMargin: "600px" }
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [hasMore, loading]);

    // Cœurs déjà donnés par l'utilisateur connecté.
    //
    // Ne requête que les médias pas encore vus (`queriedLikeIdsRef`) et
    // fusionne le résultat au lieu de remplacer tout le Set : cet effet
    // dépend de `items`, donc se redéclenche à chaque page chargée par
    // `loadMore`. Sans ces deux garde-fous, un like posé pendant qu'une de
    // ces requêtes est en vol se faisait écraser par une réponse qui ne le
    // connaissait pas encore, faisant revenir le cœur à vide alors que le
    // like était bien enregistré (voir LikeButton, bascule optimiste).
    const queriedLikeIdsRef = useRef(new Set());
    useEffect(() => {
        queriedLikeIdsRef.current = new Set();
        setLikedIds(new Set());
    }, [user]);

    useEffect(() => {
        if (!user || items.length === 0) return;

        const unqueried = items
            .map((item) => item.id)
            .filter((id) => !queriedLikeIdsRef.current.has(id));
        if (unqueried.length === 0) return;

        unqueried.forEach((id) => queriedLikeIdsRef.current.add(id));

        let cancelled = false;
        getLikedMediaIds(user.id, unqueried).then((ids) => {
            if (!cancelled) setLikedIds((previous) => new Set([...previous, ...ids]));
        });
        return () => { cancelled = true; };
    }, [user, items]);

    if (loading) {
        const skeletonColumns = Array.from({ length: columnCount }, () => []);
        [...Array(12)].forEach((_, i) => skeletonColumns[i % columnCount].push(i));

        return (
            <div className="max-w-[1600px] mx-auto px-4 py-8">
                <div className="flex flex-row gap-6">
                    {skeletonColumns.map((column, columnIndex) => (
                        <div key={columnIndex} className="flex-1 flex flex-col gap-6">
                            {column.map((i) => <SkeletonCard key={i} index={i} />)}
                        </div>
                    ))}
                </div>
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
                    <ImageOff className="w-8 h-8 text-gray-300 dark:text-zinc-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-zinc-100 mb-2">
                    {query ? `Aucun résultat pour « ${query} »` : "Rien à afficher pour l'instant"}
                </h3>
                <p className="text-gray-500 dark:text-zinc-400 max-w-md">
                    {emptyMessage ||
                        (query
                            ? "Essayez un autre mot-clé, ou soyez le premier à publier sur ce sujet."
                            : "Les premières images arrivent bientôt. Vous pouvez déjà publier les vôtres.")}
                </p>
            </div>
        );
    }

    // Répartition en colonnes de hauteur libre : c'est ce qui donne la
    // mosaïque sans laisser de trous en bas.
    const columns = Array.from({ length: columnCount }, () => []);
    items.forEach((item, index) => columns[index % columnCount].push(item));

    return (
        <div className="max-w-[1600px] mx-auto px-4 py-8">
            <div className="flex flex-row gap-6">
                {columns.map((columnItems, columnIndex) => (
                    <div key={columnIndex} className="flex-1 flex flex-col gap-6">
                        {columnItems.map((item, itemIndex) => (
                            item.type === 'video' ? (
                                <VideoCard
                                    key={item.id}
                                    video={item}
                                    liked={likedIds.has(item.id)}
                                />
                            ) : (
                                <PhotoCard
                                    key={item.id}
                                    photo={item}
                                    liked={likedIds.has(item.id)}
                                    hideActions={hideActions}
                                    priority={columnIndex === 0 && itemIndex === 0}
                                />
                            )
                        ))}
                    </div>
                ))}
            </div>

            <div ref={sentinelRef} className="h-px" aria-hidden="true" />

            {loadingMore && (
                <div className="flex justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-300 dark:text-zinc-600" />
                </div>
            )}

            {/* Repli explicite si l'observateur ne se déclenche pas. */}
            {hasMore && !loadingMore && (
                <div className="flex justify-center py-10">
                    <button
                        onClick={loadMore}
                        className="px-6 py-3 border border-gray-200 dark:border-zinc-700 rounded-full text-sm font-bold text-gray-600 hover:border-black hover:text-black dark:text-zinc-400 dark:hover:border-white dark:hover:text-white transition-colors"
                    >
                        Afficher plus d&apos;images
                    </button>
                </div>
            )}

            {!hasMore && items.length > PAGE_SIZE && (
                <p className="text-center text-sm text-gray-400 dark:text-zinc-600 py-10">
                    Vous avez tout vu.
                </p>
            )}
        </div>
    );
}
