import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { SITE_URL, SITE_NAME } from "./lib/site";
import ClientLayout from "./components/ClientLayout";
import { AuthProvider } from "./contexts/AuthContext";

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
  icons: { apple: "/icons/icon-192x192.png" },
};

// `themeColor` et `viewport` déclarés dans `metadata` sont ignorés depuis
// Next 15 — ils déclenchaient un avertissement sur chaque page du site.
export const viewport = {
  themeColor: "#0b3d2e",
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
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

  return (
    <html lang="fr">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <AuthProvider>
          <ClientLayout>{children}</ClientLayout>
        </AuthProvider>
        {/* Placé dans <body> : entre </html> et <body>, le composant était
            dans une position invalide du document. */}
        <Analytics />
      </body>
    </html>
  );
}

