"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    // Évite de déclencher deux récupérations de profil en parallèle quand
    // `onAuthStateChange` fire juste après `getUser`.
    const fetchingProfile = useRef(false);

    const fetchUserProfile = useCallback(async (userId) => {
        if (fetchingProfile.current) return;
        fetchingProfile.current = true;
        try {
            const { getProfileById } = await import('../lib/database');
            const profileData = await getProfileById(userId);
            setProfile(profileData);
        } finally {
            fetchingProfile.current = false;
        }
    }, []);

    const refreshProfile = useCallback(async () => {
        if (user) {
            await fetchUserProfile(user.id);
        }
    }, [user, fetchUserProfile]);

    useEffect(() => {
        let cancelled = false;

        // ---------------------------------------------------------------
        // 1. Initialisation : on utilise getUser() plutôt que getSession()
        //    pour forcer la vérification du JWT auprès du serveur Supabase.
        //    getSession() lit le cache localStorage et peut retourner un
        //    token expiré, surtout en PWA standalone après une longue mise
        //    en veille.
        // ---------------------------------------------------------------
        async function init() {
            try {
                const { data: { user: authUser }, error } = await supabase.auth.getUser();

                if (cancelled) return;

                if (error || !authUser) {
                    setUser(null);
                    setProfile(null);
                } else {
                    setUser(authUser);
                    await fetchUserProfile(authUser.id);
                }
            } catch {
                if (!cancelled) {
                    setUser(null);
                    setProfile(null);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        init();

        // ---------------------------------------------------------------
        // 2. Listener global : écoute les événements de session en temps
        //    réel (connexion, déconnexion, refresh du token, expiration).
        // ---------------------------------------------------------------
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (cancelled) return;

                const newUser = session?.user ?? null;

                // Token refresh réussi → mettre à jour l'utilisateur en mémoire
                // sans recharger le profil (il n'a pas changé).
                if (event === 'TOKEN_REFRESHED') {
                    setUser(newUser);
                    return;
                }

                // Déconnexion explicite ou session révoquée.
                if (event === 'SIGNED_OUT') {
                    setUser(null);
                    setProfile(null);
                    return;
                }

                // SIGNED_IN, USER_UPDATED, INITIAL_SESSION, etc.
                setUser(newUser);
                if (newUser) {
                    await fetchUserProfile(newUser.id);
                } else {
                    setProfile(null);
                }
                setLoading(false);
            }
        );

        // ---------------------------------------------------------------
        // 3. PWA : quand l'application revient au premier plan (retour
        //    d'une mise en veille, changement d'onglet), on revalide la
        //    session immédiatement. Sans cela, supabase-js garde en
        //    mémoire un token expiré et les requêtes échouent en silence
        //    avec une erreur RLS ou 401.
        // ---------------------------------------------------------------
        function handleVisibilityChange() {
            if (document.visibilityState === 'visible') {
                supabase.auth.getUser().then(({ data: { user: freshUser }, error }) => {
                    if (cancelled) return;
                    if (error || !freshUser) {
                        // La session a expiré pendant la mise en veille.
                        setUser(null);
                        setProfile(null);
                    } else if (!user || freshUser.id !== user?.id) {
                        // Changement de compte (peu probable mais possible).
                        setUser(freshUser);
                        fetchUserProfile(freshUser.id);
                    } else {
                        // Même utilisateur — on met à jour l'objet au cas où
                        // le token a été rafraîchi.
                        setUser(freshUser);
                    }
                });
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // ---------------------------------------------------------------
        // 4. PWA iOS / Android : quand le réseau revient après une coupure,
        //    on vérifie aussi la session. Sur un réseau mobile instable
        //    le refresh automatique peut avoir échoué.
        // ---------------------------------------------------------------
        function handleOnline() {
            supabase.auth.getUser().then(({ data: { user: freshUser }, error }) => {
                if (cancelled) return;
                if (error || !freshUser) {
                    setUser(null);
                    setProfile(null);
                } else {
                    setUser(freshUser);
                }
            });
        }

        window.addEventListener('online', handleOnline);

        return () => {
            cancelled = true;
            subscription.unsubscribe();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('online', handleOnline);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
