"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { LayoutDashboard, ShieldAlert, Users, Tag, Layers, Settings, Loader2 } from "lucide-react";

const NAV = [
    { href: "/admin", label: "Vue d'ensemble", icon: LayoutDashboard },
    { href: "/admin/moderation", label: "Modération", icon: ShieldAlert },
    { href: "/admin/users", label: "Utilisateurs", icon: Users },
    { href: "/admin/topics", label: "Thèmes", icon: Tag },
    { href: "/admin/collections", label: "Collections", icon: Layers },
    { href: "/admin/settings", label: "Réglages", icon: Settings },
];

/**
 * Garde d'accès de tout l'espace admin.
 *
 * `profile.role` vient de la migration 0004 ; RLS refuse de toute façon
 * chaque requête admin côté serveur si le rôle n'est pas `admin` — cette
 * garde ne fait qu'éviter d'afficher l'interface à qui n'y a pas droit.
 */
export default function AdminLayout({ children }) {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    const isAdmin = profile?.role === "admin";

    useEffect(() => {
        if (!loading && (!user || !isAdmin)) {
            router.replace("/");
        }
    }, [user, isAdmin, loading, router]);

    if (loading || !user || !isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-[1200px] mx-auto px-4 py-12 md:py-16">
                <div className="flex flex-col md:flex-row gap-12">
                    <div className="w-full md:w-56 shrink-0">
                        <h1 className="text-2xl font-bold text-gray-900 mb-8">Administration</h1>
                        <nav className="space-y-1">
                            {NAV.map(({ href, label, icon: Icon }) => {
                                const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
                                return (
                                    <Link
                                        key={href}
                                        href={href}
                                        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                                            active
                                                ? "bg-gray-50 text-black border-l-4 border-black"
                                                : "text-gray-500 hover:text-black hover:bg-gray-50"
                                        }`}
                                    >
                                        <Icon className="w-4 h-4" /> {label}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    <div className="flex-1 min-w-0">{children}</div>
                </div>
            </div>
        </div>
    );
}
