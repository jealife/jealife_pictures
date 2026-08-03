"use client";

import {
    UploadCloud, CheckCircle2, MapPin, Camera, Tag, X, Info,
    Image as ImageIcon, Video, Palette, Globe2, Loader2, Accessibility,
    PartyPopper, Copy, Check, ArrowRight,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import ExifReader from "exifreader";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { upsertProfile } from "../lib/auth";
import { syncTopics, getTopics, getCountries, getPlatformStats, getSetting } from "../lib/database";
import { processImage, formatFileSize } from "../lib/images";
import { slugifyClient } from "../lib/media";
import { friendlyErrorMessage } from "../lib/errors";
import Confetti from "../components/Confetti";
import UploadProgress from "../components/UploadProgress";

// Poids relatif de chaque étape dans la barre de progression : l'original
// (jusqu'à 50 Mo) domine largement le temps d'envoi, la vignette et la
// version web sont petites, la vérification qualité et la publication sont
// des appels réseau courts.
const UPLOAD_STAGES = {
    quality: { percent: 15, label: "Vérification de la qualité…" },
    thumbnail: { percent: 25, label: "Envoi de la vignette…" },
    display: { percent: 45, label: "Envoi de la version web…" },
    original: { percent: 90, label: "Envoi du fichier original…" },
    publish: { percent: 100, label: "Publication…" },
};

const POPULAR_TAGS = [
    "Nature", "Forêt", "Océan", "Portrait", "Culture", "Faune",
    "Architecture", "Plage", "Marché", "Vie quotidienne", "Voyage",
];

const MEDIA_TYPES = [
    { key: "photo", label: "Photo", icon: ImageIcon },
    { key: "illustration", label: "Illustration", icon: Palette },
    { key: "video", label: "Vidéo", icon: Video },
];

function blobToBase64(blob) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(",")[1]);
        reader.readAsDataURL(blob);
    });
}

/**
 * Porte de qualité automatique, appelée juste avant l'envoi définitif :
 * résolution réelle, netteté, doublon et modération de contenu, calculés
 * côté serveur (voir /api/moderate-upload). Rien de rejeté ici n'atteint le
 * stockage ni la table `media`.
 */
async function runQualityCheck(processed) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Session expirée, reconnectez-vous.");

    const base64Image = await blobToBase64(processed.display);

    const res = await fetch("/api/moderate-upload", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
            image: base64Image,
            mimeType: processed.mimeType,
            originalWidth: processed.width,
            originalHeight: processed.height,
        }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Cette image n'a pas passé le contrôle qualité.");

    return data.phash;
}

