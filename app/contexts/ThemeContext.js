"use client";

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const ThemeContext = createContext({});

const STORAGE_KEY = 'jealife-theme'; // 'light' | 'dark' | 'system'

function readStoredTheme() {
    if (typeof window === 'undefined') return 'system';
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
}

function systemPrefersDark() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyThemeClass(resolved) {
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    // `theme-color` n'est réévalué par le navigateur que contre la préférence
    // système, jamais contre une classe posée en JS : sans cette mise à jour
    // manuelle, un choix explicite « Sombre » laisserait la barre d'adresse
    // mobile teintée pour le mode clair.
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', resolved === 'dark' ? '#0a0a0a' : '#0b3d2e');
}

/**
 * Trois positions — clair / sombre / système — et non un simple bouton à
 * bascule : le script anti-FOUC (layout racine) applique déjà la bonne
 * classe avant l'hydratation, `theme` s'initialise donc directement depuis
 * `localStorage` (plutôt que dans un `useEffect`) pour ne jamais reproduire
 * un flash correct → « système » → correct le temps que l'effet se
 * déclenche.
 */
export function ThemeProvider({ children }) {
    const [theme, setThemeState] = useState(readStoredTheme);
    // Suivi séparé de la préférence système : `resolvedTheme` s'en déduit à
    // chaque rendu plutôt que d'être son propre état recalculé dans un
    // effet, ce qui évite un rendu en cascade pour une valeur qui n'est de
    // toute façon qu'une fonction de `theme`/`systemIsDark`.
    const [systemIsDark, setSystemIsDark] = useState(() =>
        typeof window !== 'undefined' ? systemPrefersDark() : false
    );

    const resolvedTheme = theme === 'system' ? (systemIsDark ? 'dark' : 'light') : theme;

    useEffect(() => {
        applyThemeClass(resolvedTheme);
    }, [resolvedTheme]);

    // Suit la préférence système en continu, pas seulement au montage : sa
    // valeur peut changer sans recharger la page (bascule automatique
    // jour/nuit de l'OS), et reste utile même hors mode « système » pour que
    // `resolvedTheme` soit déjà juste si l'utilisateur y repasse plus tard.
    useEffect(() => {
        const mql = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (event) => setSystemIsDark(event.matches);
        mql.addEventListener('change', handleChange);
        return () => mql.removeEventListener('change', handleChange);
    }, []);

    const setTheme = useCallback((next) => {
        setThemeState(next);
        window.localStorage.setItem(STORAGE_KEY, next);
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
