
"use client";

import { Download, Mail, ArrowUpRight, Copy } from "lucide-react";

export default function PressPage() {
    return (
        <div className="min-h-screen bg-white text-gray-900 font-sans">

            {/* Header */}
            <div className="bg-black text-white pt-32 pb-24 px-6">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8">Espace Presse</h1>
                    <p className="text-xl md:text-2xl text-gray-400 max-w-2xl leading-relaxed">
                        Ressources officielles, actualités et contacts pour les journalistes, blogueurs et partenaires médias.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 -mt-12 relative z-10">
                <div className="grid md:grid-cols-3 gap-8">

                    {/* Contact Card */}
                    <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 col-span-1 md:col-span-1">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <Mail className="w-5 h-5" /> Contact Presse
                        </h3>
                        <div className="space-y-4">
                            <p className="text-gray-600 text-sm">
                                Pour les demandes d&apos;interviews, de commentaires ou d&apos;informations spécifiques.
                            </p>
                            <a href="mailto:press@jealife.com" className="block w-full py-3 px-4 bg-gray-50 border border-gray-200 rounded-lg text-center font-bold hover:bg-black hover:text-white transition-all text-sm">
                                press@jealife.com
                            </a>
                            <p className="text-xs text-gray-400 text-center">
                                Nous répondons généralement sous 24h.
                            </p>
                        </div>
                    </div>

                    {/* Brand Assets Card */}
                    <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 md:col-span-2 flex flex-col justify-center">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                            <div>
                                <h3 className="text-2xl font-bold mb-2">Kit Média Officiel</h3>
                                <p className="text-gray-600 mb-6 max-w-md">
                                    Téléchargez nos logos officiels (SVG, PNG), nos directives de marque et des photos haute résolution de l&apos;équipe et des bureaux.
                                </p>
                                <div className="flex flex-wrap gap-3">
                                    <span className="px-3 py-1 bg-gray-100 rounded text-xs font-bold text-gray-600">JEaLiFe Logos</span>
                                    <span className="px-3 py-1 bg-gray-100 rounded text-xs font-bold text-gray-600">Brand Guidelines</span>
                                    <span className="px-3 py-1 bg-gray-100 rounded text-xs font-bold text-gray-600">B-Roll</span>
                                </div>
                            </div>
                            <button className="flex items-center gap-2 bg-black text-white px-6 py-4 rounded-xl font-bold hover:bg-gray-800 transition-colors shadow-lg hover:shadow-xl active:scale-95 shrink-0">
                                <Download className="w-5 h-5" /> Télécharger le Kit (.zip)
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Newsroom */}
            <div className="max-w-7xl mx-auto px-6 py-24">
                <h2 className="text-3xl font-bold mb-12 border-b border-gray-200 pb-4">Dernières Annonces</h2>

                <div className="grid gap-12">
                    {[
                        {
                            date: "12 Janvier 2026",
                            category: "Célébration",
                            title: "JEaLiFe Stock dépasse les 10,000 photos gratuites",
                            snippet: "Une étape symbolique qui marque la maturité de notre catalogue.",
                            link: "#"
                        },
                        {
                            date: "15 Novembre 2025",
                            category: "Produit",
                            title: "Lancement de l'API JEaLiFe pour les développeurs",
                            snippet: "Les créateurs d'applications peuvent désormais intégrer directement notre bibliothèque visuelle dans leurs outils.",
                            link: "#"
                        },
                        {
                            date: "02 Septembre 2025",
                            category: "Partenariat",
                            title: "JEaLiFe s'associe au Ministère du Tourisme",
                            snippet: "Une alliance stratégique autour d'une imagerie authentique et moderne.",
                            link: "#"
                        }
                    ].map((news, idx) => (
                        <div key={idx} className="group cursor-pointer">
                            <div className="flex flex-col md:flex-row gap-6 md:gap-12 items-start">
                                <div className="w-48 shrink-0 pt-1">
                                    <span className="block text-sm font-bold text-gray-400 uppercase tracking-wider">{news.date}</span>
                                    <span className="inline-block mt-2 px-2 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded uppercase">{news.category}</span>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-2xl md:text-3xl font-bold mb-3 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                                        {news.title}
                                        <ArrowUpRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </h3>
                                    <p className="text-gray-600 text-lg leading-relaxed max-w-3xl">
                                        {news.snippet}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}
