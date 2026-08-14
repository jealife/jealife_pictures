"use client";

import {
    UploadCloud, CheckCircle2, Camera, Tag, X, Info,
    Image as ImageIcon, Video, Palette, Loader2, Accessibility,
    PartyPopper, ArrowRight, Plus, ChevronDown, AlertCircle, Sparkles,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import ExifReader from "exifreader";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { upsertProfile } from "../lib/auth";
import { syncTopics, getTopics, getCountries, getPlatformStats, getSetting, getPremiumPricing } from "../lib/database";
import { processImage, formatFileSize } from "../lib/images";
import { slugifyClient } from "../lib/media";
import { friendlyErrorMessage } from "../lib/errors";
import Confetti from "../components/Confetti";
import UploadProgress from "../components/UploadProgress";
import LocationInput from "../components/LocationInput";

// Poids relatif de chaque étape dans la progression d'une image : l'original
// (jusqu'à 50 Mo) domine largement le temps d'envoi, la vignette et la
// version web sont petites, la vérification qualité et la publication sont
// des appels réseau courts.
const UPLOAD_STAGES = {
    quality: { percent: 15, label: "Vérification de la qualité…" },
    thumbnail: { percent: 30, label: "Envoi de la vignette…" },
    display: { percent: 50, label: "Envoi de la version web…" },
    original: { percent: 90, label: "Envoi du fichier original…" },
    publish: { percent: 100, label: "Publication…" },
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 Mo, annoncé dans l'UI (voir zone de dépôt)
const MAX_FILES = 10;

const AI_QUOTA_STORAGE_KEY = "jealife_ai_quota_exhausted_until";

// Chaque image est préparée dans le navigateur (redimensionnements canvas) puis
// envoyée en trois fichiers. Tout lancer d'un coup saturerait la mémoire sur
// mobile et la bande passante montante ; deux en parallèle garde l'attente
// courte sans faire tomber les téléphones d'entrée de gamme.
const CONCURRENCY = 2;

const POPULAR_TAGS = [
    "Nature", "Forêt", "Océan", "Portrait", "Culture", "Faune",
    "Architecture", "Plage", "Marché", "Vie quotidienne", "Voyage",
];

const MEDIA_TYPES = [
    { key: "photo", label: "Photo", icon: ImageIcon },
    { key: "illustration", label: "Illustration", icon: Palette },
    { key: "video", label: "Vidéo", icon: Video },
];

// Sur données mobiles instables (public visé par le site), une coupure
// passagère pendant l'envoi ne doit pas condamner toute la publication —
// surtout après que l'utilisateur a rempli tout le formulaire. On ne
// retente que les échecs réseau purs (`Failed to fetch` et apparentés,
// voir errors.js) : une réponse HTTP d'erreur (400, 413…) est déjà arrivée
// à destination et la retenter ne changerait rien.
async function fetchWithRetry(url, options, retries = 2) {
    for (let attempt = 0; ; attempt++) {
        try {
            return await fetch(url, options);
        } catch (err) {
            if (attempt >= retries || !/failed to fetch|network|load failed/i.test(err?.message || "")) throw err;
            await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        }
    }
}

// Distance de Hamming entre deux empreintes hexadécimales de 64 bits : le
// serveur ne compare qu'aux médias DÉJÀ publiés, donc deux images identiques
// envoyées dans le même lot passaient toutes les deux — ni l'une ni l'autre
// n'était encore en base au moment où l'autre était contrôlée.
function phashDistance(a, b) {
    let x = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
    let count = 0;
    while (x > 0n) {
        count += Number(x & 1n);
        x >>= 1n;
    }
    return count;
}

// Doit rester aligné sur DUPLICATE_HAMMING_THRESHOLD (/api/moderate-upload).
const DUPLICATE_THRESHOLD = 4;

async function runWithConcurrency(list, limit, worker) {
    let cursor = 0;
    const runners = Array.from({ length: Math.min(limit, list.length) }, async () => {
        while (cursor < list.length) {
            await worker(list[cursor++]);
        }
    });
    await Promise.all(runners);
}

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
async function runQualityCheck(processed, type) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Session expirée, reconnectez-vous.");

    const base64Image = await blobToBase64(processed.display);

    const res = await fetchWithRetry("/api/moderate-upload", {
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
            type,
        }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Cette image n'a pas passé le contrôle qualité.");

    return data.phash;
}

function detectType(file) {
    if (file.type.startsWith("video/")) return "video";
    if (file.type.includes("svg") || file.type.includes("illustrator")) return "illustration";
    return "photo";
}

let nextItemId = 0;

function createItem(file) {
    return {
        id: `item-${nextItemId++}`,
        file,
        previewUrl: URL.createObjectURL(file),
        type: detectType(file),
        processed: null,
        processing: true,
        // Champ unique obligatoire : sert à la fois de titre et de texte
        // alternatif. Un seul champ requis par image, tout le reste se
        // complète plus tard depuis la page de modification.
        altText: "",
        tags: [],
        tagsInput: "",
        description: "",
        location: "",
        city: "",
        // Volontairement vide : un pays pré-coché partirait en base sans que
        // personne ne l'ait choisi, et fausserait le classement géographique
        // pour toute photo dont le lieu n'a pas été renseigné.
        countryCode: "",
        // Tout contenu déjà publié reste gratuit pour toujours (voir migration
        // 0019) : ce choix ne s'applique qu'à cet envoi, il est modifiable
        // ensuite depuis la page de modification.
        isPremium: false,
        // Uniquement utilisable par les contributeurs autorisés à fixer
        // leur propre prix (voir migration 0022) ; `null` = prix par défaut
        // du type de média.
        customPrice: null,
        camera: "",
        // Relevés dans l'EXIF, jamais saisis : ce sont les réglages de
        // l'appareil au déclenchement, affichés tels quels sur la fiche photo.
        lens: "",
        focalLength: "",
        aperture: "",
        shutterSpeed: "",
        iso: null,
        detailsOpen: false,
        generating: false,
        status: "idle", // idle | uploading | done | error
        stage: "",
        percent: 0,
        error: null,
        published: null,
    };
}

/**
 * Lit les métadonnées EXIF d'un fichier pour pré-remplir ce qui peut l'être
 * sans rien demander : matériel, description existante, mots-clés déjà
 * associés à l'image par le logiciel de retouche du photographe.
 */
async function readExif(file) {
    try {
        const exif = await ExifReader.load(file);

        // Le boîtier seul dans `camera` : chaque autre donnée technique a
        // désormais sa colonne (migration 0016), plutôt que d'être concaténée
        // dans une chaîne qu'on ne pouvait plus ni lire ni exploiter.
        const make = exif.Make?.description?.trim() || "";
        const model = exif.Model?.description?.trim() || "";
        const camera = model && make && !model.startsWith(make) ? `${make}, ${model}` : model || make;

        const lens = exif.LensModel?.description || exif.Lens?.description || "";

        // `description` est déjà la valeur formatée par exifreader (« f/2.4 »,
        // « 1/750 ») ; `value` n'est qu'un repli quand elle manque.
        const aperture =
            exif.FNumber?.description || (exif.FNumber?.value ? `f/${exif.FNumber.value}` : "");
        const focalLength = exif.FocalLength?.description || "";
        const rawShutter = exif.ExposureTime?.description || exif.ShutterSpeedValue?.description || "";
        const shutterSpeed = rawShutter && !/s$/.test(rawShutter) ? `${rawShutter}s` : rawShutter;

        const rawIso = exif.ISOSpeedRatings?.value ?? exif.PhotographicSensitivity?.value;
        const isoValue = Array.isArray(rawIso) ? rawIso[0] : rawIso;
        const iso = Number.isFinite(Number(isoValue)) ? Number(isoValue) : null;

        const altText =
            exif.ObjectName?.description ||
            exif.title?.description ||
            exif.ImageDescription?.description ||
            exif.Description?.description ||
            exif["Caption-Abstract"]?.description ||
            "";

        const rawKeywords = exif.Keywords?.value || exif.subject?.value || [];
        const tags = (Array.isArray(rawKeywords) ? rawKeywords : [rawKeywords])
            .map((k) => (typeof k === "object" ? k?.description : k))
            .filter(Boolean);

        return {
            camera: camera.trim(),
            lens: lens.trim(),
            focalLength: focalLength.trim(),
            aperture: aperture.trim(),
            shutterSpeed: shutterSpeed.trim(),
            iso,
            altText: altText.trim(),
            tags,
        };
    } catch {
        return null; // Pas de métadonnées EXIF : ce n'est pas une erreur.
    }
}

function ItemCard({ item, index, countries, dbTopics, premiumPricing, canPricePremium, onPatch, onRemove, onGenerate, disabled, aiQuotaExhausted }) {
    const { africanCountries, otherCountries } = countries;

    const priceRange = premiumPricing[item.type];
    const premiumCost = priceRange?.cost;

    const countryName =
        [...africanCountries, ...otherCountries].find((c) => c.code === item.countryCode)?.name_fr || null;

    const tagSuggestions = item.tagsInput.trim()
        ? dbTopics
              .filter((t) => t.toLowerCase().includes(item.tagsInput.toLowerCase()) && !item.tags.includes(t))
              .slice(0, 6)
        : [];

    const addTag = (raw) => {
        const tag = raw.trim().replace(",", "");
        if (!tag || item.tags.some((t) => t.toLowerCase() === tag.toLowerCase())) {
            onPatch({ tagsInput: "" });
            return;
        }
        onPatch({ tags: [...item.tags, tag], tagsInput: "" });
    };

    const savings =
        item.processed && item.file
            ? Math.round((1 - item.processed.display.size / item.file.size) * 100)
            : 0;

    return (
        <div className="rounded-3xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
            <div className="flex flex-col sm:flex-row">
                {/* Aperçu au ratio réel du fichier : recadrer ici donnerait une
                    fausse idée du cadrage publié. `max-h` borne seulement les
                    formats très allongés, `object-contain` garantit qu'aucun
                    bord n'est coupé quand cette borne s'applique. */}
                <div className="relative sm:w-56 shrink-0 bg-gray-50 dark:bg-zinc-800 flex items-center justify-center p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={item.previewUrl}
                        alt={`Aperçu de l'image ${index + 1}`}
                        className="w-full h-auto max-h-80 object-contain rounded-xl"
                    />

                    {item.status !== "done" && (
                        <button
                            type="button"
                            onClick={onRemove}
                            disabled={disabled}
                            aria-label="Retirer cette image"
                            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors disabled:opacity-40"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}

                    {item.status === "done" && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <CheckCircle2 className="w-10 h-10 text-white" />
                        </div>
                    )}
                </div>

                <div className="flex-1 p-5 space-y-3">
                    <div>
                        <div className="flex items-center justify-between mb-1.5 gap-3">
                            <label
                                htmlFor={`alt-${item.id}`}
                                className="text-[13px] font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-1.5"
                            >
                                <Accessibility className="w-3.5 h-3.5 opacity-40" />
                                Décrivez l&apos;image <span className="text-red-500">*</span>
                            </label>
                            <button
                                type="button"
                                onClick={onGenerate}
                                disabled={disabled || aiQuotaExhausted || item.generating || !item.processed}
                                title={aiQuotaExhausted ? "Quota de génération IA atteint pour le moment. Réessayez plus tard." : undefined}
                                className="text-[12px] font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 disabled:opacity-50 flex items-center gap-1 shrink-0 transition-colors"
                            >
                                {item.generating ? <Loader2 className="w-3 h-3 animate-spin" /> : "✨"}
                                {item.generating ? "Génération…" : aiQuotaExhausted ? "IA indisponible" : "Générer avec l'IA"}
                            </button>
                        </div>
                        <input
                            id={`alt-${item.id}`}
                            type="text"
                            value={item.altText}
                            onChange={(e) => onPatch({ altText: e.target.value })}
                            disabled={disabled}
                            placeholder="Ex : Deux pêcheurs remontent un filet sur la plage de Mayumba"
                            className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white outline-none transition-all text-sm disabled:opacity-60"
                        />
                        <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-1.5">
                            Sert de titre et de description pour Google Images et les lecteurs d&apos;écran.
                        </p>
                    </div>

                    {/* Toujours visible, pas dans « Plus de détails » : c'est
                        un choix à part entière pour chaque image, pas un
                        réglage secondaire — le contributeur doit le voir sans
                        avoir à déplier quoi que ce soit. */}
                    <div>
                        <div className="flex gap-1.5">
                            {[
                                { key: false, label: "Gratuit" },
                                {
                                    key: true,
                                    label: premiumCost
                                        ? `Premium · ${premiumCost} crédit${premiumCost > 1 ? "s" : ""}`
                                        : "Premium",
                                },
                            ].map(({ key, label }) => (
                                <button
                                    key={String(key)}
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => onPatch({ isPremium: key })}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12px] font-medium transition-all disabled:opacity-60 ${
                                        item.isPremium === key
                                            ? "border-black dark:border-white bg-black dark:bg-white text-white dark:text-black"
                                            : "border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 hover:border-gray-400 dark:hover:border-zinc-500"
                                    }`}
                                >
                                    {key && <Sparkles className="w-3.5 h-3.5" />} {label}
                                </button>
                            ))}
                        </div>
                        {item.isPremium && canPricePremium && priceRange && (
                            <div className="flex items-center gap-2 mt-2">
                                <label htmlFor={`price-${item.id}`} className="text-[11px] font-medium text-gray-500 dark:text-zinc-400">
                                    Votre prix :
                                </label>
                                <input
                                    id={`price-${item.id}`}
                                    type="number"
                                    min={priceRange.min}
                                    max={priceRange.max}
                                    step="1"
                                    disabled={disabled}
                                    value={item.customPrice ?? priceRange.cost}
                                    onChange={(e) => onPatch({ customPrice: e.target.value })}
                                    className="w-16 px-2 py-1 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 rounded-lg text-[12px] focus:ring-2 focus:ring-black dark:focus:ring-white outline-none disabled:opacity-60"
                                />
                                <span className="text-[11px] text-gray-400 dark:text-zinc-500">
                                    crédits (entre {priceRange.min} et {priceRange.max})
                                </span>
                            </div>
                        )}
                        {item.isPremium && canPricePremium && priceRange && (
                            <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-1.5">
                                Vous faites partie des contributeurs autorisés à fixer leur propre prix.
                                Les visiteurs dépenseront ce montant en crédits ; vous touchez une part
                                de chaque achat.
                            </p>
                        )}
                        {item.isPremium && !(canPricePremium && priceRange) && (
                            <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-1.5">
                                Les visiteurs devront dépenser des crédits pour la télécharger ; vous
                                touchez une part de chaque achat.
                            </p>
                        )}
                    </div>

                    <LocationInput
                        value={item.location}
                        onPatch={onPatch}
                        countryName={countryName}
                        disabled={disabled}
                        placeholder="Où ? (ex : Parc national de la Lopé)"
                    />

                    <div>
                        {item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                {item.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="px-2.5 py-1 bg-black dark:bg-white text-white dark:text-black text-[11px] font-bold rounded-lg flex items-center gap-1.5"
                                    >
                                        {tag}
                                        <button
                                            type="button"
                                            disabled={disabled}
                                            onClick={() => onPatch({ tags: item.tags.filter((t) => t !== tag) })}
                                            aria-label={`Retirer ${tag}`}
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="relative">
                            <input
                                type="text"
                                value={item.tagsInput}
                                onChange={(e) => onPatch({ tagsInput: e.target.value })}
                                onKeyDown={(e) => {
                                    if (e.key !== "Enter" && e.key !== ",") return;
                                    e.preventDefault();
                                    addTag(item.tagsInput);
                                }}
                                disabled={disabled}
                                placeholder="Ajouter un mot-clé puis Entrée…"
                                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white outline-none transition-all text-sm disabled:opacity-60"
                            />
                            {tagSuggestions.length > 0 && (
                                <div className="absolute z-40 left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden">
                                    {tagSuggestions.map((tag) => (
                                        <button
                                            key={tag}
                                            type="button"
                                            onClick={() => addTag(tag)}
                                            className="w-full text-left px-3.5 py-2.5 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 border-b border-gray-50 dark:border-zinc-800 last:border-none flex items-center gap-2.5 transition-colors"
                                        >
                                            <Tag className="w-3.5 h-3.5 text-gray-300 dark:text-zinc-600 shrink-0" /> {tag}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {item.tags.length === 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {POPULAR_TAGS.slice(0, 6).map((tag) => (
                                    <button
                                        key={tag}
                                        type="button"
                                        disabled={disabled}
                                        onClick={() => addTag(tag)}
                                        className="px-2.5 py-1 text-[11px] font-medium text-gray-500 dark:text-zinc-400 bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-lg hover:border-gray-300 dark:hover:border-zinc-500 hover:text-black dark:hover:text-white transition-colors disabled:opacity-50"
                                    >
                                        + {tag}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => onPatch({ detailsOpen: !item.detailsOpen })}
                        className="text-[13px] font-medium text-gray-500 dark:text-zinc-400 hover:text-black dark:hover:text-white flex items-center gap-1 transition-colors"
                    >
                        <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform ${item.detailsOpen ? "rotate-180" : ""}`}
                        />
                        Plus de détails
                        <span className="font-normal text-gray-400 dark:text-zinc-500">(facultatif)</span>
                    </button>

                    {item.detailsOpen && (
                        <div className="space-y-3 pt-1">
                            <div className="flex gap-1.5">
                                {MEDIA_TYPES.map(({ key, label, icon: Icon }) => (
                                    <button
                                        key={key}
                                        type="button"
                                        disabled={disabled}
                                        onClick={() => onPatch({ type: key })}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12px] font-medium transition-all disabled:opacity-60 ${
                                            item.type === key
                                                ? "border-black dark:border-white bg-black dark:bg-white text-white dark:text-black"
                                                : "border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 hover:border-gray-400 dark:hover:border-zinc-500"
                                        }`}
                                    >
                                        <Icon className="w-3.5 h-3.5" /> {label}
                                    </button>
                                ))}
                            </div>

                            <textarea
                                rows={2}
                                value={item.description}
                                onChange={(e) => onPatch({ description: e.target.value })}
                                disabled={disabled}
                                placeholder="Contexte : l'histoire derrière la photo…"
                                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white outline-none transition-all text-sm resize-none disabled:opacity-60"
                            />

                            {/* Le pays n'est plus un champ à remplir : le choix
                                d'un lieu le déduit, et il s'affiche sous le
                                champ « Lieu ». Il reste corrigeable ici parce
                                qu'il porte le classement « Afrique d'abord » et
                                les pages par pays — une déduction fausse doit
                                pouvoir se rattraper sans passer par la page de
                                modification. */}
                            <select
                                value={item.countryCode}
                                onChange={(e) => onPatch({ countryCode: e.target.value })}
                                disabled={disabled}
                                aria-label="Corriger le pays"
                                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white outline-none transition-all text-sm disabled:opacity-60"
                            >
                                <option value="">Pays non précisé</option>
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

                            <div className="relative">
                                <Camera className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 dark:text-zinc-600" />
                                <input
                                    type="text"
                                    value={item.camera}
                                    onChange={(e) => onPatch({ camera: e.target.value })}
                                    disabled={disabled}
                                    placeholder="Matériel (ex : Sony A7 III, 85 mm f/1.4)"
                                    className="w-full pl-9 pr-3.5 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white outline-none transition-all text-sm disabled:opacity-60"
                                />
                            </div>
                        </div>
                    )}

                    {item.processing && (
                        <p className="text-[11px] text-gray-400 dark:text-zinc-500 flex items-center gap-1.5">
                            <Loader2 className="w-3 h-3 animate-spin" /> Préparation de l&apos;image…
                        </p>
                    )}

                    {item.processed && !item.processing && item.status === "idle" && (
                        <p className="text-[11px] text-gray-400 dark:text-zinc-500">
                            {item.processed.width} × {item.processed.height} px · version web{" "}
                            {formatFileSize(item.processed.display.size)}
                            {savings > 0 && ` (−${savings} %)`}
                        </p>
                    )}

                    {item.status === "uploading" && (
                        <div>
                            <div className="h-1.5 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
                                <div
                                    className="h-full bg-black dark:bg-white transition-all duration-500 ease-out"
                                    style={{ width: `${item.percent}%` }}
                                />
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1.5">{item.stage}</p>
                        </div>
                    )}

                    {item.status === "done" && (
                        <p className="text-[12px] font-medium text-green-600 dark:text-green-400 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Publiée
                        </p>
                    )}

                    {item.error && (
                        <p className="text-[12px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 border border-red-100 dark:border-red-900 rounded-xl px-3 py-2 flex items-start gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {item.error}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function SubmitForm() {
    const router = useRouter();
    const { user, profile, loading } = useAuth();

    const [items, setItems] = useState([]);
    const [step, setStep] = useState(1);
    const [publishing, setPublishing] = useState(false);
    const [formError, setFormError] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const [platformStats, setPlatformStats] = useState(null);

    const [countries, setCountries] = useState([]);
    const [dbTopics, setDbTopics] = useState([]);
    const [moderationMode, setModerationMode] = useState("auto");
    const [premiumPricing, setPremiumPricing] = useState({});

    // Le quota Gemini est partagé par tout le site, pas par image : une fois
    // atteint, chaque tentative échoue à l'identique tant qu'il n'est pas
    // reconstitué. Inutile de laisser chaque bouton « Générer avec l'IA »
    // retenter et échouer un par un — on le désactive partout dès la
    // première 429, et on le réactive tout seul passé le délai. `localStorage`
    // fait survivre ce délai à un rechargement de page : sans lui, F5 rendait
    // le bouton actif à nouveau alors que le quota, côté Google, restait
    // épuisé.
    const [aiQuotaExhaustedUntil, setAiQuotaExhaustedUntil] = useState(0);
    const aiQuotaExhausted = aiQuotaExhaustedUntil > Date.now();

    const markAiQuotaExhausted = (retryAfterMs) => {
        const until = Date.now() + (retryAfterMs || 2 * 60 * 1000);
        setAiQuotaExhaustedUntil(until);
        try {
            localStorage.setItem(AI_QUOTA_STORAGE_KEY, String(until));
        } catch {
            /* stockage indisponible (navigation privée…) : tant pis, l'état en mémoire suffit pour cette session */
        }
    };

    // Reprend un délai déjà enregistré (rechargement de page) et programme sa
    // propre expiration : c'est ce `setTimeout` qui fait « réapparaître » le
    // bouton tout seul, sans action de l'utilisateur.
    useEffect(() => {
        let stored = 0;
        try {
            stored = Number(localStorage.getItem(AI_QUOTA_STORAGE_KEY)) || 0;
        } catch {
            /* ignore */
        }
        if (stored > Date.now()) setAiQuotaExhaustedUntil(stored);

        if (aiQuotaExhaustedUntil <= Date.now()) return;
        const timer = setTimeout(() => {
            setAiQuotaExhaustedUntil(0);
            try {
                localStorage.removeItem(AI_QUOTA_STORAGE_KEY);
            } catch {
                /* ignore */
            }
        }, aiQuotaExhaustedUntil - Date.now());
        return () => clearTimeout(timer);
    }, [aiQuotaExhaustedUntil]);

    const fileInputRef = useRef(null);
    const addMoreInputRef = useRef(null);

    useEffect(() => {
        if (!loading && !user) router.push("/login?redirect=/submit");
    }, [user, loading, router]);

    useEffect(() => {
        getTopics({ limit: 200 }).then((data) => setDbTopics(data.map((t) => t.name)));
        getCountries().then(setCountries);
        getSetting("moderation_mode").then((mode) => { if (mode) setModerationMode(mode); });
        getPremiumPricing().then((rows) => {
            setPremiumPricing(Object.fromEntries(rows.map((r) => [
                r.media_type,
                { cost: r.credits_cost, min: r.min_credits_cost, max: r.max_credits_cost },
            ])));
        });
    }, []);

    const patchItem = (id, patch) =>
        setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));

    const removeItem = (id) => {
        const target = items.find((item) => item.id === id);
        if (target) URL.revokeObjectURL(target.previewUrl);
        const remaining = items.filter((item) => item.id !== id);
        setItems(remaining);
        if (remaining.length === 0) setStep(1);
    };

    const handleFileSelect = async (fileList) => {
        const selected = Array.from(fileList || []);
        if (selected.length === 0) return;

        setFormError(null);

        const accepted = [];
        const rejected = [];
        for (const file of selected) {
            if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
                rejected.push(`${file.name} : format non supporté`);
            } else if (file.size > MAX_FILE_SIZE) {
                rejected.push(`${file.name} : ${formatFileSize(file.size)}, au-delà des 50 Mo`);
            } else {
                accepted.push(file);
            }
        }

        const room = MAX_FILES - items.length;
        const kept = accepted.slice(0, Math.max(0, room));
        if (accepted.length > kept.length) {
            rejected.push(`${accepted.length - kept.length} image(s) ignorée(s) : ${MAX_FILES} au maximum par envoi`);
        }
        if (rejected.length > 0) setFormError(rejected.join(" · "));
        if (kept.length === 0) return;

        const newItems = kept.map(createItem);
        setItems((prev) => [...prev, ...newItems]);
        setStep(2);

        // Préparation (redimensionnements) et lecture EXIF en parallèle
        // limitée : chaque vignette apparaît dès que son image est prête,
        // sans attendre les autres.
        await runWithConcurrency(newItems, CONCURRENCY, async (item) => {
            const exif = await readExif(item.file);
            try {
                const processed = await processImage(item.file);
                patchItem(item.id, {
                    processed,
                    processing: false,
                    ...(exif?.camera ? { camera: exif.camera } : {}),
                    ...(exif?.lens ? { lens: exif.lens } : {}),
                    ...(exif?.focalLength ? { focalLength: exif.focalLength } : {}),
                    ...(exif?.aperture ? { aperture: exif.aperture } : {}),
                    ...(exif?.shutterSpeed ? { shutterSpeed: exif.shutterSpeed } : {}),
                    ...(exif?.iso != null ? { iso: exif.iso } : {}),
                    ...(exif?.altText ? { altText: exif.altText } : {}),
                    ...(exif?.tags?.length ? { tags: [...new Set(exif.tags)] } : {}),
                });
            } catch (err) {
                // `console.warn`, pas `console.error` : Next.js intercepte ce
                // dernier en développement et ouvre sa page d'erreur plein
                // écran pour CHAQUE appel, même quand l'échec est déjà
                // intercepté et déjà montré à l'utilisateur — ce qui est le
                // cas ici (voir `patchItem` juste en dessous). Vaut pour les
                // quatre échecs de ce fichier qui finissent sur une carte,
                // pas pour le nettoyage R2 plus bas, dont l'échec ne
                // s'affiche nulle part.
                console.warn("Image processing failed:", err);
                patchItem(item.id, {
                    processing: false,
                    error: "Cette image n'a pas pu être préparée. Retirez-la et essayez un autre fichier.",
                });
            }
        });
    };

    /**
     * Rédaction assistée, à la demande et image par image. Volontairement
     * pas déclenchée automatiquement au dépôt : un envoi groupé
     * consommerait autant d'appels que d'images et épuiserait vite le
     * quota du fournisseur.
     */
    const generateForItem = async (item) => {
        if (!item.processed?.thumbnail) return;
        // Filet de sécurité si l'état n'a pas encore basculé (plusieurs clics
        // rapprochés avant le re-rendu) : le bouton est déjà censé être
        // désactivé dans ce cas, voir `aiQuotaExhausted` plus bas.
        if (aiQuotaExhaustedUntil > Date.now()) return;
        patchItem(item.id, { generating: true, error: null });

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Session expirée, reconnectez-vous.");

            const base64Image = await blobToBase64(item.processed.thumbnail);

            const res = await fetchWithRetry("/api/generate-metadata", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ image: base64Image, mimeType: item.processed.mimeType, type: item.type }),
            });

            const data = await res.json();
            if (res.status === 429 && data.quotaExceeded) {
                markAiQuotaExhausted(data.retryAfterMs);
                throw new Error(data.error);
            }
            if (!res.ok) throw new Error(data.error || "Erreur lors de la génération.");

            patchItem(item.id, {
                generating: false,
                // `title` (court, sert aussi de texte alternatif) et
                // `description` (1-2 phrases, va dans « Contexte ») sont deux
                // champs distincts côté Gemini comme côté base — les inverser
                // mettait la description entière dans le titre. C'est ce qui
                // produisait des titres de plus de 200 caractères : ce n'est
                // pas Gemini qui ignorait la consigne de longueur, c'est le
                // mauvais champ qui atterrissait dans `altText`.
                ...(data.title ? { altText: data.title } : {}),
                ...(data.description ? { description: data.description } : {}),
                ...(Array.isArray(data.tags) && data.tags.length
                    ? {
                          tags: [
                              ...item.tags,
                              ...data.tags.filter(
                                  (tag) => tag && !item.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
                              ),
                          ],
                      }
                    : {}),
            });
        } catch (err) {
            console.warn("Génération de métadonnées impossible :", err);
            patchItem(item.id, {
                generating: false,
                error: friendlyErrorMessage(err, "La génération automatique a échoué. Décrivez l'image vous-même."),
            });
        }
    };

    /**
     * Envoie une image : contrôle qualité, trois fichiers vers R2, puis la
     * ligne `media`. Chaque image est indépendante — l'échec de l'une
     * n'empêche pas les autres d'être publiées.
     */
    const publishItem = async (item, batchHashes) => {
        const goToStage = (key) =>
            patchItem(item.id, { stage: UPLOAD_STAGES[key].label, percent: UPLOAD_STAGES[key].percent });

        goToStage("quality");
        const phash = await runQualityCheck(item.processed, item.type);

        if (batchHashes.some((seen) => phashDistance(seen, phash) <= DUPLICATE_THRESHOLD)) {
            throw new Error("Cette image fait doublon avec une autre du même envoi. Retirez-la.");
        }
        batchHashes.push(phash);

        const folder = `${user.id}/${Date.now()}-${item.id}`;
        const { extension, mimeType } = item.processed;

        // Envoi direct navigateur → Cloudflare R2 via une URL signée à usage
        // unique : faire transiter un original de plusieurs dizaines de Mo
        // par une fonction serverless Vercel se heurterait à sa limite de
        // taille de requête.
        const upload = async (path, body, contentType) => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Session expirée, reconnectez-vous.");

            const res = await fetchWithRetry("/api/r2-upload-url", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                // La taille fait partie de la signature côté serveur : R2
                // refusera un corps différent de celui annoncé ici.
                body: JSON.stringify({ path, contentType, contentLength: body.size }),
            });
            const { uploadUrl, publicUrl, error } = await res.json();
            if (!res.ok) throw new Error(error || "Impossible de préparer l'envoi.");

            // PUT vers une clé R2 fixe : rejouable sans risque, le second
            // envoi remplace simplement le premier au même endroit.
            const putRes = await fetchWithRetry(uploadUrl, {
                method: "PUT",
                headers: { "Content-Type": contentType },
                body,
            });
            if (!putRes.ok) throw new Error("L'envoi du fichier a échoué.");

            return publicUrl;
        };

        goToStage("thumbnail");
        const thumbnailUrl = await upload(`${folder}/thumb.${extension}`, item.processed.thumbnail, mimeType);

        goToStage("display");
        const displayUrl = await upload(`${folder}/display.${extension}`, item.processed.display, mimeType);

        goToStage("original");
        const originalExtension = item.file.name.split(".").pop()?.toLowerCase() || "jpg";
        const originalUrl = await upload(
            `${folder}/original.${originalExtension}`,
            item.file,
            item.file.type || "image/jpeg"
        );

        goToStage("publish");
        const altText = item.altText.trim();
        const { data: mediaRecord, error: insertError } = await supabase
            .from("media")
            .insert({
                user_id: user.id,
                type: item.type,
                url: displayUrl,
                original_url: originalUrl,
                thumbnail_url: thumbnailUrl,
                blur_data_url: item.processed.blurDataURL,
                phash,
                // Un seul champ saisi sert de titre et de texte alternatif :
                // l'un porte le référencement et l'accessibilité, l'autre
                // l'affichage et l'adresse de la page. Le contributeur peut
                // les dissocier ensuite depuis la page de modification.
                title: altText,
                alt_text: altText,
                description: item.description.trim() || null,
                camera: item.camera.trim() || null,
                lens: item.lens.trim() || null,
                focal_length: item.focalLength.trim() || null,
                aperture: item.aperture.trim() || null,
                shutter_speed: item.shutterSpeed.trim() || null,
                iso: item.iso,
                tags: item.tags,
                location: item.location.trim() || null,
                city: item.city.trim() || null,
                country_code: item.countryCode || null,
                is_premium: item.isPremium,
                // `null` sauf pour un contributeur autorisé à fixer son
                // propre prix (voir migration 0022) — un déclencheur en
                // base revalide de toute façon la fourchette et le statut,
                // ceci n'est qu'un confort d'interface.
                custom_credits_cost: item.isPremium && item.customPrice != null ? Number(item.customPrice) : null,
                width: item.processed.width,
                height: item.processed.height,
                // Lue sur la vidéo pendant l'extraction de l'aperçu ; nulle
                // pour une image. Sans elle, le badge de durée des cartes
                // vidéo ne s'affichait jamais.
                duration: item.processed.duration,
                file_size: item.file.size,
                mime_type: item.file.type || null,
                // Le statut n'est pas décidé ici : un déclencheur côté
                // serveur (migration 0004) l'impose selon le réglage
                // `moderation_mode` choisi par un admin.
            })
            .select("id, status")
            .single();

        if (insertError) {
            // Les 3 fichiers sont déjà sur R2 à ce stade : sans ce nettoyage,
            // ils restent orphelins (aucune ligne `media` ne les référence,
            // donc invisibles/supprimables nulle part dans l'admin) —
            // best-effort, ne doit pas masquer l'erreur d'origine si le
            // nettoyage échoue à son tour.
            try {
                const { data: { session: cleanupSession } } = await supabase.auth.getSession();
                if (cleanupSession) {
                    await fetch("/api/r2-delete", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${cleanupSession.access_token}`,
                        },
                        body: JSON.stringify({
                            paths: [
                                `${folder}/thumb.${extension}`,
                                `${folder}/display.${extension}`,
                                `${folder}/original.${originalExtension}`,
                            ],
                        }),
                    });
                }
            } catch (cleanupErr) {
                console.error("Nettoyage R2 après échec de publication impossible :", cleanupErr);
            }
            throw insertError;
        }

        // Un échec ici n'annule pas la publication (la ligne `media` existe
        // déjà) mais laisse les tags non rattachés à `media_topics` —
        // invisible pour l'auteur sans ce signalement, et la photo
        // n'apparaîtrait alors jamais sur les pages thème correspondantes.
        const topicsResult = item.tags.length > 0 ? await syncTopics(mediaRecord.id, item.tags) : { success: true };

        return {
            id: mediaRecord.id,
            slug: slugifyClient(altText || "photo"),
            status: mediaRecord.status,
            topicsWarning: item.tags.length > 0 && !topicsResult.success,
        };
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setFormError(null);

        const pending = items.filter((item) => item.status !== "done");
        if (pending.length === 0 || !user) return;

        if (pending.some((item) => item.processing)) {
            setFormError("Certaines images sont encore en préparation, patientez un instant.");
            return;
        }
        if (pending.some((item) => !item.processed)) {
            setFormError("Une image n'a pas pu être préparée. Retirez-la avant de publier.");
            return;
        }
        if (pending.some((item) => !item.altText.trim())) {
            setFormError("Chaque image doit être décrite avant d'être publiée.");
            return;
        }

        setPublishing(true);
        setItems((prev) =>
            prev.map((item) =>
                item.status === "done" ? item : { ...item, status: "uploading", error: null, percent: 0 }
            )
        );

        try {
            // Filet de sécurité : sans profil, la contrainte de clé étrangère
            // sur `media.user_id` fait échouer toutes les publications.
            const { data: existingProfile } = await supabase
                .from("profiles")
                .select("id")
                .eq("id", user.id)
                .maybeSingle();

            if (!existingProfile) {
                const username = `${user.email.split("@")[0]}-${user.id.slice(0, 4)}`;
                const { success, error: profileError } = await upsertProfile(user.id, {
                    username,
                    full_name: user.user_metadata?.full_name || username,
                    avatar_url: user.user_metadata?.avatar_url || null,
                });
                if (!success) throw new Error(profileError);
            }
        } catch (err) {
            console.warn("Profile check failed:", err);
            setFormError(friendlyErrorMessage(err, "La publication a échoué. Réessayez."));
            setItems((prev) => prev.map((item) => (item.status === "uploading" ? { ...item, status: "idle" } : item)));
            setPublishing(false);
            return;
        }

        const succeeded = new Set();
        // Partagé entre les images du lot : chacune y ajoute son empreinte une
        // fois le contrôle qualité passé, et se compare à celles qui l'ont
        // précédée.
        const batchHashes = [];
        await runWithConcurrency(pending, CONCURRENCY, async (item) => {
            try {
                const published = await publishItem(item, batchHashes);
                succeeded.add(item.id);
                patchItem(item.id, { status: "done", published, percent: 100, stage: "" });
            } catch (err) {
                console.warn("Submission error:", err);
                patchItem(item.id, {
                    status: "error",
                    stage: "",
                    error: friendlyErrorMessage(err, "La publication a échoué. Réessayez."),
                });
            }
        });

        setPublishing(false);

        // L'écran de succès n'apparaît que si plus rien n'est en attente :
        // sinon on reste sur la liste, chaque échec affiché sur sa carte,
        // le bouton devenant « Réessayer ».
        if (pending.every((item) => succeeded.has(item.id))) {
            setStep(3);
            getPlatformStats().then(setPlatformStats);
        }
    };

    // Les aperçus ne sont libérés qu'au démontage : les révoquer à chaque
    // changement de `items` (donc à chaque frappe dans un champ) viderait
    // toutes les vignettes affichées.
    const itemsRef = useRef(items);
    useEffect(() => { itemsRef.current = items; }, [items]);
    useEffect(() => () => itemsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl)), []);

    const resetForm = () => {
        items.forEach((item) => URL.revokeObjectURL(item.previewUrl));
        setItems([]);
        setStep(1);
        setFormError(null);
        setPlatformStats(null);
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
        handleFileSelect(event.dataTransfer.files);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black dark:border-white mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-zinc-400">Vérification de votre session…</p>
                </div>
            </div>
        );
    }

    if (!user) return null;

    const countryGroups = {
        africanCountries: countries.filter((c) => c.is_african),
        otherCountries: countries.filter((c) => !c.is_african),
    };

    const pendingCount = items.filter((item) => item.status !== "done").length;
    const hasFailures = items.some((item) => item.status === "error");
    const publishedItems = items.filter((item) => item.published);
    const anyPending = publishedItems.some((item) => item.published.status === "pending");
    const overallPercent = items.length
        ? Math.round(items.reduce((total, item) => total + (item.status === "done" ? 100 : item.percent), 0) / items.length)
        : 0;

    return (
        <div className="min-h-screen bg-white dark:bg-zinc-950">
            {publishing && (
                <UploadProgress
                    percent={overallPercent}
                    label={
                        items.length > 1
                            ? `Envoi de ${Math.min(items.filter((i) => i.status === "done").length + 1, items.length)} sur ${items.length}…`
                            : "Envoi en cours…"
                    }
                />
            )}

            <div className="max-w-[1200px] mx-auto px-4 py-12 md:py-20">
                {step === 1 ? (
                    <div className="max-w-3xl mx-auto">
                        <div className="text-center mb-12">
                            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-zinc-100 mb-4">
                                Contribuez à JEaLiFe Stock
                            </h1>
                            <p className="text-lg text-gray-500 dark:text-zinc-400">
                                Partagez votre regard, gardez vos droits.
                            </p>
                        </div>

                        <div
                            className={`border-3 border-dashed rounded-[32px] p-20 text-center transition-all ${
                                dragActive
                                    ? "border-green-500 bg-green-50/50 scale-[1.02]"
                                    : "border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600"
                            }`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                        >
                            <div className="cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                <div className="w-20 h-20 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <UploadCloud className="w-10 h-10 text-gray-400 dark:text-zinc-500" />
                                </div>
                                <p className="mt-4 text-[15px] font-medium text-gray-700 dark:text-zinc-300">
                                    Glissez et déposez vos fichiers ici
                                </p>
                                <p className="mt-1.5 text-[13px] text-gray-500 dark:text-zinc-400">
                                    Jusqu&apos;à {MAX_FILES} images à la fois • JPG, PNG, WebP, SVG ou MP4 • 50 Mo par fichier
                                </p>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*,video/*"
                                multiple
                                className="hidden"
                                onChange={(e) => { handleFileSelect(e.target.files); e.target.value = ""; }}
                            />
                        </div>

                        {formError && (
                            <p className="mt-6 text-center text-sm text-red-600 dark:text-red-400">{formError}</p>
                        )}

                        {moderationMode === "manual" && (
                            <p className="mt-6 text-center text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 border border-amber-100 dark:border-amber-900 rounded-xl px-4 py-3">
                                Chaque envoi est actuellement vérifié par un membre de l&apos;équipe
                                avant d&apos;être publié.
                            </p>
                        )}

                        <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-gray-400 dark:text-zinc-500 text-sm font-medium">
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
                        <div className="mt-10 p-6 bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-800 rounded-2xl">
                            <p className="text-xs font-bold text-gray-900 dark:text-zinc-100 uppercase tracking-wider mb-4">
                                Avant d&apos;envoyer
                            </p>
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5 text-sm text-gray-600 dark:text-zinc-400">
                                <li className="flex gap-2.5">
                                    <span className="text-gray-300 dark:text-zinc-600">•</span> Photo nette, 5 mégapixels minimum
                                </li>
                                <li className="flex gap-2.5">
                                    <span className="text-gray-300 dark:text-zinc-600">•</span> Vous devez être l&apos;auteur et détenir les droits
                                </li>
                                <li className="flex gap-2.5">
                                    <span className="text-gray-300 dark:text-zinc-600">•</span> Pas de contenu choquant, violent ou à caractère sexuel
                                </li>
                                <li className="flex gap-2.5">
                                    <span className="text-gray-300 dark:text-zinc-600">•</span> Pas de filigrane, logo ou texte incrusté
                                </li>
                                <li className="flex gap-2.5">
                                    <span className="text-gray-300 dark:text-zinc-600">•</span> Une photo ou illustration originale, pas une capture d&apos;écran
                                </li>
                                <li className="flex gap-2.5">
                                    <span className="text-gray-300 dark:text-zinc-600">•</span> 50 Mo maximum
                                </li>
                            </ul>
                        </div>
                    </div>
                ) : step === 3 ? (
                    <div className="max-w-2xl mx-auto text-center">
                        <Confetti />
                        <div className="w-20 h-20 bg-green-50 dark:bg-green-950 rounded-full flex items-center justify-center mx-auto mb-6">
                            <PartyPopper className="w-10 h-10 text-green-600 dark:text-green-400" />
                        </div>

                        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-zinc-100 mb-6">
                            Merci pour votre contribution
                        </h1>

                        {/* La preuve d'abord, l'explication ensuite : la photo
                            elle-même confirme ce qui vient de se passer bien
                            mieux qu'une phrase, et une seule image méritait
                            mieux qu'une case à moitié d'une grille pensée pour
                            plusieurs — recadrée en carré, à côté d'un vide.
                            Son ratio réel est gardé (`object-contain`), comme
                            partout ailleurs dans ce formulaire. */}
                        {publishedItems.length === 1 ? (
                            <button
                                type="button"
                                onClick={() =>
                                    router.push(`/photos/${publishedItems[0].published.id}-${publishedItems[0].published.slug}`)
                                }
                                className="block w-full max-w-sm mx-auto mb-8 rounded-2xl overflow-hidden bg-gray-100 dark:bg-zinc-800 ring-1 ring-black/5 dark:ring-white/10 hover:ring-black dark:hover:ring-white transition-all"
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={publishedItems[0].previewUrl}
                                    alt={publishedItems[0].altText}
                                    className="w-full h-auto max-h-96 object-contain"
                                />
                            </button>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
                                {publishedItems.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => router.push(`/photos/${item.published.id}-${item.published.slug}`)}
                                        className="rounded-2xl overflow-hidden bg-gray-100 dark:bg-zinc-800 ring-1 ring-black/5 dark:ring-white/10 hover:ring-black dark:hover:ring-white transition-all"
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={item.previewUrl} alt={item.altText} className="w-full h-32 object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}

                        {anyPending ? (
                            <p className="text-lg text-gray-500 dark:text-zinc-400 mb-10">
                                {publishedItems.length > 1
                                    ? "Vos images ont passé nos contrôles de qualité automatiques."
                                    : "Votre image a passé nos contrôles de qualité automatiques."}{" "}
                                Un membre de l&apos;équipe les vérifie avant publication : vous
                                êtes pour l&apos;instant la seule personne à pouvoir les voir.
                            </p>
                        ) : (
                            <>
                                <p className="text-lg text-gray-500 dark:text-zinc-400 mb-2">
                                    {publishedItems.length > 1
                                        ? `Vos ${publishedItems.length} images ont passé nos contrôles de qualité automatiques et sont déjà visibles.`
                                        : "Votre image a passé nos contrôles de qualité automatiques et est déjà visible sur JEaLiFe Stock."}
                                </p>
                                {platformStats && (
                                    <p className="text-lg text-gray-500 dark:text-zinc-400 mb-10">
                                        Grâce à vous, la plateforme compte désormais{" "}
                                        <strong className="text-gray-900 dark:text-zinc-100">
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

                        {publishedItems.some((item) => item.published.topicsWarning) && (
                            <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 border border-amber-100 dark:border-amber-900 rounded-xl px-4 py-3 mb-6">
                                Certaines images sont publiées, mais leurs mots-clés n&apos;ont pas pu être
                                enregistrés. Vous pouvez les ajouter depuis la page de modification.
                            </p>
                        )}

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            {publishedItems.length === 1 && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        router.push(
                                            `/photos/${publishedItems[0].published.id}-${publishedItems[0].published.slug}`
                                        )
                                    }
                                    className="px-6 py-4 bg-black dark:bg-white text-white dark:text-black font-bold rounded-2xl hover:bg-gray-800 dark:hover:bg-zinc-200 transition-all shadow-xl hover:shadow-2xl active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {anyPending ? "Voir mon envoi" : "Voir la photo publiée"} <ArrowRight className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-6 py-4 border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 font-bold rounded-2xl hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all active:scale-95"
                            >
                                Publier d&apos;autres images
                            </button>
                        </div>

                        {profile?.username && (
                            <p className="mt-8 text-sm font-medium text-gray-500 dark:text-zinc-400">
                                <a href={`/@${profile.username}`} className="hover:text-black dark:hover:text-white transition-colors">
                                    Voir mon profil
                                </a>
                            </p>
                        )}
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-zinc-100 mb-2">
                                {items.length > 1 ? `${items.length} images à publier` : "Votre image"}
                            </h1>
                            <p className="text-gray-500 dark:text-zinc-400">
                                Une description par image suffit. Tout le reste se complète plus tard.
                            </p>
                        </div>

                        <div className="space-y-4">
                            {items.map((item, index) => (
                                <ItemCard
                                    key={item.id}
                                    item={item}
                                    index={index}
                                    countries={countryGroups}
                                    dbTopics={dbTopics}
                                    premiumPricing={premiumPricing}
                                    canPricePremium={!!profile?.can_price_premium}
                                    disabled={publishing}
                                    aiQuotaExhausted={aiQuotaExhausted}
                                    onPatch={(patch) => patchItem(item.id, patch)}
                                    onRemove={() => removeItem(item.id)}
                                    onGenerate={() => generateForItem(item)}
                                />
                            ))}
                        </div>

                        {items.length < MAX_FILES && (
                            <>
                                <button
                                    type="button"
                                    disabled={publishing}
                                    onClick={() => addMoreInputRef.current?.click()}
                                    className="mt-4 w-full py-6 border-2 border-dashed border-gray-200 dark:border-zinc-700 rounded-3xl text-sm font-medium text-gray-500 dark:text-zinc-400 hover:border-gray-400 dark:hover:border-zinc-500 hover:text-black dark:hover:text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <Plus className="w-4 h-4" />
                                    Ajouter d&apos;autres images ({MAX_FILES - items.length} restantes)
                                </button>
                                <input
                                    ref={addMoreInputRef}
                                    type="file"
                                    accept="image/*,video/*"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => { handleFileSelect(e.target.files); e.target.value = ""; }}
                                />
                            </>
                        )}

                        <div className="mt-6 p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-700 flex gap-3">
                            <Info className="w-5 h-5 text-gray-400 dark:text-zinc-500 shrink-0" />
                            <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
                                En publiant, vous acceptez la{" "}
                                <a href="/licence" target="_blank" className="underline font-semibold hover:text-black dark:hover:text-white">
                                    licence JEaLiFe
                                </a>
                                . Vous restez propriétaire de vos images et pouvez les retirer à tout moment.
                            </p>
                        </div>

                        {formError && (
                            <p className="mt-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 border border-red-100 dark:border-red-900 rounded-xl px-4 py-3">
                                {formError}
                            </p>
                        )}

                        <div className="flex gap-4 pt-6">
                            <button
                                type="button"
                                onClick={resetForm}
                                disabled={publishing}
                                className="flex-1 py-4 px-6 border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 font-bold rounded-2xl hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all active:scale-95 disabled:opacity-50"
                            >
                                Tout annuler
                            </button>
                            <button
                                type="submit"
                                disabled={publishing || pendingCount === 0 || items.some((item) => item.processing)}
                                className="flex-1 py-4 px-6 bg-black dark:bg-white text-white dark:text-black font-bold rounded-2xl hover:bg-gray-800 dark:hover:bg-zinc-200 transition-all shadow-xl hover:shadow-2xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                            >
                                {publishing ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" /> Publication…
                                    </>
                                ) : hasFailures ? (
                                    `Réessayer (${pendingCount})`
                                ) : pendingCount > 1 ? (
                                    `Publier les ${pendingCount} images`
                                ) : (
                                    "Publier l'image"
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
