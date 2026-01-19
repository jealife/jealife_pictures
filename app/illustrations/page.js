
"use client";

import Hero from "../components/Hero";
import TopicBar from "../components/TopicBar";
import { illustrations } from "../lib/data";
import PhotoCard from "../components/PhotoCard";

export default function IllustrationsPage() {
    return (
        <main className="min-h-screen">
            <Hero />
            <TopicBar />

            <div className="max-w-[1400px] mx-auto px-4 py-8">
                <h2 className="text-2xl font-bold mb-6 text-gray-900">Illustrations à la une</h2>
                <div className="columns-1 sm:columns-2 md:columns-3 gap-6 space-y-6">
                    {illustrations.map((p) => (
                        <PhotoCard key={p.id} photo={p} />
                    ))}
                    {/* Duplicates for demo */}
                    {illustrations.map((p) => (
                        <PhotoCard key={`dup-${p.id}`} photo={{ ...p, id: `dup-${p.id}` }} />
                    ))}
                </div>
            </div>
        </main>
    );
}
