# Sauvegarde de JEaLiFe Stock

Deux choses différentes sont protégées ici :

1. **La base de données** (Supabase) — tous les textes : profils, fiches
   photos, portefeuilles de crédits, ventes, notifications... Sur le forfait
   gratuit actuel, Supabase ne fait **aucune** sauvegarde automatique. C'est
   le trou le plus urgent, celui que ce système comble.
2. **Les fichiers photos** (Cloudflare R2) — les images elles-mêmes. Elles ne
   sont pas dupliquées ailleurs, mais on peut se protéger d'une suppression
   accidentelle à moindre coût (voir tout en bas).

## 1. Comment ça marche, une fois en place

Chaque nuit à 4h15 (heure du Gabon), un robot GitHub :
1. copie l'intégralité de la base de données Supabase dans un fichier ;
2. dépose ce fichier dans un dossier dédié de **votre Google Drive**,
   séparé des photos et jamais public ;
3. supprime les copies de plus de 30 jours, pour ne pas remplir Drive
   indéfiniment.

Avantage d'utiliser Drive plutôt que Cloudflare pour ce dossier précis : les
sauvegardes vivent chez un fournisseur totalement différent de Supabase (la
base) et de Cloudflare (les photos) — si l'un des deux avait un incident,
vos sauvegardes restent intactes ailleurs. Et vous pouvez les consulter
vous-même, en un coup d'œil, dans une interface que vous connaissez déjà.

Vous n'avez rien à faire ensuite. Si un jour une sauvegarde échoue (panne
réseau, etc.), GitHub vous envoie automatiquement un e-mail — assurez-vous
juste que les notifications du dépôt sont activées pour votre compte.

## 2. Mise en place — une fois, 15 minutes

Cette partie est faite de réglages dans des tableaux de bord auxquels je
n'ai pas accès : à faire vous-même, dans l'ordre.

### a. Récupérer l'adresse de connexion à la base

Dans le tableau de bord **Supabase** → *Project Settings* → *Database* →
section *Connection string* → onglet **URI**.

Prenez la version **"Direct connection"** (pas "Transaction pooler" ni
"Session pooler" — un pg_dump a besoin de la connexion directe). Elle
ressemble à :

```
postgresql://postgres:[VOTRE-MOT-DE-PASSE]@db.xxxxxxxx.supabase.co:5432/postgres
```

Remplacez `[VOTRE-MOT-DE-PASSE]` par le mot de passe de la base (affiché sur
la même page, ou à réinitialiser si vous ne l'avez plus).

### b. Créer un « compte robot » Google et lui partager un dossier Drive

Google Drive n'a pas de système de jeton simple comme Cloudflare : un
programme automatisé doit s'identifier avec un **compte de service**, une
sorte de compte Google réservé aux robots. Ça se fait une seule fois, dans
la **Google Cloud Console** (gratuite, pas besoin de carte bancaire pour
cette partie) :

1. Allez sur [console.cloud.google.com](https://console.cloud.google.com),
   créez un nouveau projet, par exemple `jealife-stock-backups`.
2. Menu **APIs & Services** → **Library** → cherchez **Google Drive API** →
   **Enable**.
3. Menu **APIs & Services** → **Credentials** → **Create Credentials** →
   **Service Account**. Donnez-lui un nom, par exemple `stock-backup`.
   Aucun rôle particulier n'est nécessaire aux étapes suivantes.
4. Une fois le compte de service créé, ouvrez-le → onglet **Keys** →
   **Add Key** → **Create new key** → format **JSON**. Un fichier `.json`
   se télécharge : c'est le secret qui permettra au robot de s'identifier.
   Gardez-le, ne le partagez à personne d'autre que GitHub (étape c).
5. Ouvrez ce fichier JSON dans un éditeur de texte et repérez le champ
   `client_email` — une adresse qui ressemble à
   `stock-backup@jealife-stock-backups.iam.gserviceaccount.com`.
6. Dans **votre** Google Drive (le compte que vous utilisez normalement),
   créez un dossier, par exemple « JEaLiFe Stock — Sauvegardes ». Faites un
   clic droit → **Partager** → collez l'adresse `client_email` repérée à
   l'étape précédente, avec le rôle **Éditeur**.

   *Un compte de service n'a pas d'espace de stockage à lui : il ne peut
   écrire que dans un dossier qu'un vrai compte lui a explicitement
   partagé — sans cette étape, l'envoi échouera.*
7. Ouvrez ce dossier dans votre navigateur et copiez son identifiant dans
   l'adresse : `https://drive.google.com/drive/folders/CETTE-PARTIE-ICI`.

### c. Enregistrer ces secrets dans GitHub

Dans le dépôt GitHub du projet → **Settings** → **Secrets and variables** →
**Actions** → **New repository secret**, ajoutez ces 3 secrets :

| Nom du secret | Valeur |
|---|---|
| `SUPABASE_DB_URL` | l'adresse de connexion de l'étape (a) |
| `GDRIVE_SERVICE_ACCOUNT_JSON` | tout le contenu du fichier `.json` téléchargé à l'étape (b.4) |
| `GDRIVE_BACKUP_FOLDER_ID` | l'identifiant du dossier Drive copié à l'étape (b.7) |

### d. Activer le robot

Le fichier `.github/workflows/backup-database.yml` est déjà prêt dans le
projet. Une fois les 3 secrets enregistrés, il suffit qu'il soit envoyé sur
GitHub (`git push`) pour que la sauvegarde nocturne démarre automatiquement
— aucune autre action n'est nécessaire.

Pour vérifier tout de suite que ça fonctionne sans attendre la nuit : onglet
**Actions** du dépôt GitHub → **Sauvegarde de la base de données** →
**Run workflow**. S'il se termine avec une coche verte, tout est en place.

## 3. En cas de besoin réel — comment restaurer

Le jour où c'est nécessaire, revenez avec ce fichier et demandez à Claude de
restaurer la base à partir d'une sauvegarde précise : je télécharge le
fichier `.dump` correspondant depuis le dossier Drive de sauvegarde et je le
réinjecte avec `pg_restore`, en utilisant la même adresse de connexion que
ci-dessus. Vous n'avez pas besoin de connaître la commande exacte — et vous
pouvez aussi simplement ouvrir le dossier dans Drive vous-même pour voir
quelles dates de sauvegarde sont disponibles.

## 4. Protéger aussi les fichiers photos (R2)

Moins urgent que la base — mais peu coûteux à activer : dans Cloudflare R2,
sur le bucket des **photos** (celui déjà utilisé par le site, sans rapport
avec le dossier Drive ci-dessus), activez **Object Versioning** dans les
réglages du bucket. Concrètement : si un
fichier est un jour supprimé ou écrasé par erreur (bug, mauvaise
manipulation admin), l'ancienne version reste récupérable au lieu d'être
perdue pour de bon. C'est un simple interrupteur, sans rien à coder.

Une réplication complète du catalogue de photos vers un second
stockage (protection contre un incident chez Cloudflare lui-même) est une
étape plus lourde, à envisager plus tard si le catalogue prend de la valeur
— pas nécessaire aujourd'hui.
