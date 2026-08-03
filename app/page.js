import { Suspense } from "react";
import Link from "next/link";
import Hero from "./components/Hero";
import TopicBar from "./components/TopicBar";
import MasonryGrid from "./components/MasonryGrid";
import CategorySection from "./components/CategorySection";
import FeaturedTopics from "./components/FeaturedTopics";
import FeaturedCollections from "./components/FeaturedCollections";
import GridFallback from "./components/GridFallback";
import { pickShowcaseImage } from "./lib/auth-images";
import { getMedia, PAGE_SIZE } from "./lib/database";

export default async function Home({ searchParams }) {
  const params = await searchParams;
  const query = params?.q;

  // Première page rendue par le serveur : sans elle, le HTML servi aux robots
  // ne contenait aucun lien vers une fiche image. Les recherches, elles,
  // restent côté client — elles n'ont pas vocation à être indexées.
  const initialItems = query
    ? null
    : await getMedia({ type: "photo", limit: PAGE_SIZE, country: params?.pays || null });

  return (
    <main className="min-h-screen bg-white">
      {!query && <Hero background={pickShowcaseImage()} />}
      {!query && <CategorySection />}

      <Suspense fallback={<div className="h-16 border-b border-gray-100" />}>
        <TopicBar />
      </Suspense>

      {query ? (
        <div className="max-w-[1600px] mx-auto px-4 pt-6 pb-2">
          <h1 className="text-2xl font-bold text-gray-900">
            Images « {query} »
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Images libres de droits, téléchargeables gratuitement.
          </p>
        </div>
      ) : (
        <div className="max-w-[1600px] mx-auto px-4 pt-10 pb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Les dernières images
          </h2>
          <p className="text-gray-500">
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

      {!query && (
        <Suspense fallback={null}>
          <FeaturedCollections />
        </Suspense>
      )}

      <section className="bg-gray-50 border-t border-gray-100 py-20 text-center mt-20 px-4">
        <h2 className="text-3xl font-bold mb-4">
          Vous photographiez ? Cette banque est la vôtre.
        </h2>
        <p className="text-gray-500 max-w-xl mx-auto mb-8">
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
