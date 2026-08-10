"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { signOut } from "../lib/auth";
import { ThemeToggleIcon } from "../components/ThemeToggle";
import {
    LayoutDashboard, ShieldAlert, Users, Tag, Layers, Settings, History,
    BarChart3, Loader2, ExternalLink, MoreHorizontal, LogOut, Banknote,
} from "lucide-react";

// `tab: true` marque les quatre entrées les plus utilisées au quotidien
// (modération, utilisateurs) : elles seules tiennent dans la barre d'onglets
// mobile, façon app native — au-delà de 5 slots ça redevient une liste, pas
// une barre d'onglets. Le reste vit dans le tiroir "Plus".
const NAV = [
    { href: "/admin", label: "Vue d'ensemble", icon: LayoutDashboard, tab: true },
    { href: "/admin/moderation", label: "Modération", icon: ShieldAlert, tab: true },
    { href: "/admin/users", label: "Utilisateurs", icon: Users, tab: true },
    { href: "/admin/reports", label: "Rapports", icon: BarChart3, tab: true },
    { href: "/admin/topics", label: "Thèmes", icon: Tag },
    { href: "/admin/collections", label: "Collections", icon: Layers },
    { href: "/admin/monetization", label: "Monétisation", icon: Banknote },
    { href: "/admin/audit", label: "Journal d'audit", icon: History },
    { href: "/admin/settings", label: "Réglages", icon: Settings },
];

const TAB_ITEMS = NAV.filter((item) => item.tab);
const MORE_ITEMS = NAV.filter((item) => !item.tab);

/**
 * Coquille de l'espace admin — interface à part entière, détachée de la
 * Navbar publique (voir ClientLayout.js) : sidebar fixe sur desktop, barre
 * d'onglets + tiroir "Plus" en bas sur mobile, comme une vraie app.
 *
 * `profile.role` vient de la migration 0004 ; RLS refuse de toute façon
 * chaque requête admin côté serveur si le rôle n'est pas `admin` — cette
 * garde ne fait qu'éviter d'afficher l'interface à qui n'y a pas droit.
 */
