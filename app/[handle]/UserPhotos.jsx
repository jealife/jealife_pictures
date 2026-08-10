"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import MasonryGrid from "../components/MasonryGrid";
import { getUserProfile } from "../lib/database";
import { useAuth } from "../contexts/AuthContext";

/**
 * Photos d'un profil.
 *
 * Lorsqu'un contributeur consulte son propre profil, ses photos en attente
 * de modération (status = 'pending') sont visibles pour lui seul, avec un
 * badge « En cours d'analyse ». Elles restent absentes du feed éditorial et
 * de la vue publique du profil.
 */
export default function UserPhotos() {
    const { handle } = useParams();
    const decodedHandle = handle ? decodeURIComponent(handle) : "";
    const username = decodedHandle.startsWith("@") ? decodedHandle.slice(1) : null;
    const [userId, setUserId] = useState(null);
    const [profileId, setProfileId] = useState(null);
    const [loading, setLoading] = useState(true);

    const { user: currentUser, loading: authLoading } = useAuth();

    useEffect(() => {
        if (!username) return;
        let cancelled = false;

        getUserProfile(username).then((profile) => {
            if (cancelled) return;
            setUserId(profile?.id || null);
            setProfileId(profile?.id || null);
            setLoading(false);
        });

        return () => { cancelled = true; };
    }, [username]);

    if (loading || authLoading) {
        return (
            <div className="py-20 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-300 dark:text-zinc-600" />
            </div>
        );
    }

    if (!userId) return null;

    // Un contributeur voit ses propres photos en attente de modération.
    // La comparaison est faite côté client uniquement ; la requête DB reste
    // bornée par `user_id` = celui du profil consulté — pas de fuite possible.
    const isOwnProfile = !!currentUser && currentUser.id === profileId;

    return (
        <MasonryGrid
            userId={userId}
            type={null}
            includeUnpublished={isOwnProfile}
            emptyMessage="Ce photographe n'a pas encore publié d'image."
        />
    );
}
