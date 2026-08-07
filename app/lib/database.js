import { supabase } from './supabase';
import { friendlyErrorMessage } from './errors';

// Nombre d'éléments par page. La grille chargeait 50 médias d'un coup et
// s'arrêtait là ; on pagine désormais partout.
export const PAGE_SIZE = 24;

// Colonnes ramenées pour une carte de grille. On ne sélectionne jamais `*` :
// sur une connexion mobile gabonaise, chaque colonne inutile se paie.
const CARD_SELECT = `
  id, type, url, thumbnail_url, blur_data_url, title, alt_text,
  location, city, country_code, geo_priority, width, height, duration,
  likes_count, downloads_count, views_count, created_at,
  profiles:user_id ( id, username, full_name, avatar_url, is_verified )
`;

const DETAIL_SELECT = `
  *,
  profiles:user_id (
    id, username, full_name, avatar_url, bio, location,
    is_verified, total_views, total_downloads,
    website, instagram_username, twitter_username
  ),
  countries:country_code ( code, name_fr, slug, region ),
  media_topics ( topics ( id, name, slug ) )
`;

/**
 * Classement du site. C'est ici que se joue le « Afrique d'abord » :
 * `geo_priority` vaut 0 pour le Gabon, 1 pour la CEMAC, 2 pour le reste de
 * l'Afrique, 4 hors du continent. Trier dessus avant la date fait remonter
 * le contenu gabonais sans jamais cacher le reste.
 */
function applySort(query, sort) {
    switch (sort) {
        case 'recent':
            return query.order('created_at', { ascending: false });
        case 'populaire':
            return query
                .order('downloads_count', { ascending: false })
                .order('likes_count', { ascending: false });
        case 'monde':
            // Explicitement demandé par l'utilisateur : on neutralise le
            // classement géographique.
            return query.order('created_at', { ascending: false });
        default:
            return query
                .order('geo_priority', { ascending: true })
                .order('created_at', { ascending: false });
    }
}

/**
 * PostgREST interprète les virgules et les parenthèses dans un filtre `.or()`.
 * Sans nettoyage, une recherche du type « forêt, plage » cassait la requête —
 * ou pouvait en modifier le sens.
 */
