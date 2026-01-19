import { supabase } from './supabase';

// Récupérer tous les médias (photos, illustrations, vidéos)
export async function getMedia(type = null, limit = 50, offset = 0) {
    try {
        let query = supabase
            .from('media')
            .select(`
        *,
        profiles:user_id (
          id,
          username,
          full_name,
          avatar_url,
          bio,
          location
        )
      `)
            .eq('status', 'published')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (type) {
            query = query.eq('type', type);
        }

        const { data, error } = await query;

        if (error) throw error;

        return data || [];
    } catch (error) {
        console.error('Error fetching media:', error);
        return [];
    }
}

// Récupérer un média par ID
export async function getMediaById(id) {
    try {
        const { data, error } = await supabase
            .from('media')
            .select(`
        *,
        profiles:user_id (
          id,
          username,
          full_name,
          avatar_url,
          bio,
          location,
          total_views,
          total_downloads
        ),
        media_topics (
          topics (
            id,
            name,
            slug
          )
        )
      `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching media by id:', error);
        return null;
    }
}

// Récupérer les topics
export async function getTopics() {
    try {
        const { data, error } = await supabase
            .from('topics')
            .select('*')
            .order('name');

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching topics:', error);
        return [];
    }
}

// Récupérer les médias par topic
export async function getMediaByTopic(topicSlug, limit = 50) {
    try {
        const { data, error } = await supabase
            .from('media')
            .select(`
        *,
        profiles:user_id (
          id,
          username,
          full_name,
          avatar_url
        ),
        media_topics!inner (
          topics!inner (
            slug
          )
        )
      `)
            .eq('media_topics.topics.slug', topicSlug)
            .eq('status', 'published')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching media by topic:', error);
        return [];
    }
}

// Récupérer un profil utilisateur
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
        console.error('Error fetching user profile:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
        });
        return null;
    }
}

// Récupérer un profil par ID
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
        console.error('Error fetching profile by id:', error);
        return null;
    }
}

// Récupérer les médias d'un utilisateur
export async function getUserMedia(userId, type = null) {
    try {
        let query = supabase
            .from('media')
            .select(`
        *,
        profiles:user_id (
          id,
          username,
          full_name,
          avatar_url
        )
      `)
            .eq('user_id', userId)
            .eq('status', 'published')
            .order('created_at', { ascending: false });

        if (type) {
            query = query.eq('type', type);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching user media:', error);
        return [];
    }
}

// Mettre à jour les informations d'un média
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
        console.error('Error updating media:', error);
        return { success: false, error: error.message };
    }
}

// Liker un média
export async function likeMedia(mediaId, userId) {
    try {
        const { error } = await supabase
            .from('media_likes')
            .insert({ media_id: mediaId, user_id: userId });

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error liking media:', error);
        return false;
    }
}

// Unliker un média
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
        console.error('Error unliking media:', error);
        return false;
    }
}

// Vérifier si l'utilisateur a liké un média
export async function hasUserLikedMedia(mediaId, userId) {
    try {
        const { data, error } = await supabase
            .from('media_likes')
            .select('*')
            .eq('media_id', mediaId)
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return !!data;
    } catch (error) {
        console.error('Error checking like status:', error);
        return false;
    }
}

// Rechercher des médias
export async function searchMedia(query, type = null, limit = 50) {
    try {
        let searchQuery = supabase
            .from('media')
            .select(`
        *,
        profiles:user_id (
          id,
          username,
          full_name,
          avatar_url
        )
      `)
            .eq('status', 'published')
            .or(`title.ilike.%${query}%,alt_text.ilike.%${query}%,description.ilike.%${query}%,location.ilike.%${query}%`)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (type) {
            searchQuery = searchQuery.eq('type', type);
        }

        const { data, error } = await searchQuery;

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error searching media:', error);
        return [];
    }
}

// Incrémenter le nombre de vues
export async function incrementViews(mediaId) {
    try {
        const { error } = await supabase
            .rpc('increment_views', { media_id: mediaId });

        if (error) throw error;
        return true;
    } catch (error) {
        // Si la fonction n'existe pas encore, utiliser une mise à jour directe
        try {
            const { data: media } = await supabase
                .from('media')
                .select('views_count')
                .eq('id', mediaId)
                .single();

            if (media) {
                await supabase
                    .from('media')
                    .update({ views_count: (media.views_count || 0) + 1 })
                    .eq('id', mediaId);
            }
            return true;
        } catch (updateError) {
            console.error('Error incrementing views:', updateError);
            return false;
        }
    }
}

