"use client";

import { useSyncExternalStore } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

const emptySubscribe = () => () => {};

const OPTIONS = [
    { value: "light", label: "Clair", icon: Sun },
    { value: "system", label: "Système", icon: Monitor },
    { value: "dark", label: "Sombre", icon: Moon },
];

const CYCLE = ["light", "dark", "system"];

// Le thème réel dépend de `localStorage`, indisponible côté serveur : sans
// ce garde-fou, le premier rendu client (sélection déjà correcte) ne
// correspondrait pas au rendu serveur (toujours "système" par défaut), ce que
// React signale comme une erreur d'hydratation. `useSyncExternalStore` avec un
// snapshot serveur figé à `false` est le mécanisme prévu pour ce cas précis —
// contrairement à un `setState` dans un effet, il ne déclenche pas de rendu
// en cascade signalé par `react-hooks/set-state-in-effect`.
function useMounted() {
    return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

/** Contrôle segmenté à 3 positions — menu mobile, réglages du compte. */
export function ThemeToggle({ className = "" }) {
    const { theme, setTheme } = useTheme();
    const mounted = useMounted();

    return (
        <div className={`inline-flex items-center gap-0.5 p-1 bg-gray-100 dark:bg-zinc-800 rounded-full ${className}`}>
            {OPTIONS.map(({ value, label, icon: Icon }) => {
                const active = mounted && theme === value;
                return (
                    <button
                        key={value}
                        type="button"
                        onClick={() => setTheme(value)}
                        aria-label={label}
                        aria-pressed={active}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                            active
                                ? "bg-white dark:bg-zinc-600 text-black dark:text-white shadow-sm"
                                : "text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-100"
                        }`}
                    >
                        <Icon className="w-3.5 h-3.5" /> {label}
                    </button>
                );
            })}
        </div>
    );
}

/** Bouton compact qui parcourt clair → sombre → système — rail desktop (64px). */
export function ThemeToggleIcon({ className = "" }) {
    const { theme, resolvedTheme, setTheme } = useTheme();
    const mounted = useMounted();

    const cycle = () => {
        const index = CYCLE.indexOf(theme);
        setTheme(CYCLE[(index + 1) % CYCLE.length]);
    };

    const activeTheme = mounted ? theme : "system";
    const Icon = activeTheme === "system" ? Monitor : resolvedTheme === "dark" ? Moon : Sun;
    const label = activeTheme === "light" ? "Thème : Clair" : activeTheme === "dark" ? "Thème : Sombre" : "Thème : Système";

    return (
        <button
            type="button"
            onClick={cycle}
            title={`${label} (cliquer pour changer)`}
            aria-label="Changer de thème"
            className={`p-2 rounded-lg text-gray-400 hover:text-black hover:bg-gray-50 dark:text-zinc-500 dark:hover:text-white dark:hover:bg-zinc-800 transition-colors ${className}`}
        >
            <Icon size={24} />
        </button>
    );
}
