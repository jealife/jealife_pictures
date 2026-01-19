# Guide de Configuration Supabase pour JEaLiFe Pictures

## 1. Créer un projet Supabase

1. Allez sur [https://supabase.com](https://supabase.com)
2. Créez un compte ou connectez-vous
3. Créez un nouveau projet
4. Notez votre URL de projet et votre clé anon (disponibles dans Settings > API)

## 2. Configurer les variables d'environnement

1. Copiez `.env.local.example` vers `.env.local`
2. Remplissez les valeurs :
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-clé-anon
   ```

## 3. Exécuter le schéma SQL

1. Ouvrez le SQL Editor dans votre dashboard Supabase
2. Copiez le contenu de `supabase_schema.sql`
3. Collez-le dans l'éditeur et exécutez

## 4. Ajouter des fonctions RPC (optionnel mais recommandé)

Ajoutez ces fonctions SQL pour améliorer les performances :

```sql
-- Fonction pour incrémenter les vues
create or replace function increment_views(media_id bigint)
returns void as $$
begin
  update media
  set views_count = views_count + 1
  where id = media_id;
end;
$$ language plpgsql security definer;

-- Fonction pour incrémenter les téléchargements
create or replace function increment_downloads(media_id bigint)
returns void as $$
begin
  update media
  set downloads_count = downloads_count + 1
  where id = media_id;
end;
$$ language plpgsql security definer;
```

## 5. Configuration du stockage (pour les uploads)

1. Dans votre dashboard Supabase, allez dans Storage
2. Créez un nouveau bucket appelé `media`
3. Configurez les politiques de sécurité :

```sql
-- Politique pour la lecture publique
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'media' );

-- Politique pour l'upload authentifié
create policy "Authenticated users can upload media"
on storage.objects for insert
with check ( bucket_id = 'media' AND auth.role() = 'authenticated' );

-- Politique pour supprimer ses propres fichiers
create policy "Users can delete own media"
on storage.objects for delete
using ( bucket_id = 'media' AND auth.uid() = owner );
```

## 6. Données de test (optionnel)

Pour ajouter des données de test, créez un utilisateur puis :

```sql
-- Exemple d'insertion de média (remplacez USER_ID par un vrai UUID)
INSERT INTO media (user_id, type, url, title, alt_text, location, width, height)
VALUES (
  'USER_ID_HERE',
  'photo',
  'https://images.unsplash.com/photo-1547471080-165f61765106?q=80&w=1200',
  'Paysage du Gabon',
  'Belle photo de paysage au Gabon',
  'Libreville, Gabon',
  1200,
  800
);
```

## 7. Redémarrer le serveur de développement

```bash
npm run dev
```

## 8. Vérifier la connexion

L'application devrait maintenant charger les données depuis Supabase. Vérifiez :
- La page d'accueil charge les photos
- La barre de topics affiche les catégories
- La recherche fonctionne

## Fichiers modifiés

- ✅ `.env.local.example` - Template des variables d'environnement
- ✅ `app/lib/supabase.js` - Configuration du client Supabase
- ✅ `app/lib/database.js` - Fonctions de requêtes à la base de données
- ✅ `app/components/MasonryGrid.jsx` - Chargement dynamique des photos
- ✅ `app/components/TopicBar.jsx` - Chargement dynamique des topics
- ✅ `supabase_schema.sql` - Schéma complet de la base de données

## Prochaines étapes

1. Implémenter l'authentification utilisateur
2. Ajouter la fonctionnalité d'upload de médias
3. Implémenter les likes et les collections
4. Ajouter la pagination pour les grandes collections