function sanitizeForOr(value) {
    return value.replace(/[,()"\\%]/g, ' ').trim();
}

function applyPagination(query, { limit = PAGE_SIZE, offset = 0 } = {}) {
    return query.range(offset, offset + limit - 1);
}

// ---------------------------------------------------------------------------
// Lecture des médias
// ---------------------------------------------------------------------------

export async function getMedia({
    type = 'photo',
    limit = PAGE_SIZE,
    offset = 0,
    country = null,
    sort = 'defaut',
    orientation = null,
} = {}) {
    try {
        let query = supabase
            .from('media')
            .select(CARD_SELECT)
            .eq('status', 'published');

        if (type) query = query.eq('type', type);
        if (country) query = query.eq('country_code', country.toUpperCase());
        if (orientation) query = query.eq('orientation', orientation);

        query = applyPagination(applySort(query, sort), { limit, offset });

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching media:', error.message || error);
        return [];
    }
}

/**
 * Image de fond du hero d'accueil. Utilisait auparavant une photo Unsplash
 * de décor (le même pool que les pages de connexion) créditée « JEaLiFe
 * Stock » avec un lien sortant vers un compte Unsplash externe — trompeur,
 * et sans rapport avec le catalogue réel. On tire maintenant une vraie photo
 * publiée, au format paysage, parmi les plus populaires, et son crédit
 * renvoie vers la fiche du photographe sur le site.
 */
export async function getHeroBackground() {
    try {
        const { data, error } = await supabase
            .from('media')
            .select('url, title, alt_text, profiles:user_id ( username, full_name )')
            .eq('status', 'published')
            .eq('type', 'photo')
            .eq('orientation', 'paysage')
            .order('downloads_count', { ascending: false })
            .order('likes_count', { ascending: false })
            .limit(10);

        if (error) throw error;
        if (data && data.length > 0) {
            const pick = data[Math.floor(Math.random() * data.length)];
            return {
                url: pick.url,
                photographer: pick.profiles?.full_name || 'JEaLiFe Stock',
                photographer_url: pick.profiles?.username ? `/@${pick.profiles.username}` : null,
            };
        }
    } catch (error) {
        console.error('Error fetching hero background:', error.message || error);
    }
    return null;
}

export async function getMediaById(id) {
    try {
        const { data, error } = await supabase
            .from('media')
            .select(DETAIL_SELECT)
            .eq('id', id)
            .maybeSingle();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching media by id:', error.message || error);
        return null;
    }
}

/**
 * Recherche plein texte française, insensible aux accents et aux fautes de
 * frappe légères : « foret ivindo » trouve « Forêt d'Ivindo ».
 * Si le vecteur ne donne rien, on retente en correspondance partielle pour
 * ne jamais renvoyer une page vide sur un mot inhabituel.
 */
export async function searchMedia(query, {
    type = 'photo',
    limit = PAGE_SIZE,
    offset = 0,
    country = null,
    sort = 'defaut',
    orientation = null,
} = {}) {
    const term = (query || '').trim();
    if (!term) return getMedia({ type, limit, offset, country, sort, orientation });

    try {
        let request = supabase
            .from('media')
            .select(CARD_SELECT)
            .eq('status', 'published')
            // Nom non qualifié obligatoire : PostgREST traduit ceci en
            // `wfts(<config>)`, et son analyseur de filtres refuse le point
            // d'un `public.fr_unaccent`. La configuration vivant dans `public`,
            // le search_path la résout sans ambiguïté.
            .textSearch('search_vector', term, {
                config: 'fr_unaccent',
                type: 'websearch',
            });

        if (type) request = request.eq('type', type);
        if (country) request = request.eq('country_code', country.toUpperCase());
        if (orientation) request = request.eq('orientation', orientation);

        const { data, error } = await applyPagination(
            applySort(request, sort),
            { limit, offset }
        );

        if (error) throw error;
        if (data && data.length > 0) return data;

        return searchMediaFallback(term, { type, limit, offset, country, sort, orientation });
    } catch (error) {
        console.error('Error searching media:', error.message || error);
        return searchMediaFallback(term, { type, limit, offset, country, sort, orientation });
    }
}

async function searchMediaFallback(term, { type, limit, offset, country, sort, orientation }) {
    const safe = sanitizeForOr(term);
    if (!safe) return [];

    try {
        let request = supabase
            .from('media')
            .select(CARD_SELECT)
            .eq('status', 'published')
            .or(
                `title.ilike.%${safe}%,` +
                `alt_text.ilike.%${safe}%,` +
                `description.ilike.%${safe}%,` +
                `location.ilike.%${safe}%,` +
                `city.ilike.%${safe}%`
            );

        if (type) request = request.eq('type', type);
        if (country) request = request.eq('country_code', country.toUpperCase());
        if (orientation) request = request.eq('orientation', orientation);

        const { data, error } = await applyPagination(
            applySort(request, sort),
            { limit, offset }
        );

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error in search fallback:', error.message || error);
        return [];
    }
}

/**
 * Compte de résultats, sans les récupérer — pour le "X images" affiché en
 * tête de page et le nombre par onglet Photos/Illustrations/Vidéos pendant
 * une recherche. Reprend la même recherche plein texte + repli que
 * `searchMedia`, mais `head: true` : Postgres ne renvoie que le total.
 */
export async function countMedia({ query = '', type = null, country = null, orientation = null } = {}) {
    const term = (query || '').trim();

    try {
        let request = supabase
            .from('media')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'published');

        if (type) request = request.eq('type', type);
        if (country) request = request.eq('country_code', country.toUpperCase());
        if (orientation) request = request.eq('orientation', orientation);

        if (term) {
            request = request.textSearch('search_vector', term, { config: 'fr_unaccent', type: 'websearch' });
        }

        const { count, error } = await request;
        if (error) throw error;

        if (term && !count) {
            // Même repli que searchMedia : un mot inhabituel ne doit pas
            // afficher « 0 résultat » si la correspondance partielle, elle,
            // en trouve.
            const safe = sanitizeForOr(term);
            if (!safe) return 0;

            let fallback = supabase
                .from('media')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'published')
                .or(
                    `title.ilike.%${safe}%,` +
                    `alt_text.ilike.%${safe}%,` +
                    `description.ilike.%${safe}%,` +
                    `location.ilike.%${safe}%,` +
                    `city.ilike.%${safe}%`
                );

            if (type) fallback = fallback.eq('type', type);
            if (country) fallback = fallback.eq('country_code', country.toUpperCase());
            if (orientation) fallback = fallback.eq('orientation', orientation);

            const { count: fallbackCount, error: fallbackError } = await fallback;
            if (fallbackError) throw fallbackError;
            return fallbackCount || 0;
        }

        return count || 0;
    } catch (error) {
        console.error('Error counting media:', error.message || error);
        return 0;
    }
}

/** Un comptage par type de contenu (Photos/Illustrations/Vidéos), pour les onglets pendant une recherche. */
export async function getSearchTypeCounts(query, { country = null, orientation = null } = {}) {
    const [photo, illustration, video] = await Promise.all([
        countMedia({ query, type: 'photo', country, orientation }),
        countMedia({ query, type: 'illustration', country, orientation }),
        countMedia({ query, type: 'video', country, orientation }),
    ]);
    return { photo, illustration, video };
}

export async function getMediaByTopic(topicSlug, {
    type = null,
    limit = PAGE_SIZE,
    offset = 0,
    sort = 'defaut',
    country = null,
    orientation = null,
} = {}) {
    try {
        let query = supabase
            .from('media')
            .select(`${CARD_SELECT}, media_topics!inner ( topics!inner ( slug ) )`)
            .eq('status', 'published')
            .eq('media_topics.topics.slug', topicSlug);

        if (type) query = query.eq('type', type);
        if (country) query = query.eq('country_code', country.toUpperCase());
        if (orientation) query = query.eq('orientation', orientation);

        const { data, error } = await applyPagination(
            applySort(query, sort),
            { limit, offset }
        );

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching media by topic:', error.message || error);
        return [];
    }
}

