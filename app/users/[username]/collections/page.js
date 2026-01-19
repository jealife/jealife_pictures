"use client";

import { useParams } from "next/navigation";
import { collections } from "../../../lib/data"; // You'll need to ensure this export exists in data.js
import { Layers } from "lucide-react";
import Link from "next/link";

export default function UserCollectionsPage() {
    const { username } = useParams();

    // Mock: filtering collections relevant to user or just all of them for demo
    // const userCollections = collections.filter(c => c.author.username === username);
    const userCollections = collections || [];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {userCollections.length > 0 ? (
                userCollections.map(collection => (
                    <Link href={`/collections/${collection.id}`} key={collection.id} className="group block cursor-pointer">
                        {/* Collection Preview Grid (1 Main + 2 Side) */}
                        <div className="h-64 grid grid-cols-3 gap-0.5 rounded-lg overflow-hidden bg-gray-100 mb-4 opacity-90 group-hover:opacity-100 transition-opacity">
                            {/* Main Image (Left, takes 2/3) */}
                            <div className="col-span-2 h-full relative">
                                <img
                                    src={collection.preview_photos[0]}
                                    alt={collection.title}
                                    className="absolute inset-0 w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                            </div>
                            {/* Side Images (Right, stacked) */}
                            <div className="col-span-1 grid grid-rows-2 gap-0.5 h-full">
                                <div className="relative h-full">
                                    <img
                                        src={collection.preview_photos[1] || collection.preview_photos[0]}
                                        className="absolute inset-0 w-full h-full object-cover"
                                        alt=""
                                    />
                                </div>
                                <div className="relative h-full">
                                    <img
                                        src={collection.preview_photos[2] || collection.preview_photos[0]}
                                        className="absolute inset-0 w-full h-full object-cover"
                                        alt=""
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Title & Info */}
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 group-hover:text-black mb-1">
                                {collection.title}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <span>{collection.total_photos} photos</span>
                                <span>•</span>
                                <span>Curated by {collection.author.name}</span>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-3">
                                {collection.tags.slice(0, 3).map(tag => (
                                    <span key={tag} className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-md font-medium hover:bg-gray-200 transition-colors">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </Link>
                ))
            ) : (
                <div className="col-span-full py-20 text-center flex flex-col items-center">
                    <div className="w-32 h-32 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                        <Layers className="w-12 h-12 text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Aucune collection</h3>
                    <p className="text-gray-500 max-w-md">Cet utilisateur n'a pas encore créé de collection.</p>
                </div>
            )}
        </div>
    );
}
