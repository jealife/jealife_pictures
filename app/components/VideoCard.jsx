"use client";

import Link from "next/link";
import Image from "next/image";
import { Play, MapPin } from "lucide-react";
import LikeButton from "./LikeButton";
import SaveToCollectionButton from "./SaveToCollectionButton";
import { locationLabel } from "../lib/media";

export default function VideoCard({ video, liked = false }) {
    if (!video) return null;

    const place = locationLabel(video);
    const poster = video.thumbnailUrl || video.url;

    return (
        <div className="relative group">
            <div className="relative w-full overflow-hidden rounded-2xl bg-gray-900 shadow-sm transition-all duration-500 hover:shadow-xl hover:-translate-y-1">
                <Link href={`/photos/${video.id}`} className="block">
                    <div className="relative aspect-video">
                        <Image
                            src={poster}
                            alt={video.alt}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="object-cover transition-transform duration-700 group-hover:scale-105 opacity-90 group-hover:opacity-100"
                            {...(video.blurDataURL
                                ? { placeholder: "blur", blurDataURL: video.blurDataURL }
                                : {})}
                        />

                        <span className="absolute inset-0 flex items-center justify-center">
                            <span className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:bg-white/40 transition-colors">
                                <Play className="w-5 h-5 text-white fill-white ml-1" aria-hidden="true" />
                            </span>
                        </span>

                        {video.duration && (
                            <span className="absolute top-3 right-3 bg-black/50 backdrop-blur text-white text-xs font-medium px-2 py-1 rounded">
                                {video.duration}
                            </span>
                        )}
                    </div>
                </Link>

                <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/0 to-black/30 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                <div className="absolute top-4 right-4 flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 z-20">
                    <LikeButton
                        mediaId={video.id}
                        initialLiked={liked}
                        initialCount={video.likes}
                        variant="overlay"
                    />
                    <SaveToCollectionButton mediaId={video.id} />
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 z-20">
                    <Link href={`/users/${video.author.username}`} className="flex items-center gap-3 min-w-0">
                        <Image
                            src={video.author.avatar}
                            alt=""
                            width={32}
                            height={32}
                            unoptimized
                            className="w-8 h-8 rounded-full border-2 border-white/20 object-cover shrink-0"
                        />
                        <span className="min-w-0">
                            <span className="block text-white font-medium text-sm drop-shadow-md truncate">
                                {video.author.name}
                            </span>
                            {place && (
                                <span className="flex items-center gap-1 text-[10px] text-white/80 truncate">
                                    <MapPin className="w-2.5 h-2.5 shrink-0" /> {place}
                                </span>
                            )}
                        </span>
                    </Link>
                </div>
            </div>
        </div>
    );
}
