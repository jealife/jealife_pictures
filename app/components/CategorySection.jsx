"use client";

import Link from "next/link";
import Image from "next/image";
import { Camera, Image as ImageIcon, PenTool, Video, Music, Mic } from "lucide-react";

export default function CategorySection() {
    const categories = [
        {
            title: "Photos",
            count: "5.2M+ photos",
            icon: Camera,
            href: "/?type=photo",
            color: "bg-blue-50 text-blue-600",
            image: "https://images.unsplash.com/photo-1554048612-387768052bf7?auto=format&fit=crop&q=80&w=300&h=200"
        },
        {
            title: "Illustrations",
            count: "800K+ illustrations",
            icon: PenTool,
            href: "/?type=illustration",
            color: "bg-purple-50 text-purple-600",
            image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=300&h=200"
        },
        {
            title: "Vidéos",
            count: "100K+ vidéos",
            icon: Video,
            href: "/?type=video",
            color: "bg-red-50 text-red-600",
            image: "https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&q=80&w=300&h=200"
        }
    ];

    return (
        <div className="w-full max-w-[1600px] mx-auto px-4 py-16">
            <h2 className="text-2xl font-bold mb-8 text-gray-900">Ressources gratuites pour tous vos projets</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {categories.map((cat, idx) => (
                    <Link
                        key={idx}
                        href={cat.href}
                        className="group relative overflow-hidden rounded-2xl h-28 flex items-center justify-between p-6 transition-all hover:shadow-lg border border-gray-100 bg-white"
                    >
                        <div className="relative z-10 flex flex-col justify-center h-full">
                            <div className="flex items-center gap-3 mb-1">
                                <span className={`p-2 rounded-lg ${cat.color} group-hover:scale-110 transition-transform`}>
                                    <cat.icon className="w-5 h-5" />
                                </span>
                                <h3 className="font-bold text-lg text-gray-900">{cat.title}</h3>
                            </div>
                            <p className="text-xs text-gray-500 font-medium pl-1">{cat.count}</p>
                        </div>

                        {/* Decorative Image Fade */}
                        <div className="absolute right-0 top-0 bottom-0 w-1/2 overflow-hidden opacity-10 group-hover:opacity-20 transition-opacity">
                            {/* Using standard img for quick implementation in this new component, could be Image */}
                            <Image
                                src={cat.image}
                                alt=""
                                fill
                                className="object-cover mask-linear-fade"
                            />
                        </div>
                        <div className="absolute inset-0 bg-linear-to-r from-white via-white/80 to-transparent pointer-events-none"></div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