export async function getRelatedMedia(media, limit = 12) {
    if (!media) return [];

    // On cherche d'abord dans le même pays et sur les mêmes mots-clés :
    // « associées » doit vouloir dire quelque chose, pas juste « récentes ».
    try {
        let query = supabase
            .from('media')
            .select(CARD_SELECT)
            .eq('status', 'published')
            .eq('type', media.type || 'photo')
            .neq('id', media.id);

        if (media.tags?.length) {
            query = query.overlaps('tags', media.tags.slice(0, 6));
        } else if (media.country_code) {
            query = query.eq('country_code', media.country_code);
        }

        const { data, error } = await query
            .order('geo_priority', { ascending: true })
            .order('downloads_count', { ascending: false })
            .limit(limit);

        if (error) throw error;
        if (data?.length) return data;
    } catch (error) {
        console.error('Error fetching related media:', error.message || error);
    }

    return getMedia({ type: media.type || 'photo', limit });
}

// ---------------------------------------------------------------------------
// Thèmes & pays
// ---------------------------------------------------------------------------

export async function getTopics({ featuredOnly = false, kind = null, limit = 60 } = {}) {
    try {
        let query = supabase
            .from('topics')
            .select('id, slug, name, description, cover_image_url, total_media, is_featured')
            .order('is_featured', { ascending: false })
            .order('total_media', { ascending: false })
            .limit(limit);

        if (featuredOnly) query = query.eq('is_featured', true);
        if (kind) query = query.eq('kind', kind);

        const { data, error } = await query;
        if (error) throw error;

        const topics = data || [];

        // Pour chaque topic sans cover_image_url, on va chercher la thumbnail
        // de la première photo associée via media_topics
        const needsCover = topics.filter((t) => !t.cover_image_url && t.total_media > 0);

        if (needsCover.length > 0) {
            const ids = needsCover.map((t) => t.id);

            const { data: links } = await supabase
                .from('media_topics')
                .select('topic_id, media ( thumbnail_url, url )')
                .in('topic_id', ids)
                .limit(needsCover.length * 5);

            if (links) {
                // Indexe la première photo valide trouvée par topic_id
                const coverMap = {};
                for (const link of links) {
                    if (link.media && !coverMap[link.topic_id]) {
                        const imgUrl = link.media.thumbnail_url || link.media.url;
                        if (imgUrl) coverMap[link.topic_id] = imgUrl;
                    }
                }
                // Injecte dans les topics
                for (const topic of topics) {
                    if (!topic.cover_image_url && coverMap[topic.id]) {
                        topic.cover_image_url = coverMap[topic.id];
                    }
                }
            }
        }

        return topics;
    } catch (error) {
        console.error('Error fetching topics:', error.message || error);
        return [];
    }
}




export async function getTopicBySlug(slug) {
    try {
        const { data, error } = await supabase
            .from('topics')
            .select('*')
            .eq('slug', slug)
            .maybeSingle();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching topic:', error.message || error);
        return null;
    }
}

export async function getCountries({ africanOnly = false } = {}) {
    try {
        let query = supabase
            .from('countries')
            .select('code, name_fr, slug, region, is_african, is_cemac')
            .order('name_fr');

        if (africanOnly) query = query.eq('is_african', true);

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching countries:', error.message || error);
        return [];
    }
}

export async function getCountryBySlug(slug) {
    try {
        const { data, error } = await supabase
            .from('countries')
            .select('*')
            .eq('slug', slug)
            .maybeSingle();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching country:', error.message || error);
        return null;
    }
}

/** Pays qui ont réellement du contenu, pour ne pas proposer des filtres vides. */
export async function getActiveCountries() {
    try {
        const { data, error } = await supabase
            .from('media')
            .select('country_code, countries:country_code ( code, name_fr, slug, is_african )')
            .eq('status', 'published')
            .not('country_code', 'is', null)
            .limit(1000);

        if (error) throw error;

        const counts = new Map();
        for (const row of data || []) {
            if (!row.countries) continue;
            const entry = counts.get(row.country_code) || { ...row.countries, count: 0 };
            entry.count += 1;
            counts.set(row.country_code, entry);
        }

        return [...counts.values()].sort((a, b) => b.count - a.count);
    } catch (error) {
        console.error('Error fetching active countries:', error.message || error);
        return [];
    }
}

// ---------------------------------------------------------------------------
// Statistiques publiques — de vrais chiffres, à la place des « 5 millions »
// affichés jusqu'ici sur une base vide.
// ---------------------------------------------------------------------------

