"use client";

import { ArrowUpDown, Check, ChevronDown } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Tri des résultats. Le paramètre `?tri=` et la logique existent depuis
 * longtemps côté serveur (`applySort`, app/lib/database.js) mais n'avaient
 * jamais de contrôle visible — seul quelqu'un qui connaissait déjà l'URL
 * pouvait s'en servir.
 */
const OPTIONS = [
    { value: null, label: "Par défaut" },
    { value: "recent", label: "Plus récent" },
    { value: "populaire", label: "Plus populaire" },
];

export default function SortControl() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);

    const active = searchParams.get("tri");

    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    const select = (value) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) params.set("tri", value);
        else params.delete("tri");

        const query = params.toString();
        router.push(query ? `${pathname}?${query}` : pathname);
        setOpen(false);
    };

    const current = OPTIONS.find((option) => option.value === active) || OPTIONS[0];

    return (
        <div className="relative shrink-0" ref={containerRef}>
            <button
                onClick={() => setOpen(!open)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${
                    active
                        ? "border-black dark:border-white bg-black dark:bg-white text-white dark:text-black"
                        : "border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 hover:border-gray-400 hover:text-black dark:hover:border-zinc-500 dark:hover:text-white"
                }`}
                aria-expanded={open}
                aria-label="Trier les résultats"
            >
                <ArrowUpDown className="w-4 h-4" />
                <span className="hidden sm:inline">{current.label}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-gray-100 dark:border-zinc-800 py-1 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    {OPTIONS.map((option) => (
                        <button
                            key={option.label}
                            onClick={() => select(option.value)}
                            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-zinc-800 text-left text-sm font-medium text-gray-900 dark:text-zinc-100 transition-colors"
                        >
                            {option.label}
                            {current.label === option.label && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
