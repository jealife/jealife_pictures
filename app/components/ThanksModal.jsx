"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Share2, Copy, Check } from "lucide-react";
import { mediaUrl } from "../lib/media";
import { SITE_URL } from "../lib/site";

export default function ThanksModal({ photo, onClose }) {
    const [copied, setCopied] = useState(false);

    if (!photo) return null;

    const photoUrl = typeof window !== "undefined" 
        ? `${window.location.origin}${mediaUrl(photo)}` 
        : `${SITE_URL}${mediaUrl(photo)}`;

    const authorUrl = typeof window !== "undefined"
        ? `${window.location.origin}/@${photo.author.username}`
        : `${SITE_URL}/@${photo.author.username}`;

    const authorUrlWithUtm = `${authorUrl}?utm_source=jealife_stock&utm_medium=referral&utm_content=creditCopyText`;
    const photoUrlWithUtm = `${photoUrl}?utm_source=jealife_stock&utm_medium=referral&utm_content=creditCopyText`;

    const plainText = `Photo de ${photo.author.name} sur JEaLiFe Stock`;
    const htmlText = `Photo de <a href="${authorUrlWithUtm}">${photo.author.name}</a> sur <a href="${photoUrlWithUtm}">JEaLiFe Stock</a>`;

    const handleCopy = async () => {
        try {
            if (navigator.clipboard && window.ClipboardItem) {
                const htmlBlob = new Blob([htmlText], { type: 'text/html' });
                const textBlob = new Blob([plainText], { type: 'text/plain' });
                await navigator.clipboard.write([
                    new window.ClipboardItem({
                        'text/html': htmlBlob,
                        'text/plain': textBlob
                    })
                ]);
            } else {
                await navigator.clipboard.writeText(plainText);
            }
        } catch (err) {
            console.error("Erreur de copie au format riche :", err);
            await navigator.clipboard.writeText(plainText);
        }
        
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShare = async () => {
        const shareData = {
            title: photo.title || "Photo sur JEaLiFe Stock",
            text: photo.description || "Découvrez cette image sur JEaLiFe Stock",
            url: photoUrl,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch {
                // share cancelled or failed
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-[540px] shadow-2xl overflow-hidden flex relative animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200"
                onClick={(event) => event.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-900 bg-white/80 hover:bg-gray-100 rounded-full transition-colors z-10"
                    aria-label="Fermer"
                >
                    <X className="w-5 h-5" />
                </button>
                
                <div className="w-[140px] shrink-0 bg-gray-100 hidden sm:block relative">
                    {photo.type === "video" ? (
                        <video src={photo.url} className="w-full h-full object-cover" />
                    ) : (
                        <Image
                            src={photo.thumbnailUrl || photo.url}
                            alt={photo.alt || ""}
                            fill
                            className="object-cover"
                        />
                    )}
                </div>
                
                <div className="p-6 sm:p-8 flex-1 flex flex-col justify-center">
                    <h3 className="text-xl font-black text-gray-900 mb-2">Exprimez vos remerciements !</h3>
                    <p className="text-[14px] text-gray-500 mb-6 leading-relaxed">
                        Remerciez <Link href={`/@${photo.author.username}`} onClick={onClose} className="font-semibold text-gray-700 underline underline-offset-2 hover:text-gray-900">{photo.author.name}</Link> sur les réseaux sociaux ou copiez le texte ci-dessous pour l&apos;attribuer à l&apos;artiste.
                    </p>
                    
                    <div className="flex items-center gap-2 mb-6">
                        <button onClick={handleShare} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-900 transition-colors" aria-label="Partager">
                            <Share2 className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl p-1.5 overflow-hidden">
                        <div className="flex-1 px-3 text-[13px] text-gray-600 truncate bg-transparent select-all cursor-text">
                            Photo de {photo.author.name} sur JEaLiFe Stock
                        </div>
                        <button
                            onClick={handleCopy}
                            className="flex items-center justify-center w-10 h-10 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors shrink-0"
                            aria-label="Copier"
                        >
                            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
