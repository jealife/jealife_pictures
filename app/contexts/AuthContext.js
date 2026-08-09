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

        // `getSession()` plutôt que `getUser()` pour ces trois vérifications :
        // `getSession()` rafraîchit silencieusement un jeton d'accès expiré
        // tant que le refresh token reste valide, alors que `getUser()` se
        // contente de vérifier le jeton courant tel quel contre le serveur.
        // Un onglet mis en arrière-plan (changement d'app, verrouillage
        // d'écran) voit son minuteur de rafraîchissement automatique
        // ralenti par le navigateur — au retour, le jeton d'accès est
        // souvent expiré alors que la session, elle, reste valide.
        // Appeler `getUser()` dans ce cas renvoyait une vraie erreur
        // d'authentification et déconnectait l'utilisateur pour rien.
        // `isInitial` : au premier appel (montage), `loading` doit toujours finir
        // par retomber à `false`, même sur un raté réseau — sinon la page reste
        // bloquée sur son écran de chargement indéfiniment (c'était le cas ici :
        // une erreur réseau passagère au tout premier chargement faisait sortir
        // la fonction avant d'atteindre le moindre `setLoading(false)`). Aux
        // appels suivants (retour de mise en veille, reconnexion réseau),
        // `loading` est déjà à `false` depuis longtemps ; ne pas le toucher sur
        // un raté réseau évite d'afficher un spinner pour un utilisateur déjà
        // connecté à l'écran.
        async function revalidateSession(isInitial) {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (isCancelled) return;
                if (isNetworkAuthError(error)) {
                    if (isInitial) setLoading(false);
                    return;
                }
                if (error || !session) {
                    setUser(null);
                    setProfile(null);
                    setLoading(false);
                } else {
                    await syncAuthAndProfile(session.user);
                }
            } catch (err) {
                if (isCancelled) return;
                console.error("Erreur lors de la vérification de session :", err);
                setUser(null);
                setProfile(null);
                setLoading(false);
            }
        }

        // 1. Initialisation de la session
        revalidateSession(true);

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
                revalidateSession(false);
            }
        }

        // 4. Validation au retour de la connexion réseau
        function handleOnline() {
            revalidateSession(false);
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

