"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
    MapPin, Camera, Eye, Download, ArrowLeft, Edit2, Check, Copy,
    Share2, Flag, Globe2, X,
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
import { normalizeMedia, normalizeMediaList, formatCount, locationLabel } from "../../lib/media";

export default function PhotoDetail() {
    const { id } = useParams();
    const router = useRouter();
    const { user } = useAuth();

    const [photo, setPhoto] = useState(null);
    const [raw, setRaw] = useState(null);
    const [related, setRelated] = useState([]);
    const [liked, setLiked] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showShare, setShowShare] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [copied, setCopied] = useState(false);

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

            setRaw(data);
            setPhoto(normalizeMedia(data));
            setLoading(false);

            // Compteur de vues : passe désormais par une fonction serveur, la
            // mise à jour directe depuis le navigateur étant refusée à tout
            // visiteur non propriétaire de l'image.
            incrementViews(id);

            getRelatedMedia(data).then((rows) => {
                if (!cancelled) setRelated(normalizeMediaList(rows));
            });
        }

        load();
        return () => { cancelled = true; };
    }, [id]);

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

            <div className="sticky top-0 sm:top-16 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 px-4 h-16 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                    <button
                        onClick={() => router.back()}
                        className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-black shrink-0"
                        aria-label="Revenir en arrière"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>

                    <Link href={`/users/${photo.author.username}`} className="flex items-center gap-3 ml-2 group min-w-0">
                        <Image
                            src={photo.author.avatar}
                            alt=""
                            width={32}
                            height={32}
                            unoptimized
                            className="rounded-full object-cover border border-gray-200 shrink-0"
                        />
                        <span className="text-left hidden sm:block min-w-0">
                            <span className="block font-bold text-sm text-gray-900 truncate">{photo.author.name}</span>
                            <span className="block text-[10px] text-gray-500 tracking-wide uppercase truncate">
                                @{photo.author.username}
                            </span>
                        </span>
                    </Link>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {isOwner && (
                        <Link
                            href={`/photos/${id}/edit`}
                            className="flex items-center gap-2 px-3 py-2 border border-blue-100 bg-blue-50/50 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50 transition-all"
                        >
                            <Edit2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Modifier</span>
                        </Link>
                    )}

                    <button
                        onClick={share}
                        className="p-2 text-gray-500 hover:text-black hover:bg-gray-100 rounded-lg transition-all"
                        aria-label="Partager"
                    >
                        <Share2 className="w-5 h-5" />
                    </button>

                    <LikeButton
                        mediaId={photo.id}
                        initialLiked={liked}
                        initialCount={photo.likes}
                        variant="outline"
                        showCount
                    />

                    <DownloadButton media={photo} variant="primary" />
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-6 md:py-10">
                <div className="flex flex-col gap-10 md:gap-16">
                    <div className="w-full flex items-center justify-center bg-gray-50/50 rounded-3xl p-4 md:p-12 min-h-[400px] max-h-[85vh] relative overflow-hidden border border-gray-100">
                        <Image
                            src={photo.url}
                            alt={photo.alt}
                            fill
                            className="object-contain shadow-2xl rounded-sm z-10"
                            priority
                            quality={82}
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1200px"
                            {...(photo.blurDataURL
                                ? { placeholder: "blur", blurDataURL: photo.blurDataURL }
                                : {})}
                        />
                    </div>

                    <div className="max-w-4xl mx-auto w-full space-y-12">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
                            <div className="flex-1 space-y-6 min-w-0">
                                <Link href={`/users/${photo.author.username}`} className="flex items-center gap-4 group w-fit">
                                    <Image
                                        src={photo.author.avatar}
                                        alt=""
                                        width={64}
                                        height={64}
                                        unoptimized
                                        className="rounded-full object-cover ring-2 ring-gray-100 group-hover:ring-black transition-all shadow-sm"
                                    />
                                    <span>
                                        <span className="block font-black text-xl text-gray-900 leading-tight">
                                            {photo.author.name}
                                        </span>
                                        <span className="block text-sm text-gray-500">@{photo.author.username}</span>
                                    </span>
                                </Link>

                                <div className="space-y-4">
                                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight text-balance">
                                        {photo.title || photo.alt}
                                    </h1>
                                    {photo.description && (
                                        <p className="text-lg text-gray-500 leading-relaxed">{photo.description}</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 shrink-0">
                                <LikeButton
                                    mediaId={photo.id}
                                    initialLiked={liked}
                                    initialCount={photo.likes}
                                    variant="large"
                                />
                                <SaveToCollectionButton mediaId={photo.id} variant="outline" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-12 border-t border-gray-100">
                            <div className="space-y-8">
                                <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
                                    Statistiques
                                </h2>
                                <div className="grid grid-cols-2 gap-6">
                                    <Stat icon={Eye} label="Vues" value={photo.views} />
                                    <Stat icon={Download} label="Téléchargements" value={photo.downloads} />
                                </div>
                            </div>

                            <div className="space-y-8">
                                <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
                                    Informations
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    {place && (
                                        <Info icon={MapPin} label="Lieu">
                                            {photo.country ? (
                                                <Link href={`/pays/${photo.country.slug}`} className="hover:underline">
                                                    {place}
                                                </Link>
                                            ) : place}
                                        </Info>
                                    )}
                                    {photo.country && (
                                        <Info icon={Globe2} label="Pays">
                                            <Link href={`/pays/${photo.country.slug}`} className="hover:underline">
                                                {photo.country.emoji} {photo.country.name_fr}
                                            </Link>
                                        </Info>
                                    )}
                                    {raw?.camera && <Info icon={Camera} label="Matériel">{raw.camera}</Info>}
                                    {photo.width && photo.height && (
                                        <Info icon={Eye} label="Dimensions">
                                            {photo.width} × {photo.height} px
                                        </Info>
                                    )}
                                    <Info icon={Check} label="Licence">
                                        <Link href="/licence" className="hover:underline">Libre usage</Link>
                                    </Info>
                                    {publishedOn && <Info icon={Camera} label="Publiée le">{publishedOn}</Info>}
                                </div>
                            </div>
                        </div>

                        {(topics.length > 0 || photo.tags.length > 0) && (
                            <div className="pt-12 border-t border-gray-100">
                                <div className="flex flex-wrap gap-2">
                                    {topics.map((topic) => (
                                        <Link
                                            key={topic.slug}
                                            href={`/themes/${topic.slug}`}
                                            className="px-5 py-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-black hover:text-white transition-all text-xs font-bold border border-gray-100"
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
                                                className="px-5 py-2.5 bg-white text-gray-500 rounded-xl hover:bg-gray-50 hover:text-black transition-all text-xs font-medium border border-gray-100"
                                            >
                                                {tag}
                                            </Link>
                                        ))}
                                </div>
                            </div>
                        )}

                        {/* Signalement : le site n'offrait aucun moyen d'alerter
                            sur une image volée ou choquante. */}
                        <div className="pt-8 border-t border-gray-100">
                            <button
                                onClick={() => setShowReport(true)}
                                className="flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-red-600 transition-colors"
                            >
                                <Flag className="w-3.5 h-3.5" /> Signaler cette image
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {related.length > 0 && (
                <section className="mt-20 pt-20 border-t border-gray-100 bg-gray-50/30">
                    <div className="max-w-[1600px] mx-auto px-4 md:px-8 pb-16">
                        <h2 className="text-2xl font-black text-gray-900 mb-8">Images associées</h2>
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

function Stat({ icon: Icon, label, value }) {
    return (
        <div className="space-y-1">
            <div className="flex items-center gap-2 text-gray-400">
                <Icon className="w-4 h-4" aria-hidden="true" />
                <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
            </div>
            <p className="text-3xl font-black text-gray-900">{formatCount(value)}</p>
        </div>
    );
}

function Info({ icon: Icon, label, children }) {
    return (
        <div className="flex items-start gap-3">
            <Icon className="w-5 h-5 text-gray-300 mt-0.5 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase text-gray-400">{label}</p>
                <p className="text-sm font-bold text-gray-700 break-words">{children}</p>
            </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">Partager</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full" aria-label="Fermer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between gap-4 mb-4">
                    <p className="text-sm text-gray-600 truncate flex-1">{url}</p>
                    <button
                        onClick={onCopy}
                        className="shrink-0 flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-bold hover:bg-gray-800 transition-all active:scale-95"
                    >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied ? "Copié" : "Copier"}
                    </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    {targets.map((target) => (
                        <a
                            key={target.label}
                            href={target.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col items-center gap-2 p-3 hover:bg-gray-50 rounded-xl transition-colors"
                        >
                            <span className={`w-10 h-10 ${target.color} text-white rounded-full flex items-center justify-center`}>
                                <Share2 className="w-5 h-5" />
                            </span>
                            <span className="text-xs font-medium">{target.label}</span>
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
            <div className="sticky top-0 sm:top-16 z-30 bg-white border-b border-gray-100 px-4 h-16 flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-gray-100 rounded-full" />
                    <div className="w-8 h-8 bg-gray-100 rounded-full" />
                    <div className="space-y-1">
                        <div className="w-24 h-3 bg-gray-100 rounded" />
                        <div className="w-16 h-2 bg-gray-50 rounded" />
                    </div>
                </div>
                <div className="flex gap-2">
                    <div className="w-20 h-9 bg-gray-100 rounded-lg" />
                    <div className="w-32 h-9 bg-gray-100 rounded-lg" />
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto px-4 py-10">
                <div className="aspect-video bg-gray-100 rounded-3xl animate-pulse mb-16" />
                <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
                    <div className="w-64 h-8 bg-gray-100 rounded-lg" />
                    <div className="w-full h-4 bg-gray-50 rounded" />
                    <div className="w-3/4 h-4 bg-gray-50 rounded" />
                </div>
            </div>
        </div>
    );
}
