"use client";

import { useParams, useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
    MapPin, Camera, Eye, Download, ArrowLeft, Edit2, Check, Copy,
    Share2, Flag, Globe2, X, MoreHorizontal, ShieldCheck, Calendar, Info,
    Mail, Twitter, Instagram
} from "lucide-react";
import LikeButton from "../../components/LikeButton";
import DownloadButton from "../../components/DownloadButton";
import SaveToCollectionButton from "../../components/SaveToCollectionButton";
import ReportDialog from "../../components/ReportDialog";
import PhotoCard from "../../components/PhotoCard";
import { useAuth } from "../../contexts/AuthContext";
import {
    getMediaById, getRelatedMedia, hasUserLikedMedia, incrementViews,
} from "../../lib/database";
import { normalizeMedia, normalizeMediaList, formatCount, locationLabel, parseMediaId, mediaUrl } from "../../lib/media";

export default function PhotoDetail() {
    const { id: rawId } = useParams();
    const router = useRouter();
    const pathname = usePathname();
    const { user } = useAuth();
    
    // Extrait l'ID numérique du slug (ex: "123-paysage" -> 123)
    const id = parseMediaId(rawId);

    const [photo, setPhoto] = useState(null);
    const [raw, setRaw] = useState(null);
    const [related, setRelated] = useState([]);
    const [liked, setLiked] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showShare, setShowShare] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showConnect, setShowConnect] = useState(false);

    useEffect(() => {
        window.scrollTo(0, 0);
        let cancelled = false;

        async function load() {
            setLoading(true);
            const data = await getMediaById(id);
            if (cancelled) return;

            if (!data) {
                setPhoto(null);
                setLoading(false);
                return;
            }

            const normalized = normalizeMedia(data);
            const canonicalPath = mediaUrl(normalized);
            
            // Redirection canonique silencieuse si l'URL ne correspond pas au slug
            if (pathname !== canonicalPath && !cancelled) {
                router.replace(canonicalPath, { scroll: false });
            }

            setRaw(data);
            setPhoto(normalized);
            setLoading(false);

            incrementViews(id);

            getRelatedMedia(data).then((rows) => {
                if (!cancelled) setRelated(normalizeMediaList(rows));
            });
        }

        load();
        return () => { cancelled = true; };
    }, [id, pathname, router]);

    useEffect(() => {
        if (!user || !photo) return;
        hasUserLikedMedia(photo.id, user.id).then(setLiked);
    }, [user, photo]);

    const share = async () => {
        const shareData = {
            title: photo.title || "Photo sur JEaLiFe Stock",
            text: photo.description || "Découvrez cette image sur JEaLiFe Stock",
            url: window.location.href,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
                return;
            } catch {
                /* partage annulé : on ouvre la fenêtre de repli */
            }
        }
        setShowShare(true);
    };

    const copyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) return <DetailSkeleton />;

    if (!photo) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white text-center px-4">
                <h1 className="text-2xl font-bold mb-4">Cette image n&apos;existe pas ou n&apos;est plus publiée.</h1>
                <Link href="/" className="px-6 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-colors">
                    Retour à l&apos;accueil
                </Link>
            </div>
        );
    }

    const isOwner = user?.id === raw?.user_id;
    const place = locationLabel(photo);
    const topics = (raw?.media_topics || []).map((link) => link.topics).filter(Boolean);
    const publishedOn = raw?.created_at
        ? new Date(raw.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
        : null;

    const isVideo = photo.type === "video";

    return (
        <div className="min-h-screen bg-white">

            {/* Sticky Bar */}
            <div className="sticky top-0 sm:top-16 z-30 bg-white px-4 h-[72px] flex items-center justify-between gap-3">
                <div className="flex items-center gap-1 min-w-0">
                    <button
                        onClick={() => router.back()}
                        className="sm:hidden p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-black shrink-0"
                        aria-label="Revenir en arrière"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>

                    <Link href={`/users/${photo.author.username}`} className="shrink-0 group">
                        <Image
                            src={photo.author.avatar}
                            alt=""
                            width={36}
                            height={36}
                            unoptimized
                            className="rounded-full object-cover shrink-0 ring-1 ring-gray-200 group-hover:ring-gray-300 transition-all"
                        />
                    </Link>
                    <div className="flex flex-col min-w-0">
                        <Link href={`/users/${photo.author.username}`} className="group">
                            <span className="font-bold text-[15px] text-gray-900 truncate leading-tight group-hover:underline">{photo.author.name}</span>
                        </Link>
                        {/* Menu "Connectez-vous avec" */}
                        <div className="relative">
                            <button
                                onClick={(e) => { e.preventDefault(); setShowConnect(!showConnect); }}
                                className="flex text-[13px] text-blue-500 hover:text-blue-600 font-medium truncate items-center gap-1 transition-colors"
                            >
                                Disponible
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="mt-0.5 shrink-0"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.4-1.4 3.6 3.6 7.6-7.6L19 8l-9 9z"/></svg>
                            </button>

                            {showConnect && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowConnect(false)} />
                                    <div className="absolute left-0 top-full mt-2 w-56 bg-white border border-gray-200 shadow-xl rounded-md overflow-hidden z-50 py-1">
                                        <div className="px-4 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                                            Connectez-vous avec {photo.author.name}
                                        </div>
                                        {photo.author.email && (
                                            <a href={`mailto:${photo.author.email}`} className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors">
                                                <Mail className="w-4 h-4 text-gray-400" /> Envoyer un email
                                            </a>
                                        )}
                                        {photo.author.website && (
                                            <a href={photo.author.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors">
                                                <Globe2 className="w-4 h-4 text-gray-400" /> Site web
                                            </a>
                                        )}
                                        {photo.author.instagramUsername && (
                                            <a href={`https://instagram.com/${photo.author.instagramUsername}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors">
                                                <Instagram className="w-4 h-4 text-gray-400" /> Instagram
                                            </a>
                                        )}
                                        {photo.author.twitterUsername && (
                                            <a href={`https://twitter.com/${photo.author.twitterUsername}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors">
                                                <Twitter className="w-4 h-4 text-gray-400" /> Twitter
                                            </a>
                                        )}
                                        {!photo.author.email && !photo.author.website && !photo.author.instagramUsername && !photo.author.twitterUsername && (
                                            <div className="px-4 py-3 text-[13px] text-gray-500 italic">
                                                Aucun lien de contact renseigné.
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <SaveToCollectionButton mediaId={photo.id} variant="outline" className="hidden sm:flex justify-center w-9 sm:w-auto h-9 sm:px-3 border-gray-300 text-gray-600 hover:border-gray-900 hover:text-gray-900 rounded-md shadow-sm" />
                    <LikeButton
                        mediaId={photo.id}
                        initialLiked={liked}
                        initialCount={photo.likes}
                        variant="outline"
                        className="hidden sm:flex justify-center w-9 sm:w-auto h-9 sm:px-3 border-gray-300 text-gray-600 hover:border-gray-900 hover:text-gray-900 rounded-md shadow-sm"
                    />

                    {isOwner && (
                        <Link
                            href={`/photos/${rawId}/edit`}
                            className="hidden sm:flex items-center gap-2 h-9 px-3 border border-gray-300 bg-white rounded-md text-[13px] font-medium text-gray-700 hover:border-gray-900 hover:text-gray-900 transition-all shadow-sm"
                        >
                            <Edit2 className="w-3.5 h-3.5" /> Modifier l&apos;image
                        </Link>
                    )}

                    <DownloadButton media={photo} variant="primary" />
                </div>
            </div>

            {/* Unsplash-style Image Container */}
            <div className="w-full bg-white sm:px-4 lg:px-8 py-0 sm:py-6 flex justify-center">
                <div className="relative flex items-center justify-center bg-gray-50 overflow-hidden sm:rounded-[2px]">
                    {isVideo ? (
                        <video
                            src={photo.originalUrl}
                            poster={photo.url}
                            controls
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-auto h-auto max-w-full object-contain"
                            style={{ maxHeight: "calc(100vh - 140px)" }}
                        />
                    ) : (
                        <Image
                            src={photo.url}
                            alt={photo.alt}
                            width={photo.width || 1200}
                            height={photo.height || 800}
                            className="w-auto h-auto max-w-full object-contain"
                            style={{ maxHeight: "calc(100vh - 140px)" }}
                            priority
                            quality={90}
                            {...(photo.blurDataURL
                                ? { placeholder: "blur", blurDataURL: photo.blurDataURL }
                                : {})}
                        />
                    )}
                </div>
            </div>

            {/* Image Details Section */}
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
                
                {/* Stats & Actions Row */}
                <div className="flex justify-between items-start mb-6 sm:mb-10">
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-12">
                        <div className="flex flex-col">
                            <span className="text-[13px] text-gray-500 font-medium mb-1">Vues</span>
                            <span className="text-[15px] font-semibold text-gray-900">{formatCount(photo.views)}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[13px] text-gray-500 font-medium mb-1">Téléchargements</span>
                            <span className="text-[15px] font-semibold text-gray-900">{formatCount(photo.downloads)}</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                        <LikeButton
                            mediaId={photo.id}
                            initialLiked={liked}
                            initialCount={photo.likes}
                            variant="outline"
                            className="flex sm:hidden items-center justify-center h-8 w-10 border border-gray-300 rounded-md text-gray-600 shadow-sm"
                        />
                        <SaveToCollectionButton 
                            mediaId={photo.id} 
                            variant="outline" 
                            className="flex sm:hidden items-center justify-center h-8 w-10 border-gray-300 text-gray-600 rounded-md shadow-sm" 
                        />
                        <button 
                            onClick={share}
                            className="flex items-center gap-2 h-8 px-3 border border-gray-300 rounded-md text-[13px] font-medium text-gray-600 hover:text-gray-900 hover:border-gray-900 transition-colors shadow-sm"
                        >
                            <Share2 className="w-4 h-4 text-gray-400" /> <span className="hidden sm:inline">Partager</span>
                        </button>
                        <div className="relative">
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="flex items-center justify-center w-10 h-8 border border-gray-300 rounded-md text-gray-600 hover:text-gray-900 hover:border-gray-900 transition-colors shadow-sm"
                                aria-label="Plus d'options"
                            >
                                <MoreHorizontal className="w-4 h-4 text-gray-400" />
                            </button>
                            
                            {showMenu && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 shadow-xl rounded-md overflow-hidden z-50 py-1">
                                        <button
                                            onClick={() => { setShowMenu(false); setShowReport(true); }}
                                            className="w-full px-4 py-2 text-left text-[13px] hover:bg-gray-50 text-gray-700"
                                        >
                                            Signaler l&apos;image
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Title, Desc & Info list */}
                <div className="max-w-4xl space-y-6">
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-snug text-balance">
                        {photo.title || photo.alt}
                    </h1>
                    
                    {photo.description && (
                        <p className="text-[15px] text-gray-700 leading-relaxed max-w-prose">
                            {photo.description}
                        </p>
                    )}

                    <div className="space-y-3 pt-2">
                        {(place || photo.country) && (
                            <div className="flex items-center gap-3 text-[14px] text-gray-500 hover:text-gray-900 transition-colors cursor-pointer w-fit">
                                <MapPin className="w-4 h-4" /> 
                                <span>{place || photo.country?.name_fr}</span>
                            </div>
                        )}
                        {publishedOn && (
                            <div className="flex items-center gap-3 text-[14px] text-gray-500">
                                <Calendar className="w-4 h-4" /> 
                                <span>Publiée le {publishedOn}</span>
                            </div>
                        )}
                        {raw?.camera && (
                            <div className="flex items-center gap-3 text-[14px] text-gray-500">
                                <Camera className="w-4 h-4" /> 
                                <span>{raw.camera}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-3 text-[14px] text-gray-500 hover:text-gray-900 transition-colors">
                            <ShieldCheck className="w-4 h-4" /> 
                            <Link href="/licence" className="hover:underline">Utilisation gratuite sous la Licence JEaLiFe</Link>
                        </div>
                    </div>
                </div>

                {/* Tags Section */}
                {(topics.length > 0 || photo.tags.length > 0) && (
                    <div className="flex flex-wrap gap-2 pt-10">
                        {topics.map((topic) => (
                            <Link
                                key={topic.slug}
                                href={`/themes/${topic.slug}`}
                                className="px-3 py-1.5 bg-[#eeeeee] text-gray-600 hover:bg-[#e1e1e1] hover:text-gray-900 rounded-[4px] transition-colors text-[13px] capitalize"
                            >
                                {topic.name}
                            </Link>
                        ))}
                        {photo.tags
                            .filter((tag) => !topics.some((t) => t.name.toLowerCase() === tag.toLowerCase()))
                            .map((tag) => (
                                <Link
                                    key={tag}
                                    href={`/?q=${encodeURIComponent(tag.toLowerCase())}`}
                                    className="px-3 py-1.5 bg-[#eeeeee] text-gray-600 hover:bg-[#e1e1e1] hover:text-gray-900 rounded-[4px] transition-colors text-[13px] capitalize"
                                >
                                    {tag}
                                </Link>
                            ))}
                    </div>
                )}
            </div>

            {/* Related Images */}
            {related.length > 0 && (
                <section className="mt-10 border-t border-gray-100 bg-gray-50/50">
                    <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-16">
                        <h2 className="text-2xl font-black text-gray-900 mb-8">Images similaires</h2>
                        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6">
                            {related.map((item) => (
                                <PhotoCard key={item.id} photo={item} hideActions />
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {showShare && (
                <ShareModal
                    photo={photo}
                    copied={copied}
                    onCopy={copyLink}
                    onClose={() => setShowShare(false)}
                />
            )}

            {showReport && (
                <ReportDialog
                    mediaId={photo.id}
                    userId={user?.id || null}
                    onClose={() => setShowReport(false)}
                />
            )}
        </div>
    );
}

function ShareModal({ photo, copied, onCopy, onClose }) {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = photo.title || "Belle image sur JEaLiFe Stock";

    const targets = [
        { label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${text} : ${url}`)}`, color: "bg-[#25D366]" },
        { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, color: "bg-[#1877F2]" },
        { label: "X", href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, color: "bg-gray-900" },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-black">Partager</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors" aria-label="Fermer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between gap-4 mb-6">
                    <p className="text-sm text-gray-600 truncate flex-1 font-medium">{url}</p>
                    <button
                        onClick={onCopy}
                        className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all active:scale-95"
                    >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied ? "Copié" : "Copier"}
                    </button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    {targets.map((target) => (
                        <a
                            key={target.label}
                            href={target.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col items-center gap-3 p-4 hover:bg-gray-50 rounded-2xl transition-colors border border-transparent hover:border-gray-100"
                        >
                            <span className={`w-12 h-12 ${target.color} text-white rounded-full flex items-center justify-center shadow-sm`}>
                                <Share2 className="w-5 h-5" />
                            </span>
                            <span className="text-xs font-bold text-gray-700">{target.label}</span>
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );
}

function DetailSkeleton() {
    return (
        <div className="min-h-screen bg-white">
            <div className="sticky top-0 sm:top-16 z-30 bg-white border-b border-gray-100 px-4 h-[72px] flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-4">
                    <div className="w-9 h-9 bg-gray-100 rounded-full" />
                    <div className="w-10 h-10 bg-gray-100 rounded-full" />
                    <div className="space-y-2">
                        <div className="w-24 h-3 bg-gray-100 rounded" />
                        <div className="w-16 h-2 bg-gray-50 rounded" />
                    </div>
                </div>
                <div className="flex gap-2">
                    <div className="w-20 h-10 bg-gray-100 rounded-xl" />
                    <div className="w-32 h-10 bg-gray-100 rounded-xl" />
                </div>
            </div>

            <div className="w-full bg-gray-900 min-h-[50vh] animate-pulse" />
            
            <div className="max-w-[1200px] mx-auto px-4 py-16">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="w-3/4 h-12 bg-gray-100 rounded-xl animate-pulse" />
                        <div className="w-full h-4 bg-gray-50 rounded animate-pulse" />
                        <div className="w-5/6 h-4 bg-gray-50 rounded animate-pulse" />
                    </div>
                    <div className="space-y-4">
                        <div className="w-full h-24 bg-gray-50 rounded-2xl animate-pulse" />
                        <div className="w-full h-48 bg-gray-50 rounded-2xl animate-pulse" />
                    </div>
                </div>
            </div>
        </div>
    );
}
