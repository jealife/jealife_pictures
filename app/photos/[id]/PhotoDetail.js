"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Heart, Plus, Download, Share2, MapPin, Calendar, Camera, Eye, ArrowLeft, Loader2, Edit2, Check, Copy, ChevronDown } from "lucide-react";
import Link from "next/link";
import MasonryGrid from "../../components/MasonryGrid";
import { getMediaById, incrementDownloads, incrementViews } from "../../lib/database";
import { useAuth } from "../../contexts/AuthContext";

export default function PhotoDetail() {
    const { id } = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const [photo, setPhoto] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showShareModal, setShowShareModal] = useState(false);
    const [copied, setCopied] = useState(false);
    const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        window.scrollTo(0, 0);

        async function fetchPhoto() {
            setLoading(true);
            try {
                const data = await getMediaById(id);
                if (data) {
                    setPhoto({
                        ...data,
                        author: {
                            name: data.profiles?.full_name || data.profiles?.username || 'Anonyme',
                            username: data.profiles?.username || 'unknown',
                            avatar: data.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.profiles?.id}`
                        }
                    });

                    // Increment views count dynamically
                    incrementViews(id);
                }
            } catch (err) {
                console.error("Error fetching photo:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchPhoto();
    }, [id]);

    const handleDownload = async (size = 'original') => {
        if (!photo) return;
        setIsDownloading(true);
        setDownloadMenuOpen(false);

        try {
            // Logique de téléchargement
            let downloadUrl = photo.url;
            const filename = `jealife-${photo.title?.toLowerCase().replace(/\s+/g, '-') || 'photo'}-${size}.jpg`;

            // Si on avait une API de redimensionnement, on l'utiliserait ici
            // Pour l'instant on télécharge l'original, mais on prépare la structure

            const response = await fetch(downloadUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            // Incrémenter les stats
            await incrementDownloads(photo.id);

            // Mettre à jour l'UI locale
            setPhoto(prev => ({ ...prev, downloads_count: (prev.downloads_count || 0) + 1 }));
        } catch (err) {
            console.error("Download failed:", err);
        } finally {
            setIsDownloading(false);
        }
    };

    const downloadSizes = [
        { label: 'Petit', width: 640, key: 'small' },
        { label: 'Moyen', width: 1920, key: 'medium' },
        { label: 'Grand', width: 2400, key: 'large' },
        { label: 'Format original', width: null, key: 'original' }
    ];

    const handleShare = async () => {
        // ... (share logic remains same)
        const shareData = {
            title: photo.title || 'Photo sur JEaLiFe Pictures',
            text: photo.description || 'Découvrez cette superbe photo sur JEaLiFe Pictures',
            url: typeof window !== 'undefined' ? window.location.href : '',
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                setShowShareModal(true);
            }
        } else {
            setShowShareModal(true);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(typeof window !== 'undefined' ? window.location.href : '');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white">
                {/* Header Skeleton */}
                <div className="sticky top-0 sm:top-16 z-30 bg-white border-b border-gray-100 px-4 h-16 flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-gray-100 rounded-full"></div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-100 rounded-full"></div>
                            <div className="space-y-1">
                                <div className="w-24 h-3 bg-gray-100 rounded"></div>
                                <div className="w-16 h-2 bg-gray-50 rounded"></div>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <div className="w-20 h-9 bg-gray-100 rounded-lg"></div>
                        <div className="w-32 h-9 bg-gray-100 rounded-lg"></div>
                    </div>
                </div>

                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
                        {/* Image Skeleton */}
                        <div className="aspect-video bg-gray-100 rounded-2xl animate-pulse"></div>

                        {/* Sidebar Skeleton */}
                        <div className="space-y-8 animate-pulse">
                            <div className="space-y-2">
                                <div className="w-full h-8 bg-gray-100 rounded-lg"></div>
                                <div className="w-3/4 h-4 bg-gray-50 rounded-lg"></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="h-24 bg-gray-50 rounded-2xl"></div>
                                <div className="h-24 bg-gray-50 rounded-2xl"></div>
                            </div>
                            <div className="space-y-4 pt-4 border-t border-gray-100">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="flex gap-3">
                                        <div className="w-5 h-5 bg-gray-50 rounded"></div>
                                        <div className="w-32 h-4 bg-gray-50 rounded"></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!photo) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white text-center px-4">
                <h2 className="text-2xl font-bold mb-4">Oups, cette photo n'existe pas.</h2>
                <Link href="/" className="px-6 py-3 bg-black text-white rounded-xl font-bold">
                    Retour à l'accueil
                </Link>
            </div>
        );
    }

    const isOwner = user?.id === photo.user_id;
    const formattedDate = new Date(photo.created_at).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    // SEO: JSON-LD for ImageObject
    const jsonLd = {
        "@context": "https://schema.org/",
        "@type": "ImageObject",
        "contentUrl": photo.url,
        "datePublished": photo.created_at,
        "description": photo.description || photo.title,
        "name": photo.title,
        "author": {
            "@type": "Person",
            "name": photo.author.name
        },
        "interactionStatistic": {
            "@type": "InteractionCounter",
            "interactionType": "https://schema.org/WatchAction",
            "userInteractionCount": photo.views_count || 0
        }
    };

    return (
        <div className="min-h-screen bg-white">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            {/* Sticky Header */}
            <div className="sticky top-0 sm:top-16 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-black">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-3 ml-2">
                        <Link href={`/users/${photo.author.username}`} className="flex items-center gap-3 group">
                            <img
                                src={photo.author.avatar}
                                alt={photo.author.name}
                                className="w-8 h-8 rounded-full object-cover border border-gray-200"
                            />
                            <div className="text-left hidden xs:block">
                                <p className="font-bold text-sm text-gray-900 group-hover:text-black leading-tight">{photo.author.name}</p>
                                <p className="text-[10px] text-gray-500 tracking-wide uppercase">@{photo.author.username}</p>
                            </div>
                        </Link>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isOwner && (
                        <Link
                            href={`/photos/${id}/edit`}
                            className="flex items-center gap-2 px-3 py-2 border border-blue-100 bg-blue-50/50 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50 transition-all mr-2"
                        >
                            <Edit2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Modifier</span>
                        </Link>
                    )}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleShare}
                            className="p-2 text-gray-500 hover:text-black hover:bg-gray-100 rounded-lg transition-all"
                            title="Partager"
                        >
                            <Share2 className="w-5 h-5" />
                        </button>
                        <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:text-black hover:border-black transition-all">
                            <Heart className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-10 py-6 md:py-10">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-12 items-start">

                    {/* Left Side: The Image (Main Stage) */}
                    <div className="lg:sticky lg:top-32">
                        <div className="bg-gray-50/50 rounded-3xl p-4 md:p-8 flex items-center justify-center min-h-[500px] max-h-[85vh] group relative overflow-hidden ring-1 ring-gray-100">
                            <img
                                src={photo.url}
                                alt={photo.title || "Photo"}
                                className="max-h-[75vh] w-auto h-auto object-contain shadow-2xl rounded-sm z-10"
                            />
                            {/* Decorative background blur */}
                            <div className="absolute inset-0 blur-3xl opacity-10 pointer-events-none scale-150">
                                <img src={photo.url} alt="" className="w-full h-full object-cover" />
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Control Center (Info & Actions) */}
                    <div className="space-y-10">
                        {/* 1. Author & Primary Actions */}
                        <div className="space-y-6">
                            <div className="flex items-start justify-between">
                                <Link href={`/users/${photo.author.username}`} className="flex items-center gap-4 group">
                                    <img
                                        src={photo.author.avatar}
                                        alt={photo.author.name}
                                        className="w-14 h-14 rounded-full object-cover ring-2 ring-gray-100 group-hover:ring-black transition-all"
                                    />
                                    <div className="text-left">
                                        <p className="font-black text-xl text-gray-900 leading-tight">{photo.author.name}</p>
                                        <p className="text-sm text-gray-500">@{photo.author.username}</p>
                                    </div>
                                </Link>
                                <button className="p-3 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-2xl transition-all border border-gray-100 active:scale-90">
                                    <Heart className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <h1 className="text-3xl font-black text-gray-900 leading-tight">
                                    {photo.title || "Image sans titre"}
                                </h1>
                                {photo.description && (
                                    <p className="text-gray-500 leading-relaxed">
                                        {photo.description}
                                    </p>
                                )}
                            </div>

                            <div className="flex gap-3">
                                <div className="relative flex-1">
                                    <button
                                        onClick={() => handleDownload('original')}
                                        disabled={isDownloading}
                                        className="w-full h-14 bg-black text-white rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-xl active:scale-95 disabled:opacity-70 flex items-center justify-center gap-3"
                                    >
                                        {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                                        Télécharger Gratuitement
                                    </button>
                                </div>
                                <button
                                    onClick={() => setDownloadMenuOpen(!downloadMenuOpen)}
                                    className="h-14 w-14 bg-gray-100 text-gray-900 rounded-2xl hover:bg-gray-200 transition-all flex items-center justify-center border border-gray-200"
                                >
                                    <ChevronDown className={`w-5 h-5 transition-transform ${downloadMenuOpen ? 'rotate-180' : ''}`} />
                                </button>
                            </div>
                        </div>

                        {/* 2. Insights Bento Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-6 bg-gray-50 rounded-[32px] border border-gray-100 hover:bg-white hover:shadow-lg transition-all">
                                <div className="flex items-center gap-3 text-gray-400 mb-2">
                                    <Eye className="w-5 h-5" />
                                    <span className="text-[11px] font-bold uppercase tracking-widest">Vues</span>
                                </div>
                                <p className="text-2xl font-black text-gray-900">{photo.views_count?.toLocaleString() || 0}</p>
                            </div>
                            <div className="p-6 bg-gray-50 rounded-[32px] border border-gray-100 hover:bg-white hover:shadow-lg transition-all">
                                <div className="flex items-center gap-3 text-gray-400 mb-2">
                                    <Download className="w-5 h-5" />
                                    <span className="text-[11px] font-bold uppercase tracking-widest">Downloads</span>
                                </div>
                                <p className="text-2xl font-black text-gray-900">{photo.downloads_count?.toLocaleString() || 0}</p>
                            </div>
                        </div>

                        {/* 3. Detailed Specs Section */}
                        <div className="space-y-6 pt-8 border-t border-gray-100">
                            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-400">Information Technique</h3>
                            <div className="grid grid-cols-1 gap-5">
                                {photo.location && (
                                    <div className="flex items-center gap-4 group">
                                        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                                            <MapPin className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase text-gray-400">Localisation</p>
                                            <p className="text-sm font-bold text-gray-900">{photo.location}</p>
                                        </div>
                                    </div>
                                )}
                                {photo.camera && (
                                    <div className="flex items-center gap-4 group">
                                        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-purple-50 group-hover:text-purple-500 transition-colors">
                                            <Camera className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase text-gray-400">Appareil & Optique</p>
                                            <p className="text-sm font-bold text-gray-900">{photo.camera}</p>
                                        </div>
                                    </div>
                                )}
                                <div className="flex items-center gap-4 group">
                                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-green-50 group-hover:text-green-500 transition-colors">
                                        <Check className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase text-gray-400">Licence de l'image</p>
                                        <p className="text-sm font-bold text-gray-900">Usage commercial libre</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 4. Tags Box */}
                        {photo.tags && photo.tags.length > 0 && (
                            <div className="pt-8 border-t border-gray-100">
                                <div className="flex flex-wrap gap-2">
                                    {photo.tags.map(tag => (
                                        <Link
                                            key={tag}
                                            href={`/?q=${tag.toLowerCase()}`}
                                            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-black hover:text-white transition-all text-xs font-bold"
                                        >
                                            {tag}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Related Photos Section */}
            <div className="mt-20 pt-20 border-t border-gray-100 bg-gray-50/30">
                <div className="max-w-[1600px] mx-auto px-4 md:px-8 text-left">
                    <h2 className="text-2xl font-black text-gray-900 mb-8">Images associées</h2>
                    <MasonryGrid
                        searchQuery={photo.tags?.[0] || photo.title?.split(' ')[0]}
                    />
                </div>
            </div>

            {/* Simple Share Modal */}
            {showShareModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold">Partager cette photo</h3>
                            <button onClick={() => setShowShareModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <Plus className="w-5 h-5 rotate-45" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between gap-4">
                                <p className="text-sm text-gray-600 truncate flex-1 leading-none">{typeof window !== 'undefined' ? window.location.href : ''}</p>
                                <button
                                    onClick={copyToClipboard}
                                    className="shrink-0 flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-bold hover:bg-gray-800 transition-all active:scale-95"
                                >
                                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    {copied ? 'Copié !' : 'Copier'}
                                </button>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <a
                                    href={`https://wa.me/?text=${encodeURIComponent(`${photo.title || 'Photo'} sur JEaLiFe Pictures: ${typeof window !== 'undefined' ? window.location.href : ''}`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex flex-col items-center gap-2 p-3 hover:bg-gray-50 rounded-xl transition-colors text-center"
                                >
                                    <div className="w-10 h-10 bg-[#25D366] text-white rounded-full flex items-center justify-center">
                                        <Share2 className="w-5 h-5" />
                                    </div>
                                    <span className="text-xs font-medium">WhatsApp</span>
                                </a>
                                <a
                                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex flex-col items-center gap-2 p-3 hover:bg-gray-50 rounded-xl transition-colors text-center"
                                >
                                    <div className="w-10 h-10 bg-[#1877F2] text-white rounded-full flex items-center justify-center">
                                        <Share2 className="w-5 h-5" />
                                    </div>
                                    <span className="text-xs font-medium">Facebook</span>
                                </a>
                                <a
                                    href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&text=${encodeURIComponent(photo.title || 'Belle photo sur JEaLiFe Pictures')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex flex-col items-center gap-2 p-3 hover:bg-gray-50 rounded-xl transition-colors text-center"
                                >
                                    <div className="w-10 h-10 bg-gray-900 text-white rounded-full flex items-center justify-center">
                                        <Share2 className="w-5 h-5" />
                                    </div>
                                    <span className="text-xs font-medium">Twitter</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )
            }
        </div >
    );
}
