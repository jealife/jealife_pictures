"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getProfileById } from '../lib/database';

const AuthContext = createContext({});

// `AuthRetryableFetchError` est le nom que supabase-js donne à un échec
// réseau pendant l'appel (offline, timeout…), par opposition à une réponse
// du serveur qui rejette vraiment la session (ex: 401). Confondre les deux
// dans `handleVisibilityChange`/`handleOnline` — deux handlers censés
// justement absorber une coupure réseau — déconnectait l'utilisateur à
// cause du réseau qu'ils sont censés gérer, alors que sa session restait
// valide.
function isNetworkAuthError(error) {
    return error?.name === 'AuthRetryableFetchError';
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    // Évite les doublons de requêtes simultanées tout en permettant l'attente partagée
    const activeFetchRef = useRef(null);

    const loadProfile = useCallback(async (userId) => {
        if (!userId) {
            setProfile(null);
            return null;
        }

        // Si une récupération est déjà en cours pour ce même utilisateur, réutiliser la promesse
        if (activeFetchRef.current && activeFetchRef.current.userId === userId) {
            return activeFetchRef.current.promise;
        }

        const promise = (async () => {
            try {
                const profileData = await getProfileById(userId);
                setProfile(profileData);
                return profileData;
            } catch (err) {
                console.error("Erreur lors du chargement du profil :", err);
                return null;
            } finally {
                if (activeFetchRef.current?.userId === userId) {
                    activeFetchRef.current = null;
                }
            }
        })();

        activeFetchRef.current = { userId, promise };
        return promise;
    }, []);

    const refreshProfile = useCallback(async () => {
        if (user?.id) {
            activeFetchRef.current = null;
            await loadProfile(user.id);
        }
    }, [user, loadProfile]);

    useEffect(() => {
        let isCancelled = false;

        async function syncAuthAndProfile(authUser) {
            if (isCancelled) return;

            if (!authUser) {
                setUser(null);
                setProfile(null);
                setLoading(false);
                return;
            }

            setUser(authUser);
            // Crucial : garder loading à true tant que le profil en base de données n'est pas chargé
            await loadProfile(authUser.id);

            if (!isCancelled) {
                setLoading(false);
            }
        }

        // 1. Initialisation de la session
        async function init() {
            try {
                const { data: { user: authUser }, error } = await supabase.auth.getUser();
                if (error || !authUser) {
                    await syncAuthAndProfile(null);
                } else {
                    await syncAuthAndProfile(authUser);
                }
            } catch {
                await syncAuthAndProfile(null);
            }
        }

        init();

        // 2. Écoute des événements d'authentification
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (isCancelled) return;

                const newUser = session?.user ?? null;

                if (event === 'TOKEN_REFRESHED') {
                    setUser(newUser);
                    return;
                }

                if (event === 'SIGNED_OUT') {
                    setUser(null);
                    setProfile(null);
                    setLoading(false);
                    return;
                }

                await syncAuthAndProfile(newUser);
            }
        );

        // 3. Validation au retour de mise en veille (PWA / changement d'onglet)
        function handleVisibilityChange() {
            if (document.visibilityState === 'visible') {
                supabase.auth.getUser().then(({ data: { user: freshUser }, error }) => {
                    if (isCancelled) return;
                    if (isNetworkAuthError(error)) return;
                    if (error || !freshUser) {
                        setUser(null);
                        setProfile(null);
                        setLoading(false);
                    } else {
                        syncAuthAndProfile(freshUser);
                    }
                });
            }
        }

        // 4. Validation au retour de la connexion réseau
        function handleOnline() {
            supabase.auth.getUser().then(({ data: { user: freshUser }, error }) => {
                if (isCancelled) return;
                if (isNetworkAuthError(error)) return;
                if (error || !freshUser) {
                    setUser(null);
                    setProfile(null);
                    setLoading(false);
                } else {
                    syncAuthAndProfile(freshUser);
                }
            });
        }

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('online', handleOnline);

        return () => {
            isCancelled = true;
            subscription.unsubscribe();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('online', handleOnline);
        };
    }, [loadProfile]);

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

