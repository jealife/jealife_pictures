"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import MasonryGrid from "../../components/MasonryGrid";
import { getUserProfile } from "../../lib/database";

/**
 * Photos d'un profil.
 *
 * Le profil était cherché ici avec `.eq('username', …)` alors que le layout
 * parent utilisait `.ilike(…)` : sur une URL dont la casse différait du pseudo
 * enregistré, l'en-tête du profil s'affichait correctement mais la galerie
 * restait obstinément vide. Les deux passent désormais par la même fonction.
 */
export default function UserPhotosPage() {
    const { username } = useParams();
    const [userId, setUserId] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!username) return;
        let cancelled = false;

        getUserProfile(username).then((profile) => {
            if (cancelled) return;
            setUserId(profile?.id || null);
            setLoading(false);
        });

        return () => { cancelled = true; };
    }, [username]);

    if (loading) {
        return (
            <div className="py-20 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
            </div>
        );
    }

    if (!userId) return null;

    return (
        <MasonryGrid
            userId={userId}
            type={null}
            emptyMessage="Ce photographe n'a pas encore publié d'image."
        />
    );
}
