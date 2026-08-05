"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { BadgeCheck, MapPin } from "lucide-react";
import LikeButton from "./LikeButton";
import DownloadButton from "./DownloadButton";
import SaveToCollectionButton from "./SaveToCollectionButton";
import ImageLoader from "./ImageLoader";
import { locationLabel, mediaUrl } from "../lib/media";

export default function PhotoCard({ photo, liked = false, hideActions = false, priority = false }) {
    // Chargement progressif : sans cet état, les images d'une même page
    // "popaient" toutes en même temps dès qu'elles franchissaient le seuil
    // de lazy-loading, ce qui donnait l'impression que tout s'affichait
    // d'un bloc. Chacune garde désormais son propre skeleton et ne
    // s'affiche qu'une fois réellement prête.
    const [loaded, setLoaded] = useState(false);

    if (!photo) return null;

    const place = locationLabel(photo);
    const hasDimensions = photo.width && photo.height;

    return (
        <div className="relative group mb-6 break-inside-avoid">
            <div className="relative w-full rounded-2xl bg-gray-100 shadow-sm transition-all duration-500 hover:shadow-xl hover:-translate-y-1">
                <div className="relative w-full overflow-hidden rounded-2xl">
                    <Link href={mediaUrl(photo)} className="block">
                        {hasDimensions ? (
                            <div className="relative w-full" style={{ aspectRatio: `${photo.width} / ${photo.height}` }}>
                                {!loaded && <ImageLoader />}
                                <Image
                                    src={photo.thumbnailUrl}
                                    alt={photo.alt}
                                    fill
                                    className={`object-cover transform transition-all duration-700 group-hover:scale-105 cursor-zoom-in ${
                                        loaded ? "opacity-100" : "opacity-0"
                                    }`}
                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                                    quality={85}
                                    priority={priority}
                                    onLoad={() => setLoaded(true)}
                                    onError={() => setLoaded(true)}
                                    {...(photo.blurDataURL
                                        ? { placeholder: "blur", blurDataURL: photo.blurDataURL }
                                        : {})}
                                />
                            </div>
                        ) : (
                            <div className="relative w-full min-h-[220px]">
                                {!loaded && <ImageLoader />}
                                <Image
                                    src={photo.thumbnailUrl}
                                    alt={photo.alt}
                                    width={0}
                                    height={0}
                                    sizes="100vw"
                                    className={`w-full h-auto block object-cover transform transition-all duration-700 group-hover:scale-105 cursor-zoom-in ${
                                        loaded ? "opacity-100" : "opacity-0"
                                    }`}
                                    quality={85}
                                    loading="lazy"
                                    onLoad={() => setLoaded(true)}
                                    onError={() => setLoaded(true)}
                                />
                            </div>
                        )}
                    </Link>
                </div>

                {!hideActions && (
                    <>
                        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                            <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/0 to-black/30 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                        </div>

                        <div className="absolute top-4 right-4 flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 translate-y-0 md:translate-y-2 md:group-hover:translate-y-0 z-30">
                            <LikeButton
                                mediaId={photo.id}
                                initialLiked={liked}
                                initialCount={photo.likes}
                                variant="overlay"
                            />
                            <SaveToCollectionButton mediaId={photo.id} />
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 p-5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 translate-y-0 md:translate-y-2 md:group-hover:translate-y-0 z-40">
                            <div className="flex items-center justify-between gap-3">
                                <Link
                                    href={`/users/${photo.author.username}`}
                                    className="flex items-center gap-3 group/author min-w-0"
                                >
                                    <Image
                                        src={photo.author.avatar}
                                        alt=""
                                        width={36}
                                        height={36}
                                        unoptimized
                                        className="w-9 h-9 rounded-full border-2 border-white/20 object-cover shadow-sm group-hover/author:border-white transition-colors shrink-0"
                                    />
                                    <span className="drop-shadow-md min-w-0">
                                        <span className="flex items-center gap-1 text-white font-medium text-sm leading-tight truncate">
                                            {photo.author.name}
                                            {photo.author.isVerified && (
                                                <BadgeCheck className="w-3.5 h-3.5 text-white shrink-0" aria-label="Contributeur vérifié" />
                                            )}
                                        </span>
                                        {place && (
                                            <span className="flex items-center gap-1 text-[10px] text-white/80 mt-0.5 font-light truncate">
                                                <MapPin className="w-2.5 h-2.5 shrink-0" />
                                                {place}
                                            </span>
                                        )}
                                    </span>
                                </Link>

                                <DownloadButton media={photo} />
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
