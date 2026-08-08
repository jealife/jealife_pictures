import { Suspense } from "react";
import Link from "next/link";
import Hero from "./components/Hero";
import TopicBar from "./components/TopicBar";
import MasonryGrid from "./components/MasonryGrid";
import CategorySection from "./components/CategorySection";
import FeaturedTopics from "./components/FeaturedTopics";
import DiscoveryPanel from "./components/DiscoveryPanel";
import GridFallback from "./components/GridFallback";
import { pickShowcaseImage } from "./lib/auth-images";
import { getMedia, getHeroBackground, countMedia, PAGE_SIZE } from "./lib/database";

export default async function Home({ searchParams }) {
  const params = await searchParams;
  const query = params?.q;
  const orientation = params?.orientation || null;

  // Première page rendue par le serveur : sans elle, le HTML servi aux robots
  // ne contenait aucun lien vers une fiche image. Les recherches, elles,
  // restent côté client — elles n'ont pas vocation à être indexées.
  const initialItems = query
    ? null
    : await getMedia({ type: "photo", limit: PAGE_SIZE, country: params?.pays || null, orientation });

  const resultsCount = query
    ? await countMedia({ query, type: "photo", country: params?.pays || null, orientation })
    : null;

  // Une vraie photo du catalogue plutôt qu'un visuel de décor Unsplash : le
  // hero d'accueil doit montrer ce que la plateforme publie réellement, pas
  // une image d'emprunt créditée sous le nom de la marque.
  const heroBackground = query ? null : (await getHeroBackground()) || pickShowcaseImage();

  return (
    <main className="min-h-screen bg-white dark:bg-zinc-950">
      {!query && <Hero background={heroBackground} />}
      {!query && <CategorySection />}

      {!query && (
        <Suspense fallback={null}>
          <DiscoveryPanel />
        </Suspense>
      )}

      <Suspense fallback={<div className="h-16 border-b border-gray-100" />}>
        <TopicBar />
      </Suspense>

      {query ? (
        <div className="max-w-[1600px] mx-auto px-4 pt-6 pb-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">
            Images « {query} »
          </h1>
          <p className="text-gray-500 dark:text-zinc-400 text-sm mt-1">
            {resultsCount} image{resultsCount > 1 ? "s" : ""} libre{resultsCount > 1 ? "s" : ""} de
            droits, téléchargeable{resultsCount > 1 ? "s" : ""} gratuitement.
          </p>
        </div>
      ) : (
        <div className="max-w-[1600px] mx-auto px-4 pt-10 pb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-100 mb-2">
            Les dernières images
          </h2>
          <p className="text-gray-500 dark:text-zinc-400">
            Ajoutées récemment par la communauté.
          </p>
        </div>
      )}

      <Suspense fallback={<GridFallback />}>
        <MasonryGrid initialItems={initialItems} />
      </Suspense>

      {!query && (
        <Suspense fallback={null}>
          <FeaturedTopics />
        </Suspense>
      )}

      <section className="bg-gray-50 dark:bg-zinc-900 border-t border-gray-100 dark:border-zinc-800 py-20 text-center mt-20 px-4">
        <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-zinc-100">
          Vous photographiez ? Cette banque est la vôtre.
        </h2>
        <p className="text-gray-500 dark:text-zinc-400 max-w-xl mx-auto mb-8">
          Publiez vos images, gardez vos droits, et faites voir votre travail
          bien au-delà d&apos;un fil d&apos;actualité. Retrait possible à tout moment.
        </p>
        <Link
          href="/submit"
          className="inline-block px-8 py-3 bg-emerald-700 text-white rounded-full font-bold hover:bg-emerald-800 transition-colors shadow-xl shadow-emerald-700/20"
        >
          Publier une image
        </Link>
      </section>
    </main>
  );
}
