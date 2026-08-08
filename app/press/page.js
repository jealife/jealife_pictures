import { Download, Mail } from "lucide-react";

export const metadata = {
    title: "Espace presse",
    description:
        "Contact presse et logos officiels de JEaLiFe Stock, la banque d'images libres de droits du Gabon et de l'Afrique.",
    alternates: { canonical: "/press" },
};

/**
 * Cette page annonçait un partenariat avec le « Ministère du Tourisme », le
 * lancement d'une API et un cap de 10 000 photos — trois annonces qui n'ont
 * jamais eu lieu — et proposait un « Kit Média » en .zip qui n'existait pas.
 * Ne restent que les deux logos réellement présents dans /public et un vrai
 * contact.
 */
export default function PressPage() {
    return (
        <div className="min-h-screen bg-white dark:bg-zinc-950 text-gray-900 dark:text-zinc-100 font-sans">

            {/* Header */}
            <div className="bg-black text-white pt-32 pb-24 px-6">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8">Espace Presse</h1>
                    <p className="text-xl md:text-2xl text-gray-400 max-w-2xl leading-relaxed">
                        Ressources officielles et contact pour les journalistes, blogueurs et partenaires médias.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 -mt-12 relative z-10">
                <div className="grid md:grid-cols-3 gap-8">

                    {/* Contact Card */}
                    <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-zinc-800 col-span-1 md:col-span-1">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <Mail className="w-5 h-5" /> Contact Presse
                        </h3>
                        <div className="space-y-4">
                            <p className="text-gray-600 dark:text-zinc-400 text-sm">
                                Pour les demandes d&apos;interviews, de commentaires ou d&apos;informations spécifiques.
                            </p>
                            <a href="mailto:jealife.pictures@gmail.com" className="block w-full py-3 px-4 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-center font-bold hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-all text-sm">
                                jealife.pictures@gmail.com
                            </a>
                        </div>
                    </div>

                    {/* Brand Assets Card — les deux fichiers existent vraiment dans /public */}
                    <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-zinc-800 md:col-span-2 flex flex-col justify-center">
                        <h3 className="text-2xl font-bold mb-2">Logos officiels</h3>
                        <p className="text-gray-600 dark:text-zinc-400 mb-6 max-w-md">
                            Les deux versions du logo JEaLiFe Stock, en PNG haute résolution avec fond transparent.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <a
                                href="/JEaLiFe-Stock-Logo-transparent-noir.png"
                                download
                                className="flex items-center gap-2 bg-black text-white px-5 py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors text-sm"
                            >
                                <Download className="w-4 h-4" /> Logo noir (.png)
                            </a>
                            <a
                                href="/JEaLiFe-Stock-Logo-transparent-blanc.png"
                                download
                                className="flex items-center gap-2 bg-gray-900 text-white px-5 py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors text-sm border border-gray-700"
                            >
                                <Download className="w-4 h-4" /> Logo blanc (.png)
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* Newsroom */}
            <div className="max-w-7xl mx-auto px-6 py-24">
                <h2 className="text-3xl font-bold mb-6 border-b border-gray-200 dark:border-zinc-800 pb-4">Dernières Annonces</h2>
                <p className="text-gray-500 dark:text-zinc-400">
                    Rien à annoncer pour l&apos;instant. Revenez bientôt, ou écrivez-nous si vous
                    préparez un article et avez besoin d&apos;informations.
                </p>
            </div>

        </div>
    );
}
