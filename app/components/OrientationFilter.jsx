"use client";

import { RectangleHorizontal, Check, ChevronDown } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const OPTIONS = [
    { value: null, label: "Toutes orientations" },
    { value: "paysage", label: "Paysage" },
    { value: "portrait", label: "Portrait" },
    { value: "carre", label: "Carré" },
];

export default function OrientationFilter() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);

    const active = searchParams.get("orientation");

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
        if (value) params.set("orientation", value);
        else params.delete("orientation");

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
                        ? "border-black bg-black text-white"
                        : "border-gray-200 text-gray-600 hover:border-gray-400 hover:text-black"
                }`}
                aria-expanded={open}
                aria-label="Filtrer par orientation"
            >
                <RectangleHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">{current.label}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    {OPTIONS.map((option) => (
                        <button
                            key={option.label}
                            onClick={() => select(option.value)}
                            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 text-left text-sm font-medium text-gray-900 transition-colors"
                        >
                            {option.label}
                            {current.label === option.label && <Check className="w-4 h-4 text-emerald-600" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
