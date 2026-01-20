
import { Suspense } from "react";
import Hero from "./components/Hero";
import TopicBar from "./components/TopicBar";
import MasonryGrid from "./components/MasonryGrid";
import CategorySection from "./components/CategorySection";
import FeaturedCollections from "./components/FeaturedCollections";

export default async function Home({ searchParams }) {
  const params = await searchParams;
  const query = params?.q;

  return (
    <main className="min-h-screen bg-white">
      {!query && <Hero />}
      {!query && <CategorySection />}

      <TopicBar />

      {!query && (
        <div className="max-w-[1600px] mx-auto px-4 pt-10 pb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Découvrez plus d'un million d'images gratuites</h2>
          <p className="text-gray-500 mb-6">Haute qualité partagée par notre talentueuse communauté.</p>
        </div>
      )}

      {query && (
        <div className="max-w-[1600px] mx-auto px-4 pt-6 pb-2">
          <h1 className="text-2xl font-bold text-gray-900 capitalize">{query} Images</h1>
          <p className="text-gray-500 text-sm mt-1">{`Images libres de droits pour "${query}"`}</p>
        </div>
      )}

      <Suspense fallback={<div className="text-center py-20">Chargement...</div>}>
        <MasonryGrid />
      </Suspense>

      {!query && <FeaturedCollections />}

      {/* Footer styled call to action */}
      <div className="bg-gray-50 border-t border-gray-100 py-20 text-center mt-20">
        <h2 className="text-3xl font-bold mb-4">Rejoignez la communauté JEaLiFe</h2>
        <p className="text-gray-500 max-w-xl mx-auto mb-8">Partagez vos propres photos, illustrations et vidéos avec des créateurs du monde entier.</p>
        <button className="px-8 py-3 bg-green-600 text-white rounded-full font-bold hover:bg-green-700 transition-colors shadow-xl shadow-green-600/20">
          Commencer gratuitement
        </button>
      </div>
    </main>
  );
}
