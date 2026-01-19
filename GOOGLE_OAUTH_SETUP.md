# Guide : Configuration Google OAuth pour Supabase

## Étape 1 : Accéder à Google Cloud Console

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Connectez-vous avec votre compte Google

## Étape 2 : Créer un nouveau projet (ou sélectionnez un projet existant)

1. Cliquez sur le sélecteur de projet en haut de la page
2. Cliquez sur **"Nouveau projet"**
3. Donnez un nom à votre projet : `JEaLiFe Pictures` (par exemple)
4. Cliquez sur **"Créer"**
5. Attendez quelques secondes que le projet soit créé
6. Sélectionnez votre nouveau projet

## Étape 3 : Activer l'API Google+

1. Dans le menu de gauche, allez dans **"API et services" > "Bibliothèque"**
2. Recherchez **"Google+ API"** ou **"Google Identity"**
3. Cliquez sur l'API et activez-la
4. Recherchez aussi **"Google People API"** et activez-la

## Étape 4 : Configurer l'écran de consentement OAuth

1. Dans le menu de gauche, allez dans **"API et services" > "Écran de consentement OAuth"**
2. Sélectionnez **"Externe"** (ou "Interne" si vous avez Google Workspace)
3. Cliquez sur **"Créer"**

### Remplissez les informations :

**Page 1 - Informations sur l'application :**
- **Nom de l'application** : JEaLiFe Pictures
- **E-mail assistance utilisateur** : votre email
- **Logo de l'application** : (optionnel pour le moment)
- **Domaine de l'application** : (laissez vide pour le développement)
- **Domaines autorisés** : (laissez vide pour le développement)
- **Coordonnées du développeur** : votre email
- Cliquez sur **"Enregistrer et continuer"**

**Page 2 - Champs d'application :**
- Cliquez sur **"Ajouter ou supprimer des champs d'application"**
- Sélectionnez :
  - `.../auth/userinfo.email`
  - `.../auth/userinfo.profile`
- Cliquez sur **"Mettre à jour"**
- Cliquez sur **"Enregistrer et continuer"**

**Page 3 - Utilisateurs test :**
- Ajoutez votre email comme utilisateur test
- Cliquez sur **"Enregistrer et continuer"**

**Page 4 - Résumé :**
- Vérifiez les informations
- Cliquez sur **"Retour au tableau de bord"**

## Étape 5 : Créer les identifiants OAuth

1. Dans le menu de gauche, allez dans **"API et services" > "Identifiants"**
2. Cliquez sur **"+ Créer des identifiants"** en haut
3. Sélectionnez **"ID client OAuth"**

### Configuration de l'ID client :

1. **Type d'application** : Sélectionnez **"Application Web"**
2. **Nom** : `JEaLiFe Pictures Web Client` (ou autre nom descriptif)

3. **Origines JavaScript autorisées** - Ajoutez :
   ```
   http://localhost:3000
   ```
   Et si vous avez déjà un domaine de production :
   ```
   https://votre-domaine.com
   ```

4. **URI de redirection autorisés** - **IMPORTANT** : Ajoutez ces deux URLs :
   
   **Pour Supabase :**
   ```
   https://VOTRE_PROJET.supabase.co/auth/v1/callback
   ```
   
   Remplacez `VOTRE_PROJET` par l'ID de votre projet Supabase.
   Vous trouvez cet URL dans votre dashboard Supabase :
   - Settings > API > Project URL
   - Ajoutez `/auth/v1/callback` à la fin

   **Pour le développement local (optionnel) :**
   ```
   http://localhost:3000/auth/callback
   ```

5. Cliquez sur **"Créer"**

## Étape 6 : Récupérer vos identifiants

Une fenêtre s'ouvre avec vos identifiants :

- **Client ID** : ressemble à `123456789-abcdefghijk.apps.googleusercontent.com`
- **Client Secret** : ressemble à `GOCSPX-abc123def456ghi789`

⚠️ **IMPORTANT** : Copiez ces deux valeurs immédiatement !

## Étape 7 : Configurer Supabase

1. Allez dans votre **Dashboard Supabase**
2. Naviguez vers **Authentication > Providers**
3. Trouvez **Google** dans la liste
4. Activez le provider (toggle ON)
5. Collez :
   - **Client ID (for OAuth)** : votre Client ID Google
   - **Client Secret (for OAuth)** : votre Client Secret Google
6. Cliquez sur **"Save"**

## Étape 8 : Vérifier la configuration

### Dans Google Cloud Console :

Vérifiez que votre écran de consentement OAuth ressemble à ceci :

**Origines JavaScript autorisées :**
```
http://localhost:3000
https://votre-domaine.com (si applicable)
```

**URI de redirection autorisés :**
```
https://votre-projet.supabase.co/auth/v1/callback
http://localhost:3000/auth/callback (optionnel)
```

### Dans Supabase :

L'URL de callback Supabase devrait être :
```
https://votre-projet.supabase.co/auth/v1/callback
```

## Étape 9 : Tester la connexion

1. Lancez votre application : `npm run dev`
2. Allez sur `/login` ou `/join`
3. Cliquez sur le bouton **"Continuer avec Google"**
4. Vous devriez être redirigé vers Google pour vous connecter
5. Après autorisation, vous serez redirigé vers votre application

## Problèmes courants

### Erreur 400: redirect_uri_mismatch

**Cause** : L'URI de redirection ne correspond pas
**Solution** : 
1. Vérifiez que l'URL dans Google Cloud Console correspond EXACTEMENT à celle de Supabase
2. Pas d'espace, pas de `/` à la fin qui ne devrait pas être là
3. Format exact : `https://votre-projet.supabase.co/auth/v1/callback`

### Erreur 403: access_denied

**Cause** : Votre email n'est pas dans les utilisateurs test
**Solution** : Ajoutez votre email dans "Utilisateurs test" dans l'écran de consentement OAuth

### L'écran de consentement ne s'affiche pas

**Cause** : Cookies bloqués ou popup bloqué
**Solution** : Autorisez les popups et vérifiez vos paramètres de cookies

## Passer en production

Quand vous êtes prêt pour la production :

1. Dans Google Cloud Console > OAuth consent screen
2. Cliquez sur **"Publier l'application"**
3. Soumettez votre application pour vérification Google (si nécessaire)
4. Mettez à jour vos URI de redirection avec vos URLs de production

## Ressources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase Google OAuth Guide](https://supabase.com/docs/guides/auth/social-login/auth-google)

## Notes importantes

- ⚠️ Ne partagez JAMAIS votre Client Secret publiquement
- 🔒 Le Client Secret doit rester côté serveur (Supabase le gère pour vous)
- 📧 En mode développement, seuls les utilisateurs test peuvent se connecter
- 🚀 En production, publiez votre application OAuth pour permettre à tous de se connecter
