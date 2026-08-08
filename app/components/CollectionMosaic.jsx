import Image from "next/image";
import { Layers } from "lucide-react";

/**
 * Couverture en mosaïque d'une collection : une grande image à gauche, deux
 * empilées à droite — le repère visuel des pages Collections d'Unsplash,
 * plus lisible qu'une seule photo pour donner une idée du contenu réel.
 *
 * Se dégrade proprement à 2, 1 ou 0 image plutôt que de laisser des cases
 * vides : une collection qui démarre n'a pas toujours 3 photos.
 */
export default function CollectionMosaic({ images = [], alt = "", className = "" }) {
    const [first, second, third] = images;

    if (!first) {
        return (
            <div className={`flex items-center justify-center bg-gray-100 dark:bg-zinc-800 text-gray-300 dark:text-zinc-600 ${className}`}>
                <Layers className="w-8 h-8" />
            </div>
        );
    }

    if (!second) {
        return (
            <div className={`relative bg-gray-100 dark:bg-zinc-800 ${className}`}>
                <Image src={first} alt={alt} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" />
            </div>
        );
    }

    if (!third) {
        return (
            <div
                className={`grid grid-cols-2 gap-[3px] bg-gray-100 dark:bg-zinc-800 ${className}`}
                style={{ gridTemplateRows: "1fr" }}
            >
                <div className="relative h-full w-full">
                    <Image src={first} alt={alt} fill sizes="(max-width: 640px) 50vw, 16vw" className="object-cover" />
                </div>
                <div className="relative h-full w-full">
                    <Image src={second} alt="" fill sizes="(max-width: 640px) 50vw, 16vw" className="object-cover" />
                </div>
            </div>
        );
    }

    // `gridTemplateRows` explicite : sans lui, les deux rangées implicites
    // restent en `auto` (taille au contenu) et n'occupent jamais la hauteur
    // donnée par `aspect-[4/3]` sur le conteneur — les `<Image fill>` se
    // retrouvent alors dans une boîte de hauteur nulle, invisibles bien que
    // chargées avec succès.
    return (
        <div
            className={`grid gap-[3px] bg-gray-100 dark:bg-zinc-800 ${className}`}
            style={{ gridTemplateColumns: "2fr 1fr", gridTemplateRows: "1fr 1fr" }}
        >
            <div className="relative row-span-2 h-full w-full">
                <Image src={first} alt={alt} fill sizes="(max-width: 640px) 66vw, 22vw" className="object-cover" />
            </div>
            <div className="relative h-full w-full">
                <Image src={second} alt="" fill sizes="(max-width: 640px) 34vw, 11vw" className="object-cover" />
            </div>
            <div className="relative h-full w-full">
                <Image src={third} alt="" fill sizes="(max-width: 640px) 34vw, 11vw" className="object-cover" />
            </div>
        </div>
    );
}
