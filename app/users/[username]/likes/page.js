"use client";

import { useParams } from "next/navigation";
import { photos } from "../../../lib/data";
import PhotoCard from "../../../components/PhotoCard";
import { Heart } from "lucide-react";

export default function UserLikesPage() {
    const { username } = useParams();

    // Mock: just picking some photos that are NOT the user's photos to simulate "likes"
    // In a real app, this would be `user.likes` relationship
    const likedPhotos = photos.filter(p => p.author.username !== username).slice(0, 6);

    return (
        <div className="columns-1 sm:columns-2 md:columns-3 gap-6 space-y-6">
            {likedPhotos.length > 0 ? (
                <>
                    {likedPhotos.map(p => (
                        <PhotoCard key={p.id} photo={p} />
                    ))}
                    {/* Demo duplication */}
                    {likedPhotos.map(p => (
                        <PhotoCard key={`l-${p.id}`} photo={{ ...p, id: `l-${p.id}` }} />
                    ))}
                </>
            ) : (
                <div className="col-span-full py-20 text-center flex flex-col items-center">
                    <div className="w-32 h-32 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                        <Heart className="w-12 h-12 text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Aucune photo aimée</h3>
                    <p className="text-gray-500 max-w-md">Cet utilisateur n'a pas encore aimé de contenu.</p>
                </div>
            )}
        </div>
    );
}