export async function getPlatformStats() {
    const empty = {
        total_photos: 0, total_illustrations: 0, total_videos: 0,
        total_gabon: 0, total_africa: 0, total_contributors: 0, total_downloads: 0,
    };

    try {
        const { data, error } = await supabase
            .from('platform_stats')
            .select('*')
            .maybeSingle();

        if (error) throw error;
        return data || empty;
    } catch (error) {
        console.error('Error fetching platform stats:', error.message || error);
        return empty;
    }
}

// ---------------------------------------------------------------------------
// Profils
// ---------------------------------------------------------------------------

export async function getUserProfile(username) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .ilike('username', username)
            .maybeSingle();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching user profile:', error.message || error);
        return null;
    }
}

export async function getProfileById(id) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching profile by id:', error.message || error);
        return null;
    }
}

export async function getUserMedia(userId, {
    type = null,
    limit = PAGE_SIZE,
    offset = 0,
    includeUnpublished = false,
} = {}) {
    try {
        let query = supabase
            .from('media')
            .select(CARD_SELECT)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (!includeUnpublished) query = query.eq('status', 'published');
        if (type) query = query.eq('type', type);

        const { data, error } = await applyPagination(query, { limit, offset });
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching user media:', error.message || error);
        return [];
    }
}

export async function getUserStats(userId) {
    const empty = {
        total_photos: 0, total_likes_received: 0, total_likes_given: 0,
        total_collections: 0, total_views: 0, total_downloads: 0,
    };

    try {
        const [mediaRes, likesGivenRes, collectionsRes] = await Promise.all([
            supabase
                .from('media')
                .select('likes_count, views_count, downloads_count')
                .eq('user_id', userId)
                .eq('status', 'published'),
            supabase
                .from('media_likes')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId),
            supabase
                .from('collections')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId),
        ]);

        const media = mediaRes.data || [];
        const sum = (key) => media.reduce((acc, m) => acc + (m[key] || 0), 0);

        return {
            total_photos: media.length,
            // On distingue enfin les j'aime reçus (une vraie mesure de
            // reconnaissance pour un photographe) des j'aime donnés.
            total_likes_received: sum('likes_count'),
            total_likes_given: likesGivenRes.count || 0,
            total_collections: collectionsRes.count || 0,
            total_views: sum('views_count'),
            total_downloads: sum('downloads_count'),
        };
    } catch (error) {
        console.error('Error fetching user stats:', error.message || error);
        return empty;
    }
}

// ---------------------------------------------------------------------------
// Écriture sur les médias
// ---------------------------------------------------------------------------

export async function updateMedia(mediaId, updates) {
    try {
        const { data, error } = await supabase
            .from('media')
            .update(updates)
            .eq('id', mediaId)
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error updating media:', error.message || error);
        return { success: false, error: friendlyErrorMessage(error, "Impossible de mettre à jour cette photo.") };
    }
}

export async function deleteMedia(mediaId) {
    try {
        // Passe par une route serveur plutôt qu'un DELETE direct : elle seule
        // a les identifiants Cloudflare R2 nécessaires pour retirer aussi les
        // fichiers (vignette, version web, original), sans quoi une photo
        // "supprimée" restait accessible indéfiniment à son URL.
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Session expirée, reconnectez-vous.");

        const res = await fetch('/api/delete-media', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ mediaId }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Impossible de supprimer cette photo.");

        return { success: true };
    } catch (error) {
        console.error('Error deleting media:', error.message || error);
        return { success: false, error: friendlyErrorMessage(error, "Impossible de supprimer cette photo.") };
    }
}

// ---------------------------------------------------------------------------
// J'aime
// ---------------------------------------------------------------------------

export async function likeMedia(mediaId, userId) {
    try {
        const { error } = await supabase
            .from('media_likes')
            .insert({ media_id: mediaId, user_id: userId });
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error liking media:', error.message || error);
        return false;
    }
}

export async function unlikeMedia(mediaId, userId) {
    try {
        const { error } = await supabase
            .from('media_likes')
            .delete()
            .eq('media_id', mediaId)
            .eq('user_id', userId);
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error unliking media:', error.message || error);
        return false;
    }
}

export async function hasUserLikedMedia(mediaId, userId) {
    if (!userId) return false;
    try {
        const { data, error } = await supabase
            .from('media_likes')
            .select('media_id')
            .eq('media_id', mediaId)
            .eq('user_id', userId)
            .maybeSingle();

        if (error) throw error;
        return !!data;
    } catch (error) {
        console.error('Error checking like status:', error.message || error);
        return false;
    }
}

/** Les identifiants aimés par l'utilisateur, pour pré-remplir les cœurs. */
export async function getLikedMediaIds(userId, mediaIds = []) {
    if (!userId || mediaIds.length === 0) return new Set();
    try {
        const { data, error } = await supabase
            .from('media_likes')
            .select('media_id')
            .eq('user_id', userId)
            .in('media_id', mediaIds);

        if (error) throw error;
        return new Set((data || []).map((row) => row.media_id));
    } catch (error) {
        console.error('Error fetching liked ids:', error.message || error);
        return new Set();
    }
}

