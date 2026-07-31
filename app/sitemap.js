import { supabase } from "./lib/supabase";
import { slugifyClient } from "./lib/media";

const BASE_URL = "https://stock.jealife.com/";

export const revalidate = 3600;

/**
 * Plan du site.
 *
 * L'ancien plan listait quatre URL fixes — l'accueil, une page /search
 * inexistante, la connexion et l'inscription — et pas une seule image ni un
 * seul profil. Pour une banque d'images, dont l'essentiel du trafic vient de
 * Google Images, cela revenait à laisser tout le catalogue hors du moteur de
 * recherche.
 */
export default async function sitemap() {
    const now = new Date();

    const staticRoutes = [
        { url: BASE_URL, changeFrequency: "hourly", priority: 1 },
        { url: `${BASE_URL}/illustrations`, changeFrequency: "daily", priority: 0.8 },
        { url: `${BASE_URL}/videos`, changeFrequency: "daily", priority: 0.8 },
        { url: `${BASE_URL}/themes`, changeFrequency: "daily", priority: 0.8 },
        { url: `${BASE_URL}/pays`, changeFrequency: "weekly", priority: 0.8 },
        { url: `${BASE_URL}/licence`, changeFrequency: "monthly", priority: 0.6 },
        { url: `${BASE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
        { url: `${BASE_URL}/help`, changeFrequency: "monthly", priority: 0.4 },
        { url: `${BASE_URL}/join`, changeFrequency: "monthly", priority: 0.4 },
        { url: `${BASE_URL}/login`, changeFrequency: "monthly", priority: 0.3 },
    ].map((route) => ({ ...route, lastModified: now }));

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
                .select("id, title, alt_text, updated_at")
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
            url: `${BASE_URL}/themes/${topic.slug}`,
            lastModified: now,
            changeFrequency: "daily",
            priority: 0.7,
        })),
        ...countries.map((country) => ({
            url: `${BASE_URL}/pays/${country.slug}`,
            lastModified: now,
            changeFrequency: "weekly",
            priority: 0.7,
        })),
        ...profiles.map((profile) => ({
            url: `${BASE_URL}/users/${profile.username}`,
            lastModified: profile.updated_at ? new Date(profile.updated_at) : now,
            changeFrequency: "weekly",
            priority: 0.6,
        })),
        ...media.map((item) => {
            const slug = slugifyClient(item.title || item.alt_text || "photo");
            return {
                url: `${BASE_URL}/photos/${item.id}-${slug}`,
                lastModified: item.updated_at ? new Date(item.updated_at) : now,
                changeFrequency: "monthly",
                priority: 0.9,
            };
        }),
    ];
}
