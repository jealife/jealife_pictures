"use client";

import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { getTopics } from "../lib/database";

export default function TopicBar() {
    const scrollRef = useRef(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(true);
    const [activeTopic, setActiveTopic] = useState("À la Une");
    const [topics, setTopics] = useState([]);

    // Featured topics similar to Unsplash
    const featuredTopics = [
        "À la Une",
        "Fond d'écran",
        "Nature",
        "Architecture",
        "Voyage",
        "Street Photography",
        "Personnes",
        "Animaux",
        "Textures & Motifs",
        "Film"
    ];

    const capitalize = (str) => {
        if (!str) return "";
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    };

    useEffect(() => {
        async function fetchTopics() {
            const data = await getTopics();
            if (data) {
                // Get unique names, properly formatted, excluding those already in featured
                const dbNames = data
                    .map(t => capitalize(t.name))
                    .filter(name => !featuredTopics.includes(name));

                // Keep only unique ones and limit to 15 popular ones from DB
                const uniqueDbNames = [...new Set(dbNames)].slice(0, 1);
                setTopics(uniqueDbNames);
            }
        }
        fetchTopics();
    }, []);

    const scroll = (direction) => {
        if (scrollRef.current) {
            const { current } = scrollRef;
            const scrollAmount = 400;
            if (direction === 'left') {
                current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
            } else {
                current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
            }
        }
    };

    const checkScroll = () => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
            setShowLeftArrow(scrollLeft > 10);
            setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
        }
    };

    useEffect(() => {
        const el = scrollRef.current;
        if (el) {
            el.addEventListener('scroll', checkScroll);
            checkScroll();
            // Need a slight delay for initial check as content might load
            setTimeout(checkScroll, 500);
            return () => el.removeEventListener('scroll', checkScroll);
        }
    }, [topics]);

    const allDisplayTopics = [...featuredTopics, ...topics];

    return (
        <div className="sticky top-16 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100 py-3">
            <div className="relative max-w-[1800px] mx-auto px-4 flex items-center gap-6">

                {/* Fixed Media Types */}
                <div className="hidden md:flex items-center gap-1 pr-6 border-r border-gray-200 shrink-0">
                    <Link href="/" className="px-3 py-1.5 text-sm font-semibold text-black hover:text-gray-600 transition-colors">Photos</Link>
                    <Link href="/illustrations" className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-black transition-colors">Illustrations</Link>
                    <Link href="/videos" className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-black transition-colors">Vidéos</Link>
                </div>

                {/* Scrollable Topics */}
                <div className="relative flex-1 overflow-hidden group">

                    {showLeftArrow && (
                        <div className="absolute left-0 top-0 bottom-0 w-16 bg-linear-to-r from-white via-white to-transparent z-10 flex items-center pl-2">
                            <button onClick={() => scroll('left')} className="p-1.5 bg-white shadow-lg rounded-full border border-gray-100 hover:scale-110 transition-transform">
                                <ChevronLeft className="w-4 h-4 text-gray-700" />
                            </button>
                        </div>
                    )}

                    <div
                        ref={scrollRef}
                        className="flex items-center gap-6 overflow-x-auto scrollbar-hide px-2 py-1"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {allDisplayTopics.map((name) => (
                            <Link
                                key={name}
                                href={name === "À la Une" ? "/" : `/?q=${name.toLowerCase()}`}
                                onClick={() => setActiveTopic(name)}
                                className={`whitespace-nowrap pb-2 text-sm font-medium transition-all border-b-2 hover:text-black ${activeTopic === name ? "border-black text-black" : "border-transparent text-gray-500"}`}
                            >
                                {name}
                            </Link>
                        ))}
                    </div>

                    {showRightArrow && (
                        <div className="absolute right-0 top-0 bottom-0 w-16 bg-linear-to-l from-white via-white to-transparent z-10 flex items-center justify-end pr-2">
                            <button onClick={() => scroll('right')} className="p-1.5 bg-white shadow-lg rounded-full border border-gray-100 hover:scale-110 transition-transform">
                                <ChevronRight className="w-4 h-4 text-gray-700" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