export default function SubmitPage() {
    const router = useRouter();
    const { user, profile, loading } = useAuth();

    const [step, setStep] = useState(1);
    const [publishedMedia, setPublishedMedia] = useState(null);
    const [platformStats, setPlatformStats] = useState(null);
    const [linkCopied, setLinkCopied] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadStage, setUploadStage] = useState("");
    const [uploadPercent, setUploadPercent] = useState(0);
    const [dragActive, setDragActive] = useState(false);
    const [formError, setFormError] = useState(null);
    const [isGeneratingMetadata, setIsGeneratingMetadata] = useState(false);

    const [file, setFile] = useState(null);
    const [processed, setProcessed] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [previewUrl, setPreviewUrl] = useState("");

    const [selectedType, setSelectedType] = useState("photo");
    const [title, setTitle] = useState("");
    const [altText, setAltText] = useState("");
    const [description, setDescription] = useState("");
    const [location, setLocation] = useState("");
    const [city, setCity] = useState("");
    const [countryCode, setCountryCode] = useState("GA"); // Gabon par défaut
    const [camera, setCamera] = useState("");
    const [tagsInput, setTagsInput] = useState("");
    const [tags, setTags] = useState([]);

    const [countries, setCountries] = useState([]);
    const [dbTopics, setDbTopics] = useState([]);
    const [moderationMode, setModerationMode] = useState("auto");
    const [locationSuggestions, setLocationSuggestions] = useState([]);
    const [tagSuggestions, setTagSuggestions] = useState([]);
    const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
    const [showTagSuggestions, setShowTagSuggestions] = useState(false);

    const fileInputRef = useRef(null);

    useEffect(() => {
        if (!loading && !user) router.push("/login?redirect=/submit");
    }, [user, loading, router]);

    useEffect(() => {
        getTopics({ limit: 200 }).then((data) => setDbTopics(data.map((t) => t.name)));
        getCountries().then(setCountries);
        getSetting("moderation_mode").then((mode) => { if (mode) setModerationMode(mode); });
    }, []);

    useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

    // Suggestions de lieux. On récupère aussi le code pays renvoyé par Photon,
    // ce qui remplit le champ pays sans effort et alimente le classement
    // géographique du site.
    useEffect(() => {
        if (location.trim().length < 2) {
            setLocationSuggestions([]);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const response = await fetch(
                    `https://photon.komoot.io/api/?q=${encodeURIComponent(location)}&limit=5`
                );
                const data = await response.json();

                const seen = new Set();
                const results = [];
                for (const feature of data.features || []) {
                    const { name, city: featureCity, country, countrycode } = feature.properties;
                    const label = [name, featureCity, country].filter(Boolean).join(", ");
                    if (label && !seen.has(label)) {
                        seen.add(label);
                        results.push({ label, city: featureCity || name, countryCode: countrycode });
                    }
                }
                setLocationSuggestions(results);
            } catch {
                setLocationSuggestions([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [location]);

    useEffect(() => {
        if (!tagsInput.trim()) {
            setTagSuggestions([]);
            return;
        }
        setTagSuggestions(
            dbTopics
                .filter((t) => t.toLowerCase().includes(tagsInput.toLowerCase()) && !tags.includes(t))
                .slice(0, 8)
        );
    }, [tagsInput, tags, dbTopics]);

    const handleFileSelect = async (files) => {
        const selected = files?.[0];
        if (!selected) return;

        let detectedType = "photo";
        if (selected.type.startsWith("video/")) {
            detectedType = "video";
        } else if (selected.type.includes("svg") || selected.type.includes("illustrator")) {
            detectedType = "illustration";
        } else if (!selected.type.startsWith("image/")) {
            setFormError("Format de fichier non supporté. Seules les images et les vidéos sont acceptées.");
            return;
        }

        setFormError(null);
        setFile(selected);
        setSelectedType(detectedType);
        setTitle(selected.name.replace(/\.[^/.]+$/, ""));
        setPreviewUrl(URL.createObjectURL(selected));
        setStep(2);

        // Génération des dérivés dans le navigateur. C'est ce qui permet
        // d'envoyer quelques centaines de kilo-octets au lieu du fichier brut,
        // et surtout d'enregistrer enfin les dimensions de l'image.
        setProcessing(true);
        try {
            setProcessed(await processImage(selected));
        } catch (err) {
            console.error("Image processing failed:", err);
            setFormError("Cette image n'a pas pu être préparée. Essayez un autre fichier.");
        } finally {
            setProcessing(false);
        }

        try {
            const exif = await ExifReader.load(selected);

            const model = exif.Model?.description || "";
            const lens = exif.LensModel?.description || exif.Lens?.description || "";
            const aperture = exif.FNumber?.description ? `f/${exif.FNumber.value}` : "";
            const focal = exif.FocalLength?.description || "";

            let exifLabel = model;
            if (lens) exifLabel += `, ${lens}`;
            else if (focal || aperture) exifLabel += `, ${focal} ${aperture}`.trimEnd();
            if (exifLabel) setCamera(exifLabel);

            const exifTitle =
                exif.ObjectName?.description || exif.title?.description || exif.ImageDescription?.description;
            if (exifTitle) setTitle(exifTitle);

            const exifDescription =
                exif.Description?.description || exif["Caption-Abstract"]?.description;
            if (exifDescription) setDescription(exifDescription);

            const rawKeywords = exif.Keywords?.value || exif.subject?.value || [];
            if (rawKeywords?.length) {
                const extracted = (Array.isArray(rawKeywords) ? rawKeywords : [rawKeywords]).map(
                    (k) => (typeof k === "object" ? k.description : k)
                );
                setTags((prev) => [...new Set([...prev, ...extracted])]);
            }
        } catch {
            /* Pas de métadonnées EXIF : ce n'est pas une erreur. */
        }
    };

    const addTag = (event) => {
        if (event.key !== "Enter" && event.key !== ",") return;
        event.preventDefault();
        const tag = tagsInput.trim().replace(",", "");
        if (tag && !tags.includes(tag)) {
            setTags([...tags, tag]);
            setTagsInput("");
            setTagSuggestions([]);
        }
    };

    const selectTag = (tag) => {
        if (!tags.includes(tag)) setTags([...tags, tag]);
        setTagsInput("");
        setTagSuggestions([]);
    };

    const selectLocation = (suggestion) => {
        setLocation(suggestion.label);
        if (suggestion.city) setCity(suggestion.city);
        if (suggestion.countryCode) setCountryCode(suggestion.countryCode.toUpperCase());
        setLocationSuggestions([]);
        setShowLocationSuggestions(false);
    };

    const resetFile = () => {
        setStep(1);
        setFile(null);
        setProcessed(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl("");
    };

    // Repart de zéro après une publication réussie : contrairement à
    // resetFile (juste changer de fichier en gardant les infos déjà
    // saisies), ici on efface tout puisqu'il s'agit d'un nouvel envoi.
    const resetForm = () => {
        resetFile();
        setSelectedType("photo");
        setTitle("");
        setAltText("");
        setDescription("");
        setLocation("");
        setCity("");
        setCountryCode("GA");
        setCamera("");
        setTagsInput("");
        setTags([]);
        setPublishedMedia(null);
        setLinkCopied(false);
    };

    const copyPublishedLink = () => {
        if (!publishedMedia) return;
        navigator.clipboard.writeText(`${window.location.origin}/photos/${publishedMedia.id}-${publishedMedia.slug}`);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
    };

    const generateMetadataWithAI = async () => {
        if (!processed || !processed.thumbnail) return;
        setIsGeneratingMetadata(true);
        setFormError(null);

        try {
            const base64Image = await blobToBase64(processed.thumbnail);

            const res = await fetch("/api/generate-metadata", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    image: base64Image,
                    mimeType: processed.mimeType,
                    type: selectedType
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Erreur lors de la génération.");
            }

            const data = await res.json();
            if (data.title) setTitle(data.title);
            if (data.description) {
                setAltText(data.description);
                setDescription(data.description);
            }
            if (data.tags && Array.isArray(data.tags)) {
                const newTags = data.tags.filter(tag => !tags.includes(tag));
                setTags(prev => [...prev, ...newTags]);
            }
        } catch (error) {
            console.error("Génération de métadonnées impossible :", error);
            setFormError(friendlyErrorMessage(error, "La génération automatique a échoué. Réessayez ou remplissez les champs manuellement."));
        } finally {
            setIsGeneratingMetadata(false);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setFormError(null);

        if (!file || !user) return;
        if (!processed) {
            setFormError("L'image est encore en préparation, patientez un instant.");
            return;
        }
        if (!altText.trim()) {
            setFormError("La description pour l'accessibilité est obligatoire.");
            return;
        }

        setUploading(true);
        setUploadPercent(0);
        const goToStage = (key) => {
            setUploadStage(UPLOAD_STAGES[key].label);
            setUploadPercent(UPLOAD_STAGES[key].percent);
        };
        try {
            // Filet de sécurité : sans profil, la contrainte de clé étrangère
            // sur `media.user_id` fait échouer la publication.
            const { data: profile } = await supabase
                .from("profiles")
                .select("id")
                .eq("id", user.id)
                .maybeSingle();

            if (!profile) {
                setUploadStage("Création de votre profil…");
                const username = `${user.email.split("@")[0]}-${user.id.slice(0, 4)}`;
                const { success, error: profileError } = await upsertProfile(user.id, {
                    username,
                    full_name: user.user_metadata?.full_name || username,
                    avatar_url: user.user_metadata?.avatar_url || null,
                });
                if (!success) throw new Error(profileError);
            }

            // Porte de qualité : résolution réelle, netteté, doublon et
            // modération de contenu. Tout ce qui est rejeté ici n'atteint
            // jamais le stockage ni la table `media`.
            goToStage("quality");
            const phash = await runQualityCheck(processed);

            const folder = `${user.id}/${Date.now()}`;
            const { extension, mimeType } = processed;

            // Envoi direct navigateur → Cloudflare R2 via une URL signée à
            // usage unique : faire transiter un original de plusieurs
            // dizaines de Mo par une fonction serverless Vercel se heurterait
            // à sa limite de taille de requête.
            const upload = async (path, body, contentType) => {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error("Session expirée, reconnectez-vous.");

                const res = await fetch("/api/r2-upload-url", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({ path, contentType }),
                });
                const { uploadUrl, publicUrl, error } = await res.json();
                if (!res.ok) throw new Error(error || "Impossible de préparer l'envoi.");

                const putRes = await fetch(uploadUrl, {
                    method: "PUT",
                    headers: { "Content-Type": contentType },
                    body,
                });
                if (!putRes.ok) throw new Error("L'envoi du fichier a échoué.");

                return publicUrl;
            };

            goToStage("thumbnail");
            const thumbnailUrl = await upload(`${folder}/thumb.${extension}`, processed.thumbnail, mimeType);

            goToStage("display");
            const displayUrl = await upload(`${folder}/display.${extension}`, processed.display, mimeType);

            goToStage("original");
            const originalExtension = file.name.split(".").pop()?.toLowerCase() || "jpg";
            const originalUrl = await upload(
                `${folder}/original.${originalExtension}`,
                file,
                file.type || "image/jpeg"
            );

            goToStage("publish");
            const { data: mediaRecord, error: insertError } = await supabase
                .from("media")
                .insert({
                    user_id: user.id,
                    type: selectedType,
                    url: displayUrl,
                    original_url: originalUrl,
                    thumbnail_url: thumbnailUrl,
                    blur_data_url: processed.blurDataURL,
                    phash,
                    title: title.trim() || null,
                    alt_text: altText.trim(),
                    description: description.trim() || null,
                    camera: camera.trim() || null,
                    tags,
                    location: location.trim() || null,
                    city: city.trim() || null,
                    country_code: countryCode || null,
                    width: processed.width,
                    height: processed.height,
                    // Lue sur la vidéo pendant l'extraction de l'aperçu ; nulle
                    // pour une image. Sans elle, le badge de durée des cartes
                    // vidéo ne s'affichait jamais.
                    duration: processed.duration,
                    file_size: file.size,
                    mime_type: file.type || null,
                    // Le statut n'est pas décidé ici : un déclencheur côté
                    // serveur (migration 0004) l'impose selon le réglage
                    // `moderation_mode` choisi par un admin. L'envoyer en dur
                    // depuis le navigateur n'aurait de toute façon aucun
                    // effet — mais autant ne pas prétendre décider de ce
                    // qu'on ne décide plus.
                })
                .select("id, status")
                .single();

            if (insertError) throw insertError;

            if (mediaRecord) await syncTopics(mediaRecord.id, tags);

            const slug = slugifyClient(title.trim() || altText.trim() || "photo");
            setPublishedMedia({ id: mediaRecord.id, slug, status: mediaRecord.status });
            getPlatformStats().then(setPlatformStats);
            setStep(3);
        } catch (err) {
            console.error("Submission error:", err);
            setFormError(friendlyErrorMessage(err, "La publication a échoué. Réessayez."));
        } finally {
            setUploading(false);
            setUploadStage("");
        }
    };

    const handleDrag = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setDragActive(event.type === "dragenter" || event.type === "dragover");
    };

    const handleDrop = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setDragActive(false);
        if (event.dataTransfer.files?.[0]) handleFileSelect(event.dataTransfer.files);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4" />
                    <p className="text-gray-500">Vérification de votre session…</p>
                </div>
            </div>
        );
    }

    if (!user) return null;

    const africanCountries = countries.filter((c) => c.is_african);
    const otherCountries = countries.filter((c) => !c.is_african);
    const savings =
        processed && file ? Math.round((1 - processed.display.size / file.size) * 100) : 0;

    return (
        <div className="min-h-screen bg-white">
            {uploading && <UploadProgress percent={uploadPercent} label={uploadStage} />}
            <div className="max-w-[1200px] mx-auto px-4 py-12 md:py-20">
                {step === 1 ? (
                    <div className="max-w-3xl mx-auto">
                        <div className="text-center mb-12">
                            <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
                                Contribuez à JEaLiFe
                            </h1>
                            <p className="text-lg text-gray-500">
                                Partagez votre regard, gardez vos droits.
                            </p>
                        </div>

                        <div
                            className={`border-3 border-dashed rounded-[32px] p-20 text-center transition-all ${
                                dragActive
                                    ? "border-green-500 bg-green-50/50 scale-[1.02]"
                                    : "border-gray-200 hover:border-gray-300"
                            }`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                        >
                            <div className="cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <UploadCloud className="w-10 h-10 text-gray-400" />
                                </div>
                                <p className="mt-4 text-[15px] font-medium text-gray-700">
                                    Glissez et déposez votre fichier ici
                                </p>
                                <p className="mt-1.5 text-[13px] text-gray-500">
                                    Format JPG, PNG, WebP, SVG ou MP4 • Jusqu&apos;à 50 Mo
                                </p>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*,video/*"
                                className="hidden"
                                onChange={(e) => handleFileSelect(e.target.files)}
                            />
                        </div>

                        {formError && (
                            <p className="mt-6 text-center text-sm text-red-600">{formError}</p>
                        )}

                        {moderationMode === "manual" && (
                            <p className="mt-6 text-center text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                                Chaque envoi est actuellement vérifié par un membre de l&apos;équipe
                                avant d&apos;être publié.
                            </p>
                        )}

                        <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-gray-400 text-sm font-medium">
                            <span className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-500" /> Gratuit
                            </span>
                            <span className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-500" /> Vous restez propriétaire
                            </span>
                            <span className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-500" /> Retrait possible à tout moment
                            </span>
                        </div>

                        {/* Ce que le contrôle qualité automatique vérifie réellement à
                            l'envoi (voir /api/moderate-upload) : mieux vaut le dire avant
                            l'envoi qu'après un rejet. */}
                        <div className="mt-10 p-6 bg-gray-50 border border-gray-100 rounded-2xl">
                            <p className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4">
                                Avant d&apos;envoyer
                            </p>
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5 text-sm text-gray-600">
                                <li className="flex gap-2.5">
                                    <span className="text-gray-300">•</span> Photo nette, 5 mégapixels minimum
                                </li>
                                <li className="flex gap-2.5">
                                    <span className="text-gray-300">•</span> Vous devez être l&apos;auteur et détenir les droits
                                </li>
                                <li className="flex gap-2.5">
                                    <span className="text-gray-300">•</span> Pas de contenu choquant, violent ou à caractère sexuel
                                </li>
                                <li className="flex gap-2.5">
                                    <span className="text-gray-300">•</span> Pas de filigrane, logo ou texte incrusté
                                </li>
                                <li className="flex gap-2.5">
                                    <span className="text-gray-300">•</span> Une photo ou illustration originale, pas une capture d&apos;écran
                                </li>
                                <li className="flex gap-2.5">
                                    <span className="text-gray-300">•</span> 50 Mo maximum
                                </li>
                            </ul>
                        </div>
                    </div>
                ) : step === 3 ? (
                    <div className="max-w-2xl mx-auto text-center">
                        <Confetti />
                        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <PartyPopper className="w-10 h-10 text-green-600" />
                        </div>

                        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
                            Merci pour votre contribution
                        </h1>

                        {publishedMedia?.status === "pending" ? (
                            <p className="text-lg text-gray-500 mb-10">
                                Votre image a passé nos contrôles de qualité automatiques.
                                Un membre de l&apos;équipe la vérifie avant publication : vous
                                êtes pour l&apos;instant la seule personne à pouvoir la voir.
                            </p>
                        ) : (
                            <>
                                <p className="text-lg text-gray-500 mb-2">
                                    Votre image a passé nos contrôles de qualité automatiques et est
                                    déjà visible sur JEaLiFe Stock.
                                </p>
                                {platformStats && (
                                    <p className="text-lg text-gray-500 mb-10">
                                        Grâce à vous, la plateforme compte désormais{" "}
                                        <strong className="text-gray-900">
                                            {(
                                                (platformStats.total_photos || 0) +
                                                (platformStats.total_illustrations || 0) +
                                                (platformStats.total_videos || 0)
                                            ).toLocaleString("fr-FR")}
                                        </strong>{" "}
                                        médias publiés.
                                    </p>
                                )}
                            </>
                        )}

                        {previewUrl && (
                            <div className="rounded-2xl overflow-hidden shadow-xl bg-gray-100 ring-1 ring-black/5 mb-10 max-w-sm mx-auto">
                                <img
                                    src={previewUrl}
                                    alt="Aperçu de l'image publiée"
                                    className="w-full h-auto object-cover max-h-80"
                                />
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button
                                type="button"
                                onClick={() => publishedMedia && router.push(`/photos/${publishedMedia.id}-${publishedMedia.slug}`)}
                                className="px-6 py-4 bg-black text-white font-bold rounded-2xl hover:bg-gray-800 transition-all shadow-xl hover:shadow-2xl active:scale-95 flex items-center justify-center gap-2"
                            >
                                {publishedMedia?.status === "pending" ? "Voir mon envoi" : "Voir la photo publiée"}{" "}
                                <ArrowRight className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-6 py-4 border border-gray-200 text-gray-600 font-bold rounded-2xl hover:bg-gray-50 transition-all active:scale-95"
                            >
                                Publier une autre image
                            </button>
                        </div>

                        <div className="mt-8 flex items-center justify-center gap-6 text-sm font-medium text-gray-500">
                            {profile?.username && (
                                <a href={`/users/${profile.username}`} className="hover:text-black transition-colors">
                                    Voir mon profil
                                </a>
                            )}
                            <button
                                type="button"
                                onClick={copyPublishedLink}
                                className="flex items-center gap-2 hover:text-black transition-colors"
                            >
                                {linkCopied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                                {linkCopied ? "Lien copié" : "Copier le lien"}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                        <div className="lg:sticky lg:top-28">
                            <div className="rounded-2xl overflow-hidden shadow-2xl bg-gray-100 ring-1 ring-black/5">
                                <img
                                    src={previewUrl}
                                    alt="Aperçu de l'image à publier"
                                    className="w-full h-auto object-cover max-h-[70vh]"
                                />
                            </div>

                            <div className="mt-4 flex items-center justify-between gap-4">
                                <button
                                    onClick={resetFile}
                                    className="text-sm font-medium text-gray-500 hover:text-black flex items-center gap-2 transition-colors"
                                >
                                    <X className="w-4 h-4" /> Changer de fichier
                                </button>

                                {processing && (
                                    <span className="text-xs text-gray-400 flex items-center gap-2">
                                        <Loader2 className="w-3 h-3 animate-spin" /> Préparation…
                                    </span>
                                )}
                            </div>

                            {processed && (
                                <div className="mt-4 p-4 bg-green-50 border border-green-100 rounded-xl text-xs text-green-800 leading-relaxed">
                                    <strong>{processed.width} × {processed.height} px.</strong>{" "}
                                    Version web réduite à {formatFileSize(processed.display.size)}
                                    {savings > 0 && ` (−${savings} % par rapport à l'original de ${formatFileSize(file.size)})`}.
                                    L&apos;original est conservé pour le téléchargement haute définition.
                                </div>
                            )}
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div>
                                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                                    Détails de l&apos;image
                                </h2>
                                <p className="text-gray-500">
                                    Ces informations décident de qui trouvera votre photo.
                                </p>
                            </div>

                            <div className="space-y-6">
                                <fieldset>
                                    <legend className="block text-sm font-bold text-gray-900 mb-2">
                                        Type de contenu
                                    </legend>
                                    <div className="flex gap-2">
                                        {MEDIA_TYPES.map(({ key, label, icon: Icon }) => (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => setSelectedType(key)}
                                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                                                    selectedType === key
                                                        ? "border-black bg-black text-white"
                                                        : "border-gray-200 text-gray-600 hover:border-gray-400"
                                                }`}
                                            >
                                                <Icon className="w-4 h-4" /> {label}
                                            </button>
                                        ))}
                                    </div>
                                </fieldset>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label htmlFor="title" className="block text-sm font-bold text-gray-900">
                                            Titre
                                        </label>
                                        <button
                                            type="button"
                                            onClick={generateMetadataWithAI}
                                            disabled={isGeneratingMetadata || !processed}
                                            className="text-[13px] font-medium text-amber-600 hover:text-amber-700 disabled:opacity-50 flex items-center gap-1 transition-colors"
                                        >
                                            {isGeneratingMetadata ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "✨"}
                                            {isGeneratingMetadata ? "Génération..." : "Générer avec l'IA"}
                                        </button>
                                    </div>
                                    <input
                                        id="title"
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Ex : Éléphant de forêt dans le parc d'Ivindo"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all font-medium"
                                        required
                                    />
                                </div>

                                {/* Champ nouveau et obligatoire : sans texte alternatif,
                                    une image n'existe ni pour Google Images ni pour un
                                    lecteur d'écran. C'est le premier levier de visibilité
                                    d'une banque d'images. */}
                                <div>
                                    <label htmlFor="alt" className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                                        <Accessibility className="w-4 h-4 opacity-40" />
                                        Décrivez l&apos;image <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="alt"
                                        type="text"
                                        value={altText}
                                        onChange={(e) => setAltText(e.target.value)}
                                        placeholder="Ex : Deux pêcheurs remontent un filet sur la plage de Mayumba au lever du jour"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all font-medium"
                                        required
                                    />
                                    <p className="text-xs text-gray-400 mt-2">
                                        Une phrase simple qui dit ce qu&apos;on voit. C&apos;est ce que lisent
                                        Google Images et les lecteurs d&apos;écran.
                                    </p>
                                </div>

                                <div>
                                    <label htmlFor="description" className="block text-sm font-bold text-gray-900 mb-2">
                                        Contexte <span className="font-normal text-gray-400">(facultatif)</span>
                                    </label>
                                    <textarea
                                        id="description"
                                        rows={3}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="L'histoire derrière la photo, les conditions de prise de vue…"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all font-medium resize-none"
                                    />
                                </div>

                                {/* Le pays est structuré, plus seulement du texte libre :
                                    il alimente le classement géographique et les
                                    pages par pays. */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="country" className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                                            <Globe2 className="w-4 h-4 opacity-40" /> Pays
                                        </label>
                                        <select
                                            id="country"
                                            value={countryCode}
                                            onChange={(e) => setCountryCode(e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all font-medium"
                                        >
                                            <option value="">Non précisé</option>
                                            <optgroup label="Afrique">
                                                {africanCountries.map((country) => (
                                                    <option key={country.code} value={country.code}>
                                                        {country.name_fr}
                                                    </option>
                                                ))}
                                            </optgroup>
                                            <optgroup label="Reste du monde">
                                                {otherCountries.map((country) => (
                                                    <option key={country.code} value={country.code}>
                                                        {country.name_fr}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        </select>
                                    </div>

                                    <div>
                                        <label htmlFor="city" className="block text-sm font-bold text-gray-900 mb-2">
                                            Ville
                                        </label>
                                        <input
                                            id="city"
                                            type="text"
                                            value={city}
                                            onChange={(e) => setCity(e.target.value)}
                                            placeholder="Ex : Libreville"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all font-medium"
                                        />
                                    </div>
                                </div>

                                <div className="relative">
                                    <label htmlFor="location" className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                                        <MapPin className="w-4 h-4 opacity-40" /> Lieu précis
                                    </label>
                                    <input
                                        id="location"
                                        type="text"
                                        value={location}
                                        onChange={(e) => { setLocation(e.target.value); setShowLocationSuggestions(true); }}
                                        onFocus={() => setShowLocationSuggestions(true)}
                                        placeholder="Ex : Parc national de la Lopé"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all font-medium"
                                    />
                                    {showLocationSuggestions && locationSuggestions.length > 0 && (
                                        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                            {locationSuggestions.map((suggestion) => (
                                                <button
                                                    key={suggestion.label}
                                                    type="button"
                                                    onClick={() => selectLocation(suggestion)}
                                                    className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 border-b border-gray-50 last:border-none flex items-center gap-3 transition-colors"
                                                >
                                                    <MapPin className="w-4 h-4 text-gray-300 shrink-0" />
                                                    {suggestion.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="camera" className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                                        <Camera className="w-4 h-4 opacity-40" /> Matériel
                                    </label>
                                    <input
                                        id="camera"
                                        type="text"
                                        value={camera}
                                        onChange={(e) => setCamera(e.target.value)}
                                        placeholder="Ex : Sony A7 III, 85 mm f/1.4"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all font-medium"
                                    />
                                </div>

                                <div className="relative">
                                    <label htmlFor="tags" className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                                        <Tag className="w-4 h-4 opacity-40" /> Mots-clés
                                    </label>

                                    {tags.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {tags.map((tag) => (
                                                <span
                                                    key={tag}
                                                    className="px-3 py-1.5 bg-black text-white text-xs font-bold rounded-lg flex items-center gap-2 animate-in zoom-in-95"
                                                >
                                                    {tag}
                                                    <button type="button" onClick={() => setTags(tags.filter((t) => t !== tag))} aria-label={`Retirer ${tag}`}>
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <input
                                        id="tags"
                                        type="text"
                                        value={tagsInput}
                                        onChange={(e) => { setTagsInput(e.target.value); setShowTagSuggestions(true); }}
                                        onFocus={() => setShowTagSuggestions(true)}
                                        onKeyDown={addTag}
                                        placeholder="Tapez un mot-clé puis Entrée…"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all font-medium"
                                    />

                                    {showTagSuggestions && tagSuggestions.length > 0 && (
                                        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                            {tagSuggestions.map((tag) => (
                                                <button
                                                    key={tag}
                                                    type="button"
                                                    onClick={() => selectTag(tag)}
                                                    className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 border-b border-gray-50 last:border-none flex items-center gap-3 transition-colors"
                                                >
                                                    <Tag className="w-4 h-4 text-gray-300 shrink-0" /> {tag}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {POPULAR_TAGS.filter((t) => !tags.includes(t)).slice(0, 8).map((tag) => (
                                            <button
                                                key={tag}
                                                type="button"
                                                onClick={() => selectTag(tag)}
                                                className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50 border border-gray-100 rounded-lg hover:border-gray-300 hover:text-black transition-colors"
                                            >
                                                + {tag}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex gap-3">
                                    <Info className="w-5 h-5 text-gray-400 shrink-0" />
                                    <p className="text-xs text-gray-500 leading-relaxed">
                                        En publiant, vous acceptez la{" "}
                                        <a href="/licence" target="_blank" className="underline font-semibold hover:text-black">
                                            licence JEaLiFe
                                        </a>
                                        . Vous restez propriétaire de votre image et pouvez la retirer
                                        à tout moment.
                                    </p>
                                </div>

                                {formError && (
                                    <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                                        {formError}
                                    </p>
                                )}

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={resetFile}
                                        disabled={uploading}
                                        className="flex-1 py-4 px-6 border border-gray-200 text-gray-600 font-bold rounded-2xl hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={uploading || processing || !processed}
                                        className="flex-1 py-4 px-6 bg-black text-white font-bold rounded-2xl hover:bg-gray-800 transition-all shadow-xl hover:shadow-2xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                                    >
                                        {uploading ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                {uploadStage || "Publication…"}
                                            </>
                                        ) : (
                                            "Publier l'image"
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
