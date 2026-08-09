"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, ShieldCheck, BadgeCheck, Ban, Trash2, Loader2 } from "lucide-react";
import { getAdminUsers, setUserRole, setUserFlag } from "../../lib/database";
import { avatarFallback } from "../../lib/media";
import { useAuth } from "../../contexts/AuthContext";
import DeleteAccountDialog from "../../components/DeleteAccountDialog";

export default function AdminUsersPage() {
    const { profile: currentAdmin } = useAuth();
    const [search, setSearch] = useState("");
    const [users, setUsers] = useState(null);
    const [busyId, setBusyId] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const load = useCallback((term = "") => {
        getAdminUsers({ search: term, limit: 100 }).then(setUsers);
    }, []);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        const timer = setTimeout(() => load(search), 300);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const toggleRole = async (user) => {
        const nextRole = user.role === "admin" ? "user" : "admin";
        const confirmed = window.confirm(
            nextRole === "admin"
                ? `Donner les droits admin à @${user.username} ?`
                : `Retirer les droits admin de @${user.username} ?`
        );
        if (!confirmed) return;

        setBusyId(user.id);
        await setUserRole(user.id, nextRole);
        setBusyId(null);
        load(search);
    };

    const toggleFlag = async (user, field) => {
        setBusyId(user.id);
        await setUserFlag(user.id, field, !user[field]);
        setBusyId(null);
        load(search);
    };

    // Coupe les nouvelles publications (voir migration 0011) sans supprimer
    // le compte ni son historique — pas de blocage de connexion.
    const toggleSuspend = async (user) => {
        const nextValue = !user.is_suspended;
        const confirmed = window.confirm(
            nextValue
                ? `Suspendre @${user.username} ? Ce compte ne pourra plus publier tant qu'il n'est pas réactivé.`
                : `Réactiver @${user.username} ?`
        );
        if (!confirmed) return;

        setBusyId(user.id);
        await setUserFlag(user.id, "is_suspended", nextValue);
        setBusyId(null);
        load(search);
    };

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 mb-1">Utilisateurs</h2>
            <p className="text-gray-500 dark:text-zinc-400 text-sm mb-6">
                {users ? `${users.length} membre${users.length > 1 ? "s" : ""}` : " "}
            </p>

            <div className="relative mb-6 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-zinc-500" />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Chercher un nom ou un pseudo…"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 rounded-xl text-sm focus:ring-2 focus:ring-black dark:focus:ring-white outline-none"
                />
            </div>

            {users === null ? (
                <Loader2 className="w-6 h-6 animate-spin text-gray-300 dark:text-zinc-600" />
            ) : users.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-zinc-500 italic">Aucun résultat.</p>
            ) : (
                <div className="space-y-2">
                    {users.map((u) => (
                        <div
                            key={u.id}
                            className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 p-3 border border-gray-100 dark:border-zinc-800 rounded-xl"
                        >
                            <div className="flex items-center gap-4 min-w-0 flex-1">
                                <Image
                                    src={u.avatar_url || avatarFallback(u.id)}
                                    alt=""
                                    width={40}
                                    height={40}
                                    unoptimized
                                    className="w-10 h-10 rounded-full object-cover shrink-0 bg-gray-100 dark:bg-zinc-800"
                                />
                                <div className="min-w-0 flex-1">
                                    <Link
                                        href={`/@${u.username}`}
                                        target="_blank"
                                        className="font-semibold text-gray-900 dark:text-zinc-100 hover:underline truncate block"
                                    >
                                        {u.full_name || u.username}
                                        {u.is_suspended && (
                                            <span className="ml-2 align-middle text-[10px] font-bold uppercase tracking-wide text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 px-1.5 py-0.5 rounded">
                                                Suspendu
                                            </span>
                                        )}
                                    </Link>
                                    <p className="text-xs text-gray-500 dark:text-zinc-400">@{u.username}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap sm:shrink-0">
                            <button
                                disabled={busyId === u.id}
                                onClick={() => toggleFlag(u, "is_verified")}
                                title="Contributeur vérifié"
                                className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                                    u.is_verified ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950" : "text-gray-300 dark:text-zinc-600 hover:text-gray-500 dark:hover:text-zinc-400"
                                }`}
                            >
                                <BadgeCheck className="w-4 h-4" />
                            </button>
                            <button
                                disabled={busyId === u.id || u.id === currentAdmin?.id}
                                onClick={() => toggleSuspend(u)}
                                title={
                                    u.id === currentAdmin?.id
                                        ? "Impossible de vous suspendre vous-même"
                                        : u.is_suspended ? "Réactiver ce compte" : "Suspendre ce compte"
                                }
                                className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                                    u.is_suspended ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950" : "text-gray-300 dark:text-zinc-600 hover:text-gray-500 dark:hover:text-zinc-400"
                                }`}
                            >
                                <Ban className="w-4 h-4" />
                            </button>
                            <button
                                disabled={busyId === u.id || u.id === currentAdmin?.id}
                                onClick={() => toggleRole(u)}
                                title={
                                    u.id === currentAdmin?.id
                                        ? "Impossible de retirer vos propres droits ici"
                                        : u.role === "admin" ? "Retirer les droits admin" : "Nommer administrateur"
                                }
                                className={`px-3 py-2 text-xs font-bold rounded-lg transition-colors disabled:opacity-40 flex items-center gap-1.5 ${
                                    u.role === "admin" ? "bg-black dark:bg-white text-white dark:text-black" : "border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 hover:border-gray-400 dark:hover:border-zinc-500"
                                }`}
                            >
                                <ShieldCheck className="w-4 h-4" /> {u.role === "admin" ? "Admin" : "Rendre admin"}
                            </button>
                            <button
                                disabled={busyId === u.id || u.id === currentAdmin?.id || u.role === "admin"}
                                onClick={() => setDeleteTarget(u)}
                                title={
                                    u.id === currentAdmin?.id
                                        ? "Impossible de supprimer votre propre compte ici"
                                        : u.role === "admin"
                                        ? "Retirez d'abord les droits admin avant de supprimer ce compte"
                                        : "Supprimer définitivement ce compte"
                                }
                                className="p-2 rounded-lg text-gray-300 dark:text-zinc-600 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-300 dark:disabled:hover:text-zinc-600"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {deleteTarget && (
                <DeleteAccountDialog
                    user={deleteTarget}
                    onClose={() => setDeleteTarget(null)}
                    onDeleted={() => {
                        setDeleteTarget(null);
                        load(search);
                    }}
                />
            )}
        </div>
    );
}
