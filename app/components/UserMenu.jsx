"use client";

import { useRouter } from "next/navigation";
import { BarChart3, Download, Settings, LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function UserMenu({ user, onSignOut, onClose }) {
    const router = useRouter();
    const { profile } = useAuth();
    const isAdmin = profile?.role === "admin";

    // Use profile from database if available, otherwise fallback to metadata
    const username = profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'user';
    const fullName = profile?.full_name || user?.user_metadata?.full_name || 'JEaLiFe Stock';
    const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`;

    const menuItems = [
        {
            label: 'Afficher le profil',
            href: `/@${username}`,
            icon: null,
            className: 'font-medium text-gray-600 hover:text-black'
        },
        {
            label: 'Statistiques',
            href: `/@${username}/stats`,
            icon: BarChart3,
            className: 'text-gray-600 hover:text-black'
        },
        {
            label: 'Historique téléchargements',
            href: `/@${username}/downloads`,
            icon: Download,
            className: 'text-gray-600 hover:text-black'
        },
        {
            label: 'Paramètres du compte',
            href: '/settings',
            icon: Settings,
            className: 'text-gray-600 hover:text-black'
        },
        ...(isAdmin ? [{
            label: 'Administration',
            href: '/admin',
            icon: ShieldCheck,
            className: 'text-gray-600 hover:text-black'
        }] : []),
    ];

    const handleNavigation = (href) => {
        onClose(); // Close menu
        router.push(href); // Navigate programmatically
    };

    return (
        <div className="py-2 w-full min-w-[280px]">
            {/* User Info Header */}
            <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-3 mb-2">
                    <img
                        src={avatarUrl}
                        alt={fullName}
                        className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 truncate">{fullName}</p>
                        <p className="text-sm text-gray-500 truncate">{user?.email}</p>
                    </div>
                </div>
            </div>

            {/* Menu Items */}
            <div className="py-2">
                {menuItems.map((item, index) => (
                    <button
                        key={index}
                        onClick={() => handleNavigation(item.href)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 text-left ${item.className}`}
                    >
                        {item.icon && <item.icon size={18} className="text-gray-400" />}
                        <span>{item.label}</span>
                    </button>
                ))}
            </div>

            {/* Submit Button */}
            <div className="px-4 py-2 border-t border-b border-gray-100">
                <button
                    onClick={() => handleNavigation('/submit')}
                    className="block w-full py-2.5 px-4 text-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors text-sm"
                >
                    Soumettre une image
                </button>
            </div>

            {/* Sign Out */}
            <div className="py-2">
                <button
                    onClick={() => {
                        onClose();
                        onSignOut();
                    }}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                >
                    <LogOut size={18} className="text-gray-400" />
                    <span>Déconnexion @{username}</span>
                </button>
            </div>
        </div>
    );
}
