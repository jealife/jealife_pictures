"use client";

import { useEffect, useRef } from "react";

const COLORS = ["#16a34a", "#f59e0b", "#2563eb", "#dc2626", "#0891b2", "#9333ea"];

/**
 * Pluie de confettis en CSS pur (voir .animate-confetti-fall dans
 * globals.css) : pas de dépendance externe pour un effet purement
 * décoratif et à usage unique.
 *
 * Le tirage aléatoire manipule directement le DOM dans l'effet, sans passer
 * par le state React : les rendus doivent rester purs (Math.random() y est
 * interdit), et un décor éphémère comme celui-ci est justement le genre de
 * synchronisation avec un système externe (le DOM) que les effets sont
 * censés faire.
 */
export default function Confetti({ count = 70 }) {
    const containerRef = useRef(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const pieces = [];
        for (let i = 0; i < count; i++) {
            const piece = document.createElement("span");
            piece.className = "absolute top-[-5%] rounded-sm animate-confetti-fall";

            const width = 6 + Math.random() * 6;
            piece.style.left = `${Math.random() * 100}%`;
            piece.style.width = `${width}px`;
            piece.style.height = `${width * 0.4}px`;
            piece.style.backgroundColor = COLORS[i % COLORS.length];
            piece.style.animationDelay = `${Math.random() * 0.4}s`;
            piece.style.animationDuration = `${2.6 + Math.random() * 1.6}s`;
            piece.style.setProperty("--confetti-rotation", `${360 + Math.random() * 360}deg`);
            piece.style.setProperty("--confetti-drift", `${(Math.random() - 0.5) * 200}px`);

            container.appendChild(piece);
            pieces.push(piece);
        }

        const timer = setTimeout(() => pieces.forEach((p) => p.remove()), 4500);

        return () => {
            clearTimeout(timer);
            pieces.forEach((p) => p.remove());
        };
    }, [count]);

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 z-[60] overflow-hidden pointer-events-none"
            aria-hidden="true"
        />
    );
}
