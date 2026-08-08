import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import MasonryGrid from "../../components/MasonryGrid";
import GridFallback from "../../components/GridFallback";
import { getCountryBySlug, getMedia, countMedia, PAGE_SIZE } from "../../lib/database";

export const revalidate = 300;

export async function generateMetadata({ params }) {
    const { slug } = await params;
    const country = await getCountryBySlug(slug);

    if (!country) return { title: "Pays introuvable" };

    // Une page sans la moindre photo reste utile pour le visiteur (elle invite
    // à publier la première), mais n'a rien à faire indexée : Google traite
    // les pages quasi vides comme un signal de mauvaise qualité pour tout le
    // site, pas seulement pour cette page.
    const hasMedia = (await countMedia({ type: "photo", country: country.code })) > 0;

    return {
        title: `Images du ${country.name_fr}`,
        description: `Photos libres de droits prises au ${country.name_fr}. Téléchargement gratuit sur JEaLiFe Stock.`,
        alternates: { canonical: `/pays/${country.slug}` },
        ...(hasMedia ? {} : { robots: { index: false, follow: true } }),
    };
}

/**
 * Page par pays : une adresse propre et référençable pour chaque lieu, là où
 * le site ne savait auparavant faire qu'une recherche texte sur un champ
 * `location` libre.
 */
export default async function CountryPage({ params }) {
    const { slug } = await params;
    const country = await getCountryBySlug(slug);

    if (!country) notFound();

    const initialItems = await getMedia({ type: "photo", limit: PAGE_SIZE, country: country.code });

    return (
        <main className="min-h-screen bg-white dark:bg-zinc-950">
            <header className="max-w-[1600px] mx-auto px-4 pt-12 pb-6">
                <Link href="/pays" className="text-sm font-medium text-gray-400 dark:text-zinc-500 hover:text-black dark:hover:text-white transition-colors">
                    ← Tous les pays
                </Link>
                <h1 className="text-4xl font-extrabold text-gray-900 dark:text-zinc-100 mt-4">
                    {country.name_fr}
                </h1>
                <p className="text-gray-500 dark:text-zinc-400 mt-2">
                    Images libres de droits prises au {country.name_fr}.
                </p>
            </header>

            <Suspense fallback={<GridFallback />}>
                <MasonryGrid
                    country={country.code}
                    initialItems={initialItems}
                    emptyMessage={`Aucune image du ${country.name_fr} pour l'instant. Publiez la première.`}
                />
            </Suspense>
        </main>
    );
}