export default function AdminLayout({ children }) {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [moreOpen, setMoreOpen] = useState(false);

    const isAdmin = profile?.role === "admin";

    useEffect(() => {
        if (!loading && (!user || !isAdmin)) {
            router.replace("/");
        }
    }, [user, isAdmin, loading, router]);

    const handleSignOut = async () => {
        await signOut();
        router.push("/");
        router.refresh();
    };

    if (loading || !user || !isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
                <Loader2 className="w-8 h-8 animate-spin text-gray-300 dark:text-zinc-600" />
            </div>
        );
    }

    const isActive = (href) => (href === "/admin" ? pathname === href : pathname.startsWith(href));
    const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`;
    const moreActive = MORE_ITEMS.some((item) => isActive(item.href));

    return (
        <div className="min-h-screen bg-white dark:bg-zinc-950">
            {/* Sidebar desktop — fixe, pleine hauteur : la coquille admin ne
                partage plus rien avec la Navbar publique (ni largeur, ni
                nav), elle est visuellement une app à part. */}
            <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 w-64 border-r border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <Link href="/admin" className="flex items-center h-16 px-6 border-b border-gray-100 dark:border-zinc-800 shrink-0">
                    <span className="font-bold text-lg text-gray-900 dark:text-zinc-100">Administration</span>
                </Link>

                <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                    {NAV.map(({ href, label, icon: Icon }) => {
                        const active = isActive(href);
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                                    active
                                        ? "bg-gray-50 dark:bg-zinc-800 text-black dark:text-white"
                                        : "text-gray-500 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-zinc-800"
                                }`}
                            >
                                <Icon className="w-4 h-4 shrink-0" /> {label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-3 border-t border-gray-100 dark:border-zinc-800 space-y-1">
                    <Link
                        href="/"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all"
                    >
                        <ExternalLink className="w-4 h-4 shrink-0" /> Voir le site
                    </Link>

                    <div className="flex items-center gap-2.5 px-3 py-2">
                        <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 border border-gray-200 dark:border-zinc-700" />
                        <p className="min-w-0 flex-1 text-sm font-semibold text-gray-900 dark:text-zinc-100 truncate">
                            {profile?.full_name || profile?.username}
                        </p>
                        <ThemeToggleIcon className="shrink-0" />
                    </div>

                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-all w-full text-left"
                    >
                        <LogOut className="w-4 h-4 shrink-0" /> Se déconnecter
                    </button>
                </div>
            </aside>

            {/* Barre supérieure mobile — minimale : le titre de chaque page
                vit déjà dans son propre <h2>, pas la peine de le répéter ici. */}
            <header className="md:hidden sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border-b border-gray-100 dark:border-zinc-800">
                <Link href="/admin" className="font-bold text-gray-900 dark:text-zinc-100">
                    Administration
                </Link>
                <Link href="/" className="p-2 -mr-2 text-gray-500 dark:text-zinc-400" aria-label="Voir le site public">
                    <ExternalLink className="w-5 h-5" />
                </Link>
            </header>

            {/* Contenu */}
            <div className="md:pl-64">
                <div className="max-w-[1200px] mx-auto px-4 py-8 md:py-16 pb-28 md:pb-16">
                    {children}
                </div>
            </div>

            {/* Barre d'onglets mobile — façon app native, en bas, pouces
                accessibles ; le 5e slot ouvre un tiroir pour le reste. */}
            <nav
                className="md:hidden fixed inset-x-0 bottom-0 z-30 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border-t border-gray-100 dark:border-zinc-800"
                style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
            >
                <div className="grid grid-cols-5">
                    {/* Icônes seules, sans libellé : 5 colonnes avec texte
                        serraient trop pour rester lisibles à cette largeur.
                        `aria-label` garde chaque onglet nommé pour un lecteur
                        d'écran malgré l'absence de texte visible. */}
                    {TAB_ITEMS.map(({ href, label, icon: Icon }) => {
                        const active = isActive(href);
                        return (
                            <Link
                                key={href}
                                href={href}
                                aria-label={label}
                                className={`flex items-center justify-center py-3.5 transition-colors ${
                                    active ? "text-black dark:text-white" : "text-gray-400 dark:text-zinc-500"
                                }`}
                            >
                                <Icon className="w-6 h-6" />
                            </Link>
                        );
                    })}
                    <button
                        type="button"
                        onClick={() => setMoreOpen(true)}
                        aria-expanded={moreOpen}
                        aria-label="Plus"
                        className={`flex items-center justify-center py-3.5 transition-colors ${
                            moreOpen || moreActive ? "text-black dark:text-white" : "text-gray-400 dark:text-zinc-500"
                        }`}
                    >
                        <MoreHorizontal className="w-6 h-6" />
                    </button>
                </div>
            </nav>

            {/* Tiroir "Plus" mobile — rendu hors de la barre d'onglets (pas
                imbriqué dedans) : un `fixed` posé dans un ancêtre déjà
                `fixed` s'y confine au lieu de couvrir tout l'écran, même
                piège déjà rencontré avec la bulle de recherche flottante
                (voir Navbar.jsx). */}
            {moreOpen && (
                <div
                    className="md:hidden fixed inset-0 z-40 bg-black/40"
                    onClick={() => setMoreOpen(false)}
                />
            )}
            <div
                className={`md:hidden fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-zinc-900 rounded-t-3xl shadow-2xl transition-transform duration-300 ${
                    moreOpen ? "translate-y-0" : "translate-y-full pointer-events-none"
                }`}
                style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
            >
                <div className="flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-zinc-700" />
                </div>

                <div className="px-4 pt-2">
                    {MORE_ITEMS.map(({ href, label, icon: Icon }) => {
                        const active = isActive(href);
                        return (
                            <Link
                                key={href}
                                href={href}
                                onClick={() => setMoreOpen(false)}
                                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-colors ${
                                    active
                                        ? "bg-gray-50 dark:bg-zinc-800 text-black dark:text-white"
                                        : "text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800"
                                }`}
                            >
                                <Icon className="w-4 h-4 shrink-0" /> {label}
                            </Link>
                        );
                    })}

                    <div className="h-px bg-gray-100 dark:bg-zinc-800 my-2" />

                    <Link
                        href="/"
                        onClick={() => setMoreOpen(false)}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <ExternalLink className="w-4 h-4 shrink-0" /> Voir le site public
                    </Link>
                    <button
                        type="button"
                        onClick={() => { setMoreOpen(false); handleSignOut(); }}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors w-full text-left"
                    >
                        <LogOut className="w-4 h-4 shrink-0" /> Se déconnecter
                    </button>
                </div>
            </div>
        </div>
    );
}
