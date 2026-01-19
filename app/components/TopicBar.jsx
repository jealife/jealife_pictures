"use client";

import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { getTopics } from "../lib/database";

export default function TopicBar() {
    const scrollRef = useRef(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(true);
    const [activeTopic, setActiveTopic] = useState("Tous");
    const [topics, setTopics] = useState([]);

    useEffect(() => {
        async function fetchTopics() {
            const data = await getTopics();
            setTopics(data);
        }
        fetchTopics();
    }, []);

    const scroll = (direction) => {
        if (scrollRef.current) {
            const { current } = scrollRef;
            const scrollAmount = 300;
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
            return () => el.removeEventListener('scroll', checkScroll);
        }
    }, []);

    return (
        <div className="sticky top-16 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100 py-3">
            <div className="relative max-w-[1800px] mx-auto px-4 flex items-center gap-6">

                {/* Fixed Media Types */}
                <div className="hidden md:flex items-center gap-1 pr-6 border-r border-gray-200 shrink-0">
                    <Link href="/" className="px-3 py-1.5 text-sm font-medium text-black hover:text-gray-600 transition-colors">Photos</Link>
                    <Link href="/illustrations" className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-black transition-colors">Illustrations</Link>
                    <Link href="/videos" className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-black transition-colors">Vidéos</Link>
                </div>

                {/* Scrollable Topics */}
                <div className="relative flex-1 overflow-hidden group">

                    {showLeftArrow && (
                        <div className="absolute left-0 top-0 bottom-0 w-16 bg-linear-to-r from-white via-white/80 to-transparent z-10 flex items-center pl-2">
                            <button onClick={() => scroll('left')} className="p-1.5 bg-white shadow-md rounded-full border border-gray-100 hover:scale-110 transition-transform">
                                <ChevronLeft className="w-4 h-4 text-gray-700" />
                            </button>
                        </div>
                    )}

                    <div
                        ref={scrollRef}
                        className="flex items-center gap-3 overflow-x-auto scrollbar-hide px-2 py-1"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        <button
                            onClick={() => setActiveTopic("Tous")}
                            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all ${activeTopic === "Tous" ? "bg-black text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                        >
                            Tous
                        </button>
                        {topics.map((topic) => (
                            <button
                                key={topic.id}
                                onClick={() => setActiveTopic(topic.name)}
                                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all ${activeTopic === topic.name ? "bg-black text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                            >
                                {topic.name}
                            </button>
                        ))}
                    </div>

                    {showRightArrow && (
                        <div className="absolute right-0 top-0 bottom-0 w-16 bg-linear-to-l from-white via-white/80 to-transparent z-10 flex items-center justify-end pr-2">
                            <button onClick={() => scroll('right')} className="p-1.5 bg-white shadow-md rounded-full border border-gray-100 hover:scale-110 transition-transform">
                                <ChevronRight className="w-4 h-4 text-gray-700" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
