
"use client";

import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";

export default function TeamPage() {
    return (
        <div className="min-h-screen bg-white text-gray-900 font-sans">

            {/* Hero Section */}
            <div className="max-w-7xl mx-auto px-6 py-24 md:py-32">
                <h1 className="text-5xl md:text-8xl font-bold tracking-tight mb-8">
                    Make something <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">meaningful.</span>
                </h1>
                <p className="text-xl md:text-2xl text-gray-600 max-w-3xl leading-relaxed">
                    Chez JEaLiFe, nous ne construisons pas seulement une banque d'images. Nous construisons une communauté qui célèbre la culture, la créativité et le partage.
                </p>
            </div>

            {/* Image Grid */}
            <div className="w-full overflow-hidden mb-24">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4">
                    <div className="space-y-4 translate-y-8">
                        <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=600" className="rounded-xl w-full h-64 object-cover" />
                        <img src="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=600" className="rounded-xl w-full h-80 object-cover" />
                    </div>
                    <div className="space-y-4">
                        <img src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=600" className="rounded-xl w-full h-80 object-cover" />
                        <img src="https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=600" className="rounded-xl w-full h-64 object-cover" />
                    </div>
                    <div className="space-y-4 translate-y-12">
                        <img src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=600" className="rounded-xl w-full h-64 object-cover" />
                        <img src="https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=600" className="rounded-xl w-full h-80 object-cover" />
                    </div>
                    <div className="space-y-4 translate-y-4">
                        <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=600" className="rounded-xl w-full h-80 object-cover" />
                        <img src="https://images.unsplash.com/photo-1531545514256-b1400bc00f31?q=80&w=600" className="rounded-xl w-full h-64 object-cover" />
                    </div>
                </div>
            </div>

            {/* Values */}
            <div className="max-w-7xl mx-auto px-6 py-24 border-t border-gray-100">
                <h2 className="text-3xl font-bold mb-16">Pourquoi nous rejoindre ?</h2>
                <div className="grid md:grid-cols-3 gap-12">
                    <div>
                        <h3 className="text-xl font-bold mb-4">Remote First</h3>
                        <p className="text-gray-600">
                            Nous travaillons de partout. Libreville, Paris, New York ou votre salon. Nous valorisons les résultats, pas les heures de présence.
                        </p>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold mb-4">Impact Culturel</h3>
                        <p className="text-gray-600">
                            Chaque ligne de code, chaque pixel contribue à changer la narration visuelle d'un continent.
                        </p>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold mb-4">Open & Transparent</h3>
                        <p className="text-gray-600">
                            Nous partageons nos succès et nos échecs. Nous construisons en public et valorisons l'honnêteté radicale.
                        </p>
                    </div>
                </div>
            </div>

            {/* Positions */}
            <div className="bg-gray-50 py-24">
                <div className="max-w-5xl mx-auto px-6">
                    <h2 className="text-4xl font-bold mb-4">Postes ouverts</h2>
                    <p className="text-gray-500 mb-12">Venez construire le futur avec nous.</p>

                    <div className="space-y-4">
                        {[
                            { role: 'Senior Frontend Engineer', team: 'Product', location: 'Remote' },
                            { role: 'Backend Developer (Node.js)', team: 'Engineering', location: 'Remote' },
                            { role: 'Product Designer', team: 'Design', location: 'Libreville / Remote' },
                            { role: 'Community Manager', team: 'Marketing', location: 'Dakar' }
                        ].map((job) => (
                            <div key={job.role} className="bg-white p-6 rounded-xl border border-gray-200 hover:border-black transition-all cursor-pointer group flex flex-col sm:flex-row items-start sm:items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{job.role}</h3>
                                    <div className="flex gap-3 mt-1 text-sm text-gray-500">
                                        <span>{job.team}</span>
                                        <span>•</span>
                                        <span>{job.location}</span>
                                    </div>
                                </div>
                                <span className="mt-4 sm:mt-0 font-bold text-sm bg-gray-100 px-4 py-2 rounded-lg group-hover:bg-black group-hover:text-white transition-colors">
                                    Postuler
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

        </div>
    );
}