export async function getUserLikedMedia(userId, { limit = PAGE_SIZE, offset = 0 } = {}) {
    try {
        const { data, error } = await supabase
            .from('media_likes')
            .select(`created_at, media ( ${CARD_SELECT} )`)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;
        return (data || []).map((row) => row.media).filter(Boolean);
    } catch (error) {
        console.error('Error fetching liked media:', error.message || error);
        return [];
    }
}

/**
 * Historique des téléchargements (table `media_downloads`, migration 0009).
 *
 * Un même média peut avoir été téléchargé plusieurs fois (tailles
 * différentes, essais…) : on demande davantage de lignes que `limit` et on
 * déduplique ici par média, en gardant l'occurrence la plus récente, pour ne
 * pas répéter la même image dans la grille.
 */
export async function getUserDownloadHistory(userId, { limit = PAGE_SIZE } = {}) {
    try {
        const { data, error } = await supabase
            .from('media_downloads')
            .select(`created_at, media ( ${CARD_SELECT} )`)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit * 3);

        if (error) throw error;

        const seen = new Set();
        const unique = [];
        for (const row of data || []) {
            if (!row.media || seen.has(row.media.id)) continue;
            seen.add(row.media.id);
            unique.push(row.media);
            if (unique.length >= limit) break;
        }
        return unique;
    } catch (error) {
        console.error('Error fetching download history:', error.message || error);
        return [];
    }
}

// ---------------------------------------------------------------------------
// Compteurs — via RPC SECURITY DEFINER. L'ancienne version tentait un UPDATE
// direct depuis le navigateur, que la RLS refusait à tout visiteur non
// propriétaire : les compteurs restaient donc figés à zéro.
// ---------------------------------------------------------------------------

export async function incrementViews(mediaId) {
    try {
        const { error } = await supabase.rpc('increment_views', { media_id: Number(mediaId) });
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error incrementing views:', error.message || error);
        return false;
    }
}

export async function incrementDownloads(mediaId) {
    try {
        const { error } = await supabase.rpc('increment_downloads', { media_id: Number(mediaId) });
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error incrementing downloads:', error.message || error);
        return false;
    }
}

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

