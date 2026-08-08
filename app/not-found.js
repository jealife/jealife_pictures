import Link from "next/link";
import { SearchX } from "lucide-react";

export const metadata = { title: "Page introuvable" };

export default function NotFound() {
    return (
        <main className="min-h-[70vh] flex flex-col items-center justify-center bg-white dark:bg-zinc-950 text-center px-6">
            <div className="w-20 h-20 bg-gray-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-6">
                <SearchX className="w-8 h-8 text-gray-300 dark:text-zinc-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-zinc-100 mb-3">Page introuvable</h1>
            <p className="text-gray-500 dark:text-zinc-400 max-w-md mb-8">
                Cette adresse ne mène nulle part. Elle a peut-être changé, ou le
                contenu a été retiré par son auteur.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
                <Link
                    href="/"
                    className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold hover:bg-gray-800 dark:hover:bg-zinc-200 transition-colors"
                >
                    Retour à l&apos;accueil
                </Link>
                <Link
                    href="/themes"
                    className="px-6 py-3 border border-gray-200 dark:border-zinc-700 rounded-xl font-bold text-gray-600 dark:text-zinc-400 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white transition-colors"
                >
                    Parcourir les thèmes
                </Link>
            </div>
        </main>
    );
}
