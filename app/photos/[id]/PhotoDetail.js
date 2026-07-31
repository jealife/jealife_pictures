"use client";

import { useParams, useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
    MapPin, Camera, Eye, Download, ArrowLeft, Edit2, Check, Copy,
    Share2, Flag, Globe2, X, MoreHorizontal, ShieldCheck
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

    const jsonLd = {
        "@context": "https://schema.org/",
        "@type": "ImageObject",
        contentUrl: photo.url,
        thumbnailUrl: photo.thumbnailUrl,
        datePublished: raw?.created_at,
        description: photo.description || photo.alt,
        name: photo.title || photo.alt,
        license: "https://stock.jealife.com/licence",
        acquireLicensePage: "https://stock.jealife.com/licence",
        creditText: photo.author.name,
        creator: { "@type": "Person", name: photo.author.name },
        contentLocation: place ? { "@type": "Place", name: place } : undefined,
        width: photo.width || undefined,
        height: photo.height || undefined,
    };

    return (
        <div className="min-h-screen bg-white">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            {/* Sticky Bar (Glassmorphism) */}
            <div className="sticky top-0 sm:top-16 z-30 bg-white/90 backdrop-blur-xl border-b border-gray-100 px-4 h-[72px] flex items-center justify-between gap-3">
                <div className="flex items-center gap-4 min-w-0">
                    <button
                        onClick={() => router.back()}
                        className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-black shrink-0"
                        aria-label="Revenir en arrière"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>

                    <Link href={`/users/${photo.author.username}`} className="flex items-center gap-3 group min-w-0">
                        <Image
                            src={photo.author.avatar}
                            alt=""
                            width={40}
                            height={40}
                            unoptimized
                            className="rounded-full object-cover shrink-0 ring-2 ring-transparent group-hover:ring-gray-200 transition-all shadow-sm"
                        />
                        <div className="flex flex-col min-w-0">
                            <span className="font-bold text-sm text-gray-900 truncate leading-tight group-hover:underline">{photo.author.name}</span>
                            <span className="text-[11px] text-gray-500 truncate">@{photo.author.username}</span>
                        </div>
                    </Link>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {isOwner && (
                        <Link
                            href={`/photos/${rawId}/edit`}
                            className="hidden sm:flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
                        >
                            <Edit2 className="w-4 h-4" /> Modifier
                        </Link>
                    )}

                    <LikeButton
                        mediaId={photo.id}
                        initialLiked={liked}
                        initialCount={photo.likes}
                        variant="outline"
                        showCount
                    />

                    <DownloadButton media={photo} variant="primary" />

                    <div className="relative">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="p-2.5 text-gray-500 hover:text-black hover:bg-gray-100 rounded-xl transition-all ml-1"
                            aria-label="Plus d'options"
                        >
                            <MoreHorizontal className="w-5 h-5" />
                        </button>
                        
                        {showMenu && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 shadow-xl rounded-xl overflow-hidden z-50 py-1 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                                    <button
                                        onClick={() => { setShowMenu(false); share(); }}
                                        className="w-full px-4 py-2.5 text-left text-sm font-medium hover:bg-gray-50 flex items-center gap-3 text-gray-700"
                                    >
                                        <Share2 className="w-4 h-4 text-gray-400" /> Partager
                                    </button>
                                    <button
                                        onClick={() => { setShowMenu(false); setShowReport(true); }}
                                        className="w-full px-4 py-2.5 text-left text-sm font-medium hover:bg-red-50 flex items-center gap-3 text-red-600"
                                    >
                                        <Flag className="w-4 h-4 text-red-500" /> Signaler
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Immersive Dark Background Image Section */}
            <div className="w-full bg-gray-950 flex items-center justify-center min-h-[50vh] max-h-[85vh] relative select-none">
                <Image
                    src={photo.url}
                    alt={photo.alt}
                    fill
                    className="object-contain"
                    priority
                    quality={90}
                    sizes="100vw"
                    {...(photo.blurDataURL
                        ? { placeholder: "blur", blurDataURL: photo.blurDataURL }
                        : {})}
                />
            </div>

            {/* Image Details Section */}
            <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16">
                    
                    {/* Left column: Title, Description, Tags */}
                    <div className="lg:col-span-2 space-y-10">
                        <div className="space-y-4">
                            <h1 className="text-3xl md:text-5xl font-black text-gray-900 leading-tight text-balance">
                                {photo.title || photo.alt}
                            </h1>
                            {photo.description && (
                                <p className="text-lg text-gray-600 leading-relaxed max-w-prose">
                                    {photo.description}
                                </p>
                            )}
                        </div>

                        {(topics.length > 0 || photo.tags.length > 0) && (
                            <div className="flex flex-wrap gap-2.5">
                                {topics.map((topic) => (
                                    <Link
                                        key={topic.slug}
                                        href={`/themes/${topic.slug}`}
                                        className="px-4 py-2 bg-gray-100 text-gray-800 rounded-xl hover:bg-black hover:text-white transition-colors text-sm font-bold"
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
                                            className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl hover:border-gray-400 hover:text-black transition-colors text-sm font-medium shadow-sm"
                                        >
                                            {tag}
                                        </Link>
                                    ))}
                            </div>
                        )}
                    </div>

                    {/* Right column: Stats and Info */}
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400 mb-4">
                                Statistiques
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-5 bg-gray-50/80 rounded-2xl border border-gray-100 flex flex-col gap-1.5">
                                    <span className="flex items-center gap-1.5 text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                                        <Eye className="w-3.5 h-3.5" /> Vues
                                    </span>
                                    <span className="text-3xl font-black text-gray-900">{formatCount(photo.views)}</span>
                                </div>
                                <div className="p-5 bg-gray-50/80 rounded-2xl border border-gray-100 flex flex-col gap-1.5">
                                    <span className="flex items-center gap-1.5 text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                                        <Download className="w-3.5 h-3.5" /> DLs
                                    </span>
                                    <span className="text-3xl font-black text-gray-900">{formatCount(photo.downloads)}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400 mb-4">
                                Détails
                            </h3>
                            <div className="space-y-4">
                                {place && (
                                    <div className="flex items-start gap-3.5">
                                        <div className="p-2 bg-gray-50 rounded-lg shrink-0 text-gray-400">
                                            <MapPin className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 mt-0.5">{place}</p>
                                            <p className="text-[11px] text-gray-500 font-medium">Lieu de prise de vue</p>
                                        </div>
                                    </div>
                                )}
                                {photo.country && !place && (
                                    <div className="flex items-start gap-3.5">
                                        <div className="p-2 bg-gray-50 rounded-lg shrink-0 text-gray-400">
                                            <Globe2 className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 mt-0.5">{photo.country.name_fr}</p>
                                            <p className="text-[11px] text-gray-500 font-medium">Pays</p>
                                        </div>
                                    </div>
                                )}
                                {raw?.camera && (
                                    <div className="flex items-start gap-3.5">
                                        <div className="p-2 bg-gray-50 rounded-lg shrink-0 text-gray-400">
                                            <Camera className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 mt-0.5">{raw.camera}</p>
                                            <p className="text-[11px] text-gray-500 font-medium">Appareil photo</p>
                                        </div>
                                    </div>
                                )}
                                {publishedOn && (
                                    <div className="flex items-start gap-3.5">
                                        <div className="p-2 bg-gray-50 rounded-lg shrink-0 text-gray-400">
                                            <Check className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 mt-0.5">{publishedOn}</p>
                                            <p className="text-[11px] text-gray-500 font-medium">Date de publication</p>
                                        </div>
                                    </div>
                                )}
                                <div className="flex items-start gap-3.5">
                                    <div className="p-2 bg-emerald-50 rounded-lg shrink-0 text-emerald-600">
                                        <ShieldCheck className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <Link href="/licence" className="text-sm font-bold text-gray-900 mt-0.5 hover:underline decoration-2 underline-offset-2">
                                            Licence libre
                                        </Link>
                                        <p className="text-[11px] text-gray-500 font-medium">Gratuit pour tout usage</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="pt-2">
                            <div className="w-full h-[52px] relative group cursor-pointer">
                                <SaveToCollectionButton mediaId={photo.id} variant="outline" className="w-full h-full justify-center rounded-xl font-bold border-2" />
                            </div>
                        </div>
                    </div>
                </div>
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
