/**
 * Images d'illustration du site (accueil, connexion, inscription).
 *
 * Ce sont les photos de l'auteur du site, hébergées sur son compte Unsplash
 * @jealife_pictures. Elles servent de vitrine tant que la banque se remplit.
 *
 * Note : ces URL pointent vers le CDN d'Unsplash. Le jour où vous voudrez
 * couper cette dépendance externe, il suffira de déposer les mêmes fichiers
 * dans `public/hero/` et de remplacer les URL ci-dessous par des chemins
 * locaux — le reste du code n'a pas à changer.
 */
export const AUTH_IMAGES = [
    {
        "url": "https://images.unsplash.com/photo-1744710964175-a9159aa30a7d?fm=jpg&q=95&w=2400&auto=format&fit=crop",
        "photographer": "JEaLiFe Stock",
        "photographer_url": "https://unsplash.com/fr/@jealife_pictures"
    },
    {
        "url": "https://images.unsplash.com/photo-1745070934881-1877d2d77c24?fm=jpg&q=95&w=2400&auto=format&fit=crop",
        "photographer": "JEaLiFe Stock",
        "photographer_url": "https://unsplash.com/fr/@jealife_pictures"
    },
    {
        "url": "https://images.unsplash.com/photo-1746035829976-84116b4cca12?fm=jpg&q=95&w=2400&auto=format&fit=crop",
        "photographer": "JEaLiFe Stock",
        "photographer_url": "https://unsplash.com/fr/@jealife_pictures"
    },
    {
        "url": "https://images.unsplash.com/photo-1755143005629-6e4f401b283e?fm=jpg&q=95&w=2400&auto=format&fit=crop",
        "photographer": "JEaLiFe Stock",
        "photographer_url": "https://unsplash.com/fr/@jealife_pictures"
    },
    {
        "url": "https://images.unsplash.com/photo-1758807884454-a59ed04d32c5?fm=jpg&q=95&w=2400&auto=format&fit=crop",
        "photographer": "JEaLiFe Stock",
        "photographer_url": "https://unsplash.com/fr/@jealife_pictures"
    },
    {
        "url": "https://images.unsplash.com/photo-1763503658162-084bee71871b?fm=jpg&q=95&w=2400&auto=format&fit=crop",
        "photographer": "JEaLiFe Stock",
        "photographer_url": "https://unsplash.com/fr/@jealife_pictures"
    },
    {
        "url": "https://images.unsplash.com/photo-1744710963682-7b6ad5ee0e7d?fm=jpg&q=95&w=2400&auto=format&fit=crop",
        "photographer": "JEaLiFe Stock",
        "photographer_url": "https://unsplash.com/fr/@jealife_pictures"
    },
    {
        "url": "https://images.unsplash.com/photo-1746035830053-f35472d338d8?fm=jpg&q=95&w=2400&auto=format&fit=crop",
        "photographer": "JEaLiFe Stock",
        "photographer_url": "https://unsplash.com/fr/@jealife_pictures"
    },
    {
        "url": "https://images.unsplash.com/photo-1746036295673-459dc3af9e6a?fm=jpg&q=95&w=2400&auto=format&fit=crop",
        "photographer": "JEaLiFe Stock",
        "photographer_url": "https://unsplash.com/fr/@jealife_pictures"
    },
    {
        "url": "https://images.unsplash.com/photo-1750287499511-171b2f9dace4?fm=jpg&q=95&w=2400&auto=format&fit=crop",
        "photographer": "JEaLiFe Stock",
        "photographer_url": "https://unsplash.com/fr/@jealife_pictures"
    }
];

/**
 * Tire une image de vitrine au hasard.
 *
 * À appeler depuis un composant serveur, puis à passer en prop : tirer au sort
 * dans un `useEffect` obligeait à un `setState` immédiat après le montage —
 * un rendu supplémentaire à chaque visite, et un accroc d'hydratation si le
 * tirage avait lieu pendant le rendu.
 */
export function pickShowcaseImage() {
    return AUTH_IMAGES[Math.floor(Math.random() * AUTH_IMAGES.length)];
}
