
import { Suspense } from "react";
import Hero from "./components/Hero";
import TopicBar from "./components/TopicBar";
import MasonryGrid from "./components/MasonryGrid";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <TopicBar />
      <Suspense fallback={<div className="text-center py-20">Chargement...</div>}>
        <MasonryGrid />
      </Suspense>
    </main>
  );
}
