import { supabase } from './supabase';

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
    is_verified, total_views, total_downloads
  ),
  countries:country_code ( code, name_fr, slug, emoji, region ),
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
} = {}) {
    try {
        let query = supabase
            .from('media')
            .select(CARD_SELECT)
            .eq('status', 'published');

        if (type) query = query.eq('type', type);
        if (country) query = query.eq('country_code', country.toUpperCase());

        query = applyPagination(applySort(query, sort), { limit, offset });

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching media:', error.message || error);
        return [];
    }
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
} = {}) {
    const term = (query || '').trim();
    if (!term) return getMedia({ type, limit, offset, country, sort });

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

        const { data, error } = await applyPagination(
            applySort(request, sort),
            { limit, offset }
        );

        if (error) throw error;
        if (data && data.length > 0) return data;

        return searchMediaFallback(term, { type, limit, offset, country, sort });
    } catch (error) {
        console.error('Error searching media:', error.message || error);
        return searchMediaFallback(term, { type, limit, offset, country, sort });
    }
}

async function searchMediaFallback(term, { type, limit, offset, country, sort }) {
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

export async function getMediaByTopic(topicSlug, {
    type = null,
    limit = PAGE_SIZE,
    offset = 0,
    sort = 'defaut',
} = {}) {
    try {
        let query = supabase
            .from('media')
            .select(`${CARD_SELECT}, media_topics!inner ( topics!inner ( slug ) )`)
            .eq('status', 'published')
            .eq('media_topics.topics.slug', topicSlug);

        if (type) query = query.eq('type', type);

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

export async function getTopics({ featuredOnly = false, limit = 60 } = {}) {
    try {
        let query = supabase
            .from('topics')
            .select('id, slug, name, description, cover_image_url, total_media, is_featured')
            .order('is_featured', { ascending: false })
            .order('total_media', { ascending: false })
            .limit(limit);

        if (featuredOnly) query = query.eq('is_featured', true);

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
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
            .select('code, name_fr, slug, region, is_african, is_cemac, emoji')
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
            .select('country_code, countries:country_code ( code, name_fr, slug, emoji, is_african )')
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
        return { success: false, error: error.message };
    }
}

export async function deleteMedia(mediaId) {
    try {
        const { error } = await supabase.from('media').delete().eq('id', mediaId);
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error deleting media:', error.message || error);
        return { success: false, error: error.message };
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
        return { success: false, error: error.message };
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
        return { success: false, error: error.message };
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
        return { success: false, error: error.message };
    }
}
