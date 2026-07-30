"use client";

import Image from "next/image";
import { AUTH_IMAGES } from "../lib/auth-images";

/**
 * Panneau illustré des pages de connexion et d'inscription.
 *
 * L'image est choisie par index plutôt que tirée au sort : ces pages sont
 * statiques, et un tirage au montage coûtait un rendu supplémentaire pour un
 * bénéfice nul.
 */
export default function AuthBackground({ title, quote, imageIndex = 0 }) {
    const background = AUTH_IMAGES[imageIndex % AUTH_IMAGES.length];

    return (
        <div className="hidden lg:block lg:w-[40%] relative bg-black overflow-hidden">
            <Image
                src={background.url}
                alt=""
                fill
                priority
                sizes="40vw"
                className="object-cover"
            />

            <div className="absolute inset-0 bg-linear-to-b from-black/40 via-black/10 to-black/85 z-10" />

            <div className="absolute bottom-8 left-8 right-8 z-20 text-white">
                <h2 className="text-4xl font-bold mb-2">{title}</h2>
                <p className="text-lg opacity-90 max-w-md">{quote}</p>
                <p className="text-xs opacity-60 mt-6">
                    Photo par{" "}
                    <a
                        href={background.photographer_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                    >
                        {background.photographer}
                    </a>
                </p>
            </div>
        </div>
    );
}
