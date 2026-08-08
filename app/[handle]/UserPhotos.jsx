"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import MasonryGrid from "../components/MasonryGrid";
import { getUserProfile } from "../lib/database";

/**
 * Photos d'un profil.
 */
export default function UserPhotos() {
    const { handle } = useParams();
    const decodedHandle = handle ? decodeURIComponent(handle) : "";
    const username = decodedHandle.startsWith("@") ? decodedHandle.slice(1) : null;
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
                <Loader2 className="w-8 h-8 animate-spin text-gray-300 dark:text-zinc-600" />
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
