import Link from "next/link";
import { getActiveCountries, getCountries } from "../lib/database";

export const revalidate = 600;

export const metadata = {
    title: "Parcourir par pays",
    description:
        "Explorez les images libres de droits de JEaLiFe Stock pays par pays.",
};

const REGION_LABELS = {
    "afrique-centrale": "Afrique centrale",
    "afrique-de-l-ouest": "Afrique de l'Ouest",
    "afrique-du-nord": "Afrique du Nord",
    "afrique-de-l-est": "Afrique de l'Est",
    "afrique-australe": "Afrique australe",
};

export default async function CountriesPage() {
    const [all, active] = await Promise.all([
        getCountries({ africanOnly: true }),
        getActiveCountries(),
    ]);

    const counts = new Map(active.map((country) => [country.code, country.count]));

    const byRegion = all.reduce((groups, country) => {
        (groups[country.region] ||= []).push(country);
        return groups;
    }, {});

    return (
        <main className="min-h-screen bg-white">
            <div className="max-w-[1200px] mx-auto px-4 py-16">
                <h1 className="text-4xl font-extrabold text-gray-900 mb-3">
                    Parcourir par pays
                </h1>
                <p className="text-gray-500 mb-12 max-w-2xl">
                    Les lieux déjà représentés dans la banque. Ceux qui n&apos;ont pas
                    encore d&apos;images attendent leurs premiers photographes.
                </p>

                {Object.entries(REGION_LABELS).map(([region, label]) => {
                    const countries = byRegion[region] || [];
                    if (countries.length === 0) return null;

                    return (
                        <section key={region} className="mb-12">
                            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
                                {label}
                            </h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                {/* Les pays déjà représentés d'abord : sur 54 pays, un
                                    seul en a — les noyer dans une liste alphabétique
                                    de destinations vides laissait croire que tout le
                                    monde était cliquable pour de vraies photos. */}
                                {[...countries]
                                    .sort((a, b) => (counts.get(b.code) || 0) - (counts.get(a.code) || 0))
                                    .map((country) => {
                                    const count = counts.get(country.code) || 0;
                                    return (
                                        <Link
                                            key={country.code}
                                            href={`/pays/${country.slug}`}
                                            className={`flex items-center justify-between gap-2 px-4 py-3 border rounded-xl transition-all ${
                                                count > 0
                                                    ? "border-gray-200 hover:border-black hover:shadow-sm"
                                                    : "border-gray-100 opacity-50 hover:opacity-100"
                                            }`}
                                        >
                                            <span className="flex items-center gap-2 min-w-0">
                                                <span className="text-sm font-medium text-gray-900 truncate">
                                                    {country.name_fr}
                                                </span>
                                            </span>
                                            <span className={`text-[10px] font-bold shrink-0 ${count > 0 ? "text-gray-400" : "text-gray-300"}`}>
                                                {count > 0 ? count : "Bientôt"}
                                            </span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </section>
                    );
                })}
            </div>
        </main>
    );
}
