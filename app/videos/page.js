
"use client";

import Hero from "../components/Hero";
import TopicBar from "../components/TopicBar";
import { videos } from "../lib/data";
import VideoCard from "../components/VideoCard";

export default function VideosPage() {
    return (
        <main className="min-h-screen">
            <Hero />
            <TopicBar />

            <div className="max-w-[1400px] mx-auto px-4 py-8">
                <h2 className="text-2xl font-bold mb-6 text-gray-900">Vidéos gratuites</h2>
                <div className="columns-1 sm:columns-2 md:columns-3 gap-6 space-y-6">
                    {videos.map((v) => (
                        <VideoCard key={v.id} video={v} />
                    ))}
                    {/* Duplicates for demo */}
                    {videos.map((v) => (
                        <VideoCard key={`dup-${v.id}`} video={{ ...v, id: `dup-${v.id}` }} />
                    ))}
                    {videos.map((v) => (
                        <VideoCard key={`dup2-${v.id}`} video={{ ...v, id: `dup2-${v.id}` }} />
                    ))}
                </div>
            </div>
        </main>
    );
}
