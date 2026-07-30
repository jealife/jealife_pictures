import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import MasonryGrid from "../../components/MasonryGrid";
import GridFallback from "../../components/GridFallback";
import { getCountryBySlug } from "../../lib/database";

export const revalidate = 300;

export async function generateMetadata({ params }) {
    const { slug } = await params;
    const country = await getCountryBySlug(slug);

    if (!country) return { title: "Pays introuvable" };

    return {
        title: `Images du ${country.name_fr}`,
        description: `Photos libres de droits prises au ${country.name_fr}. Téléchargement gratuit sur JEaLiFe Stock.`,
        alternates: { canonical: `/pays/${country.slug}` },
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

    return (
        <main className="min-h-screen bg-white">
            <header className="max-w-[1600px] mx-auto px-4 pt-12 pb-6">
                <Link href="/pays" className="text-sm font-medium text-gray-400 hover:text-black transition-colors">
                    ← Tous les pays
                </Link>
                <h1 className="text-4xl font-extrabold text-gray-900 mt-4 flex items-center gap-3">
                    <span aria-hidden="true">{country.emoji}</span>
                    {country.name_fr}
                </h1>
                <p className="text-gray-500 mt-2">
                    Images libres de droits prises au {country.name_fr}.
                </p>
            </header>

            <Suspense fallback={<GridFallback />}>
                <MasonryGrid
                    country={country.code}
                    emptyMessage={`Aucune image du ${country.name_fr} pour l'instant. Publiez la première.`}
                />
            </Suspense>
        </main>
    );
}
