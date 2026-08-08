"use client";

import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { likeMedia, unlikeMedia } from "../lib/database";
import { formatCount } from "../lib/media";

/**
 * Bouton « J'aime » réellement branché.
 *
 * Les cœurs affichés sur les cartes et sur la page photo n'avaient aucun
 * gestionnaire de clic : `likeMedia()` et `unlikeMedia()` existaient dans la
 * couche données mais n'étaient appelées nulle part. Rien n'était donc jamais
 * enregistré, et le compteur restait figé.
 */
export default function LikeButton({
    mediaId,
    initialLiked = false,
    initialCount = 0,
    variant = "overlay",
    showCount = false,
    className = "",
}) {
    const { user } = useAuth();
    const router = useRouter();
    const [liked, setLiked] = useState(initialLiked);
    const [count, setCount] = useState(initialCount);
    const [pending, setPending] = useState(false);

    useEffect(() => {
        setLiked(initialLiked);
    }, [initialLiked]);

    useEffect(() => {
        setCount(initialCount);
    }, [initialCount]);

    const toggle = async (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (!user) {
            router.push(`/login?redirect=/photos/${mediaId}`);
            return;
        }
        if (pending) return;

        // Bascule optimiste : sur une connexion lente, attendre la réponse du
        // serveur donne l'impression que le bouton ne marche pas.
        const nextLiked = !liked;
        setLiked(nextLiked);
        setCount((value) => Math.max(0, value + (nextLiked ? 1 : -1)));
        setPending(true);

        const ok = nextLiked
            ? await likeMedia(mediaId, user.id)
            : await unlikeMedia(mediaId, user.id);

        if (!ok) {
            setLiked(!nextLiked);
            setCount((value) => Math.max(0, value + (nextLiked ? -1 : 1)));
        }
        setPending(false);
    };

    const styles = {
        overlay: `bg-white/20 backdrop-blur-md border border-white/10 p-2.5 rounded-full transition-all active:scale-95 ${
            liked ? "text-red-500 bg-white" : "text-white hover:bg-white hover:text-red-500"
        }`,
        outline: `flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-all ${
            liked
                ? "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400"
                : "border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 hover:text-black hover:border-black dark:hover:text-white dark:hover:border-white"
        }`,
        large: `shrink-0 flex items-center gap-2 px-6 py-4 rounded-2xl transition-all border active:scale-95 font-bold ${
            liked
                ? "bg-red-50 dark:bg-red-950 border-red-100 dark:border-red-900 text-red-600 dark:text-red-400"
                : "bg-gray-50 dark:bg-zinc-800 border-gray-100 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950 dark:hover:text-red-400"
        }`,
    };

    return (
        <button
            onClick={toggle}
            disabled={pending}
            className={`${styles[variant] || styles.overlay} ${className}`}
            aria-pressed={liked}
            aria-label={liked ? "Retirer des favoris" : "Ajouter aux favoris"}
            title={liked ? "Retirer des favoris" : "J'aime"}
        >
            {/* Classes écrites en toutes lettres : Tailwind ne détecte pas
                les noms de classe construits dynamiquement. */}
            <Heart className={`${variant === "overlay" ? "w-5 h-5" : "w-4 h-4"} ${liked ? "fill-current" : ""}`} />
            {variant === "large" && <span>{liked ? "Enregistré" : "Enregistrer"}</span>}
            {showCount && count > 0 && <span className="text-xs font-bold">{formatCount(count)}</span>}
        </button>
    );
}
