import { supabase } from './supabase';

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
        return { success: false, error: error.message };
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
        return { success: false, error: error.message };
    }
}

// Connexion avec OAuth (Google, Facebook, etc.)
export async function signInWithOAuth(provider) {
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error signing in with OAuth:', error);
        return { success: false, error: error.message };
    }
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

// Récupérer l'utilisateur actuel
export async function getCurrentUser() {
    try {
        // Vérifier d'abord s'il y a une session
        const { data: { session } } = await supabase.auth.getSession();

        // Si pas de session, retourner null sans erreur
        if (!session) {
            return null;
        }

        // Si session existe, récupérer l'utilisateur
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
        return { success: false, error: error.message };
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
