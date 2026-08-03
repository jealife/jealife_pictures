"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { getMediaByTopic, getTopics } from "../lib/database";
import { formatCount } from "../lib/media";

/**
 * Thèmes mis en avant.
 *
 * Remplace l'ancienne section « Playlists et collections sélectionnées », qui
 * affichait quatre vignettes codées en dur (« Célébrations & Fêtes »,
 * « Ciels & Nuages »…) illustrées par des photos Unsplash et pointant vers
 * /collections/<slug>, une route qui n'existe pas. Ici les thèmes viennent de
 * la base, leur illustration est une vraie image publiée, et les liens
 * mènent à des pages réelles.
 */
export default function FeaturedTopics() {
    const [topics, setTopics] = useState([]);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            // `kind: 'category'` : un tag peut techniquement être mis en avant
            // depuis /admin/topics sans être promu catégorie — cette vitrine
            // ne doit montrer que la structure choisie, pas un tag isolé.
            const featured = await getTopics({ featuredOnly: true, kind: "category", limit: 8 });
            if (cancelled) return;

            // On ne montre que les thèmes qui ont réellement du contenu :
            // une vignette vide donne l'impression d'un site abandonné.
            const withCovers = await Promise.all(
                featured.map(async (topic) => {
                    if (topic.cover_image_url) return { ...topic, cover: topic.cover_image_url };
                    const [first] = await getMediaByTopic(topic.slug, { limit: 1 });
                    return first ? { ...topic, cover: first.thumbnail_url || first.url } : null;
                })
            );

            if (!cancelled) setTopics(withCovers.filter(Boolean).slice(0, 4));
        }

        load();
        return () => { cancelled = true; };
    }, []);

    if (topics.length === 0) return null;

    return (
        <section className="w-full max-w-[1600px] mx-auto px-4 py-16 border-t border-gray-100">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Thèmes à explorer</h2>
                <Link href="/themes" className="text-sm font-bold text-gray-500 hover:text-emerald-700 transition-colors">
                    Tous les thèmes
                </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {topics.map((topic) => (
                    <Link
                        key={topic.slug}
                        href={`/themes/${topic.slug}`}
                        className="group relative h-64 rounded-xl overflow-hidden"
                    >
                        <Image
                            src={topic.cover}
                            alt=""
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                            className="object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />

                        <div className="absolute bottom-0 left-0 p-6 text-white">
                            <h3 className="text-xl font-bold mb-1">{topic.name}</h3>
                            <p className="text-xs text-white/80 font-medium">
                                {formatCount(topic.total_media)} image{topic.total_media > 1 ? "s" : ""}
                            </p>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
}