// Incrémenter le nombre de téléchargements
export async function incrementDownloads(mediaId) {
    try {
        const { error } = await supabase
            .rpc('increment_downloads', { media_id: mediaId });

        if (error) throw error;
        return true;
    } catch (error) {
        // Si la fonction n'existe pas encore, utiliser une mise à jour directe
        try {
            const { data: media } = await supabase
                .from('media')
                .select('downloads_count')
                .eq('id', mediaId)
                .single();

            if (media) {
                await supabase
                    .from('media')
                    .update({ downloads_count: (media.downloads_count || 0) + 1 })
                    .eq('id', mediaId);
            }
            return true;
        } catch (updateError) {
            console.error('Error incrementing downloads:', updateError);
            return false;
        }
    }
}

// Récupérer les collections d'un utilisateur
export async function getUserCollections(userId) {
    try {
        const { data, error } = await supabase
            .from('collections')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching user collections:', error);
        return [];
    }
}

// Ajouter un média à une collection
export async function addMediaToCollection(collectionId, mediaId) {
    try {
        const { error } = await supabase
            .from('collection_media')
            .insert({ collection_id: collectionId, media_id: mediaId });

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error adding media to collection:', error);
        return false;
    }
}
// Récupérer les statistiques d'un utilisateur (nombre de photos, likes, collections)
export async function getUserStats(userId) {
    try {
        const [photosRes, likesRes, collectionsRes] = await Promise.all([
            supabase
                .from('media')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('status', 'published'),
            supabase
                .from('media_likes')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId),
            supabase
                .from('collections')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
        ]);

        return {
            total_photos: photosRes.count || 0,
            total_likes: likesRes.count || 0,
            total_collections: collectionsRes.count || 0
        };
    } catch (error) {
        console.error('Error fetching user stats:', error);
        return {
            total_photos: 0,
            total_likes: 0,
            total_collections: 0
        };
    }
}
// Supprimer un média
export async function deleteMedia(mediaId) {
    try {
        const { error } = await supabase
            .from('media')
            .delete()
            .eq('id', mediaId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error deleting media:', error);
        return { success: false, error: error.message };
    }
}
// Synchroniser les mots-clés avec la table topics
export async function syncTopics(mediaId, tags) {
    if (!tags || tags.length === 0) return { success: true };

    try {
        // 1. Préparer les slugs
        const tagSlugs = tags.map(tag => {
            return tag.trim().toLowerCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                .replace(/\s+/g, '-')
                .replace(/[^\w-]+/g, '');
        }).filter(slug => slug.length > 0);

        if (tagSlugs.length === 0) return { success: true };

        // 2. Récupérer les topics existants
        const { data: existingTopics, error: fetchError } = await supabase
            .from('topics')
            .select('id, slug')
            .in('slug', tagSlugs);

        if (fetchError) throw fetchError;

        const existingSlugs = existingTopics?.map(t => t.slug) || [];
        const missingTags = tags.filter(tag => {
            const slug = tag.trim().toLowerCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                .replace(/\s+/g, '-')
                .replace(/[^\w-]+/g, '');
            return !existingSlugs.includes(slug);
        });

        // 3. Insérer les topics manquants
        let allTopics = [...(existingTopics || [])];

        if (missingTags.length > 0) {
            const newTopicsData = missingTags.map(tag => ({
                name: tag.trim(),
                slug: tag.trim().toLowerCase()
                    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                    .replace(/\s+/g, '-')
                    .replace(/[^\w-]+/g, '')
            }));

            const { data: insertedTopics, error: insertError } = await supabase
                .from('topics')
                .insert(newTopicsData)
                .select();

            if (insertError) {
                console.error('Error inserting new topics:', insertError);
                // On continue quand même avec les topics existants si l'insertion échoue
            } else if (insertedTopics) {
                allTopics = [...allTopics, ...insertedTopics];
            }
        }

        // 4. Créer les liens dans media_topics
        if (allTopics.length > 0 && mediaId) {
            const mediaTopicLinks = allTopics.map(topic => ({
                media_id: mediaId,
                topic_id: topic.id
            }));

            // Supprimer les anciens liens pour ce média
            await supabase
                .from('media_topics')
                .delete()
                .eq('media_id', mediaId);

            // Insérer les nouveaux liens
            const { error: linkError } = await supabase
                .from('media_topics')
                .insert(mediaTopicLinks);

            if (linkError) throw linkError;
        }

        return { success: true };
    } catch (error) {
        console.error('Full Error syncing topics:', JSON.stringify(error, null, 2));
        console.error('Error message:', error.message || error.details || 'Unknown error');
        return { success: false, error: error.message };
    }
}
