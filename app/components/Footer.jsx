"use client";

import Link from "next/link";
import { Facebook, Twitter, Instagram, Linkedin, Globe, Camera } from "lucide-react";

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-white border-t border-gray-100 pt-16 pb-8">
            <div className="max-w-[1600px] mx-auto px-4 md:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
                    {/* Brand Section */}
                    <div className="space-y-4">
                        <Link href="/" className="flex items-center gap-2 group">
                            <div className="bg-black text-white p-1.5 rounded-lg group-hover:scale-110 transition-transform">
                                <Camera className="w-5 h-5" />
                            </div>
                            <span className="font-bold text-xl tracking-tight">JEaLiFe Pictures</span>
                        </Link>
                        <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
                            La source d'images internet. Propulsée par des créateurs du Gabon et d'ailleurs.
                            Partagez et découvrez des ressources libres de droits.
                        </p>
                        <div className="flex items-center gap-4 pt-2">
                            <a href="#" className="p-2 bg-gray-50 rounded-full text-gray-500 hover:bg-black hover:text-white transition-all transform hover:-translate-y-1">
                                <Facebook className="w-4 h-4" />
                            </a>
                            <a href="#" className="p-2 bg-gray-50 rounded-full text-gray-500 hover:bg-black hover:text-white transition-all transform hover:-translate-y-1">
                                <Twitter className="w-4 h-4" />
                            </a>
                            <a href="#" className="p-2 bg-gray-50 rounded-full text-gray-500 hover:bg-black hover:text-white transition-all transform hover:-translate-y-1">
                                <Instagram className="w-4 h-4" />
                            </a>
                            <a href="#" className="p-2 bg-gray-50 rounded-full text-gray-500 hover:bg-black hover:text-white transition-all transform hover:-translate-y-1">
                                <Linkedin className="w-4 h-4" />
                            </a>
                        </div>
                    </div>

                    {/* Links Columns */}
                    <div>
                        <h3 className="font-bold text-gray-900 mb-6">Découvrir</h3>
                        <ul className="space-y-3">
                            <li><Link href="/" className="text-gray-500 hover:text-green-600 transition-colors text-sm font-medium">Choix de la rédaction</Link></li>
                            <li><Link href="/" className="text-gray-500 hover:text-green-600 transition-colors text-sm font-medium">Collections populaires</Link></li>
                            <li><Link href="/" className="text-gray-500 hover:text-green-600 transition-colors text-sm font-medium">Photos populaires</Link></li>
                            <li><Link href="/" className="text-gray-500 hover:text-green-600 transition-colors text-sm font-medium">Recherches fréquentes</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-bold text-gray-900 mb-6">Communauté</h3>
                        <ul className="space-y-3">
                            <li><Link href="/" className="text-gray-500 hover:text-green-600 transition-colors text-sm font-medium">Devenir contributeur</Link></li>
                            <li><Link href="/join" className="text-gray-500 hover:text-green-600 transition-colors text-sm font-medium">S'inscrire</Link></li>
                            <li><Link href="/login" className="text-gray-500 hover:text-green-600 transition-colors text-sm font-medium">Connexion</Link></li>
                            <li><Link href="/" className="text-gray-500 hover:text-green-600 transition-colors text-sm font-medium">Forum</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-bold text-gray-900 mb-6">À propos</h3>
                        <ul className="space-y-3">
                            <li><Link href="/" className="text-gray-500 hover:text-green-600 transition-colors text-sm font-medium">À propos de nous</Link></li>
                            <li><Link href="/" className="text-gray-500 hover:text-green-600 transition-colors text-sm font-medium">FAQ</Link></li>
                            <li><Link href="/" className="text-gray-500 hover:text-green-600 transition-colors text-sm font-medium">Conditions d'utilisation</Link></li>
                            <li><Link href="/" className="text-gray-500 hover:text-green-600 transition-colors text-sm font-medium">Politique de confidentialité</Link></li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-gray-400">
                        © {currentYear} JEaLiFe Pictures. Tous droits réservés.
                    </p>
                    <div className="flex items-center gap-6">
                        <button className="flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-black transition-colors">
                            <Globe className="w-3 h-3" />
                            Français
                        </button>
                    </div>
                </div>
            </div>
        </footer>
    );
}
