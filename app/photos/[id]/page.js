import { getMediaById } from "../../lib/database";
import PhotoDetail from "./PhotoDetail";

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
    const { id } = await params;
    const photo = await getMediaById(id);

    if (!photo) {
        return {
            title: "Photo non trouvée | JEaLiFe Stock",
        };
    }

    const title = `${photo.title || "Photo"} par ${photo.profiles?.full_name || photo.profiles?.username} | JEaLiFe Stock`;
    const description = photo.description || `Découvrez cette superbe photo de ${photo.profiles?.full_name} sur JEaLiFe Stock. Téléchargement gratuit en haute résolution.`;
    const author = photo.profiles?.full_name || photo.profiles?.username;

    return {
        title: title,
        description: description,
        keywords: [author, ...(photo.tags || []), "photo gratuite", "libre de droits", "JEaLiFe Stock"],
        openGraph: {
            title: title,
            description: description,
            images: [
                {
                    url: photo.url,
                    width: 1200,
                    height: 630,
                    alt: photo.title || "Photo",
                },
            ],
            type: "website",
        },
        twitter: {
            card: "summary_large_image",
            title: title,
            description: description,
            images: [photo.url],
        },
    };
}

export default function Page() {
    return <PhotoDetail />;
}
