"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Heart, Plus, Download, Share2, MapPin, Calendar, Camera, Eye, ArrowLeft, Loader2, Edit2, Check, Copy, ChevronDown } from "lucide-react";
import Link from "next/link";
import { getMediaById, incrementDownloads } from "../../lib/database";
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
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="w-10 h-10 animate-spin text-gray-300" />
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
                    <div className="flex items-center gap-2 mr-2">
                        <button
                            onClick={handleShare}
                            className="p-2 text-gray-500 hover:text-black hover:bg-gray-100 rounded-lg transition-all"
                            title="Partager"
                        >
                            <Share2 className="w-5 h-5" />
                        </button>
                        <button className="hidden sm:flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:text-black hover:border-black transition-all">
                            <Heart className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="relative flex items-center">
                        <button
                            onClick={() => handleDownload('original')}
                            disabled={isDownloading}
                            className="h-10 px-5 bg-green-600 text-white rounded-l-lg font-bold text-sm hover:bg-green-700 transition-all shadow-sm flex items-center gap-2 disabled:opacity-70"
                        >
                            {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Télécharger"}
                        </button>
                        <div className="h-10 w-[1px] bg-green-700/30"></div>
                        <button
                            onClick={() => setDownloadMenuOpen(!downloadMenuOpen)}
                            className="h-10 px-2 bg-green-600 text-white rounded-r-lg hover:bg-green-700 transition-all shadow-sm flex items-center"
                        >
                            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${downloadMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Download Dropdown */}
                        {downloadMenuOpen && (
                            <div className="absolute right-0 top-12 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                <div className="p-2">
                                    {downloadSizes.map((size) => (
                                        <button
                                            key={size.key}
                                            onClick={() => handleDownload(size.key)}
                                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors group"
                                        >
                                            <div className="text-left">
                                                <p className="text-sm font-semibold text-gray-900 group-hover:text-black">{size.label}</p>
                                                {size.width && <p className="text-[10px] text-gray-400">{size.width} px</p>}
                                            </div>
                                            <Download className="w-4 h-4 text-gray-300 group-hover:text-green-600 transition-colors" />
                                        </button>
                                    ))}
                                </div>
                                <div className="p-4 bg-gray-50 border-t border-gray-100">
                                    <p className="text-[10px] text-gray-400 italic leading-tight">
                                        Toutes les photos sur JEaLiFe Pictures sont gratuites et sous licence libre.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8 items-start">

                    <div className="flex flex-col gap-6">
                        <div className="relative w-full bg-gray-50 rounded-lg flex items-center justify-center min-h-[400px] max-h-[85vh] p-2 sm:p-4">
                            <img
                                src={photo.url}
                                alt={photo.title || "Photo"}
                                className="max-h-[80vh] w-auto h-auto object-contain shadow-sm rounded-sm"
                            />
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 leading-tight mb-4">{photo.title || "Titre de la photo"}</h1>
                            {photo.description && (
                                <p className="text-gray-500 leading-relaxed font-sans">{photo.description}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-2xl bg-gray-50 border border-transparent hover:border-gray-200 transition-colors">
                                <div className="flex items-center gap-2 text-gray-500 mb-1">
                                    <Eye className="w-4 h-4" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Vues</span>
                                </div>
                                <p className="text-2xl font-black text-gray-900">{photo.views_count?.toLocaleString() || 0}</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-gray-50 border border-transparent hover:border-gray-200 transition-colors">
                                <div className="flex items-center gap-2 text-gray-500 mb-1">
                                    <Download className="w-4 h-4" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Downloads</span>
                                </div>
                                <p className="text-2xl font-black text-gray-900">{photo.downloads_count?.toLocaleString() || 0}</p>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-gray-100">
                            {photo.location && (
                                <div className="flex items-center gap-3 text-gray-600">
                                    <MapPin className="w-5 h-5 text-gray-400" />
                                    <span className="text-sm font-medium">{photo.location}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-3 text-gray-600">
                                <Calendar className="w-5 h-5 text-gray-400" />
                                <span className="text-sm font-medium">Publiée le {formattedDate}</span>
                            </div>
                            {photo.camera && (
                                <div className="flex items-center gap-3 text-gray-600">
                                    <Camera className="w-5 h-5 text-gray-400" />
                                    <span className="text-sm font-medium font-sans">{photo.camera}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-3 text-gray-600">
                                <div className="w-5 h-5 flex items-center justify-center">
                                    <Check className="w-4 h-4 text-green-500" />
                                </div>
                                <span className="text-sm font-medium">Licence JEaLiFe Libre Usage</span>
                            </div>
                        </div>

                        {photo.tags && photo.tags.length > 0 && (
                            <div className="space-y-3 pt-6 border-t border-gray-100">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Mots-clés</h3>
                                <div className="flex flex-wrap gap-2">
                                    {photo.tags.map(tag => (
                                        <Link
                                            key={tag}
                                            href={`/search?q=${tag}`}
                                            className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 hover:text-black transition-all text-xs font-medium"
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
            )}
        </div>
    );
}
