# Sauvegarde de JEaLiFe Stock

Deux choses différentes sont protégées ici :

1. **La base de données** (Supabase) — tous les textes : profils, fiches
   photos, portefeuilles de crédits, ventes, notifications... Sur le forfait
   gratuit actuel, Supabase ne fait **aucune** sauvegarde automatique. C'est
   le trou le plus urgent, celui que ce système comble.
2. **Les fichiers photos** (Cloudflare R2) — les images elles-mêmes. Elles ne
   sont pas dupliquées ailleurs, mais on peut se protéger d'une suppression
   accidentelle à moindre coût (voir tout en bas).

*Note : une première version de ce système passait par GitHub Actions.
GitHub bloque l'exécution de toute Action tant qu'un moyen de paiement
vérifié n'est pas enregistré sur le compte — les cartes disponibles n'ont
pas été acceptées. Le système tourne maintenant sur **Vercel**, qui héberge
déjà le site et fait déjà tourner une tâche programmée similaire
(`sync-counters`) sans jamais exiger de carte.*

## 1. Comment ça marche, une fois en place

Chaque nuit à 4h20 (heure du Gabon), une adresse du site elle-même
(`/api/cron/backup-database`) — protégée par un mot de passe secret, jamais
accessible à un visiteur — se déclenche automatiquement et :
1. copie l'intégralité du contenu de la base de données Supabase (toutes
   les tables, ligne par ligne) dans un fichier ;
2. dépose ce fichier dans un dossier dédié de **votre Google Drive**,
   séparé des photos et jamais public ;
3. supprime les copies de plus de 30 jours, pour ne pas remplir Drive
   indéfiniment.

*Détail technique, sans impact pour vous : la structure de la base
(tables, règles de sécurité) n'a pas besoin d'être sauvegardée séparément
— elle est déjà entièrement conservée dans le dossier `supabase/migrations`
du projet. Cette sauvegarde ne contient donc que les données elles-mêmes ;
restaurer un jour voudrait dire rejouer ces migrations sur une base neuve,
puis réinjecter les données de la sauvegarde. Vous n'avez rien à faire de
tout ça vous-même — c'est moi qui m'en chargerai le jour où ce sera
nécessaire.*

## 2. Mise en place — une fois, environ 15 minutes

Cette partie est faite de réglages dans des tableaux de bord auxquels je
n'ai pas accès : à faire vous-même, dans l'ordre.

### a. Récupérer l'adresse de connexion à la base

Dans le tableau de bord **Supabase** → **Project Overview** → bouton
**Connect** (en haut à droite) — ou, si absent, **Database** dans la barre
de gauche → section **Connection string**.

Prenez cette fois l'onglet **"Session pooler"** (pas "Direct connection" :
Vercel ne peut pas la joindre sans option payante supplémentaire chez
Supabase — le "Session pooler" fonctionne, lui, sans rien payer de plus).
Elle ressemble à :

```
postgresql://postgres.xxxxxxxx:[VOTRE-MOT-DE-PASSE]@aws-0-xxxxx.pooler.supabase.com:5432/postgres
```

