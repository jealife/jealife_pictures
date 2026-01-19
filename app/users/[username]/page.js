"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { getUserMedia } from "../../lib/database";
import { Image as ImageIcon } from "lucide-react";
import PhotoCard from "../../components/PhotoCard";

export default function UserPhotosPage() {
    const { username } = useParams();

    const [userPhotos, setUserPhotos] = useState([]);
    const [loadingPhotos, setLoadingPhotos] = useState(true);

    useEffect(() => {
        const fetchUserPhotos = async () => {
            if (!username) return;
            setLoadingPhotos(true);
            try {
                // Get the profile by username first
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('username', username)
                    .single();

                if (profileData) {
                    const photos = await getUserMedia(profileData.id);
                    setUserPhotos(photos);
                }
            } catch (error) {
                console.error("Error fetching user photos:", error);
            } finally {
                setLoadingPhotos(false);
            }
        };

        fetchUserPhotos();
    }, [username]);

    if (loadingPhotos) {
        return (
            <div className="py-20 flex justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black"></div>
            </div>
        );
    }

    return (
        <div className="columns-1 sm:columns-2 md:columns-3 gap-6 space-y-6">
            {userPhotos.length > 0 ? (
                userPhotos.map(p => (
                    <PhotoCard
                        key={p.id}
                        photo={{
                            ...p,
                            author: {
                                name: p.profiles?.full_name || p.profiles?.username || "Auteur",
                                avatar: p.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.user_id}`,
                                username: p.profiles?.username
                            }
                        }}
                    />
                ))
            ) : (
                <div className="col-span-full py-20 text-center flex flex-col items-center">
                    <div className="w-32 h-32 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                        <ImageIcon className="w-12 h-12 text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Aucune photo</h3>
                    <p className="text-gray-500 max-w-md">Cet utilisateur n'a pas encore publié de contenu.</p>
                </div>
            )}
        </div>
    );
}
