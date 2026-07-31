import { supabase } from "./lib/supabase";
import { slugifyClient } from "./lib/media";
import { absoluteUrl } from "./lib/site";

export const revalidate = 3600;

/**
 * Plan du site.
 *
 * L'ancien plan listait quatre URL fixes — l'accueil, une page /search
 * inexistante, la connexion et l'inscription — et pas une seule image ni un
 * seul profil. Pour une banque d'images, dont l'essentiel du trafic vient de
 * Google Images, cela revenait à laisser tout le catalogue hors du moteur.
 *
 * Chaque média déclare en plus son fichier via l'extension image (ou vidéo)
 * du protocole sitemap : c'est ce qui permet à Google Images d'indexer une
 * image sans avoir à deviner quel `<img>` d'une page est le sujet principal.
 */
export default async function sitemap() {
    const now = new Date();

    const staticRoutes = [
        { path: "/", changeFrequency: "hourly", priority: 1 },
        { path: "/illustrations", changeFrequency: "daily", priority: 0.8 },
        { path: "/videos", changeFrequency: "daily", priority: 0.8 },
        { path: "/themes", changeFrequency: "daily", priority: 0.8 },
        { path: "/pays", changeFrequency: "weekly", priority: 0.8 },
        { path: "/licence", changeFrequency: "monthly", priority: 0.6 },
        { path: "/about", changeFrequency: "monthly", priority: 0.5 },
        { path: "/help", changeFrequency: "monthly", priority: 0.4 },
        // /login, /join, /submit et /settings sont retirés : ce sont des
        // formulaires, ils n'ont rien à faire dans un plan de site et diluent
        // le budget d'exploration.
    ].map(({ path, ...rest }) => ({ url: absoluteUrl(path), lastModified: now, ...rest }));

    // Sur une base vide ou injoignable, on renvoie au moins les routes fixes
    // plutôt que de faire échouer la génération du plan.
    const safeQuery = async (run, fallback = []) => {
        try {
            const { data, error } = await run();
            if (error) throw error;
            return data || fallback;
        } catch (error) {
            console.error("Sitemap query failed:", error.message || error);
            return fallback;
        }
    };

    const [media, profiles, topics, countries] = await Promise.all([
        safeQuery(() =>
            supabase
                .from("media")
                .select("id, type, title, alt_text, url, thumbnail_url, original_url, updated_at")
                .eq("status", "published")
                .order("created_at", { ascending: false })
                .limit(20000)
        ),
        safeQuery(() =>
            supabase.from("profiles").select("username, updated_at").limit(5000)
        ),
        safeQuery(() =>
            supabase.from("topics").select("slug").gt("total_media", 0).limit(500)
        ),
        safeQuery(() =>
            supabase.from("countries").select("slug").eq("is_african", true).limit(100)
        ),
    ]);

    return [
        ...staticRoutes,

        ...topics.map((topic) => ({
            url: absoluteUrl(`/themes/${topic.slug}`),
            lastModified: now,
            changeFrequency: "daily",
            priority: 0.7,
        })),

        ...countries.map((country) => ({
            url: absoluteUrl(`/pays/${country.slug}`),
            lastModified: now,
            changeFrequency: "weekly",
            priority: 0.7,
        })),

        ...profiles.map((profile) => ({
            url: absoluteUrl(`/users/${profile.username}`),
            lastModified: profile.updated_at ? new Date(profile.updated_at) : now,
            changeFrequency: "weekly",
            priority: 0.6,
        })),

        ...media.map((item) => {
            const slug = slugifyClient(item.title || item.alt_text || "photo");
            const entry = {
                url: absoluteUrl(`/photos/${item.id}-${slug}`),
                lastModified: item.updated_at ? new Date(item.updated_at) : now,
                changeFrequency: "monthly",
                priority: 0.9,
            };

            if (item.type === "video") {
                // Pour une vidéo, `url` est l'image d'aperçu et le fichier
                // lui-même vit dans `original_url` : les confondre ferait
                // rejeter l'entrée par Google.
                entry.videos = [{
                    title: item.title || item.alt_text || "Vidéo",
                    thumbnail_loc: item.thumbnail_url || item.url,
                    description: item.alt_text || item.title || "Vidéo libre de droits",
                    content_loc: item.original_url || item.url,
                }];
            } else {
                entry.images = [item.url];
            }

            return entry;
        }),
    ];
}
