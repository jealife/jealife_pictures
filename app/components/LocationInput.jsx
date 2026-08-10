"use client";

import { useEffect, useState } from "react";
import { MapPin, Globe2 } from "lucide-react";

/**
 * Champ de lieu avec autocomplétion (Photon/OpenStreetMap) et déduction du
 * pays. Partagé entre le formulaire d'envoi (`media.country_code`) et les
 * réglages du profil (`profiles.country_code`) — c'est ce second usage qui a
 * révélé que `profiles.country_code` existait en base sans qu'aucune
 * interface ne le renseigne jamais : la localisation d'un profil était du
 * texte libre, sans code pays associé, donc impossible à relier à une
 * recherche par pays.
 *
 * `onPatch` reçoit `{ location }` en saisie libre, ou `{ location, city,
 * countryCode }` au choix d'une suggestion — au consommateur de ne garder
 * que les champs qui existent dans son propre schéma (un profil n'a pas de
 * colonne `city` séparée, contrairement à un média).
 */
export default function LocationInput({ id, value, onPatch, countryName, disabled, placeholder }) {
    const [places, setPlaces] = useState([]);
    const [showPlaces, setShowPlaces] = useState(false);

    useEffect(() => {
        if (value.trim().length < 2) return;

        const timer = setTimeout(async () => {
            try {
                const response = await fetch(
                    `https://photon.komoot.io/api/?q=${encodeURIComponent(value)}&limit=5`
                );
                const data = await response.json();

                const seen = new Set();
                const results = [];
                for (const feature of data.features || []) {
                    const { name, city, country, countrycode } = feature.properties;
                    const label = [name, city, country].filter(Boolean).join(", ");
                    if (label && !seen.has(label)) {
                        seen.add(label);
                        results.push({ label, city: city || name, countryCode: countrycode });
                    }
                }
                setPlaces(results);
            } catch {
                setPlaces([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [value]);

    // Dérivé plutôt que remis à zéro dans l'effet : un champ vidé masque les
    // suggestions immédiatement, sans setState synchrone au rendu.
    const visiblePlaces = showPlaces && value.trim().length >= 2 ? places : [];

    return (
        <div className="relative">
            <MapPin className="w-3.5 h-3.5 absolute left-3.5 top-[1.15rem] -translate-y-1/2 text-gray-300 dark:text-zinc-600" />
            <input
                id={id}
                type="text"
                value={value}
                onChange={(e) => onPatch({ location: e.target.value })}
                onFocus={() => setShowPlaces(true)}
                disabled={disabled}
                placeholder={placeholder}
                className="w-full pl-9 pr-3.5 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white outline-none transition-all text-sm disabled:opacity-60"
            />

            {visiblePlaces.length > 0 && (
                <div className="absolute z-40 left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden">
                    {visiblePlaces.map((place) => (
                        <button
                            key={place.label}
                            type="button"
                            onClick={() => {
                                onPatch({
                                    location: place.label,
                                    ...(place.city ? { city: place.city } : {}),
                                    ...(place.countryCode ? { countryCode: place.countryCode.toUpperCase() } : {}),
                                });
                                setShowPlaces(false);
                            }}
                            className="w-full text-left px-3.5 py-2.5 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 border-b border-gray-50 dark:border-zinc-800 last:border-none flex items-center gap-2.5 transition-colors"
                        >
                            <MapPin className="w-3.5 h-3.5 text-gray-300 dark:text-zinc-600 shrink-0" />
                            {place.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Le pays déduit est montré, pas redemandé : sans ce rappel, une
                déduction fausse partirait sans que personne ne la voie. */}
            {countryName && (
                <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-1.5 flex items-center gap-1">
                    <Globe2 className="w-3 h-3" /> {countryName}
                </p>
            )}
        </div>
    );
}
