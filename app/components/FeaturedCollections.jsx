"use client";

import Link from "next/link";
import Image from "next/image";

export default function FeaturedCollections() {
    const collections = [
        {
            title: "Célébrations & Fêtes",
            count: "12K+ ressources",
            image: "https://images.unsplash.com/photo-1514525253440-b393452e8d03?auto=format&fit=crop&q=80&w=400&h=400",
            slug: "fetes"
        },
        {
            title: "Bureau & Travail",
            count: "8K+ ressources",
            image: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=400&h=400",
            slug: "bureau"
        },
        {
            title: "Ciels & Nuages",
            count: "45K+ ressources",
            image: "https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&q=80&w=400&h=400",
            slug: "ciel"
        },
        {
            title: "Gabon Magnifique",
            count: "2K+ ressources",
            image: "https://images.unsplash.com/photo-1572506822558-85751970b2e2?auto=format&fit=crop&q=80&w=400&h=400",
            slug: "gabon"
        }
    ];

    return (
        <div className="w-full max-w-[1600px] mx-auto px-4 py-16 border-t border-gray-100">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Playlists et collections sélectionnées</h2>
                <Link href="/collections" className="text-sm font-bold text-gray-500 hover:text-green-600">
                    Tout voir
                </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {collections.map((col, idx) => (
                    <Link
                        key={idx}
                        href={`/collections/${col.slug}`}
                        className="group relative h-64 rounded-xl overflow-hidden cursor-pointer"
                    >
                        <Image
                            src={col.image}
                            alt={col.title}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                            unoptimized
                            className="object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent"></div>

                        <div className="absolute bottom-0 left-0 p-6 text-white translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                            <h3 className="text-xl font-bold mb-1">{col.title}</h3>
                            <p className="text-xs text-white/80 font-medium opacity-0 group-hover:opacity-100 transition-opacity delay-75">{col.count}</p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
