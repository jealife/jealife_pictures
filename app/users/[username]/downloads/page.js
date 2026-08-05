"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import PhotoCard from "../../../components/PhotoCard";
import VideoCard from "../../../components/VideoCard";
import { useAuth } from "../../../contexts/AuthContext";
import { getUserDownloadHistory, getUserProfile } from "../../../lib/database";
import { normalizeMediaList } from "../../../lib/media";

/**
 * Onglet « Historique téléchargements », lié depuis le menu utilisateur
 * (UserMenu.jsx) mais jusqu'ici sans page derrière : aucune route
 * `/users/[username]/downloads` n'existait. Lit la table `media_downloads`
 * (migration 0009) — avant elle, seuls des compteurs agrégés existaient,
 * sans trace de qui avait téléchargé quoi.
 */
export default function UserDownloadsPage() {
    const { username } = useParams();
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

            // Privé : ce qu'on télécharge ne regarde que soi (voir la policy
            // RLS de la migration 0009).
            const owner = !!(profile && currentUser && profile.id === currentUser.id);
            setIsOwner(owner);

            if (owner) {
                const rows = await getUserDownloadHistory(profile.id, { limit: 48 });
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
                message="L'historique des téléchargements est privé. Vous ne voyez que le vôtre."
            />
        );
    }

    if (items.length === 0) {
        return (
            <EmptyState
                title="Aucun téléchargement"
                message="Les images et vidéos que vous téléchargez apparaissent ici."
            />
        );
    }

    return (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-6">
            {items.map((item) =>
                item.type === "video" ? (
                    <div key={item.id} className="mb-6 break-inside-avoid">
                        <VideoCard video={item} />
                    </div>
                ) : (
                    <PhotoCard key={item.id} photo={item} />
                )
            )}
        </div>
    );
}

function EmptyState({ title, message }) {
    return (
        <div className="py-24 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                <Download className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-500 max-w-sm">{message}</p>
        </div>
    );
}
