import Link from "next/link";
import Image from "next/image";

/**
 * Pied de page.
 *
 * Les quinze liens du pied de page pointaient tous vers « / », à trois
 * exceptions près. « Conditions d'utilisation », « Politique de
 * confidentialité », « FAQ », « Forum » et « Collections populaires »
 * renvoyaient tous à l'accueil. Ne restent que des destinations réelles.
 */
const SECTIONS = [
    {
        title: "Découvrir",
        links: [
            { label: "Photos", href: "/" },
            { label: "Illustrations", href: "/illustrations" },
            { label: "Vidéos", href: "/videos" },
            { label: "Thèmes", href: "/themes" },
            { label: "Collections", href: "/collections" },
            { label: "Parcourir par pays", href: "/pays" },
        ],
    },
    {
        title: "Communauté",
        links: [
            { label: "Publier une image", href: "/submit" },
            { label: "Créer un compte", href: "/join" },
            { label: "Se connecter", href: "/login" },
            { label: "Centre d'aide", href: "/help" },
        ],
    },
    {
        title: "À propos",
        links: [
            { label: "Qui sommes-nous ?", href: "/about" },
            { label: "Notre histoire", href: "/history" },
            { label: "L'équipe", href: "/team" },
            { label: "Presse", href: "/press" },
            { label: "Licence JEaLiFe", href: "/licence" },
        ],
    },
];

export default function Footer() {
    return (
        <footer className="bg-white border-t border-gray-100 pt-16 pb-8">
            <div className="max-w-[1600px] mx-auto px-4 md:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
                    <div className="space-y-4">
                        <Link href="/" className="flex items-center gap-2 group w-fit">
                            <Image
                                src="/JEaLiFe-Stock-Logo-transparent-noir.png"
                                alt="JEaLiFe Stock"
                                width={100}
                                height={40}
                                style={{ height: "auto" }}
                                className="w-[50px] object-contain group-hover:scale-105 transition-transform"
                            />
                        </Link>
                        <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
                            Banque d&apos;images libres de droits et gratuites. Une sélection
                            soignée, où l&apos;on trouve de belles images du continent.
                        </p>
                    </div>

                    {SECTIONS.map((section) => (
                        <nav key={section.title} aria-label={section.title}>
                            <h2 className="font-bold text-gray-900 mb-6">{section.title}</h2>
                            <ul className="space-y-3">
                                {section.links.map((link) => (
                                    <li key={link.href}>
                                        <Link
                                            href={link.href}
                                            className="text-gray-500 hover:text-emerald-700 transition-colors text-sm font-medium"
                                        >
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    ))}
                </div>

                <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-gray-400">
                        © {new Date().getFullYear()} JEaLiFe Stock. Les images
                        appartiennent à leurs auteurs.
                    </p>
                    <Link href="/licence" className="text-xs font-semibold text-gray-500 hover:text-black transition-colors">
                        Licence & conditions d&apos;utilisation
                    </Link>
                </div>
            </div>
        </footer>
    );
}
