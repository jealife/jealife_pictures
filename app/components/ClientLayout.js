"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function ClientLayout({ children }) {
    const pathname = usePathname();

    const hiddenRoutes = [
        "/login",
        "/join",
        "/forgot-password",
        "/reset-password",
        "/auth/callback",
    ];
    const shouldHideLayout = hiddenRoutes.includes(pathname);

    const footerRoutes = [
        "/about",
        "/history",
        "/press",
        "/team",
        "/help",
        "/licence",
        "/settings",
        "/submit"
    ];
    const shouldShowFooter = !shouldHideLayout && footerRoutes.some(route => pathname.startsWith(route));

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
                {shouldShowFooter && <Footer />}
            </div>
        </>
    );
}
