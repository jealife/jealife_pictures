"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, Heart, FolderPlus, Sparkles, Banknote, CheckCheck, Loader2, ChevronDown } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
    getNotifications, markNotificationRead, markAllNotificationsRead,
} from "../lib/database";
import { mediaUrl, timeAgo, truncateText } from "../lib/media";

const PAGE_SIZE = 30;

const TYPE_ICON = {
    like: Heart,
    collection_add: FolderPlus,
    premium_purchase: Sparkles,
    payout_paid: Banknote,
};

function notificationText(n) {
    const actorName = truncateText(n.actor?.full_name || n.actor?.username || "Quelqu'un", 30);
    switch (n.type) {
        case "like":
            return <>{actorName} a aimé {n.media?.title ? <>« {truncateText(n.media.title, 50)} »</> : "votre photo"}</>;
        case "collection_add":
            return <>{actorName} a ajouté votre photo à la collection « {truncateText(n.details?.collection_title || "Sans titre", 30)} »</>;
        case "premium_purchase":
            return (
                <>
                    {actorName} a acheté votre photo pour {n.details?.credits_spent || "?"} crédit{n.details?.credits_spent > 1 ? "s" : ""}{" "}
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        (+{Number(n.details?.earning_fcfa || 0).toLocaleString("fr-FR")} FCFA)
                    </span>
                </>
            );
        case "payout_paid":
            return <>Votre versement de {Number(n.details?.amount_fcfa || 0).toLocaleString("fr-FR")} FCFA a été confirmé</>;
        default:
            return "Nouvelle activité";
    }
}

function notificationHref(n, username) {
    if (n.type === "payout_paid") return username ? `/@${username}/stats` : null;
    if (n.media) return mediaUrl({ id: n.media_id, title: n.media.title, alt: n.media.alt_text });
    return null;
}

/**
 * Historique complet de l'activité — la cloche du Navbar (NotificationBell)
 * n'en montre que les 8 dernières lignes. Toute la logique d'affichage est
 * volontairement dupliquée plutôt que partagée : `notificationText` mélange
 * JSX et données, et ce fichier vit dans `app/`, pas dans `lib/` (réservé au
 * code sans JSX dans ce projet) — le partager aurait demandé une nouvelle
 * convention pour une quinzaine de lignes utilisées à deux endroits.
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

    const openNotification = (n) => {
        if (!n.read_at) {
            setItems((prev) => prev.map((item) => (item.id === n.id ? { ...item, read_at: new Date().toISOString() } : item)));
            markNotificationRead(n.id);
        }
        const href = notificationHref(n, profile?.username);
        if (href) router.push(href);
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
                        {items.map((n) => {
                            const Icon = TYPE_ICON[n.type] || Bell;
                            return (
                                <button
                                    key={n.id}
                                    onClick={() => openNotification(n)}
                                    className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-left transition-colors hover:bg-gray-50 dark:hover:bg-zinc-900 ${
                                        !n.read_at ? "bg-amber-50/50 dark:bg-amber-950/10" : ""
                                    }`}
                                >
                                    <span className="relative shrink-0">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={n.actor?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${n.actor?.id || n.id}`}
                                            alt=""
                                            className="w-11 h-11 rounded-full object-cover border border-gray-100 dark:border-zinc-700"
                                        />
                                        <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-white dark:bg-zinc-900 rounded-full flex items-center justify-center border border-gray-100 dark:border-zinc-800">
                                            <Icon className="w-3 h-3 text-gray-500 dark:text-zinc-400" />
                                        </span>
                                    </span>

                                    <span className="min-w-0 flex-1">
                                        <span className="block text-[14px] text-gray-700 dark:text-zinc-300 leading-snug line-clamp-2">
                                            {notificationText(n)}
                                        </span>
                                        <span className="block text-xs text-gray-400 dark:text-zinc-500 mt-1">
                                            {timeAgo(n.created_at)}
                                        </span>
                                    </span>

                                    {n.media?.thumbnail_url && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={n.media.thumbnail_url} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
                                    )}
                                </button>
                            );
                        })}
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
