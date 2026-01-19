"use client";

import { UploadCloud, Image as ImageIcon, Video, Palette, CheckCircle2, MapPin, Camera, Tag, X, Info } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import ExifReader from 'exifreader';
import { upsertProfile } from "../lib/auth";
import { syncTopics, getTopics } from "../lib/database";

export default function SubmitPage() {
    const router = useRouter();
    const { user, loading } = useAuth();

    // State for flow
    const [step, setStep] = useState(1); // 1: Upload, 2: Details
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    // Form data
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [selectedType, setSelectedType] = useState('photo');
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [location, setLocation] = useState("");
    const [camera, setCamera] = useState("");
    const [tagsInput, setTagsInput] = useState("");
    const [tags, setTags] = useState([]);

    // Suggestions states
    const [locationSuggestions, setLocationSuggestions] = useState([]);
    const [tagSuggestions, setTagSuggestions] = useState([]);
    const [showLocationDeps, setShowLocationDeps] = useState(false);
    const [showTagDeps, setShowTagDeps] = useState(false);
    const [dbTopics, setDbTopics] = useState([]);

    const fileInputRef = useRef(null);
    const popularTags = ["Gabon", "Libreville", "Nature", "Voyage", "Afrique", "Portrait", "Paysage", "Forêt", "Océan Atlanique", "Culture", "Architecture", "Animaux", "Couchers de soleil", "Plage", "Street Photography"];

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login?redirect=/submit');
        }

        // Charger les topics de la DB pour les suggestions
        async function loadTopics() {
            const data = await getTopics();
            if (data) {
                setDbTopics(data.map(t => t.name));
            }
        }
        loadTopics();
    }, [user, loading, router]);

    // Fetch Location Suggestions (Photon API)
    useEffect(() => {
        const fetchLocations = async () => {
            if (location.trim().length < 2) {
                setLocationSuggestions([]);
                return;
            }
            try {
                const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(location)}&limit=5`);
                const data = await res.json();
                const formatted = data.features.map(f => {
                    const { name, city, country } = f.properties;
                    return [name, city, country].filter(Boolean).join(', ');
                });
                setLocationSuggestions([...new Set(formatted)]); // Remove duplicates
            } catch (e) {
                console.error("Location fetch error:", e);
            }
        };

        const timer = setTimeout(fetchLocations, 300);
        return () => clearTimeout(timer);
    }, [location]);

    // Tag Suggestions Logic
    useEffect(() => {
        if (tagsInput.trim().length > 0) {
            const filtered = dbTopics.filter(t =>
                t.toLowerCase().includes(tagsInput.toLowerCase()) && !tags.includes(t)
            );
            setTagSuggestions(filtered.slice(0, 8));
        } else {
            setTagSuggestions([]);
        }
    }, [tagsInput, tags, dbTopics]);

    const handleFileSelect = async (files) => {
        const selectedFile = files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));

        // Show preview
        const objectUrl = URL.createObjectURL(selectedFile);
        setPreviewUrl(objectUrl);

        // --- EXIF & Metadata Extraction ---
        try {
            const exifData = await ExifReader.load(selectedFile);
            console.log("Full Metadata extracted:", exifData);

            // 1. Camera Info
            const model = exifData['Model']?.description || "";
            const lens = exifData['LensModel']?.description || exifData['Lens']?.description || "";
            const fnumber = exifData['FNumber']?.description ? `f/${exifData['FNumber'].value}` : "";
            const focalLength = exifData['FocalLength']?.description || "";

            let exifString = model;
            if (lens) exifString += `, ${lens}`;
            else if (focalLength || fnumber) exifString += `, ${focalLength} ${fnumber}`.trim();

            if (exifString) setCamera(exifString);

            // 2. Title Extraction (IPTC ObjectName or XMP Title)
            const extractedTitle = exifData['ObjectName']?.description || exifData['title']?.description || exifData['ImageDescription']?.description;
            if (extractedTitle) setTitle(extractedTitle);

            // 3. Description Extraction
            const extractedDesc = exifData['Description']?.description || exifData['Caption-Abstract']?.description;
            if (extractedDesc) setDescription(extractedDesc);

            // 4. Keywords / Tags Extraction (IPTC Keywords or XMP Subject)
            const rawKeywords = exifData['Keywords']?.value || exifData['subject']?.value || [];
            if (rawKeywords && rawKeywords.length > 0) {
                // Ensure it's an array of strings
                const extractedTags = Array.isArray(rawKeywords)
                    ? rawKeywords.map(k => typeof k === 'object' ? k.description : k)
                    : [rawKeywords];

                setTags(prev => [...new Set([...prev, ...extractedTags])]);
            }

        } catch (e) {
            console.log("No exifData found or error parsing:", e);
        }

        setStep(2);
    };

    const handleAddTag = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const tag = tagsInput.trim().replace(',', '');
            if (tag && !tags.includes(tag)) {
                setTags([...tags, tag]);
                setTagsInput("");
                setTagSuggestions([]);
            }
        }
    };

    const selectTag = (tag) => {
        if (!tags.includes(tag)) {
            setTags([...tags, tag]);
            setTagsInput("");
            setTagSuggestions([]);
        }
    };

    const selectLocation = (loc) => {
        setLocation(loc);
        setLocationSuggestions([]);
        setShowLocationDeps(false);
    };

    const removeTag = (tagToRemove) => {
        setTags(tags.filter(t => t !== tagToRemove));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file || !user) {
            console.error("Missing file or user for submission");
            return;
        }

        setUploading(true);
        try {
            // 0. Ensure user profile exists (fix for 'Key is not present in table profiles')
            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', user.id)
                .maybeSingle();

            if (!profile) {
                const username = user.email.split('@')[0] + Math.floor(Math.random() * 1000);
                const { success, error: upsertErr } = await upsertProfile(user.id, {
                    username: username,
                    full_name: user.user_metadata?.full_name || username,
                    avatar_url: user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`
                });

                if (!success) throw new Error(`Could not create profile: ${upsertErr}`);
            }

            // 1. Upload to Supabase Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${Date.now()}.${fileExt}`;

            const { data: storageData, error: storageError } = await supabase.storage
                .from('media')
                .upload(fileName, file);

            if (storageError) throw storageError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('media')
                .getPublicUrl(fileName);

            // 3. Insert into Media Table
            const insertData = {
                user_id: user.id,
                url: publicUrl,
                type: selectedType,
                title: title,
                description: description,
                location: location,
                camera: camera,
                tags: tags,
                status: 'published'
            };

            // 3. Insert into Media Table
            const { data: mediaRecord, error: dbError } = await supabase
                .from('media')
                .insert(insertData)
                .select()
                .single();

            if (dbError) throw dbError;

            // 4. Synchroniser avec la table topics
            if (mediaRecord) {
                await syncTopics(mediaRecord.id, tags);
            }

            // Redirect on success
            router.push('/');

        } catch (error) {
            console.error('Submission error:', error);
            const errorMsg = error.message || error.error_description || (error.error && error.error.message) || JSON.stringify(error);
            alert(`Erreur lors de la publication: ${errorMsg}`);
        } finally {
            setUploading(false);
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
        else if (e.type === "dragleave") setDragActive(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
                <p className="text-gray-500">Vérification de votre session...</p>
            </div>
        </div>
    );

    if (!user) return null;

    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-[1200px] mx-auto px-4 py-12 md:py-20">

                {step === 1 ? (
                    <div className="max-w-3xl mx-auto">
                        <div className="text-center mb-12">
                            <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Contribuez à JEaLiFe</h1>
                            <p className="text-lg text-gray-500">Partagez votre regard sur le Gabon et l'Afrique.</p>
                        </div>

                        <div
                            className={`border-3 border-dashed rounded-[32px] p-20 text-center transition-all ${dragActive ? 'border-blue-500 bg-blue-50/50 scale-[1.02]' : 'border-gray-200 hover:border-gray-300'}`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                        >
                            <div
                                className="cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <UploadCloud className="w-10 h-10 text-gray-400" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Glissez-déposez ou parcourez</h2>
                                <p className="text-gray-500">Haute qualité recommandée (JPG, PNG)</p>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                onChange={(e) => handleFileSelect(e.target.files)}
                            />
                        </div>

                        <div className="mt-12 flex items-center justify-center gap-12 text-gray-400 text-sm font-medium">
                            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> 100% Gratuit</div>
                            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Publicité gratuite</div>
                            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Vos droits conservés</div>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

                        {/* Left: Preview */}
                        <div className="sticky top-28">
                            <div className="rounded-2xl overflow-hidden shadow-2xl bg-gray-100 ring-1 ring-black/5">
                                <img src={previewUrl} alt="Preview" className="w-full h-auto object-cover max-h-[70vh]" />
                            </div>
                            <button
                                onClick={() => setStep(1)}
                                className="mt-4 text-sm font-medium text-gray-500 hover:text-black flex items-center gap-2 transition-colors"
                            >
                                <X className="w-4 h-4" /> Changer de fichier
                            </button>
                        </div>

                        {/* Right: Form Info */}
                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div>
                                <h2 className="text-3xl font-bold text-gray-900 mb-2">Détails de l'image</h2>
                                <p className="text-gray-500">Aidez les autres à découvrir votre contenu.</p>
                            </div>

                            <div className="space-y-6">
                                {/* Title */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-2">Titre / Sujet</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Ex: Éléphant dans le parc d'Ivindo"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all font-medium"
                                        required
                                    />
                                </div>

                                {/* Location */}
                                <div className="relative">
                                    <label className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                                        <MapPin className="w-4 h-4 opacity-40" /> Lieu
                                    </label>
                                    <input
                                        type="text"
                                        value={location}
                                        onChange={(e) => {
                                            setLocation(e.target.value);
                                            setShowLocationDeps(true);
                                        }}
                                        onFocus={() => setShowLocationDeps(true)}
                                        placeholder="Ex: Lopé National Park, Gabon"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all font-medium"
                                    />
                                    {showLocationDeps && locationSuggestions.length > 0 && (
                                        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                            {locationSuggestions.map((loc, i) => (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={() => selectLocation(loc)}
                                                    className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 border-b border-gray-50 last:border-none flex items-center gap-3 transition-colors"
                                                >
                                                    <MapPin className="w-4 h-4 text-gray-300" />
                                                    {loc}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Camera Info */}
                                <div>
                                    <label className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                                        <Camera className="w-4 h-4 opacity-40" /> Matériel / EXIF
                                    </label>
                                    <input
                                        type="text"
                                        value={camera}
                                        onChange={(e) => setCamera(e.target.value)}
                                        placeholder="Ex: Sony A7III, 85mm f/1.4"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all font-medium"
                                    />
                                </div>

                                {/* Tags */}
                                <div className="relative">
                                    <label className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                                        <Tag className="w-4 h-4 opacity-40" /> Mots-clés associés
                                    </label>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {tags.map(tag => (
                                            <span key={tag} className="px-3 py-1.5 bg-black text-white text-xs font-bold rounded-lg flex items-center gap-2 animate-in zoom-in-95">
                                                {tag}
                                                <button type="button" onClick={() => removeTag(tag)}><X className="w-3 h-3" /></button>
                                            </span>
                                        ))}
                                    </div>
                                    <input
                                        type="text"
                                        value={tagsInput}
                                        onChange={(e) => {
                                            setTagsInput(e.target.value);
                                            setShowTagDeps(true);
                                        }}
                                        onFocus={() => setShowTagDeps(true)}
                                        onKeyDown={handleAddTag}
                                        placeholder="Ajoutez un mot-clé et appuyez sur Entrée..."
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all font-medium"
                                    />
                                    {showTagDeps && tagSuggestions.length > 0 && (
                                        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                            {tagSuggestions.map((tag, i) => (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={() => selectTag(tag)}
                                                    className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 border-b border-gray-50 last:border-none flex items-center gap-3 transition-colors"
                                                >
                                                    <Tag className="w-4 h-4 text-gray-300" />
                                                    {tag}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    <p className="text-xs text-gray-400 mt-2">Séparez les tags par des virgules ou la touche Entrée.</p>
                                </div>

                                {/* Privacy / Status Info */}
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex gap-3">
                                    <Info className="w-5 h-5 text-gray-400 shrink-0" />
                                    <p className="text-xs text-gray-500 leading-relaxed">
                                        En publiant, vous acceptez la <strong>Licence JEaLiFe</strong> (Libre usage).
                                        L'image sera immédiatement visible sur la page d'accueil sous le statut "Publié".
                                    </p>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        disabled={uploading}
                                        className="flex-1 py-4 px-6 border border-gray-200 text-gray-600 font-bold rounded-2xl hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={uploading}
                                        className="flex-1 py-4 px-6 bg-black text-white font-bold rounded-2xl hover:bg-gray-800 transition-all shadow-xl hover:shadow-2xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                                    >
                                        {uploading ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                                Publication...
                                            </>
                                        ) : (
                                            <>Publier l'image</>
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
