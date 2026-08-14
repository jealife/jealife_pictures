"use client";

import Link from "next/link";
import { Bell, Heart, FolderPlus, Sparkles, Banknote, Coins } from "lucide-react";
import { mediaUrl, timeAgo, truncateText } from "../lib/media";

export const TYPE_ICON = {
    like: Heart,
    collection_add: FolderPlus,
    premium_purchase: Sparkles,
    payout_paid: Banknote,
    pricing_unlocked: Coins,
};

function ActorLink({ n, onClick, children }) {
    if (!n.actor?.username) return <span className="font-medium text-gray-900 dark:text-zinc-100">{children}</span>;
    return (
        <Link
            href={`/@${n.actor.username}`}
            onClick={onClick}
            className="relative z-10 font-medium text-gray-900 dark:text-zinc-100 hover:underline"
        >
            {children}
        </Link>
    );
}

function notificationText(n, onLinkClick, titleMaxLen) {
    const actorName = truncateText(n.actor?.full_name || n.actor?.username || "Quelqu'un", 30);
    const actorLink = <ActorLink n={n} onClick={onLinkClick}>{actorName}</ActorLink>;
    switch (n.type) {
        case "like":
            return <>{actorLink} a aimé {n.media?.title ? <>« {truncateText(n.media.title, titleMaxLen)} »</> : "votre photo"}</>;
        case "collection_add": {
            const collectionTitle = truncateText(n.details?.collection_title || "Sans titre", 30);
            const collectionLink = n.collection_id ? (
                <Link
                    href={`/collections/${n.collection_id}`}
                    onClick={onLinkClick}
                    className="relative z-10 font-medium text-gray-900 dark:text-zinc-100 hover:underline"
                >
                    « {collectionTitle} »
                </Link>
            ) : <>« {collectionTitle} »</>;
            return <>{actorLink} a ajouté votre photo à la collection {collectionLink}</>;
        }
        case "premium_purchase":
            return (
                <>
                    {actorLink} a acheté votre photo pour {n.details?.credits_spent || "?"} crédit{n.details?.credits_spent > 1 ? "s" : ""}{" "}
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        (+{Number(n.details?.earning_fcfa || 0).toLocaleString("fr-FR")} FCFA)
                    </span>
                </>
            );
        case "payout_paid":
            return <>Votre versement de {Number(n.details?.amount_fcfa || 0).toLocaleString("fr-FR")} FCFA a été confirmé</>;
        case "pricing_unlocked":
            return (
                <>
                    Vous pouvez désormais{" "}
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">fixer vos propres prix Premium</span>,
                    dans la limite indiquée au moment de l&apos;envoi.
                </>
            );
        default:
            return "Nouvelle activité";
    }
}

export function notificationHref(n, username) {
    if (n.type === "payout_paid") return username ? `/@${username}/stats` : null;
    if (n.type === "pricing_unlocked") return "/submit";
    if (n.media) return mediaUrl({ id: n.media_id, title: n.media.title, alt: n.media.alt_text });
    return null;
}

/**
 * Une rangée de notification n'a pas UNE seule destination : l'auteur mène à
 * son profil, la collection (pour un ajout) mène à la collection, et le
 * reste de la rangée mène au média concerné. Un `<Link>` ne pouvant pas être
 * imbriqué dans un `<button onClick>`, la rangée est un conteneur `relative`
 * avec un lien "étiré" (`absolute inset-0`) pour la destination par défaut,
 * et des liens `relative z-10` pour les éléments spécifiques — ces derniers
 * se retrouvent ainsi au-dessus du lien étiré et interceptent le clic avant
 * lui, tandis que le texte simple autour laisse passer le clic vers le lien
 * étiré en dessous.
 */
export default function NotificationRow({ n, username, onRead, size = "compact" }) {
    const Icon = TYPE_ICON[n.type] || Bell;
    const compact = size === "compact";
    const href = notificationHref(n, username);

    const handleClick = () => onRead(n);

    return (
        <div
            className={`relative flex items-center gap-3 ${compact ? "px-4 py-3 border-b border-gray-50 dark:border-zinc-800 last:border-none" : "gap-4 px-4 py-4 rounded-2xl"} transition-colors hover:bg-gray-50 dark:hover:bg-zinc-800/60 ${
                !n.read_at ? "bg-amber-50/40 dark:bg-amber-950/10" : ""
            }`}
        >
            {href && (
                <Link href={href} onClick={handleClick} className="absolute inset-0" aria-label="Voir" />
            )}

            <Link
                href={n.actor?.username ? `/@${n.actor.username}` : href || "#"}
                onClick={handleClick}
                className="relative z-10 shrink-0"
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={n.actor?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${n.actor?.id || n.id}`}
                    alt=""
                    className={`${compact ? "w-9 h-9" : "w-11 h-11"} rounded-full object-cover border border-gray-100 dark:border-zinc-700`}
                />
                <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-white dark:bg-zinc-900 rounded-full flex items-center justify-center border border-gray-100 dark:border-zinc-800">
                    <Icon className="w-3 h-3 text-gray-500 dark:text-zinc-400" />
                </span>
            </Link>

            <span className="min-w-0 flex-1">
                <span className={`block ${compact ? "text-[13px]" : "text-[14px]"} text-gray-700 dark:text-zinc-300 leading-snug line-clamp-2`}>
                    {notificationText(n, handleClick, compact ? 40 : 50)}
                </span>
                <span className={`block ${compact ? "text-[11px]" : "text-xs"} text-gray-400 dark:text-zinc-500 mt-1`}>
                    {timeAgo(n.created_at)}
                </span>
            </span>

            {n.media?.thumbnail_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={n.media.thumbnail_url}
                    alt=""
                    className={`${compact ? "w-14 h-14 rounded-lg" : "w-16 h-16 rounded-xl"} object-cover shrink-0`}
                />
            )}
        </div>
    );
}
