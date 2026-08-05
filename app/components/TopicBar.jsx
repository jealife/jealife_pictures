"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { getTopics, getSearchTypeCounts } from "../lib/database";
import CountryFilter from "./CountryFilter";
import SortControl from "./SortControl";
import OrientationFilter from "./OrientationFilter";

/**
 * Barre de navigation par thème.
 *
 * Trois corrections :
 *   · les thèmes affichés étaient une liste codée en dur copiée d'Unsplash
 *     (« Street Photography », « Film »…), complétée par… un seul thème de la
 *     base, à cause d'un `.slice(0, 1)` là où le commentaire annonçait 15 ;
 *   · les liens pointaient vers `/?q=<nom>`, une simple recherche texte, alors
 *     que la table `media_topics` existe justement pour offrir de vraies pages
 *     de thème ;
 *   · aucun filtre géographique n'était proposé, alors que c'est la promesse
 *     centrale du site.
 */
export default function TopicBar({ activeTopic = null }) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const scrollRef = useRef(null);
    const [topics, setTopics] = useState([]);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(false);
    const [typeCounts, setTypeCounts] = useState(null);

    const query = searchParams.get("q");
    const country = searchParams.get("pays");
    const orientation = searchParams.get("orientation");

    useEffect(() => {
        // `kind: 'category'` exclut les tags nés d'un envoi (migration 0006) :
        // cette barre doit rester une liste choisie, bornée — pas grossir
        // avec chaque mot-clé inédit tapé par un contributeur.
        getTopics({ limit: 30, kind: "category" }).then(setTopics);
    }, []);

    // Compteurs par type pendant une recherche : sans eux, rien n'indique
    // avant de cliquer si l'onglet Illustrations a le moindre résultat.
    useEffect(() => {
        let cancelled = false;

        if (!query) {
            Promise.resolve().then(() => { if (!cancelled) setTypeCounts(null); });
            return () => { cancelled = true; };
        }

        getSearchTypeCounts(query, { country, orientation }).then((counts) => {
            if (!cancelled) setTypeCounts(counts);
        });
        return () => { cancelled = true; };
    }, [query, country, orientation]);

    // Un changement de type de média ne doit jamais faire perdre la
    // recherche, le pays ou le tri en cours — seul `type` change.
    const typeHref = (basePath) => {
        const queryString = searchParams.toString();
        return queryString ? `${basePath}?${queryString}` : basePath;
    };

    const checkScroll = () => {
        const element = scrollRef.current;
        if (!element) return;
        const { scrollLeft, scrollWidth, clientWidth } = element;
        setShowLeftArrow(scrollLeft > 10);
        setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    };

    useEffect(() => {
        const element = scrollRef.current;
        if (!element) return;
        element.addEventListener("scroll", checkScroll);
        checkScroll();
        const timer = setTimeout(checkScroll, 300);
        return () => {
            element.removeEventListener("scroll", checkScroll);
            clearTimeout(timer);
        };
    }, [topics]);

    const scroll = (direction) => {
        scrollRef.current?.scrollBy({
            left: direction === "left" ? -400 : 400,
            behavior: "smooth",
        });
    };

    const mediaTypes = [
        { href: "/", label: "Photos", countKey: "photo" },
        { href: "/illustrations", label: "Illustrations", countKey: "illustration" },
        { href: "/videos", label: "Vidéos", countKey: "video" },
    ];

    // Le nav principal se réduit à 65px dès le premier défilement, y compris
    // sur mobile (voir Navbar.jsx, la rangée de recherche mobile se replie
    // sur `scrolled`) : un seul décalage suffit désormais, plus besoin de
    // distinguer mobile/bureau ici.
    return (
        <div className="sticky top-16 z-[45] bg-white/95 backdrop-blur-sm border-b border-gray-100">
            <div className="max-w-[1800px] mx-auto px-4 flex items-center gap-6 py-3">
                <nav className="hidden md:flex items-center gap-1 pr-6 border-r border-gray-200 shrink-0">
                    {mediaTypes.map((type) => (
                        <Link
                            key={type.href}
                            href={typeHref(type.href)}
                            className={`px-3 py-1.5 text-sm transition-colors ${
                                pathname === type.href
                                    ? "font-semibold text-black"
                                    : "font-medium text-gray-500 hover:text-black"
                            }`}
                        >
                            {type.label}
                            {typeCounts && (
                                <span className="ml-1 text-gray-400">{typeCounts[type.countKey]}</span>
                            )}
                        </Link>
                    ))}
                </nav>

                {/* Pendant une recherche, les catégories n'ajoutent rien —
                    la requête et les filtres font déjà le travail de
                    tri, et les deux rangées ensemble surchargeaient la
                    barre. */}
                {!query && (
                <div className="relative flex-1 overflow-hidden">
                    {showLeftArrow && (
                        <div className="absolute left-0 top-0 bottom-0 w-16 bg-linear-to-r from-white via-white to-transparent z-10 flex items-center pl-2">
                            <button
                                onClick={() => scroll("left")}
                                className="p-1.5 bg-white shadow-lg rounded-full border border-gray-100 hover:scale-110 transition-transform"
                                aria-label="Faire défiler vers la gauche"
                            >
                                <ChevronLeft className="w-4 h-4 text-gray-700" />
                            </button>
                        </div>
                    )}

                    <div
                        ref={scrollRef}
                        className="flex items-center gap-6 overflow-x-auto scrollbar-hide px-2 py-1"
                    >
                        <Link
                            href="/"
                            className={`whitespace-nowrap pb-2 text-sm font-medium transition-all border-b-2 hover:text-black ${
                                !activeTopic && pathname === "/"
                                    ? "border-black text-black"
                                    : "border-transparent text-gray-500"
                            }`}
                        >
                            À la une
                        </Link>

                        {topics.map((topic) => (
                            <Link
                                key={topic.slug}
                                href={`/themes/${topic.slug}`}
                                className={`whitespace-nowrap pb-2 text-sm font-medium transition-all border-b-2 hover:text-black ${
                                    activeTopic === topic.slug
                                        ? "border-black text-black"
                                        : "border-transparent text-gray-500"
                                }`}
                            >
                                {topic.name}
                            </Link>
                        ))}
                    </div>

                    {showRightArrow && (
                        <div className="absolute right-0 top-0 bottom-0 w-16 bg-linear-to-l from-white via-white to-transparent z-10 flex items-center justify-end pr-2">
                            <button
                                onClick={() => scroll("right")}
                                className="p-1.5 bg-white shadow-lg rounded-full border border-gray-100 hover:scale-110 transition-transform"
                                aria-label="Faire défiler vers la droite"
                            >
                                <ChevronRight className="w-4 h-4 text-gray-700" />
                            </button>
                        </div>
                    )}
                </div>
                )}

                <div className="flex items-center gap-2 shrink-0 ml-auto">
                    {/* Tri et orientation n'ont d'intérêt qu'en train de
                        chercher — les afficher tout le temps surchargeait la
                        barre sur mobile pour un gain nul en navigation libre. */}
                    {query && (
                        <>
                            <OrientationFilter />
                            <SortControl />
                        </>
                    )}
                    <CountryFilter />
                </div>
            </div>
        </div>
    );
}
