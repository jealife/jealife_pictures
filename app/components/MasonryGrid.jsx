"use client";

import PhotoCard from "./PhotoCard";
import SkeletonCard from "./SkeletonCard";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { getMedia, searchMedia } from "../lib/database";

export default function MasonryGrid({ searchQuery: propQuery = null, mobileColumns = null, hideActions = false }) {
    const searchParams = useSearchParams();
    const query = (propQuery || searchParams.get("q"))?.toLowerCase();
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [columnCount, setColumnCount] = useState(3);

    // Dynamic column count based on window width
    useEffect(() => {
        const updateColumns = () => {
            const width = window.innerWidth;
            if (width < 640) setColumnCount(mobileColumns || 1);
            else if (width < 1024) setColumnCount(2);
            else if (width < 1280) setColumnCount(3);
            else setColumnCount(4);
        };

        updateColumns();
        window.addEventListener('resize', updateColumns);
        return () => window.removeEventListener('resize', updateColumns);
    }, []);

    useEffect(() => {
        async function fetchPhotos() {
            setLoading(true);
            setError(null);

            try {
                let data;
                if (query) {
                    data = await searchMedia(query, 'photo');
                } else {
                    data = await getMedia('photo', 50);
                }

                // Transform data to match component structure
                const transformedData = data.map(item => ({
                    id: item.id,
                    url: item.url,
                    alt: item.alt_text || item.title || 'Image',
                    author: {
                        name: item.profiles?.full_name || item.profiles?.username || 'Anonyme',
                        username: item.profiles?.username || 'unknown',
                        avatar: item.profiles?.avatar_url || '/default-avatar.png',
                        bio: item.profiles?.bio,
                        location: item.profiles?.location
                    },
                    likes: item.likes_count || 0,
                    location: item.location,
                    width: item.width,
                    height: item.height
                }));

                setPhotos(transformedData);
            } catch (err) {
                console.error('Error fetching photos:', err);
                setError('Impossible de charger les photos. Veuillez réessayer.');
            } finally {
                setLoading(false);
            }
        }

        fetchPhotos();
    }, [query]);

    if (loading) {
        // Distribute skeletons across columns to match the actual layout
        const skeletonCols = Array.from({ length: columnCount }, () => []);
        [...Array(12)].forEach((_, i) => skeletonCols[i % columnCount].push(i));

        return (
            <div className="max-w-[1600px] mx-auto px-4 py-8">
                {query && (
                    <div className="h-8 w-48 bg-gray-100 rounded-md animate-pulse mb-6"></div>
                )}
                <div className="flex flex-row gap-6">
                    {skeletonCols.map((col, colIdx) => (
                        <div key={colIdx} className="flex-1 flex flex-col gap-6">
                            {col.map(i => (
                                <SkeletonCard key={i} index={i} />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-[1600px] mx-auto px-4 py-20">
                <div className="text-center">
                    <p className="text-red-500 text-lg">{error}</p>
                </div>
            </div>
        );
    }

    // Distribute photos across columns perfectly
    const columns = Array.from({ length: columnCount }, () => []);
    photos.forEach((photo, index) => {
        columns[index % columnCount].push(photo);
    });

    return (
        <div className="max-w-[1600px] mx-auto px-4 py-8">
            {query && (
                <h2 className="text-2xl font-bold mb-6 capitalize text-gray-900">{query}</h2>
            )}

            {/* Masonry Layout using Flexbox Columns (The "True" Masonry way for React) */}
            <div className="flex flex-row gap-6">
                {columns.map((columnPhotos, colIndex) => (
                    <div key={colIndex} className="flex-1 flex flex-col gap-6">
                        {columnPhotos.map((photo) => (
                            <PhotoCard key={photo.id} photo={photo} hideActions={hideActions} />
                        ))}
                    </div>
                ))}
            </div>

            {photos.length === 0 && !loading && (
                <div className="py-20 text-center w-full">
                    <p className="text-gray-500 text-lg">Aucune image trouvée{query ? ` pour "${query}"` : ''}.</p>
                    <p className="text-gray-400">Essayez d'autres mots-clés.</p>
                </div>
            )}
        </div>
    );
}
