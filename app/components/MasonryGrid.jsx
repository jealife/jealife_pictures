"use client";

import PhotoCard from "./PhotoCard";
import SkeletonCard from "./SkeletonCard";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { getMedia, searchMedia } from "../lib/database";

export default function MasonryGrid() {
    const searchParams = useSearchParams();
    const query = searchParams.get("q")?.toLowerCase();
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
                    location: item.location
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
        return (
            <div className="max-w-[1400px] mx-auto px-4 py-8">
                {query && (
                    <div className="h-8 w-48 bg-gray-100 rounded-md animate-pulse mb-6"></div>
                )}
                <div className="columns-1 sm:columns-2 md:columns-3 gap-6 space-y-6">
                    {[...Array(9)].map((_, i) => (
                        <SkeletonCard key={i} index={i} />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-[1400px] mx-auto px-4 py-20">
                <div className="text-center">
                    <p className="text-red-500 text-lg">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto px-4 py-8">
            {query && (
                <h2 className="text-2xl font-bold mb-6 capitalize text-gray-900">{query}</h2>
            )}
            <div className="columns-1 sm:columns-2 md:columns-3 gap-6 space-y-6">
                {photos.map((photo) => (
                    <PhotoCard key={photo.id} photo={photo} />
                ))}
                {photos.length === 0 && (
                    <div className="py-20 text-center col-span-full w-full">
                        <p className="text-gray-500 text-lg">Aucune image trouvée{query ? ` pour "${query}"` : ''}.</p>
                        <p className="text-gray-400">Essayez d'autres mots-clés.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
