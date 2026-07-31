"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function ClientLayout({ children }) {
    const pathname = usePathname();

    // Les pages d'authentification occupent tout l'écran, avec leur propre
    // logo : y superposer la navigation du site casse la mise en page et
    // propose des sorties au milieu d'un parcours qu'on veut voir aboutir.
    // Seules /login et /join étaient couvertes ; les trois autres écrans du
    // parcours ont été ajoutés depuis.
    const hiddenRoutes = [
        "/login",
        "/join",
        "/forgot-password",
        "/reset-password",
        "/auth/callback",
    ];
    const shouldHideLayout = hiddenRoutes.includes(pathname);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

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
