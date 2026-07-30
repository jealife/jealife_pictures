"use client";

import { Globe2, Check, ChevronDown } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getActiveCountries } from "../lib/database";

/**
 * Filtre géographique.
 *
 * C'est la pièce qui manquait pour que « d'abord des images africaines » soit
 * autre chose qu'une intention : le classement met déjà le Gabon en tête, ce
 * sélecteur permet en plus de s'y restreindre explicitement, ou d'élargir au
 * reste du continent.
 *
 * On ne liste que les pays qui ont réellement du contenu — proposer un filtre
 * qui renvoie une page vide est pire que ne rien proposer.
 */
export default function CountryFilter() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [open, setOpen] = useState(false);
    const [countries, setCountries] = useState([]);
    const containerRef = useRef(null);

    const active = searchParams.get("pays");

    useEffect(() => { getActiveCountries().then(setCountries); }, []);

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

    // Rien à filtrer tant qu'un seul pays est représenté.
    if (countries.length < 2) return null;

    const select = (code) => {
        const params = new URLSearchParams(searchParams.toString());
        if (code) params.set("pays", code);
        else params.delete("pays");

        const query = params.toString();
        router.push(query ? `${pathname}?${query}` : pathname);
        setOpen(false);
    };

    const current = countries.find((country) => country.code === active);
    const african = countries.filter((country) => country.is_african);
    const others = countries.filter((country) => !country.is_african);

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
                aria-label="Filtrer par pays"
            >
                {current ? (
                    <>
                        <span aria-hidden="true">{current.emoji}</span>
                        <span className="hidden sm:inline">{current.name_fr}</span>
                    </>
                ) : (
                    <>
                        <Globe2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Tous les pays</span>
                    </>
                )}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-64 max-h-96 overflow-y-auto bg-white rounded-xl shadow-2xl border border-gray-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    <button
                        onClick={() => select(null)}
                        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 text-left text-sm font-medium text-gray-900 transition-colors"
                    >
                        <span className="flex items-center gap-2">
                            <Globe2 className="w-4 h-4 text-gray-400" /> Tous les pays
                        </span>
                        {!active && <Check className="w-4 h-4 text-emerald-600" />}
                    </button>

                    {african.length > 0 && (
                        <>
                            <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                Afrique
                            </p>
                            {african.map((country) => (
                                <CountryRow
                                    key={country.code}
                                    country={country}
                                    active={active === country.code}
                                    onSelect={select}
                                />
                            ))}
                        </>
                    )}

                    {others.length > 0 && (
                        <>
                            <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                Ailleurs
                            </p>
                            {others.map((country) => (
                                <CountryRow
                                    key={country.code}
                                    country={country}
                                    active={active === country.code}
                                    onSelect={select}
                                />
                            ))}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

function CountryRow({ country, active, onSelect }) {
    return (
        <button
            onClick={() => onSelect(country.code)}
            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 text-left transition-colors"
        >
            <span className="flex items-center gap-2 text-sm font-medium text-gray-900 truncate">
                <span aria-hidden="true">{country.emoji}</span>
                {country.name_fr}
            </span>
            <span className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-gray-400">{country.count}</span>
                {active && <Check className="w-4 h-4 text-emerald-600" />}
            </span>
        </button>
    );
}