Remplacez `[VOTRE-MOT-DE-PASSE]` par le mot de passe de la base (affiché sur
la même page, ou à réinitialiser si vous ne l'avez plus).

### b. Autoriser l'accès à votre Google Drive

*Une première version de cette étape utilisait un « compte robot »
(compte de service). Google refuse en réalité qu'un tel compte écrive
quoi que ce soit, même dans un dossier partagé avec lui, sur un compte
Gmail gratuit (erreur "Service Accounts do not have storage quota") —
cette limite n'est levée que sur un compte Google Workspace payant. La
marche à suivre ci-dessous s'authentifie comme votre compte réel à la
place, ce qui l'évite complètement.*

1. Allez sur [console.cloud.google.com](https://console.cloud.google.com),
   créez un nouveau projet, par exemple `jealife-stock-backups` (ou
   réutilisez celui d'une tentative précédente).
2. Menu **APIs & Services** → **Library** → cherchez **Google Drive API** →
   **Enable**.
3. Menu **APIs & Services** → **OAuth consent screen** — si rien n'est
   encore configuré, choisissez **External**, renseignez un nom d'app (ex.
   « Stock Backup ») et votre e-mail comme contact, puis enregistrez. Pas
   besoin de le publier ni de le faire vérifier par Google : ce sera
   utilisé uniquement par vous.
4. Menu **APIs & Services** → **Credentials** → **Create Credentials** →
   **OAuth client ID**.
   - Type d'application : **Web application**.
   - Nom : ce que vous voulez, ex. `stock-backup`.
   - **Authorized redirect URIs** → **Add URI** → collez exactement :
     `https://developers.google.com/oauthplayground`
   - **Create**. Notez le **Client ID** et le **Client secret** affichés.
5. Ouvrez [developers.google.com/oauthplayground](https://developers.google.com/oauthplayground)
   dans un nouvel onglet.
   - Cliquez sur l'icône ⚙️ (réglages, en haut à droite) → cochez
     **Use your own OAuth credentials** → collez le Client ID et le
     Client secret de l'étape précédente → fermez ce panneau.
   - Dans la liste à gauche (« Select & authorize APIs »), collez dans le
     champ de saisie manuelle : `https://www.googleapis.com/auth/drive` →
     **Authorize APIs**.
   - Connectez-vous avec **votre propre compte Google** et acceptez.
   - De retour sur Playground, cliquez **Exchange authorization code for
     tokens**.
   - Copiez la valeur affichée en face de **Refresh token** — c'est la clé
     qui permettra à la sauvegarde de continuer à fonctionner indéfiniment,
     sans jamais avoir à repasser par cette page.
6. Dans **votre** Google Drive, créez un dossier normal, par exemple
   « JEaLiFe Stock — Sauvegardes » (rien à partager cette fois, c'est votre
   propre dossier). Ouvrez-le et copiez son identifiant dans l'adresse :
   `https://drive.google.com/drive/folders/CETTE-PARTIE-ICI`.

### c. Enregistrer ces réglages dans Vercel

Dans le tableau de bord **Vercel** → votre projet → **Settings** →
**Environment Variables**, ajoutez ces 5 variables (sur tous les
environnements) — si `GDRIVE_SERVICE_ACCOUNT_JSON` existe d'une tentative
précédente, supprimez-la, elle n'est plus utilisée :

| Nom | Valeur |
|---|---|
| `BACKUP_DATABASE_URL` | l'adresse de connexion de l'étape (a) |
| `GDRIVE_CLIENT_ID` | Client ID de l'étape (b.4) |
| `GDRIVE_CLIENT_SECRET` | Client secret de l'étape (b.4) |
| `GDRIVE_REFRESH_TOKEN` | Refresh token copié à l'étape (b.5) |
| `GDRIVE_BACKUP_FOLDER_ID` | l'identifiant du dossier Drive copié à l'étape (b.6) |

`CRON_SECRET` existe déjà (utilisé par la sauvegarde des compteurs) : rien
à faire pour celui-là, la nouvelle tâche le réutilise.

### d. Activer le robot

Une fois ces 5 variables enregistrées, un redéploiement du site (automatique
au prochain `git push`, ou bouton **Redeploy** dans Vercel) suffit à
activer la tâche programmée — aucune autre action n'est nécessaire.

Pour vérifier tout de suite que ça fonctionne sans attendre la nuit :
**Vercel** → votre projet → **Settings** → **Cron Jobs** → repérez
`backup-database` → menu **⋯** → **Run now** (si ce bouton n'existe pas
sur votre plan, dites-le-moi, je la déclenche moi-même en vous demandant
juste de confirmer). Une réponse `{"success": true, ...}` avec le nombre
de tables sauvegardées confirme que tout est en place.

## 3. En cas de besoin réel — comment restaurer

Le jour où c'est nécessaire, revenez avec ce fichier et demandez à Claude de
restaurer la base à partir d'une sauvegarde précise : je télécharge le
fichier correspondant depuis le dossier Drive, je rejoue les migrations du
projet sur la base cible, puis je réinjecte les données. Vous n'avez pas
besoin de connaître la marche à suivre exacte — mais vous pouvez ouvrir le
dossier dans Drive vous-même à tout moment pour voir quelles dates de
sauvegarde sont disponibles.

## 4. Protéger aussi les fichiers photos (R2)

Moins urgent que la base — mais peu coûteux à activer : dans Cloudflare R2,
sur le bucket des **photos** (celui déjà utilisé par le site, sans rapport
avec le dossier Drive ci-dessus), activez **Object Versioning** dans les
réglages du bucket. Concrètement : si un fichier est un jour supprimé ou
écrasé par erreur (bug, mauvaise manipulation admin), l'ancienne version
reste récupérable au lieu d'être perdue pour de bon. C'est un simple
interrupteur, sans rien à coder.

Une réplication complète du catalogue de photos vers un second
stockage (protection contre un incident chez Cloudflare lui-même) est une
étape plus lourde, à envisager plus tard si le catalogue prend de la valeur
— pas nécessaire aujourd'hui.
