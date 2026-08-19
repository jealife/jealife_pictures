import Link from "next/link";
import { Check, X, AlertTriangle } from "lucide-react";

export const metadata = {
    title: "Licences JEaLiFe",
    description:
        "Ce que vous pouvez faire, et ne pas faire, avec les images téléchargées sur JEaLiFe Stock. Usage gratuit et premium.",
    alternates: { canonical: "/licence" },
};

const ALLOWED = [
    "Utiliser les images gratuitement, y compris à des fins commerciales.",
    "Les modifier, recadrer, retoucher, intégrer à vos créations.",
    "Les publier sur vos sites, réseaux sociaux, supports imprimés, publicités.",
    "Les utiliser sans demander d'autorisation préalable ni citer la source.",
];

const FORBIDDEN = [
    "Revendre ou redistribuer les images telles quelles, ou quasiment inchangées.",
    "Créer un service concurrent proposant les mêmes images en téléchargement.",
    "Utiliser les images d'une manière qui porte atteinte aux personnes représentées, notamment de façon diffamatoire, pornographique ou discriminatoire.",
    "Laisser entendre que le photographe ou JEaLiFe Stock soutient votre produit, votre parti ou votre cause.",
];

/**
 * Page de licence.
 *
 * Elle était citée dans le formulaire de publication (« vous acceptez la
 * Licence JEaLiFe ») et dans le pied de page, mais n'existait nulle part :
 * aucun utilisateur professionnel ne pouvait vérifier ses droits avant de
 * télécharger, et aucun photographe ne savait ce qu'il cédait en publiant.
 */
