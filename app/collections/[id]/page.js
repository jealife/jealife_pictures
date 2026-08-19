import { cache } from "react";
import { getCollection } from "../../lib/database";
import { absoluteUrl, jsonLdScript, SITE_NAME } from "../../lib/site";
import CollectionDetail from "./CollectionDetail";

export const revalidate = 300;

const loadCollection = cache(async (id) => getCollection(id));

export async function generateMetadata({ params }) {
    const { id } = await params;
    const collection = await loadCollection(id);

    if (!collection || collection.is_private) {
        return {
            title: "Collection introuvable",
            robots: { index: false, follow: true },
        };
    }

    const author = collection.profiles?.full_name || collection.profiles?.username || "JEaLiFe Stock";
    const count = collection.media?.length || 0;
    const description =
        collection.description ||
        `${count} image${count > 1 ? "s" : ""} sélectionnée${count > 1 ? "s" : ""} par ${author} sur ${SITE_NAME}.`;
    const cover = collection.cover_image_url || collection.media?.[0]?.thumbnail_url || collection.media?.[0]?.url;

    return {
        title: collection.title,
        description,
        alternates: { canonical: `/collections/${collection.id}` },
        openGraph: {
            title: `${collection.title} | ${SITE_NAME}`,
            description,
            type: "website",
            images: cover ? [{ url: cover, width: 1200, height: 630, alt: collection.title }] : undefined,
        },
        twitter: {
            card: "summary_large_image",
            title: collection.title,
            description,
            images: cover ? [cover] : undefined,
        },
    };
}

function buildJsonLd(collection) {
    const author = collection.profiles?.full_name || collection.profiles?.username || "JEaLiFe Stock";
    const canonical = absoluteUrl(`/collections/${collection.id}`);

    const collectionSchema = {
        "@context": "https://schema.org/",
        "@type": "CollectionPage",
        name: collection.title,
        description: collection.description || undefined,
        url: canonical,
        creator: { "@type": "Person", name: author },
        mainEntity: {
            "@type": "ItemList",
            numberOfItems: collection.media?.length || 0,
            itemListElement: (collection.media || []).slice(0, 30).map((item, index) => ({
                "@type": "ListItem",
                position: index + 1,
                url: absoluteUrl(`/photos/${item.id}`),
            })),
        },
    };

    const breadcrumb = {
        "@context": "https://schema.org/",
        "@type": "BreadcrumbList",
        itemListElement: [
            { "@type": "ListItem", position: 1, name: "Accueil", item: absoluteUrl("/") },
            { "@type": "ListItem", position: 2, name: "Collections", item: absoluteUrl("/collections") },
            { "@type": "ListItem", position: 3, name: collection.title, item: canonical },
        ],
    };

    return [collectionSchema, breadcrumb];
}

export default async function Page({ params }) {
    const { id } = await params;
    const collection = await loadCollection(id);

    return (
        <>
            {collection && !collection.is_private &&
                buildJsonLd(collection).map((schema, index) => (
                    <script
                        key={index}
                        type="application/ld+json"
                        dangerouslySetInnerHTML={{ __html: jsonLdScript(schema) }}
                    />
                ))}
            <CollectionDetail />
        </>
    );
}
