"use client";

import Link from "next/link";
import Image from "next/image";
import { BadgeCheck, MapPin } from "lucide-react";
import LikeButton from "./LikeButton";
import DownloadButton from "./DownloadButton";
import SaveToCollectionButton from "./SaveToCollectionButton";
import { locationLabel, mediaUrl } from "../lib/media";

export default function PhotoCard({ photo, liked = false, hideActions = false, priority = false }) {
    if (!photo) return null;

    const place = locationLabel(photo);
    const hasDimensions = photo.width && photo.height;

    return (
        <div className="relative group mb-6 break-inside-avoid">
            <div className="relative w-full overflow-hidden rounded-2xl bg-gray-100 shadow-sm transition-all duration-500 hover:shadow-xl hover:-translate-y-1">
                <Link href={mediaUrl(photo)} className="block">
                    {hasDimensions ? (
                        <Image
                            src={photo.thumbnailUrl}
                            alt={photo.alt}
                            width={photo.width}
                            height={photo.height}
                            className="w-full h-auto block object-cover transform transition-transform duration-700 group-hover:scale-105 cursor-zoom-in"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                            quality={70}
                            priority={priority}
                            /* Le placeholder flou vient de la base : il est
                               généré à l'envoi, donc il correspond vraiment à
                               l'image et supprime le décalage de mise en page. */
                            {...(photo.blurDataURL
                                ? { placeholder: "blur", blurDataURL: photo.blurDataURL }
                                : {})}
                        />
                    ) : (
                        /* Médias importés avant l'enregistrement des
                           dimensions : on réserve un ratio par défaut pour ne
                           pas faire sauter la grille pendant le chargement. */
                        <div className="relative w-full aspect-[4/3]">
                            <Image
                                src={photo.thumbnailUrl}
                                alt={photo.alt}
                                fill
                                className="object-cover transform transition-transform duration-700 group-hover:scale-105 cursor-zoom-in"
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                quality={70}
                            />
                        </div>
                    )}
                </Link>

                {!hideActions && (
                    <>
                        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/0 to-black/30 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                        <div className="absolute top-4 right-4 flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 translate-y-0 md:translate-y-2 md:group-hover:translate-y-0 z-20">
                            <LikeButton
                                mediaId={photo.id}
                                initialLiked={liked}
                                initialCount={photo.likes}
                                variant="overlay"
                            />
                            <SaveToCollectionButton mediaId={photo.id} />
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 p-5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 translate-y-0 md:translate-y-2 md:group-hover:translate-y-0 z-20">
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
