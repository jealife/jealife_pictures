/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // AVIF puis WebP : à qualité perçue égale, une AVIF pèse environ 30 % de
    // moins qu'une JPEG. Sur un forfait mobile gabonais, cela se voit.
    formats: ["image/avif", "image/webp"],

    // Les images sont immuables une fois publiées (chaque envoi crée un
    // chemin horodaté) : un cache d'un an évite de les retélécharger.
    minimumCacheTTL: 31536000,

    remotePatterns: [
      // Le stockage du projet Supabase. Le motif générique évite d'avoir à
      // modifier ce fichier — et de casser toutes les images en production —
      // le jour où le projet change de référence.
      { protocol: "https", hostname: "*.supabase.co" },
      // Images de vitrine du site, hébergées sur le compte Unsplash de
      // l'auteur (voir app/lib/auth-images.js).
      { protocol: "https", hostname: "images.unsplash.com" },
      // Avatars de repli générés pour les comptes sans photo de profil.
      { protocol: "https", hostname: "api.dicebear.com" },
      // Photos de profil des comptes connectés via Google.
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
