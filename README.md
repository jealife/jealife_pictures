# JEaLiFe Stock

La banque d'images du Gabon et de l'Afrique. Photos libres de droits, publiées
par des photographes africains.

Next.js 16 (App Router) · Supabase (Postgres, Auth, Storage) · Tailwind CSS 4.

---

## Mise en route

### 1. Base de données

Créez un projet Supabase, puis appliquez les migrations **dans l'ordre**,
depuis le SQL Editor du tableau de bord :

1. `supabase/migrations/0001_init.sql` — tables, politiques RLS, fonctions,
   recherche plein texte et bucket de stockage.
2. `supabase/migrations/0002_seed.sql` — les pays africains et les thèmes de
   départ.
3. `supabase/migrations/0003_upload_quality.sql` — empreinte perceptuelle
   (`phash`) utilisée par le contrôle qualité automatique à l'envoi
   (`/api/moderate-upload`).
4. `supabase/migrations/0004_admin_moderation.sql` — rôle `admin`, réglage
   `moderation_mode` (`auto`/`manual`), et les policies RLS qui donnent à un
   admin accès à `/admin` (modération, utilisateurs, thèmes).

Le bucket `media` et ses politiques sont créés par la migration : il n'y a rien
à configurer à la main dans l'interface Storage.

> Les anciens fichiers SQL de la racine (`supabase_schema.sql`,
> `supabase_setup.sql`, `update_*.sql`) sont conservés dans `supabase/legacy/`
> à titre d'archive. Ils se contredisaient — `media.id` y était tantôt `uuid`,
> tantôt `bigint` — et ne doivent plus être exécutés.

#### Devenir administrateur

La migration 0004 crée le rôle mais ne nomme personne : le premier admin se
désigne à la main, une fois inscrit sur le site, depuis le SQL Editor —

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'votre-email@exemple.com');
```

Une fois admin, vous pouvez promouvoir les suivants depuis `/admin/users` —
plus besoin de repasser par SQL.

### 2. Variables d'environnement

```bash
cp .env.local.example .env.local
```

Renseignez `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`
(Project Settings → API). Les mêmes valeurs doivent être déclarées sur Vercel.

Renseignez aussi les variables `CLOUDFLARE_R2_*` (bucket R2 → Settings pour
l'Account ID et l'URL publique, Manage API tokens pour les clés) : c'est là
qu'atterrissent les fichiers envoyés, Supabase ne sert plus que la base de
données et l'authentification.

### 3. Connexion Google (optionnel)

Suivez `GOOGLE_OAUTH_SETUP.md`. Dans Supabase → Authentication → URL
Configuration, ajoutez `https://votre-domaine/auth/callback` aux *Redirect
URLs*.

### 4. Lancer

```bash
npm install && npm run dev
```

---

## Ce qui structure le projet

### Le classement « Afrique d'abord »

Chaque média porte un `country_code` (ISO 3166-1) relié à la table
`countries`. Un déclencheur en calcule le `geo_priority` :

| Valeur | Portée |
|---|---|
| 0 | Gabon |
| 1 | CEMAC (Cameroun, Centrafrique, Congo, Guinée équatoriale, Tchad) |
| 2 | Reste de l'Afrique |
| 3 | Pays non renseigné |
| 4 | Hors Afrique |

Le tri par défaut du site est `geo_priority ASC, created_at DESC` : le contenu
gabonais remonte sans que le reste soit masqué. Un lecteur peut restreindre ou
élargir via le filtre pays, ou passer le tri en `?tri=monde`.

### Trois dérivés par image

L'envoi est préparé dans le navigateur (`app/lib/images.js`) avant tout
transfert :

| Dérivé | Rôle | Taille |
|---|---|---|
| `thumbnail_url` | grilles | 600 px max |
| `url` | affichage | 2400 px max |
| `original_url` | téléchargement HD | fichier source |
| `blur_data_url` | placeholder | 16 px, en base64 |

Le photographe téléverse donc quelques centaines de kilo-octets là où il
envoyait auparavant le fichier brut, et c'est la vignette — non l'original de
plusieurs mégaoctets — qui est servie en page d'accueil. Sur une connexion
mobile facturée au mégaoctet, l'écart est décisif.

Les trois dérivés partent directement du navigateur vers Cloudflare R2 (`app/lib/r2.js`,
`app/api/r2-upload-url`) via une URL signée à usage unique : Supabase ne
reçoit jamais le fichier lui-même, seulement l'URL R2 finale à enregistrer en
base. Les fichiers déjà publiés avant ce changement se reprennent avec
`scripts/migrate-to-r2.mjs` (voir l'en-tête du script).

### Recherche

`media.search_vector` est un `tsvector` français **désaccentué** (configuration
`public.fr_unaccent`), alimenté par le titre, les mots-clés, le texte
alternatif, le lieu, le pays et la description, avec des poids décroissants.
« foret ivindo » trouve « Forêt d'Ivindo ». Le repli en correspondance
partielle n'intervient que si le vecteur ne renvoie rien.

---

## Structure

```
app/
  lib/
    supabase.js     client Supabase
    database.js     toutes les requêtes (pagination, recherche, likes, …)
    media.js        forme unique d'un média côté interface + téléchargement
    images.js       préparation des images dans le navigateur
    auth.js         session, OAuth, profils
    r2.js           client S3/R2, URLs signées pour l'envoi de fichiers
  components/       grille, cartes, filtres, boutons d'action
  admin/            file de modération, réglages, utilisateurs, thèmes
  themes/           pages par thème
  pays/             pages par pays
  photos/[id]/      page d'une image
  users/[username]/ profil et ses onglets
supabase/
  migrations/       le schéma de référence
  legacy/           anciens fichiers SQL, archivés
scripts/
  migrate-to-r2.mjs migration ponctuelle des fichiers déjà sur Supabase Storage
```

## Commandes

```bash
npm run dev     # développement
npm run build   # build de production
npm run lint    # ESLint
```