export default function LicensePage() {
    return (
        <main className="min-h-screen bg-white dark:bg-zinc-950">
            <div className="max-w-3xl mx-auto px-4 py-16 md:py-24">
                <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-zinc-100 mb-4">
                    Licences JEaLiFe
                </h1>
                <p className="text-lg text-gray-500 dark:text-zinc-400 mb-12">
                    JEaLiFe Stock propose des images gratuites ainsi que des images Premium.
                    Voici précisément les conditions d&apos;utilisation pour chaque type de contenu.
                </p>

                <section className="mb-12" id="gratuit">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 mb-5">Licence Gratuite</h2>
                    <p className="text-gray-600 dark:text-zinc-400 mb-4 leading-relaxed">
                        Pour toutes les images marquées comme gratuites, vous pouvez :
                    </p>
                    <ul className="space-y-3 mb-6">
                        {ALLOWED.map((item) => (
                            <li key={item} className="flex gap-3 text-gray-700 dark:text-zinc-300 leading-relaxed">
                                <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                    <p className="text-gray-600 dark:text-zinc-400 mb-4 leading-relaxed">
                        Toutefois, les restrictions suivantes s&apos;appliquent :
                    </p>
                    <ul className="space-y-3">
                        {FORBIDDEN.map((item) => (
                            <li key={item} className="flex gap-3 text-gray-700 dark:text-zinc-300 leading-relaxed">
                                <X className="w-5 h-5 text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="mb-12" id="premium">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 mb-5">Licence Premium</h2>
                    <p className="text-gray-600 dark:text-zinc-400 mb-4 leading-relaxed">
                        Les images Premium nécessitent l&apos;achat de crédits pour être téléchargées. Une fois acquises, vous pouvez :
                    </p>
                    <ul className="space-y-3 mb-6">
                        <li className="flex gap-3 text-gray-700 dark:text-zinc-300 leading-relaxed">
                            <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                            <span>Utiliser l&apos;image pour des projets personnels ou commerciaux à vie, sans limite de temps ni de zone géographique.</span>
                        </li>
                        <li className="flex gap-3 text-gray-700 dark:text-zinc-300 leading-relaxed">
                            <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                            <span>Bénéficier de l&apos;image en haute résolution originale, sans aucun filigrane.</span>
                        </li>
                        <li className="flex gap-3 text-gray-700 dark:text-zinc-300 leading-relaxed">
                            <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                            <span>Les modifier, recadrer, retoucher ou intégrer à vos créations.</span>
                        </li>
                    </ul>
                    <p className="text-gray-600 dark:text-zinc-400 mb-4 leading-relaxed">
                        Toutefois, les restrictions suivantes s&apos;appliquent :
                    </p>
                    <ul className="space-y-3">
                        <li className="flex gap-3 text-gray-700 dark:text-zinc-300 leading-relaxed">
                            <X className="w-5 h-5 text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
                            <span>Revendre, sous-licencier ou redistribuer le fichier image d&apos;origine tel quel.</span>
                        </li>
                        <li className="flex gap-3 text-gray-700 dark:text-zinc-300 leading-relaxed">
                            <X className="w-5 h-5 text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
                            <span>Revendiquer la propriété intellectuelle ou les droits d&apos;auteur de l&apos;image.</span>
                        </li>
                    </ul>
                </section>

                <section className="mb-12 p-6 bg-amber-50 dark:bg-amber-950 border border-amber-100 dark:border-amber-900 rounded-2xl">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-amber-900 dark:text-amber-400 mb-3">
                        <AlertTriangle className="w-5 h-5" aria-hidden="true" />
                        Ce que la licence ne couvre pas
                    </h2>
                    <p className="text-sm text-amber-900/90 dark:text-amber-400/90 leading-relaxed">
                        La licence porte sur les droits d&apos;auteur du photographe, et sur eux
                        seuls. Elle ne remplace pas les autorisations nécessaires pour les
                        personnes reconnaissables, les marques, les œuvres d&apos;art, les logos
                        ou certains lieux privés. Si votre usage est commercial et qu&apos;une
                        personne est identifiable sur l&apos;image, il vous revient de vérifier
                        qu&apos;une autorisation existe.
                    </p>
                </section>

                <section className="mb-12">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-100 mb-5">
                        Pour les photographes
                    </h2>
                    <div className="space-y-4 text-gray-700 dark:text-zinc-300 leading-relaxed">
                        <p>
                            <strong className="text-gray-900 dark:text-zinc-100">Vous restez propriétaire de vos images.</strong>{" "}
                            En publiant sur JEaLiFe Stock, vous accordez aux utilisateurs
                            du site la licence décrite ci-dessus. Vous ne cédez aucun droit
                            d&apos;auteur et vous restez libre de diffuser vos images ailleurs.
                        </p>
                        <p>
                            <strong className="text-gray-900 dark:text-zinc-100">Vous pouvez retirer une image à tout moment.</strong>{" "}
                            La suppression met fin à sa diffusion sur le site. Elle ne peut en
                            revanche pas révoquer les usages déjà engagés de bonne foi par des
                            personnes ayant téléchargé l&apos;image avant son retrait.
                        </p>
                        <p>
                            <strong className="text-gray-900 dark:text-zinc-100">Ne publiez que ce qui vous appartient.</strong>{" "}
                            Publier l&apos;image d&apos;un tiers sans son accord vous expose personnellement.
                            Tout contenu signalé comme litigieux est retiré le temps de la vérification.
                        </p>
                    </div>
                </section>

                <section className="mb-12">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-100 mb-5">Créditer, si vous le souhaitez</h2>
                    <p className="text-gray-700 dark:text-zinc-300 leading-relaxed mb-4">
                        Le crédit n&apos;est pas obligatoire. Il reste la meilleure façon de faire
                        connaître un photographe qui partage son travail gratuitement.
                    </p>
                    <pre className="p-4 bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-xl text-sm text-gray-600 dark:text-zinc-400 overflow-x-auto">
Photo : [nom du photographe] sur JEaLiFe Stock
                    </pre>
                </section>

                <p className="text-xs text-gray-400 dark:text-zinc-500 leading-relaxed border-t border-gray-100 dark:border-zinc-800 pt-8">
                    Ce texte décrit les conditions d&apos;utilisation en langage clair. Avant
                    l&apos;ouverture au public, faites-le relire par un juriste afin qu&apos;il soit
                    conforme au droit applicable chez vous et aux textes de l&apos;OAPI en
                    matière de droit d&apos;auteur.{" "}
                    <Link href="/help" className="underline hover:text-gray-600 dark:hover:text-zinc-300">
                        Une question ? Écrivez-nous.
                    </Link>
                </p>
            </div>
        </main>
    );
}
