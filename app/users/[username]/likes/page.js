"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getUserProfile } from "../../../lib/database";
import { useAuth } from "../../../contexts/AuthContext";
import { photos } from "../../../lib/data";
import PhotoCard from "../../../components/PhotoCard";
import { Heart } from "lucide-react";

export default function UserLikesPage() {
    const { username } = useParams();
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const [isOwner, setIsOwner] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkOwnership = async () => {
            if (!username || !currentUser) {
                setIsOwner(false);
                setLoading(false);
                return;
            }
            try {
                const profile = await getUserProfile(username);
                if (profile && profile.id === currentUser.id) {
                    setIsOwner(true);
                }
            } catch (err) {
                console.error(err);
            }
            setLoading(false);
        };
        checkOwnership();
    }, [username, currentUser]);

    // Mock: just picking some photos that are NOT the user's photos to simulate "likes"
    const likedPhotos = photos.filter(p => p.author.username !== username).slice(0, 6);

    if (loading) return <div className="py-20 text-center animate-pulse text-gray-400">Vérification...</div>;

    if (!isOwner) {
        return (
            <div className="py-[100px] text-center flex flex-col items-center justify-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                    <Heart className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Accès restreint</h3>
                <p className="text-gray-500 max-w-sm">Les mentions J'aime d'un utilisateur sont privées. Vous ne pouvez voir que les vôtres.</p>
            </div>
        );
    }

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
