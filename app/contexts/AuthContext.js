"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { onAuthStateChange, getCurrentUser } from '../lib/auth';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchUserProfile = async (userId) => {
        const { getProfileById } = await import('../lib/database');
        const profileData = await getProfileById(userId);
        setProfile(profileData);
    };

    const refreshProfile = async () => {
        if (user) {
            await fetchUserProfile(user.id);
        }
    };

    useEffect(() => {
        // Vérifier la session au chargement
        getCurrentUser().then(async (user) => {
            setUser(user);
            if (user) {
                await fetchUserProfile(user.id);
            }
            setLoading(false);
        });

        // Écouter les changements d'authentification
        const { data: subscription } = onAuthStateChange(async (event, session) => {
            const newUser = session?.user ?? null;
            setUser(newUser);
            if (newUser) {
                await fetchUserProfile(newUser.id);
            } else {
                setProfile(null);
            }
            setLoading(false);
        });

        return () => {
            if (subscription && typeof subscription.unsubscribe === 'function') {
                subscription.unsubscribe();
            }
        };
    }, []);

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
