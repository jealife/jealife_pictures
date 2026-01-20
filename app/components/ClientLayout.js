"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function ClientLayout({ children }) {
    const pathname = usePathname();
    // Liste des routes où la navbar et la sidebar ne doivent pas être affichées
    const hiddenRoutes = ["/join", "/login"];
    const shouldHideLayout = hiddenRoutes.includes(pathname);

    return (
        <>
            {!shouldHideLayout && <Navbar />}
            <div className={!shouldHideLayout ? "md:pl-[64px] transition-all duration-300 flex flex-col min-h-screen" : "flex flex-col min-h-screen"}>
                <div className="flex-1">
                    {children}
                </div>
                {!shouldHideLayout && <Footer />}
            </div>
        </>
    );
}
