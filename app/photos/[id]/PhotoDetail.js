"use client";

import { useParams, useRouter, usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
    MapPin, Camera, Eye, Download, ArrowLeft, Edit2, Check, Copy,
    Share2, Flag, Globe2, X, MoreHorizontal, ShieldCheck, Calendar, Info,
    Mail, Twitter, Instagram, ChevronDown, Sparkles
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
import {
    normalizeMedia, normalizeMediaList, formatCount, locationLabel, parseMediaId, mediaUrl,
    fetchPhotoAccess,
} from "../../lib/media";

/**
 * `initialPhoto` est la ligne déjà chargée par le composant serveur (voir
 * page.js). La fiche part donc complète dès le premier rendu — image,
 * titre et description sont dans le HTML initial, et le navigateur commence
 * à télécharger l'image à l'analyse du document plutôt qu'après hydratation
 * puis requête Supabase. Seuls les compléments non essentiels au premier
 * affichage (images associées, état « j'aime ») restent chargés ensuite.
 */
export default function PhotoDetail({ initialPhoto }) {
    const { id: rawId } = useParams();
    const router = useRouter();
    const pathname = usePathname();
    const { user } = useAuth();

    // Le composant serveur interroge Supabase sans session : la RLS ne lui
    // laisse voir que les médias publiés. Une photo en attente de modération
    // ou rejetée revient donc vide côté serveur, alors que son auteur (et un
    // admin) a parfaitement le droit de la consulter — c'est le lien « Voir
    // mon envoi » affiché juste après une publication en mode manuel. On ne
    // retombe sur une requête client, porteuse de la session, que dans ce cas
    // précis : une photo publiée, soit l'écrasante majorité, n'en paie jamais
    // le coût. `undefined` = pas encore vérifié, `null` = introuvable.
    const [fallback, setFallback] = useState(undefined);
    const source = initialPhoto ?? (fallback === undefined ? null : fallback);
    const checkingFallback = !initialPhoto && Boolean(user) && fallback === undefined;

    const raw = source;
    const photo = useMemo(() => (source ? normalizeMedia(source) : null), [source]);

    const [related, setRelated] = useState([]);
    const [liked, setLiked] = useState(false);
    const [showShare, setShowShare] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showConnect, setShowConnect] = useState(false);

    useEffect(() => {
        if (initialPhoto || !user) return;
        let cancelled = false;
        getMediaById(parseMediaId(rawId)).then((data) => {
            if (!cancelled) setFallback(data ?? null);
        });
        return () => { cancelled = true; };
    }, [initialPhoto, user, rawId]);

    useEffect(() => {
        window.scrollTo(0, 0);
        if (!photo) return;

        // Redirection canonique silencieuse si l'URL ne correspond pas au
        // slug : on s'arrête là et on laisse cet effet se redéclencher une
        // fois `pathname` mis à jour (il est dans les dépendances). Continuer
        // ici en plus de ce second passage comptait chaque vue deux fois pour
        // toute entrée par une URL non canonique (lien brut `/photos/123`,
        // ancien lien partagé avant renommage…).
        const canonicalPath = mediaUrl(photo);
        if (pathname !== canonicalPath) {
            router.replace(canonicalPath, { scroll: false });
            return;
        }

        incrementViews(photo.id);

        let cancelled = false;
        getRelatedMedia(initialPhoto).then((rows) => {
            if (!cancelled) setRelated(normalizeMediaList(rows));
        });
        return () => { cancelled = true; };
    }, [initialPhoto, photo, pathname, router]);

    useEffect(() => {
        if (!user || !photo) return;
        hasUserLikedMedia(photo.id, user.id).then(setLiked);
    }, [user, photo]);

    // `initialPhoto` arrive déjà amputé de `url`/`original_url` pour un média
    // Premium (voir page.js, aucune session côté serveur) : on revérifie ici
    // avec la session du navigateur, seule à pouvoir prouver la propriété ou
    // un achat. Tant que ce n'est pas résolu, `premiumAccess` reste `null` et
    // la fiche affiche l'aperçu verrouillé.
    const [premiumAccess, setPremiumAccess] = useState(null);
    useEffect(() => {
        // Rien à vérifier pour un média gratuit : `premiumAccess` reste
        // inutilisé dans ce cas (voir `premiumLocked` plus bas), inutile de
        // le remettre à `null` en plus.
        if (!photo?.isPremium) return;
        let cancelled = false;
        fetchPhotoAccess(photo.id).then((result) => {
            if (!cancelled) setPremiumAccess(result);
        });
        return () => { cancelled = true; };
    }, [photo?.id, photo?.isPremium]);

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

    if (!photo && checkingFallback) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300 dark:border-zinc-700" />
            </div>
        );
    }

    if (!photo) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-zinc-950 text-center px-4">
                <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-zinc-100">Cette image n&apos;existe pas ou n&apos;est plus publiée.</h1>
                <Link href="/" className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold hover:bg-gray-800 dark:hover:bg-zinc-200 transition-colors">
                    Retour à l&apos;accueil
                </Link>
            </div>
        );
    }

    const isOwner = user?.id === raw?.user_id;
    const place = locationLabel(photo);
    const topics = (raw?.media_topics || []).map((link) => link.topics).filter(Boolean);
    // Réglages relevés dans l'EXIF au moment du dépôt (migration 0016).
    // Focale et ouverture partagent une ligne : c'est ainsi qu'un
    // photographe les lit (« 35.0mm f/2.4 »).
    const exposure = [raw?.focal_length, raw?.aperture].filter(Boolean).join(" ");
    const shootingDetails = [
        { label: "Appareil photo", value: raw?.camera },
        { label: "Objectif", value: raw?.lens },
        { label: "Exposition", value: [exposure, raw?.shutter_speed].filter(Boolean).join(" · ") },
        { label: "ISO", value: raw?.iso ? String(raw.iso) : null },
        {
            label: "Dimensions",
            value: raw?.width && raw?.height ? `${raw.width} × ${raw.height}` : null,
        },
    ].filter((detail) => detail.value);

    const publishedOn = raw?.created_at
        ? new Date(raw.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
        : null;

    const isVideo = photo.type === "video";

    // Tant que `premiumAccess` n'a pas confirmé un droit d'accès (achat,
    // propriété, admin), aucune adresse réelle n'est affichée — seule la
    // vignette (déjà publique) sert d'aperçu flouté. `photo.url` vaut déjà
    // `null` pour un média Premium non déverrouillé (voir page.js /
    // normalizeMedia), donc `premiumAccess?.url` est la seule source valable
    // une fois débloqué.
    const premiumLocked = photo.isPremium && !premiumAccess?.url;
    const displayUrl = photo.isPremium ? premiumAccess?.url : photo.url;
    const playbackUrl = photo.isPremium ? premiumAccess?.originalUrl : photo.originalUrl;

    const unlockPremiumPreview = () => {
        if (!photo.isPremium) return;
        fetchPhotoAccess(photo.id).then(setPremiumAccess);
    };

    return (
        <div className="min-h-screen bg-white dark:bg-zinc-950">

            {/* Sticky Bar */}
            <div className="sticky top-16 z-30 bg-white dark:bg-zinc-950 px-4 h-[72px] flex items-center justify-between gap-3">
                <div className="flex items-center gap-1 min-w-0">
                    {/* <button
                        onClick={() => router.back()}
                        className="sm:hidden p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-black shrink-0"
                        aria-label="Revenir en arrière"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button> */}

                    <Link href={`/@${photo.author.username}`} className="shrink-0 group">
                        <Image
                            src={photo.author.avatar}
                            alt=""
                            width={36}
                            height={36}
                            unoptimized
                            className="rounded-full object-cover shrink-0 ring-1 ring-gray-200 dark:ring-zinc-700 group-hover:ring-gray-300 dark:group-hover:ring-zinc-600 transition-all"
                        />
                    </Link>
                    <div className="flex flex-col min-w-0">
                        <Link href={`/@${photo.author.username}`} className="group">
                            <span className="font-bold text-[15px] text-gray-900 dark:text-zinc-100 truncate leading-tight group-hover:underline">{photo.author.name}</span>
                        </Link>
                        {/* Menu "Connectez-vous avec" */}
                        <div className="relative">
                            <button
                                onClick={(e) => { e.preventDefault(); setShowConnect(!showConnect); }}
                                aria-expanded={showConnect}
                                title="Contacter le photographe"
                                className="flex text-[13px] text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 font-medium truncate items-center gap-1 transition-colors"
                            >
                                {/* « Disponible » affiché pour tout le monde, y compris le compte
                                    JEaLiFe Stock qui n'a jamais activé cette option, ne reflétait
                                    rien — voir la même distinction sur la page de profil
                                    ([handle]/layout.js). Le bouton reste cliquable dans tous les
                                    cas (site web / réseaux restent joignables), seul le mot change. */}
                                {photo.author.isAvailableForHire ? "Disponible à l'embauche" : "Contacter"}
                                <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${showConnect ? "rotate-180" : ""}`} />
                            </button>

                            {showConnect && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowConnect(false)} />
                                    <div className="absolute left-0 top-full mt-2 w-56 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-xl rounded-md overflow-hidden z-50 py-1">
                                        <div className="px-4 py-2 text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider bg-gray-50/50 dark:bg-zinc-800/50">
                                            Connectez-vous avec {photo.author.name}
                                        </div>
                                        {photo.author.email && (
                                            <a href={`mailto:${photo.author.email}`} className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                                                <Mail className="w-4 h-4 text-gray-400 dark:text-zinc-500" /> Envoyer un email
                                            </a>
                                        )}
                                        {photo.author.website && (
                                            <a href={photo.author.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                                                <Globe2 className="w-4 h-4 text-gray-400 dark:text-zinc-500" /> Site web
                                            </a>
                                        )}
                                        {photo.author.instagramUsername && (
                                            <a href={`https://instagram.com/${photo.author.instagramUsername}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                                                <Instagram className="w-4 h-4 text-gray-400 dark:text-zinc-500" /> Instagram
                                            </a>
                                        )}
                                        {photo.author.twitterUsername && (
                                            <a href={`https://twitter.com/${photo.author.twitterUsername}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                                                <Twitter className="w-4 h-4 text-gray-400 dark:text-zinc-500" /> Twitter
                                            </a>
                                        )}
                                        {!photo.author.email && !photo.author.website && !photo.author.instagramUsername && !photo.author.twitterUsername && (
                                            <div className="px-4 py-3 text-[13px] text-gray-500 dark:text-zinc-400 italic">
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
                    <SaveToCollectionButton mediaId={photo.id} variant="outline" className="hidden sm:flex justify-center w-9 sm:w-auto h-9 sm:px-3 border-gray-300 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 hover:border-gray-900 hover:text-gray-900 dark:hover:border-zinc-400 dark:hover:text-white rounded-md shadow-sm" />
                    <LikeButton
                        mediaId={photo.id}
                        initialLiked={liked}
                        initialCount={photo.likes}
                        variant="outline"
                        className="hidden sm:flex justify-center w-9 sm:w-auto h-9 sm:px-3 border-gray-300 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 hover:border-gray-900 hover:text-gray-900 dark:hover:border-zinc-400 dark:hover:text-white rounded-md shadow-sm"
                    />

                    {isOwner && (
                        <Link
                            href={`/photos/${rawId}/edit`}
                            className="flex items-center gap-2 h-9 px-2.5 sm:px-3 border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-md text-[13px] font-medium text-gray-700 dark:text-zinc-300 hover:border-gray-900 hover:text-gray-900 dark:hover:border-zinc-400 dark:hover:text-white transition-all shadow-sm"
                            title="Modifier l'image"
                        >
                            <Edit2 className="w-3.5 h-3.5 shrink-0" />
                            <span className="hidden sm:inline">Modifier l&apos;image</span>
                        </Link>
                    )}

                    <DownloadButton media={photo} variant="primary" onDownloaded={unlockPremiumPreview} />
                </div>
            </div>

            {/* Unsplash-style Image Container */}
            <div className="w-full bg-white dark:bg-zinc-950 sm:px-4 lg:px-8 py-0 sm:py-6 flex justify-center">
                <div className="relative flex items-center justify-center bg-gray-50 dark:bg-zinc-900 overflow-hidden sm:rounded-[2px]">
                    {premiumLocked ? (
                        <LockedPreview thumbnailUrl={photo.thumbnailUrl} width={photo.width} height={photo.height} />
                    ) : isVideo ? (
                        <video
                            src={playbackUrl}
                            poster={displayUrl || photo.thumbnailUrl}
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
                            src={displayUrl}
                            alt={photo.alt}
                            width={photo.width || 1200}
                            height={photo.height || 800}
                            // Borne la taille réellement demandée à l'optimiseur d'images
                            // (lui-même adossé à R2 via next.config.js) : sans cet indice,
                            // Next suppose par défaut une image sur 100 % de la largeur de
                            // l'écran et va chercher une variante inutilement grande sur
                            // desktop, alors que `max-height` limite déjà l'affichage réel.
                            sizes="(max-width: 768px) 100vw, (max-width: 1536px) 90vw, 1600px"
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
                            <span className="text-[13px] text-gray-500 dark:text-zinc-400 font-medium mb-1">Vues</span>
                            <span className="text-[15px] font-semibold text-gray-900 dark:text-zinc-100">{formatCount(photo.views)}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[13px] text-gray-500 dark:text-zinc-400 font-medium mb-1">Téléchargements</span>
                            <span className="text-[15px] font-semibold text-gray-900 dark:text-zinc-100">{formatCount(photo.downloads)}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <LikeButton
                            mediaId={photo.id}
                            initialLiked={liked}
                            initialCount={photo.likes}
                            variant="outline"
                            className="flex sm:hidden items-center justify-center h-8 w-10 border border-gray-300 dark:border-zinc-700 rounded-md text-gray-600 dark:text-zinc-400 shadow-sm"
                        />
                        <SaveToCollectionButton
                            mediaId={photo.id}
                            variant="outline"
                            className="flex sm:hidden items-center justify-center h-8 w-10 border-gray-300 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 rounded-md shadow-sm"
                        />
                        <button
                            onClick={share}
                            className="flex items-center gap-2 h-8 px-3 border border-gray-300 dark:border-zinc-700 rounded-md text-[13px] font-medium text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-900 dark:hover:border-zinc-400 transition-colors shadow-sm"
                        >
                            <Share2 className="w-4 h-4 text-gray-400 dark:text-zinc-500" /> <span className="hidden sm:inline">Partager</span>
                        </button>
                        <div className="relative">
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="flex items-center justify-center w-10 h-8 border border-gray-300 dark:border-zinc-700 rounded-md text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-900 dark:hover:border-zinc-400 transition-colors shadow-sm"
                                aria-label="Plus d'options"
                            >
                                <MoreHorizontal className="w-4 h-4 text-gray-400 dark:text-zinc-500" />
                            </button>

                            {showMenu && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-xl rounded-md overflow-hidden z-50 py-1">
                                        <button
                                            onClick={() => { setShowMenu(false); setShowReport(true); }}
                                            className="w-full px-4 py-2 text-left text-[13px] hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300"
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
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-zinc-100 leading-snug text-balance">
                        {photo.title || photo.alt}
                    </h1>

                    {photo.description && (
                        <p className="text-[15px] text-gray-700 dark:text-zinc-300 leading-relaxed max-w-prose">
                            {photo.description}
                        </p>
                    )}

                    <div className="space-y-3 pt-2">
                        {(place || photo.country) && (
                            <div className="flex items-center gap-3 text-[14px] text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer w-fit">
                                <MapPin className="w-4 h-4" />
                                <span>{place || photo.country?.name_fr}</span>
                            </div>
                        )}
                        {publishedOn && (
                            <div className="flex items-center gap-3 text-[14px] text-gray-500 dark:text-zinc-400">
                                <Calendar className="w-4 h-4" />
                                <span>Publiée le {publishedOn}</span>
                            </div>
                        )}
                        {raw?.camera && (
                            // Réglages de prise de vue au survol : ils encombreraient
                            // la fiche affichés en permanence, mais renseignent le
                            // photographe qui vient précisément voir comment
                            // l'image a été faite. `focus-within` double le survol
                            // pour le clavier et le tactile.
                            <div className="relative group w-fit">
                                <div
                                    tabIndex={0}
                                    className="flex items-center gap-3 text-[14px] text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors outline-none"
                                >
                                    <Camera className="w-4 h-4" />
                                    <span>{raw.camera}</span>
                                </div>

                                {shootingDetails.length > 0 && (
                                    <div className="absolute left-0 bottom-full mb-2 z-30 w-max max-w-xs hidden group-hover:block group-focus-within:block bg-gray-900 dark:bg-zinc-800 text-white rounded-xl shadow-xl px-4 py-3 space-y-2.5">
                                        {shootingDetails.map(({ label, value }) => (
                                            <div key={label}>
                                                <p className="text-[11px] text-gray-400 dark:text-zinc-500">{label}</p>
                                                <p className="text-[13px] font-medium leading-snug">{value}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="flex items-center gap-3 text-[14px] text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors">
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
                                className="px-3 py-1.5 bg-[#eeeeee] dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-[#e1e1e1] dark:hover:bg-zinc-700 hover:text-gray-900 dark:hover:text-white rounded-[4px] transition-colors text-[13px] capitalize"
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
                                    className="px-3 py-1.5 bg-[#eeeeee] dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-[#e1e1e1] dark:hover:bg-zinc-700 hover:text-gray-900 dark:hover:text-white rounded-[4px] transition-colors text-[13px] capitalize"
                                >
                                    {tag}
                                </Link>
                            ))}
                    </div>
                )}
            </div>

            {/* Related Images */}
            {related.length > 0 && (
                <section className="mt-10 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50">
                    <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-16">
                        <h2 className="text-2xl font-black text-gray-900 dark:text-zinc-100 mb-8">Images similaires</h2>
                        <div className="columns-2 lg:columns-3 gap-3 sm:gap-6">
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

/**
 * Aperçu d'un média Premium non débloqué : la vignette (déjà publique,
 * 800px max, voir images.js) suffit à donner une idée de l'image sans
 * jamais remplacer l'achat — le flou appuie le message plutôt que de
 * compter dessus comme seule protection, qui tient déjà côté serveur
 * (voir /api/photo-access).
 */
function LockedPreview({ thumbnailUrl, width, height }) {
    return (
        <div
            className="relative w-full max-w-2xl overflow-hidden bg-gray-100 dark:bg-zinc-800 flex items-center justify-center sm:rounded-sm"
            style={width && height ? { aspectRatio: `${width} / ${height}` } : { minHeight: 320 }}
        >
            {thumbnailUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={thumbnailUrl}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-70"
                />
            )}
            <div className="relative flex flex-col items-center gap-3 text-center px-6 py-10 mx-4 bg-black/45 backdrop-blur-sm rounded-2xl">
                <div className="w-12 h-12 bg-white/15 rounded-full flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                </div>
                <p className="text-white font-bold">Contenu Premium</p>
                <p className="text-white/80 text-sm max-w-xs">
                    Débloquez cette image en pleine résolution avec des crédits.
                </p>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-black text-gray-900 dark:text-zinc-100">Partager</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-gray-600 dark:text-zinc-400" aria-label="Fermer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex justify-center mb-6">
                    <Image
                        src="/share.png"
                        alt="Illustration Partager"
                        width={140}
                        height={140}
                        className="w-32 h-auto object-contain"
                    />
                </div>

                <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-2xl border border-gray-100 dark:border-zinc-700 flex items-center justify-between gap-4 mb-6">
                    <p className="text-sm text-gray-600 dark:text-zinc-300 truncate flex-1 font-medium">{url}</p>
                    <button
                        onClick={onCopy}
                        className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-bold hover:bg-gray-800 dark:hover:bg-zinc-200 transition-all active:scale-95"
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
                            className="flex flex-col items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-2xl transition-colors border border-transparent hover:border-gray-100 dark:hover:border-zinc-700"
                        >
                            <span className={`w-12 h-12 ${target.color} text-white rounded-full flex items-center justify-center shadow-sm`}>
                                <Share2 className="w-5 h-5" />
                            </span>
                            <span className="text-xs font-bold text-gray-700 dark:text-zinc-300">{target.label}</span>
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );
}
