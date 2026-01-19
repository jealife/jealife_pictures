import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
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
  title: {
    default: "JEaLiFe Pictures | Belles images gratuites et photos",
    template: "%s | JEaLiFe Pictures"
  },
  description: "La source d'images internet. Propulsé par des créateurs du Gabon et d'ailleurs. Téléchargez des photos haute résolution gratuites.",
  keywords: ["photos gratuites", "Gabon", "images libres de droits", "JEaLiFe", "photographie", "Afrique", "Libreville"],
  authors: [{ name: "JEaLiFe Team" }],
  creator: "JEaLiFe",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://jealife-pictures.vercel.app",
    siteName: "JEaLiFe Pictures",
    title: "JEaLiFe Pictures | Belles images gratuites",
    description: "Découvrez des milliers de photos haute résolution gratuites partagées par une communauté talentueuse.",
    images: [
      {
        url: "/og-image.jpg", // Need to ensure this exists or use a placeholder
        width: 1200,
        height: 630,
        alt: "JEaLiFe Pictures",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "JEaLiFe Pictures",
    description: "Belles images gratuites et photos haute résolution.",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <ClientLayout>
            {children}
          </ClientLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