export async function getUserCollections(userId) {
    try {
        const { data, error } = await supabase
            .from('collections')
            .select(`
                id, title, description, is_private, created_at,
                collection_media ( media ( id, thumbnail_url, url, alt_text, title ) )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((collection) => ({
            ...collection,
            total_photos: collection.collection_media?.length || 0,
            preview_photos: (collection.collection_media || [])
                .slice(0, 3)
                .map((item) => item.media?.thumbnail_url || item.media?.url)
                .filter(Boolean),
        }));
    } catch (error) {
        console.error('Error fetching user collections:', error.message || error);
        return [];
    }
}

export async function getCollection(collectionId) {
    try {
        const { data, error } = await supabase
            .from('collections')
            .select(`
                *,
                profiles:user_id ( id, username, full_name, avatar_url ),
                collection_media ( media ( ${CARD_SELECT} ) )
            `)
            .eq('id', collectionId)
            .maybeSingle();

        if (error) throw error;
        if (!data) return null;

        return {
            ...data,
            media: (data.collection_media || []).map((item) => item.media).filter(Boolean),
        };
    } catch (error) {
        console.error('Error fetching collection:', error.message || error);
        return null;
    }
}

export async function createCollection(userId, { title, description = '', isPrivate = false }) {
    try {
        const { data, error } = await supabase
            .from('collections')
            .insert({ user_id: userId, title, description, is_private: isPrivate })
            .select()
            .single();

        if (error) throw error;
        return { success: true, collection: data };
    } catch (error) {
        console.error('Error creating collection:', error.message || error);
        return { success: false, error: friendlyErrorMessage(error, "Impossible de créer la collection.") };
    }
}

export async function addMediaToCollection(collectionId, mediaId) {
    try {
        const { error } = await supabase
            .from('collection_media')
            .upsert({ collection_id: collectionId, media_id: mediaId });
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error adding media to collection:', error.message || error);
        return false;
    }
}

export async function removeMediaFromCollection(collectionId, mediaId) {
    try {
        const { error } = await supabase
            .from('collection_media')
            .delete()
            .eq('collection_id', collectionId)
            .eq('media_id', mediaId);
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error removing media from collection:', error.message || error);
        return false;
    }
}

export async function updateCollection(collectionId, updates) {
    try {
        const { error } = await supabase.from('collections').update(updates).eq('id', collectionId);
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error updating collection:', error.message || error);
        return { success: false, error: friendlyErrorMessage(error, "Impossible de modifier cette collection.") };
    }
}

export async function deleteCollection(collectionId) {
    try {
        const { error } = await supabase.from('collections').delete().eq('id', collectionId);
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error deleting collection:', error.message || error);
        return { success: false, error: friendlyErrorMessage(error, "Impossible de supprimer cette collection.") };
    }
}

// ---------------------------------------------------------------------------
// Collections éditoriales
//
// Des collections publiées au nom de JEaLiFe Stock (pas d'un compte
// contributeur), protégées par le déclencheur de la migration 0006 : seul un
// admin peut poser `is_editorial = true`.
// ---------------------------------------------------------------------------

const COLLECTION_CARD_SELECT = `
    id, title, description, slug, cover_image_url, is_private, is_editorial, is_admin_featured, created_at,
    profiles:user_id ( id, username, full_name, avatar_url ),
    collection_media ( media ( id, thumbnail_url, url, likes_count, downloads_count ) )
`;

function withCollectionMeta(collection) {
    const items = collection.collection_media || [];
    const thumbs = items.map((item) => item.media?.thumbnail_url || item.media?.url).filter(Boolean);
    const cover = collection.cover_image_url || thumbs[0] || null;

    // Jusqu'à 3 images pour la mosaïque de couverture (une grande + deux
    // empilées, façon Unsplash) : la couverture choisie en premier, puis les
    // suivantes sans doublon.
    const previewImages = [cover, ...thumbs.filter((url) => url !== cover)]
        .filter(Boolean)
        .slice(0, 3);

    // Sert à classer et à qualifier automatiquement les collections de la
    // communauté (voir getDiscoverableCollections) : la somme des likes et
    // téléchargements de ses photos, faute d'un compteur propre à la
    // collection elle-même.
    const popularity = items.reduce(
        (sum, item) => sum + (item.media?.likes_count || 0) + (item.media?.downloads_count || 0),
        0
    );

    return {
        ...collection,
        total_photos: items.length,
        cover,
        previewImages,
        popularity,
    };
}

/**
 * Collections visibles sur les surfaces publiques (`/collections`, panneau
 * d'accueil) : les sélections éditoriales de JEaLiFe, puis les collections
 * de la communauté qui le méritent — soit parce qu'un admin les a mises en
 * avant depuis `/admin/collections`, soit automatiquement dès qu'elles
 * comptent au moins 3 photos. En dessous de ce seuil, une collection reste
 * pleinement fonctionnelle mais visible seulement sur le profil de son
 * auteur — le temps qu'elle ait de quoi se montrer.
 */
const MIN_PHOTOS_TO_SURFACE = 3;

export async function getDiscoverableCollections({ limit = 24 } = {}) {
    try {
        const { data, error } = await supabase
            .from('collections')
            .select(COLLECTION_CARD_SELECT)
            .eq('is_private', false)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const collections = (data || []).map(withCollectionMeta);

        const editorial = collections
            .filter((c) => c.is_editorial)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        const community = collections.filter((c) => !c.is_editorial);
        const featured = community
            .filter((c) => c.is_admin_featured)
            .sort((a, b) => b.popularity - a.popularity);
        const automatic = community
            .filter((c) => !c.is_admin_featured && c.total_photos >= MIN_PHOTOS_TO_SURFACE)
            .sort((a, b) => b.popularity - a.popularity);

        return [...editorial, ...featured, ...automatic].slice(0, limit);
    } catch (error) {
        console.error('Error fetching discoverable collections:', error.message || error);
        return [];
    }
}

/** Même chose côté admin, sans filtrer sur `is_private` (une collection éditoriale mise en pause reste visible ici). */
export async function getAdminEditorialCollections() {
    try {
        const { data, error } = await supabase
            .from('collections')
            .select(COLLECTION_CARD_SELECT)
            .eq('is_editorial', true)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(withCollectionMeta);
    } catch (error) {
        console.error('Error fetching admin editorial collections:', error.message || error);
        return [];
    }
}

/**
 * Collections publiques de la communauté, pour la mise en avant manuelle
 * depuis `/admin/collections`. `total_photos >= 3` est indiqué côté
 * interface (déjà visible automatiquement) plutôt que filtré ici : un admin
 * doit pouvoir mettre en avant une collection plus jeune s'il le souhaite.
 */
export async function getAdminCommunityCollections({ search = '', limit = 50 } = {}) {
    try {
        let query = supabase
            .from('collections')
            .select(COLLECTION_CARD_SELECT)
            .eq('is_editorial', false)
            .eq('is_private', false)
            .order('created_at', { ascending: false })
            .limit(limit);

        const term = search.trim();
        if (term) query = query.ilike('title', `%${sanitizeForOr(term)}%`);

        const { data, error } = await query;
        if (error) throw error;
        return (data || []).map(withCollectionMeta);
    } catch (error) {
        console.error('Error fetching community collections:', error.message || error);
        return [];
    }
}

export async function createEditorialCollection(adminUserId, { title, description = '', coverImageUrl = null }) {
    try {
        const { data, error } = await supabase
            .from('collections')
            .insert({
                user_id: adminUserId,
                title,
                description,
                cover_image_url: coverImageUrl,
                is_editorial: true,
                is_private: false,
            })
            .select()
            .single();

        if (error) throw error;
        return { success: true, collection: data };
    } catch (error) {
        console.error('Error creating editorial collection:', error.message || error);
        return { success: false, error: friendlyErrorMessage(error, "Impossible de créer cette collection.") };
    }
}

// ---------------------------------------------------------------------------
// Modération
// ---------------------------------------------------------------------------

export async function reportMedia(mediaId, { reason, details = '', reporterId = null }) {
    try {
        const { error } = await supabase
            .from('media_reports')
            .insert({ media_id: mediaId, reason, details, reporter_id: reporterId });
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error reporting media:', error.message || error);
        return { success: false, error: friendlyErrorMessage(error, "L'envoi du signalement a échoué.") };
    }
}

// ---------------------------------------------------------------------------
// Mots-clés → thèmes
// ---------------------------------------------------------------------------

const slugify = (value) =>
    (value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

const capitalize = (value) => {
    const clean = (value || '').trim();
    if (!clean) return '';
    return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
};

/**
 * Rattache les mots-clés d'un média aux thèmes du site, en créant ceux qui
 * manquent. Cette fonction échouait systématiquement en production : la table
 * `topics` n'avait aucune policy d'insertion, donc aucun mot-clé n'a jamais
 * produit de thème. La migration 0001 ajoute les policies manquantes.
 */
export async function syncTopics(mediaId, tags) {
    if (!mediaId) return { success: false, error: 'mediaId manquant' };

    try {
        const normalized = [...new Set((tags || []).map(capitalize))]
            .filter(Boolean)
            .map((name) => ({ name, slug: slugify(name) }))
            .filter((t) => t.slug.length > 0);

        // Un média sans mot-clé doit voir ses anciens liens disparaître.
        await supabase.from('media_topics').delete().eq('media_id', mediaId);
        if (normalized.length === 0) return { success: true };

        const slugs = normalized.map((t) => t.slug);

        const { data: existing, error: fetchError } = await supabase
            .from('topics')
            .select('id, slug')
            .in('slug', slugs);
        if (fetchError) throw fetchError;

        const known = new Set((existing || []).map((t) => t.slug));
        const missing = normalized.filter((t) => !known.has(t.slug));

        let allTopics = [...(existing || [])];

        if (missing.length > 0) {
            const { data: inserted, error: insertError } = await supabase
                .from('topics')
                .upsert(missing, { onConflict: 'slug' })
                .select('id, slug');

            if (insertError) {
                console.error('Error inserting new topics:', insertError.message);
            } else if (inserted) {
                allTopics = [...allTopics, ...inserted];
            }
        }

        if (allTopics.length > 0) {
            const { error: linkError } = await supabase
                .from('media_topics')
                .upsert(
                    allTopics.map((topic) => ({ media_id: mediaId, topic_id: topic.id })),
                    { onConflict: 'media_id,topic_id' }
                );
            if (linkError) throw linkError;
        }

        return { success: true };
    } catch (error) {
        console.error('Error syncing topics:', error.message || error);
        return { success: false, error: friendlyErrorMessage(error, "Impossible d'enregistrer les mots-clés.") };
    }
}

// ---------------------------------------------------------------------------
// Administration
//
// Tout ce qui suit ne renvoie des données que si l'appelant est admin : la
// RLS (migration 0004) filtre silencieusement pour tout autre compte, ces
// fonctions ne sont donc dangereuses à exposer nulle part.
// ---------------------------------------------------------------------------

/** Réglage public (lisible par tout visiteur, ex. `moderation_mode`). */
export async function getSetting(key) {
    try {
        const { data, error } = await supabase.rpc('get_setting', { setting_key: key });
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching setting:', error.message || error);
        return null;
    }
}

export async function setSetting(key, value) {
    try {
        const { error } = await supabase.rpc('set_setting', { setting_key: key, setting_value: value });
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error updating setting:', error.message || error);
        return { success: false, error: friendlyErrorMessage(error, "Impossible d'enregistrer le réglage.") };
    }
}

/** Chiffres de la page d'accueil admin : file d'attente, signalements, communauté. */
export async function getAdminOverview() {
    const empty = { pendingCount: 0, reportedCount: 0, usersCount: 0, moderationMode: 'auto' };

    try {
        const [pending, reported, users, mode] = await Promise.all([
            supabase.from('media').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
            supabase.from('media_reports').select('id', { count: 'exact', head: true }).eq('resolved', false),
            supabase.from('profiles').select('id', { count: 'exact', head: true }),
            getSetting('moderation_mode'),
        ]);

        return {
            pendingCount: pending.count || 0,
            reportedCount: reported.count || 0,
            usersCount: users.count || 0,
            moderationMode: mode || 'auto',
        };
    } catch (error) {
        console.error('Error fetching admin overview:', error.message || error);
        return empty;
    }
}

/** Médias en attente de publication (mode de modération « manuel »). */
export async function getPendingMedia({ limit = PAGE_SIZE, offset = 0 } = {}) {
    try {
        const { data, error } = await supabase
            .from('media')
            .select(`${CARD_SELECT}, description`)
            .eq('status', 'pending')
            .order('created_at', { ascending: true })
            .range(offset, offset + limit - 1);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching pending media:', error.message || error);
        return [];
    }
}

/**
 * Signalements non résolus, avec le média pour juger sur pièces.
 *
 * `reporter_id` référence `auth.users`, pas `profiles` : PostgREST ne peut
 * pas l'imbriquer comme `profiles:user_id` ailleurs dans ce fichier (la
 * relation directe n'existe pas). On récupère donc les pseudos des
 * signalants en une seconde requête plutôt que de casser l'embed.
 */
export async function getOpenReports({ limit = PAGE_SIZE, offset = 0 } = {}) {
    try {
        const { data, error } = await supabase
            .from('media_reports')
            .select(`id, reason, details, reporter_id, created_at, media ( ${CARD_SELECT} )`)
            .eq('resolved', false)
            .order('created_at', { ascending: true })
            .range(offset, offset + limit - 1);

        if (error) throw error;
        const reports = data || [];

        const reporterIds = [...new Set(reports.map((r) => r.reporter_id).filter(Boolean))];
        if (reporterIds.length === 0) return reports;

        const { data: reporters } = await supabase
            .from('profiles')
            .select('id, username, full_name')
            .in('id', reporterIds);

        const byId = new Map((reporters || []).map((p) => [p.id, p]));
        return reports.map((r) => ({ ...r, reporter: r.reporter_id ? byId.get(r.reporter_id) || null : null }));
    } catch (error) {
        console.error('Error fetching open reports:', error.message || error);
        return [];
    }
}

export async function approveMedia(mediaId) {
    return updateMedia(mediaId, { status: 'published' });
}

export async function rejectMedia(mediaId) {
    return updateMedia(mediaId, { status: 'rejected' });
}

export async function removeMedia(mediaId) {
    return updateMedia(mediaId, { status: 'removed' });
}

export async function resolveReport(reportId) {
    try {
        const { error } = await supabase
            .from('media_reports')
            .update({ resolved: true })
            .eq('id', reportId);
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error resolving report:', error.message || error);
        return { success: false, error: friendlyErrorMessage(error, "Impossible de traiter ce signalement.") };
    }
}

/** Liste des membres, du plus récent au plus ancien, avec recherche par nom/pseudo. */
export async function getAdminUsers({ search = '', limit = 50, offset = 0 } = {}) {
    try {
        let query = supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url, role, is_verified, is_contributor, total_views, total_downloads, created_at')
            .order('created_at', { ascending: false });

        const term = search.trim();
        if (term) {
            const safe = sanitizeForOr(term);
            query = query.or(`username.ilike.%${safe}%,full_name.ilike.%${safe}%`);
        }

        const { data, error } = await applyPagination(query, { limit, offset });
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching users:', error.message || error);
        return [];
    }
}

export async function setUserRole(userId, role) {
    try {
        const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error updating role:', error.message || error);
        return { success: false, error: friendlyErrorMessage(error, "Impossible de modifier ce rôle.") };
    }
}

export async function setUserFlag(userId, field, value) {
    if (!['is_verified', 'is_contributor'].includes(field)) {
        return { success: false, error: 'Champ non autorisé.' };
    }
    try {
        const { error } = await supabase.from('profiles').update({ [field]: value }).eq('id', userId);
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error updating user flag:', error.message || error);
        return { success: false, error: friendlyErrorMessage(error, "Impossible de mettre à jour ce compte.") };
    }
}

/** Tous les thèmes (catégories vitrine comme tags nés d'un envoi), pour l'admin. */
export async function getAdminTopics() {
    try {
        const { data, error } = await supabase
            .from('topics')
            .select('id, slug, name, description, cover_image_url, is_featured, kind, total_media, created_at')
            .order('is_featured', { ascending: false })
            .order('total_media', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching admin topics:', error.message || error);
        return [];
    }
}

/**
 * `kind` par défaut à 'category' : cette fonction n'est appelée que depuis
 * `/admin/topics` (voir migration 0006 pour la distinction avec les tags nés
 * de `syncTopics()`, qui héritent eux du défaut 'tag' de la colonne).
 */
export async function createTopic({ name, description = '', isFeatured = false, kind = 'category' }) {
    try {
        const slug = slugify(name);
        const { data, error } = await supabase
            .from('topics')
            .insert({ name, slug, description, is_featured: isFeatured, kind })
            .select()
            .single();

        if (error) throw error;
        return { success: true, topic: data };
    } catch (error) {
        console.error('Error creating topic:', error.message || error);
        return { success: false, error: friendlyErrorMessage(error, "Impossible de créer ce thème.") };
    }
}

export async function updateTopic(topicId, updates) {
    try {
        const { error } = await supabase.from('topics').update(updates).eq('id', topicId);
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error updating topic:', error.message || error);
        return { success: false, error: friendlyErrorMessage(error, "Impossible de modifier ce thème.") };
    }
}

export async function deleteTopic(topicId) {
    try {
        const { error } = await supabase.from('topics').delete().eq('id', topicId);
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error deleting topic:', error.message || error);
        return { success: false, error: friendlyErrorMessage(error, "Impossible de supprimer ce thème.") };
    }
}
