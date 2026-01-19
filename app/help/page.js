
"use client";

import { Search, HelpCircle, FileText, MessageCircle } from "lucide-react";

export default function HelpPage() {
    return (
        <div className="min-h-screen bg-gray-50">

            {/* Search Header */}
            <div className="bg-black text-white py-20 px-6 text-center">
                <h1 className="text-3xl md:text-5xl font-bold mb-6">Comment pouvons-nous vous aider ?</h1>
                <div className="max-w-xl mx-auto relative">
                    <Search className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Rechercher dans l'aide..."
                        className="w-full h-12 pl-12 pr-4 rounded-lg text-gray-900 focus:outline-none"
                    />
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 py-16">
                <div className="grid md:grid-cols-3 gap-8">
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-6">
                            <HelpCircle className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">FAQ Générale</h3>
                        <p className="text-gray-500 text-sm">Réponses aux questions les plus fréquentes sur l'utilisation du site.</p>
                    </div>
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
                        <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600 mb-6">
                            <FileText className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Licence & Droits</h3>
                        <p className="text-gray-500 text-sm">Comprendre ce que vous pouvez et ne pouvez pas faire avec les images.</p>
                    </div>
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
                        <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 mb-6">
                            <MessageCircle className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Pour les Créateurs</h3>
                        <p className="text-gray-500 text-sm">Guides pour uploader, gérer votre profil et gagner en visibilité.</p>
                    </div>
                </div>

                <div className="mt-16">
                    <h2 className="text-2xl font-bold mb-6">Articles populaires</h2>
                    <ul className="space-y-4">
                        {['Comment télécharger une photo en haute résolution ?', 'Puis-je utiliser les photos pour un projet commercial ?', 'Comment devenir contributeur ?', 'Mot de passe oublié ou compte bloqué'].map((article, i) => (
                            <li key={i}>
                                <a href="#" className="flex items-center text-gray-700 hover:text-blue-600 font-medium group">
                                    <span className="w-1.5 h-1.5 bg-gray-300 rounded-full mr-3 group-hover:bg-blue-600 transition-colors"></span>
                                    {article}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
