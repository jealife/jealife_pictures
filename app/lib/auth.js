import { supabase, SUPABASE_URL, SUPABASE_KEY } from './supabase';

// Connexion avec email et mot de passe
export async function signInWithEmail(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;
        return { success: true, user: data.user };
    } catch (error) {
        console.error('Error signing in:', error);
        return { success: false, error: authErrorMessage(error) };
    }
}

// Inscription avec email et mot de passe
export async function signUpWithEmail(email, password, metadata = {}) {
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: metadata, // firstName, lastName, etc.
            },
        });

        if (error) throw error;
        return { success: true, user: data.user };
    } catch (error) {
        console.error('Error signing up:', error);
        return { success: false, error: authErrorMessage(error) };
    }
}

// Connexion avec OAuth (Google, Facebook, etc.)
export async function signInWithOAuth(provider, redirectPath = '/') {
    try {
        // La destination voulue voyage dans l'URL de retour : sans elle,
        // quelqu'un qui se connecte depuis « Publier une image » atterrissait
        // sur l'accueil et devait refaire le chemin.
        const callback = new URL('/auth/callback', window.location.origin);
        if (redirectPath && redirectPath !== '/') {
            callback.searchParams.set('redirect', redirectPath);
        }

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider,
            options: { redirectTo: callback.toString() },
        });

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error signing in with OAuth:', error);
        return { success: false, error: authErrorMessage(error) };
    }
}

/**
 * Fournisseurs de connexion réellement activés sur le projet Supabase.
 *
 * La page de connexion affichait des boutons Google et Facebook en dur alors
 * qu'aucun des deux n'est activé côté Supabase : le clic ouvrait une page
 * d'erreur du fournisseur. On interroge donc le projet et on n'affiche que ce
 * qui fonctionne — le jour où un fournisseur est activé, son bouton apparaît
 * sans qu'il y ait une ligne de code à changer.
 */
export async function getEnabledOAuthProviders() {
    if (!SUPABASE_URL || !SUPABASE_KEY) return [];

    try {
        const response = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
            headers: { apikey: SUPABASE_KEY },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const settings = await response.json();
        const external = settings?.external || {};

        // Uniquement les fournisseurs pour lesquels cette interface a un bouton.
        return ['google', 'facebook', 'apple', 'github'].filter((p) => external[p]);
    } catch (error) {
        console.error('Error fetching auth providers:', error.message || error);
        return [];
    }
}

const ERROR_MESSAGES = [
    [/invalid login credentials/i, 'Adresse e-mail ou mot de passe incorrect.'],
    [/email not confirmed/i, "Votre adresse e-mail n'a pas encore été confirmée. Vérifiez votre boîte de réception."],
    [/user already registered|already been registered/i, 'Un compte existe déjà avec cette adresse e-mail.'],
    [/password should be at least/i, 'Le mot de passe doit contenir au moins 6 caractères.'],
    [/unable to validate email|invalid email/i, "Cette adresse e-mail n'est pas valide."],
    [/only request this after|rate limit|too many requests/i, 'Trop de tentatives. Patientez une minute avant de réessayer.'],
    [/provider is not enabled|unsupported provider/i, "Ce mode de connexion n'est pas encore activé."],
    [/failed to fetch|network/i, 'Connexion au serveur impossible. Vérifiez votre connexion internet.'],
];

/**
 * Traduit les messages d'erreur de Supabase, qui arrivent en anglais et dans
 * un vocabulaire technique, en phrases lisibles par la personne en face.
 */
export function authErrorMessage(error) {
    const raw = typeof error === 'string' ? error : error?.message || '';
    const match = ERROR_MESSAGES.find(([pattern]) => pattern.test(raw));
    return match ? match[1] : 'Une erreur est survenue. Réessayez dans un instant.';
}

// Déconnexion
export async function signOut() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error signing out:', error);
        return { success: false, error: error.message };
    }
}

// Récupérer l'utilisateur actuel.
// On appelle directement getUser() qui valide le JWT auprès du serveur
// Supabase. L'ancienne approche passait par getSession() d'abord, mais
// cette méthode lit le cache localStorage — en PWA standalone, après une
// longue mise en veille, le token peut être expiré sans que le client le
// sache.
export async function getCurrentUser() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return user;
    } catch (error) {
        // Ne pas logger l'erreur si c'est juste une session manquante
        if (error.message !== 'Auth session missing!') {
            console.error('Error getting current user:', error);
        }
        return null;
    }
}


// Récupérer la session actuelle
export async function getSession() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        return session;
    } catch (error) {
        console.error('Error getting session:', error);
        return null;
    }
}

// Réinitialiser le mot de passe
export async function resetPassword(email) {
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error resetting password:', error);
        return { success: false, error: authErrorMessage(error) };
    }
}

// Mettre à jour le mot de passe
export async function updatePassword(newPassword) {
    try {
        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        });

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error updating password:', error);
        return { success: false, error: error.message };
    }
}

// Écouter les changements d'authentification
export function onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
        callback(event, session);
    });
}

// Créer ou mettre à jour le profil utilisateur
export async function upsertProfile(userId, profileData) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .upsert({
                id: userId,
                ...profileData,
                updated_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) throw error;
        return { success: true, profile: data };
    } catch (error) {
        console.error('Error upserting profile:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
            fullError: error
        });
        return { success: false, error: error.message || "Erreur inconnue lors de la mise à jour du profil" };
    }
}
