import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { SITE_URL, SITE_NAME } from "./lib/site";
import ClientLayout from "./components/ClientLayout";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "JEaLiFe Stock | Images libres de droits et gratuites",
    template: "%s | JEaLiFe Stock",
  },
  description:
    "Banque d'images libres de droits et gratuites. Une sélection soignée, où l'on trouve de belles images du continent.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "JEaLiFe Stock",
  },
  keywords: [
    "banque d'images", "images libres de droits", "photos gratuites",
    "photo haute résolution", "images du continent africain", "JEaLiFe Stock",
  ],
  authors: [{ name: "JEaLiFe Stock" }],
  creator: "JEaLiFe Stock",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "/",
    siteName: SITE_NAME,
    title: "JEaLiFe Stock | Images libres de droits et gratuites",
    description:
      "Une sélection soignée d'images libres de droits, à télécharger gratuitement.",
  },
  twitter: {
    card: "summary_large_image",
    title: "JEaLiFe Stock",
    description:
      "Images libres de droits, à télécharger gratuitement.",
  },
  robots: { index: true, follow: true },
  icons: { 
    icon: "/favicon.ico",
    apple: "/icons/icon-192x192.png" 
  },
};

// `themeColor` et `viewport` déclarés dans `metadata` sont ignorés depuis
// Next 15 — ils déclenchaient un avertissement sur chaque page du site.
export const viewport = {
  themeColor: "#0b3d2e",
  width: "device-width",
  initialScale: 1,
  // "light dark" (pas juste "light") : laisse la propriété CSS `color-scheme`
  // — pilotée dynamiquement par la classe `.dark` (voir globals.css /
  // ThemeContext) — décider du rendu natif (champs, défilement…) plutôt que
  // de le figer en clair pour toute la session.
  colorScheme: "light dark",
};

export default function RootLayout({ children }) {
  // Données structurées WebSite : indiquent à Google le nom exact du site
  // ("JEaLiFe Stock" et non "JEaLiFe Agency" hérité du domaine parent).
  // Le SearchAction active la zone de recherche dans les résultats Google
  // (sitelinks search box).
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    alternateName: "JEaLiFe Stock",
    url: SITE_URL,
    description:
      "Banque d'images libres de droits et gratuites. Une sélection soignée, où l'on trouve de belles images du continent.",
    inLanguage: "fr",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  // Pose la classe `.dark` sur <html> avant tout rendu React : sans ce
  // script synchrone exécuté au tout début de <body>, la page peindrait
  // d'abord en clair puis basculerait en sombre une fois React monté — un
  // flash visible à chaque chargement pour qui a choisi le mode sombre.
  const themeInitScript = `
    (function () {
      try {
        var stored = localStorage.getItem('jealife-theme');
        var theme = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
        var resolved = theme === 'system'
          ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
          : theme;
        if (resolved === 'dark') document.documentElement.classList.add('dark');
      } catch (e) {}
    })();
  `;

  return (
    // `suppressHydrationWarning` : le script anti-FOUC pose `.dark` sur ce
    // nœud avant l'hydratation, en dehors de ce que React a lui-même rendu —
    // sans ce garde, React signale un faux mismatch à chaque chargement en
    // mode sombre.
    <html lang="fr" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <ThemeProvider>
          <AuthProvider>
            <ClientLayout>{children}</ClientLayout>
          </AuthProvider>
        </ThemeProvider>
        {/* Placé dans <body> : entre </html> et <body>, le composant était
            dans une position invalide du document. */}
        <Analytics />
      </body>
    </html>
  );
}

