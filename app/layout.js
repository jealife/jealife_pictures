import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientLayout from "./components/ClientLayout";
import { AuthProvider } from "./contexts/AuthContext";
import { Analytics } from "@vercel/analytics/next"
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
        url: "https://images.unsplash.com/photo-1759082927410-1d1856152b50?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
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
    images: ["https://images.unsplash.com/photo-1759082927410-1d1856152b50?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"],
  },
  robots: {
    index: true,
    follow: true,
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <Analytics />
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
