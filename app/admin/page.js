"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldAlert, Flag, Users, Loader2 } from "lucide-react";
import { getAdminOverview } from "../lib/database";

export default function AdminDashboard() {
    const [stats, setStats] = useState(null);

    useEffect(() => {
        getAdminOverview().then(setStats);
    }, []);

    if (!stats) {
        return <Loader2 className="w-6 h-6 animate-spin text-gray-300 dark:text-zinc-600" />;
    }

    const cards = [
        { label: "En attente de publication", value: stats.pendingCount, href: "/admin/moderation", icon: ShieldAlert },
        { label: "Signalements ouverts", value: stats.reportedCount, href: "/admin/moderation", icon: Flag },
        { label: "Membres", value: stats.usersCount, href: "/admin/users", icon: Users },
    ];

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 mb-2">Vue d&apos;ensemble</h2>
            <p className="text-gray-500 dark:text-zinc-400 text-sm mb-10">
                Mode de modération actuel :{" "}
                <strong className="text-gray-900 dark:text-zinc-100">
                    {stats.moderationMode === "manual" ? "Manuel" : "Automatique"}
                </strong>
                . <Link href="/admin/settings" className="underline hover:text-black dark:hover:text-white">Modifier</Link>
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {cards.map(({ label, value, href, icon: Icon }) => (
                    <Link
                        key={label}
                        href={href}
                        className="p-6 border border-gray-100 dark:border-zinc-800 rounded-2xl hover:border-gray-300 dark:hover:border-zinc-600 transition-colors"
                    >
                        <Icon className="w-5 h-5 text-gray-400 dark:text-zinc-500 mb-4" />
                        <p className="text-3xl font-extrabold text-gray-900 dark:text-zinc-100">{value}</p>
                        <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">{label}</p>
                    </Link>
                ))}
            </div>
        </div>
    );
}
