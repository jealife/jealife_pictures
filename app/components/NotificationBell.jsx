"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Heart, FolderPlus, Sparkles, Banknote, CheckCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
    getNotifications, getUnreadNotificationCount,
    markNotificationRead, markAllNotificationsRead,
} from "../lib/database";
import { mediaUrl, timeAgo, truncateText } from "../lib/media";

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
            return <>{actorName} a aimé {n.media?.title ? <>« {truncateText(n.media.title, 40)} »</> : "votre photo"}</>;
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
 * Cloche d'activité façon Unsplash — reçoit ses lignes déjà toutes faites
 * (déclencheurs Postgres, voir migration 0021) : ce composant ne fait que
 * les afficher, marquer lu, et rediriger. `panelClassName` positionne le
 * panneau différemment selon l'endroit où la cloche est montée (rail
 * bureau vs barre du haut mobile, voir Navbar.jsx) : deux contextes trop
 * différents pour une seule règle responsive.
 */
export default function NotificationBell({ iconSize = 24, panelClassName = "right-0 top-12" }) {
    const { user, profile } = useAuth();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [items, setItems] = useState(null);
    const containerRef = useRef(null);

    useEffect(() => {
        if (!user) return;
        getUnreadNotificationCount().then(setUnreadCount);
        // Pas d'infra temps réel dans ce projet : un sondage toutes les 60s
        // garde le badge à jour sans surcharger l'API pour autant.
        const interval = setInterval(() => {
            getUnreadNotificationCount().then(setUnreadCount);
        }, 60000);
        return () => clearInterval(interval);
    }, [user]);

    useEffect(() => {
        if (!open || items !== null) return;
        getNotifications({ limit: 8 }).then(setItems);
    }, [open, items]);

    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    if (!user) return null;

    const openNotification = (n) => {
        setOpen(false);
        if (!n.read_at) {
            setUnreadCount((c) => Math.max(0, c - 1));
            setItems((prev) => (prev || []).map((item) => (item.id === n.id ? { ...item, read_at: new Date().toISOString() } : item)));
            markNotificationRead(n.id);
        }
        const href = notificationHref(n, profile?.username);
        if (href) router.push(href);
    };

    const markAllRead = (event) => {
        event.stopPropagation();
        setUnreadCount(0);
        setItems((prev) => (prev || []).map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })));
        markAllNotificationsRead();
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setOpen((v) => !v)}
                className="relative p-2 rounded-lg transition-colors text-gray-400 hover:text-black hover:bg-gray-50 dark:text-zinc-500 dark:hover:text-white dark:hover:bg-zinc-800"
                title="Activité"
                aria-label="Activité"
                aria-expanded={open}
            >
                <Bell size={iconSize} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className={`absolute ${panelClassName} w-80 max-w-[90vw] bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden z-70 animate-in fade-in zoom-in-95 duration-200`}>
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-zinc-800">
                        <span className="font-bold text-sm text-gray-900 dark:text-zinc-100">Activité</span>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllRead}
                                className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                            >
                                <CheckCheck className="w-3.5 h-3.5" /> Tout marquer lu
                            </button>
                        )}
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {items === null ? (
                            <div className="py-10 text-center text-sm text-gray-400 dark:text-zinc-500">Chargement…</div>
                        ) : items.length === 0 ? (
                            <div className="py-10 text-center text-sm text-gray-400 dark:text-zinc-500 italic">Aucune activité pour l&apos;instant.</div>
                        ) : (
                            items.map((n) => {
                                const Icon = TYPE_ICON[n.type] || Bell;
                                return (
                                    <button
                                        key={n.id}
                                        onClick={() => openNotification(n)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors border-b border-gray-50 dark:border-zinc-800 last:border-none ${
                                            !n.read_at ? "bg-amber-50/40 dark:bg-amber-950/10" : ""
                                        }`}
                                    >
                                        <span className="relative shrink-0">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={n.actor?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${n.actor?.id || n.id}`}
                                                alt=""
                                                className="w-9 h-9 rounded-full object-cover border border-gray-100 dark:border-zinc-700"
                                            />
                                            <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-white dark:bg-zinc-900 rounded-full flex items-center justify-center border border-gray-100 dark:border-zinc-800">
                                                <Icon className="w-3 h-3 text-gray-500 dark:text-zinc-400" />
                                            </span>
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-[13px] text-gray-700 dark:text-zinc-300 leading-snug line-clamp-2">
                                                {notificationText(n)}
                                            </span>
                                            <span className="block text-[11px] text-gray-400 dark:text-zinc-500 mt-1">
                                                {timeAgo(n.created_at)}
                                            </span>
                                        </span>
                                        {n.media?.thumbnail_url && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={n.media.thumbnail_url} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>

                    <Link
                        href="/activite"
                        onClick={() => setOpen(false)}
                        className="block px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-zinc-400 hover:text-black dark:hover:text-white border-t border-gray-100 dark:border-zinc-800"
                    >
                        Voir toute l&apos;activité
                    </Link>
                </div>
            )}
        </div>
    );
}
