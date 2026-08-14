"use client";

import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
    getNotifications, getUnreadNotificationCount,
    markNotificationRead, markAllNotificationsRead,
} from "../lib/database";
import NotificationRow from "./NotificationRow";

/**
 * Cloche d'activité façon Unsplash — reçoit ses lignes déjà toutes faites
 * (déclencheurs Postgres, voir migration 0021) : ce composant ne fait que
 * les afficher (via NotificationRow, partagé avec ActivityView.jsx) et
 * marquer lu ; la navigation est portée par les liens de chaque rangée.
 *
 * `panelClassName` fixe entièrement le positionnement ET la taille du
 * panneau (rien n'est plus codé en dur ici) : sur le rail bureau, la cloche
 * est le seul élément de sa ligne, un `absolute` ancré sur elle-même
 * suffit. Dans la barre du haut mobile, la cloche n'est PAS l'élément le
 * plus à droite (avatar et menu la suivent) — un `absolute right-0` s'y
 * ancre alors sur la cloche elle-même, pas sur le bord de l'écran, et le
 * panneau déborde à gauche de l'écran. Il faut donc l'ancrer sur la
 * fenêtre (`fixed`), indépendamment de la position réelle du bouton — voir
 * les deux montages dans Navbar.jsx.
 */
export default function NotificationBell({ iconSize = 24, panelClassName = "absolute right-0 top-12 w-80 max-w-[90vw]" }) {
    const { user, profile } = useAuth();
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
        getNotifications({ limit: 15 }).then(setItems);
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

    const readNotification = (n) => {
        setOpen(false);
        if (n.read_at) return;
        setUnreadCount((c) => Math.max(0, c - 1));
        setItems((prev) => (prev || []).map((item) => (item.id === n.id ? { ...item, read_at: new Date().toISOString() } : item)));
        markNotificationRead(n.id);
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
                <div className={`${panelClassName} bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden z-70 animate-in fade-in zoom-in-95 duration-200`}>
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

                    <div className="max-h-[28rem] overflow-y-auto">
                        {items === null ? (
                            <div className="py-10 text-center text-sm text-gray-400 dark:text-zinc-500">Chargement…</div>
                        ) : items.length === 0 ? (
                            <div className="py-10 text-center text-sm text-gray-400 dark:text-zinc-500 italic">Aucune activité pour l&apos;instant.</div>
                        ) : (
                            items.map((n) => (
                                <NotificationRow key={n.id} n={n} username={profile?.username} onRead={readNotification} size="compact" />
                            ))
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
