"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, ShieldCheck, BadgeCheck, Loader2 } from "lucide-react";
import { getAdminUsers, setUserRole, setUserFlag } from "../../lib/database";
import { avatarFallback } from "../../lib/media";
import { useAuth } from "../../contexts/AuthContext";

export default function AdminUsersPage() {
    const { profile: currentAdmin } = useAuth();
    const [search, setSearch] = useState("");
    const [users, setUsers] = useState(null);
    const [busyId, setBusyId] = useState(null);

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
        setBusyId(user.id);
        const nextRole = user.role === "admin" ? "user" : "admin";
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

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Utilisateurs</h2>
            <p className="text-gray-500 text-sm mb-6">
                {users ? `${users.length} membre${users.length > 1 ? "s" : ""}` : " "}
            </p>

            <div className="relative mb-6 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Chercher un nom ou un pseudo…"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black outline-none"
                />
            </div>

            {users === null ? (
                <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
            ) : users.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Aucun résultat.</p>
            ) : (
                <div className="space-y-2">
                    {users.map((u) => (
                        <div key={u.id} className="flex items-center gap-4 p-3 border border-gray-100 rounded-xl">
                            <Image
                                src={u.avatar_url || avatarFallback(u.id)}
                                alt=""
                                width={40}
                                height={40}
                                unoptimized
                                className="w-10 h-10 rounded-full object-cover shrink-0 bg-gray-100"
                            />
                            <div className="min-w-0 flex-1">
                                <Link
                                    href={`/users/${u.username}`}
                                    target="_blank"
                                    className="font-semibold text-gray-900 hover:underline truncate block"
                                >
                                    {u.full_name || u.username}
                                </Link>
                                <p className="text-xs text-gray-500">@{u.username}</p>
                            </div>
                            <button
                                disabled={busyId === u.id}
                                onClick={() => toggleFlag(u, "is_verified")}
                                title="Contributeur vérifié"
                                className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                                    u.is_verified ? "text-blue-600 bg-blue-50" : "text-gray-300 hover:text-gray-500"
                                }`}
                            >
                                <BadgeCheck className="w-4 h-4" />
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
                                    u.role === "admin" ? "bg-black text-white" : "border border-gray-200 text-gray-600 hover:border-gray-400"
                                }`}
                            >
                                <ShieldCheck className="w-4 h-4" /> {u.role === "admin" ? "Admin" : "Rendre admin"}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
