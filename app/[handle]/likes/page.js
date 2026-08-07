"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import PhotoCard from "../../components/PhotoCard";
import { useAuth } from "../../contexts/AuthContext";
import { getUserLikedMedia, getUserProfile } from "../../lib/database";
import { normalizeMediaList } from "../../lib/media";

/**
 * Onglet « J'aime ».
 *
 * Cette page affichait des photos de démonstration tirées d'un fichier
 * statique, dupliquées pour remplir la grille — aucun lien avec les j'aime
 * réels de l'utilisateur. Elle lit maintenant la table `media_likes`.
 */
export default function UserLikesPage() {
    const { handle } = useParams();
    const decodedHandle = handle ? decodeURIComponent(handle) : "";
    const username = decodedHandle.startsWith("@") ? decodedHandle.slice(1) : null;
    const { user: currentUser } = useAuth();

    const [isOwner, setIsOwner] = useState(false);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!username) return;
        let cancelled = false;

        async function load() {
            setLoading(true);
            const profile = await getUserProfile(username);

            if (cancelled) return;

            // Les j'aime restent privés : on ne les montre qu'à leur auteur.
            const owner = !!(profile && currentUser && profile.id === currentUser.id);
            setIsOwner(owner);

            if (owner) {
                const rows = await getUserLikedMedia(profile.id, { limit: 48 });
                if (!cancelled) setItems(normalizeMediaList(rows));
            }

            if (!cancelled) setLoading(false);
        }

        load();
        return () => { cancelled = true; };
    }, [username, currentUser]);

    if (loading) {
        return (
            <div className="py-20 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
            </div>
        );
    }

    if (!isOwner) {
        return (
            <EmptyState
                title="Accès restreint"
                message="Les mentions J'aime sont privées. Vous ne voyez que les vôtres."
            />
        );
    }

    if (items.length === 0) {
        return (
            <EmptyState
                title="Aucune image aimée"
                message="Le cœur sur une image la met de côté ici."
            />
        );
    }

    return (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-6">
            {items.map((item) => (
                <PhotoCard key={item.id} photo={item} liked />
            ))}
        </div>
    );
}

function EmptyState({ title, message }) {
    return (
        <div className="py-24 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                <Heart className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-500 max-w-sm">{message}</p>
        </div>
    );
}
