"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, CheckCheck, Loader2, ChevronDown } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
    getNotifications, markNotificationRead, markAllNotificationsRead,
} from "../lib/database";
import NotificationRow from "../components/NotificationRow";

const PAGE_SIZE = 30;

/**
 * Historique complet de l'activité — la cloche du Navbar (NotificationBell)
 * n'en montre qu'un extrait récent. Les deux partagent le rendu de chaque
 * rangée via NotificationRow (app/components/NotificationRow.jsx).
 */
export default function ActivityView() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();

    const [items, setItems] = useState(null);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    useEffect(() => {
        if (!loading && !user) router.push("/login?redirect=/activite");
    }, [user, loading, router]);

    useEffect(() => {
        if (!user) return;
        getNotifications({ limit: PAGE_SIZE, offset: 0 }).then((data) => {
            setItems(data);
            setHasMore(data.length === PAGE_SIZE);
        });
    }, [user]);

    const loadMore = async () => {
        setLoadingMore(true);
        const nextOffset = offset + PAGE_SIZE;
        const data = await getNotifications({ limit: PAGE_SIZE, offset: nextOffset });
        setItems((prev) => [...(prev || []), ...data]);
        setOffset(nextOffset);
        setHasMore(data.length === PAGE_SIZE);
        setLoadingMore(false);
    };

    const unreadCount = (items || []).filter((n) => !n.read_at).length;

    const readNotification = (n) => {
        if (n.read_at) return;
        setItems((prev) => prev.map((item) => (item.id === n.id ? { ...item, read_at: new Date().toISOString() } : item)));
        markNotificationRead(n.id);
    };

    const markAllRead = () => {
        setItems((prev) => (prev || []).map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })));
        markAllNotificationsRead();
    };

    if (loading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
                <Loader2 className="w-8 h-8 animate-spin text-gray-300 dark:text-zinc-600" />
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-white dark:bg-zinc-950">
            <div className="max-w-2xl mx-auto px-4 py-12 md:py-20">
                <div className="flex items-center justify-between mb-10">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-zinc-100 flex items-center gap-3">
                            <Bell className="w-7 h-7 text-gray-300 dark:text-zinc-600" /> Activité
                        </h1>
                        <p className="text-gray-500 dark:text-zinc-400 mt-2">
                            Ce qui se passe autour de vos photos, illustrations et vidéos.
                        </p>
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllRead}
                            className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-zinc-400 hover:text-black dark:hover:text-white shrink-0"
                        >
                            <CheckCheck className="w-4 h-4" /> Tout marquer lu
                        </button>
                    )}
                </div>

                {items === null ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-300 dark:text-zinc-600" />
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-16 h-16 bg-gray-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-5">
                            <Bell className="w-7 h-7 text-gray-300 dark:text-zinc-600" />
                        </div>
                        <p className="text-gray-500 dark:text-zinc-400">Aucune activité pour l&apos;instant.</p>
                        <p className="text-sm text-gray-400 dark:text-zinc-500 mt-1">
                            Elle apparaîtra ici dès qu&apos;on aimera ou achètera l&apos;une de vos photos.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {items.map((n) => (
                            <NotificationRow key={n.id} n={n} username={profile?.username} onRead={readNotification} size="full" />
                        ))}
                    </div>
                )}

                {hasMore && (
                    <button
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="mt-6 mx-auto flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm font-medium text-gray-600 dark:text-zinc-400 hover:border-gray-400 dark:hover:border-zinc-500 hover:text-black dark:hover:text-white disabled:opacity-50 transition-colors"
                    >
                        {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
                        Voir plus
                    </button>
                )}

                {profile?.username && (
                    <p className="text-center mt-12">
                        <Link href={`/@${profile.username}`} className="text-sm text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 underline underline-offset-2">
                            Retour au profil
                        </Link>
                    </p>
                )}
            </div>
        </main>
    );
}
