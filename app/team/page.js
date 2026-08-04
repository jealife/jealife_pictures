import { Mail } from "lucide-react";

export const metadata = {
    title: "L'équipe",
    description:
        "JEaLiFe Stock est porté par une petite équipe qui construit une banque d'images pour le Gabon et l'Afrique.",
    alternates: { canonical: "/team" },
};

/**
 * Cette page listait quatre postes ("Senior Frontend Engineer", "Backend
 * Developer"…) qui n'ont jamais existé — aucun recrutement n'est en cours.
 * Mieux vaut le dire franchement que de faire miroiter des embauches
 * fictives à qui postulerait.
 */
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
                    Chez JEaLiFe, nous ne construisons pas seulement une banque d&apos;images. Nous construisons une communauté qui célèbre la culture, la créativité et le partage.
                </p>
            </div>

            {/* Image Grid */}
            <div className="w-full overflow-hidden mb-24">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4">
                    <div className="space-y-4 translate-y-8">
                        <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=600" className="rounded-xl w-full h-64 object-cover" alt="" />
                        <img src="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=600" className="rounded-xl w-full h-80 object-cover" alt="" />
                    </div>
                    <div className="space-y-4">
                        <img src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=600" className="rounded-xl w-full h-80 object-cover" alt="" />
                        <img src="https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=600" className="rounded-xl w-full h-64 object-cover" alt="" />
                    </div>
                    <div className="space-y-4 translate-y-12">
                        <img src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=600" className="rounded-xl w-full h-64 object-cover" alt="" />
                        <img src="https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=600" className="rounded-xl w-full h-80 object-cover" alt="" />
                    </div>
                    <div className="space-y-4 translate-y-4">
                        <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=600" className="rounded-xl w-full h-80 object-cover" alt="" />
                        <img src="https://images.unsplash.com/photo-1531545514256-b1400bc00f31?q=80&w=600" className="rounded-xl w-full h-64 object-cover" alt="" />
                    </div>
                </div>
            </div>

            {/* Values */}
            <div className="max-w-7xl mx-auto px-6 py-24 border-t border-gray-100">
                <h2 className="text-3xl font-bold mb-16">Ce qui nous porte</h2>
                <div className="grid md:grid-cols-3 gap-12">
                    <div>
                        <h3 className="text-xl font-bold mb-4">Remote First</h3>
                        <p className="text-gray-600">
                            Nous travaillons de partout. Nous valorisons les résultats, pas les heures de présence.
                        </p>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold mb-4">Impact Culturel</h3>
                        <p className="text-gray-600">
                            Chaque ligne de code, chaque pixel contribue à faire exister de belles images.
                        </p>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold mb-4">Open &amp; Transparent</h3>
                        <p className="text-gray-600">
                            Nous partageons nos succès et nos échecs. Nous construisons en public et valorisons l&apos;honnêteté radicale.
                        </p>
                    </div>
                </div>
            </div>

            {/* Contact — pas de poste ouvert pour l'instant, mais on lit tout */}
            <div className="bg-gray-50 py-24">
                <div className="max-w-3xl mx-auto px-6 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">Aucun poste ouvert pour l&apos;instant</h2>
                    <p className="text-gray-500 mb-10 max-w-xl mx-auto">
                        JEaLiFe Stock est encore une petite équipe. Si vous voulez contribuer autrement
                        qu&apos;en publiant vos photos — développement, design, écriture — dites-nous-le,
                        on lit chaque message.
                    </p>
                    <a
                        href="mailto:jealife.pictures@gmail.com"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-black text-white rounded-full font-bold hover:bg-gray-800 transition-all"
                    >
                        <Mail className="w-5 h-5" /> Écrivez-nous
                    </a>
                </div>
            </div>

        </div>
    );
}
