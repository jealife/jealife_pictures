"use client";
import Link from "next/link";
import { Search, Menu, X, User as UserIcon, LogIn, Image as ImageIcon, Video, Palette, ChevronDown, Building2, LayoutGrid, Users, Compass, RotateCcw, PenTool, LogOut, BarChart3, Download, Settings } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { signOut } from "../lib/auth";
import UserMenu from "./UserMenu";

export default function Navbar() {
    const router = useRouter();
    const pathname = usePathname();
    const { user, profile, loading } = useAuth();
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [typeMenuOpen, setTypeMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [openMenuSection, setOpenMenuSection] = useState(null);
    const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const desktopUserMenuRef = useRef(null);
    const mobileUserMenuRef = useRef(null);

    const handleSignOut = async () => {
        setUserMenuOpen(false);
        await signOut();
        router.push('/');
        router.refresh();
    };

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close user menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            const clickedInsideDesktop = desktopUserMenuRef.current && desktopUserMenuRef.current.contains(event.target);
            const clickedInsideMobile = mobileUserMenuRef.current && mobileUserMenuRef.current.contains(event.target);

            if (!clickedInsideDesktop && !clickedInsideMobile) {
                setUserMenuOpen(false);
            }
        };

        if (userMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [userMenuOpen]);

    const handleSearch = (e) => {
        if (e.key === 'Enter') {
            router.push(`/?q=${e.target.value}`);
            setIsSearchFocused(false);
            // Reset focus on mobile could be annoying if multiple searches, but fine for now
        }
    };

    const getCurrentType = () => {
        if (pathname === '/videos') return { icon: <VideoSizeIcon />, label: 'Vidéos' };
        if (pathname === '/illustrations') return { icon: <PaletteSizeIcon />, label: 'Illustrations' };
        return { icon: <ImageIconSizeIcon />, label: 'Photos' };
    };

    // Helper because size prop might be weird in direct render if not consistent
    const VideoSizeIcon = () => <Video size={16} />;
    const PaletteSizeIcon = () => <Palette size={16} />;
    const ImageIconSizeIcon = () => <ImageIcon size={16} />;

    const currentType = getCurrentType();

    // Shared Menu Content Logic (Unsplash Desktop Style - 3 Column Layout)
    const renderSidebarContent = (closeMenu) => (
        <div className="flex flex-col h-full bg-white text-gray-900 px-8 py-10">
            <div className="flex flex-col md:flex-row gap-12 md:gap-24">

                {/* Column 1: Société */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3 mb-2 text-gray-900 font-bold text-lg">
                        <Building2 size={24} />
                        <span>Société</span>
                    </div>
                    <div className="flex flex-col gap-3 text-gray-500 font-medium text-[15px]">
                        <Link href="/about" onClick={closeMenu} className="hover:text-black transition-colors">Qui sommes-nous ?</Link>
                        <Link href="#" onClick={closeMenu} className="hover:text-black transition-colors">Faire de la pub</Link>
                        <Link href="/history" onClick={closeMenu} className="hover:text-black transition-colors">Histoire</Link>
                        <Link href="/team" onClick={closeMenu} className="hover:text-black transition-colors">Rejoindre l'équipe</Link>
                        <Link href="#" onClick={closeMenu} className="hover:text-black transition-colors">Blog</Link>
                        <Link href="/press" onClick={closeMenu} className="hover:text-black transition-colors">Newsroom</Link>
                        <Link href="#" onClick={closeMenu} className="hover:text-black transition-colors">Contactez-nous</Link>
                        <Link href="/help" onClick={closeMenu} className="hover:text-black transition-colors">Centre d'assistance</Link>
                    </div>
                    {/* Socials can go here or bottom */}
                    <div className="flex gap-4 mt-4 text-gray-400">
                        {/* Mock Social Icons */}
                        <div className="w-5 h-5 bg-gray-200 rounded-full hover:bg-black transition-colors cursor-pointer"></div>
                        <div className="w-5 h-5 bg-gray-200 rounded-full hover:bg-black transition-colors cursor-pointer"></div>
                        <div className="w-5 h-5 bg-gray-200 rounded-full hover:bg-black transition-colors cursor-pointer"></div>
                    </div>
                </div>

                {/* Column 2: Produit */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3 mb-2 text-gray-900 font-bold text-lg">
                        <LayoutGrid size={24} />
                        <span>Produit</span>
                    </div>
                    <div className="flex flex-col gap-3 text-gray-500 font-medium text-[15px]">
                        <Link href="#" onClick={closeMenu} className="hover:text-black transition-colors">Développeurs / API</Link>
                        <Link href="#" onClick={closeMenu} className="hover:text-black transition-colors">Jealife Dataset</Link>
                        <Link href="#" onClick={closeMenu} className="hover:text-black transition-colors">Jealife pour iOS</Link>
                        <Link href="#" onClick={closeMenu} className="hover:text-black transition-colors">Applis & plug-ins</Link>
                        <Link href="#" onClick={closeMenu} className="hover:text-black transition-colors">Jealife Studio</Link>
                        <Link href="#" onClick={closeMenu} className="hover:text-black transition-colors">Publicités placement produit</Link>
                    </div>
                </div>

                {/* Column 3: Communauté */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3 mb-2 text-gray-900 font-bold text-lg">
                        <Users size={24} />
                        <span>Communauté</span>
                    </div>
                    <div className="flex flex-col gap-3 text-gray-500 font-medium text-[15px]">
                        <Link href="#" onClick={closeMenu} className="hover:text-black transition-colors">Devenir contributeur</Link>
                        <Link href="#" onClick={closeMenu} className="hover:text-black transition-colors">Collections</Link>
                        <Link href="#" onClick={closeMenu} className="hover:text-black transition-colors">Tendances</Link>
                        <Link href="#" onClick={closeMenu} className="hover:text-black transition-colors">Jealife Awards</Link>
                        <Link href="#" onClick={closeMenu} className="hover:text-black transition-colors">Statistiques</Link>
                    </div>
                </div>

            </div>

            {/* Bottom Links */}
            <div className="mt-auto pt-10 border-t border-gray-100 flex gap-6 text-sm text-gray-500 font-medium">
                <Link href="#" onClick={closeMenu} className="hover:text-black">Licence</Link>
                <Link href="#" onClick={closeMenu} className="hover:text-black">Charte de protection des données</Link>
                <Link href="#" onClick={closeMenu} className="hover:text-black">Conditions générales</Link>
                <Link href="#" onClick={closeMenu} className="hover:text-black">Sécurité</Link>
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop Navigation Rail (Unsplash Style) */}
            <div className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-[64px] z-[60] bg-white border-r border-gray-100 items-center py-4 bg-white">
                {/* Logo */}
                <Link href="/" className="mb-10 px-1">
                    <img
                        src="/JEaLiFe-Pictures-logo-black.png"
                        alt="Logo"
                        className="w-14 h-auto object-contain hover:scale-105 transition-transform"
                    />
                </Link>

                {/* Main Nav Icons */}
                <div className="flex flex-col gap-6 w-full items-center">
                    <Link href="/" title="Photos" className={`p-2 rounded-lg transition-colors ${pathname === '/' ? 'text-black' : 'text-gray-400 hover:text-black hover:bg-gray-50'}`}>
                        <ImageIcon size={24} />
                    </Link>
                    <Link href="/illustrations" title="Illustrations" className={`p-2 rounded-lg transition-colors ${pathname === '/illustrations' ? 'text-black' : 'text-gray-400 hover:text-black hover:bg-gray-50'}`}>
                        <PenTool size={24} />
                    </Link>
                    <Link href="/videos" title="Videos" className={`p-2 rounded-lg transition-colors ${pathname === '/videos' ? 'text-black' : 'text-gray-400 hover:text-black hover:bg-gray-50'}`}>
                        <Video size={24} />
                    </Link>

                    <div className="w-8 h-px bg-gray-100"></div>
                </div>

                {/* Spacer */}
                <div className="flex-1"></div>

                {/* Bottom Icons */}
                <div className="flex flex-col gap-6 w-full items-center mb-2">
                    {/* Profile/Login Icon with Avatar */}
                    {user ? (
                        <div className="relative" ref={desktopUserMenuRef}>
                            <button
                                onClick={() => setUserMenuOpen(!userMenuOpen)}
                                className="p-1 hover:opacity-80 transition-opacity"
                                title="Profil"
                            >
                                <img
                                    src={profile?.avatar_url || user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
                                    alt="Profile"
                                    className="w-8 h-8 rounded-full object-cover border-2 border-gray-200"
                                />
                            </button>

                            {/* User Dropdown Menu */}
                            {userMenuOpen && (
                                <div className="absolute left-16 bottom-0 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-70 animate-in fade-in zoom-in-95 duration-200 origin-bottom-left">
                                    <UserMenu
                                        user={user}
                                        onSignOut={handleSignOut}
                                        onClose={() => setUserMenuOpen(false)}
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        <Link href="/login" title="Connexion" className="p-2 rounded-lg text-gray-400 hover:text-black hover:bg-gray-50 transition-colors">
                            <UserIcon size={24} />
                        </Link>
                    )}

                    <button
                        onClick={() => setDesktopSidebarOpen(true)}
                        className="p-2 rounded-lg text-gray-400 hover:text-black hover:bg-gray-50 transition-colors"
                        title="Menu"
                    >
                        <Menu size={24} />
                    </button>
                </div>
            </div>

            {/* Floating Navbar Container */}
            <nav className={`sticky top-0 z-50 transition-all duration-300 md:ml-[64px] ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100' : 'bg-white border-b border-transparent'}`}>
                <div className="max-w-[1800px] mx-auto px-4 sm:px-6">
                    <div className="h-16 flex items-center justify-between gap-4">

                        {/* Left: Brand (Mobile Only) */}
                        <div className="flex items-center gap-4 shrink-0 z-50 md:hidden">
                            <Link href="/" className="flex items-center group">
                                <img
                                    src="/JEaLiFe-Pictures-logo-black.png"
                                    alt="JEaLiFe Pictures"
                                    className="h-12 w-auto object-contain"
                                />
                            </Link>
                        </div>

                        {/* Search Bar - Desktop Only (Hidden on mobile top bar) */}
                        <div className={`hidden md:block flex-1 max-w-2xl transition-all duration-300 ${isSearchFocused ? 'scale-[1.01]' : ''}`}>
                            <div className={`relative flex items-center bg-gray-100 rounded-full transition-all duration-300 ${isSearchFocused ? 'ring-2 ring-black/5 bg-white shadow-lg' : 'hover:bg-gray-200/70'}`}>
                                <SearchDropdown currentType={currentType} setTypeMenuOpen={setTypeMenuOpen} typeMenuOpen={typeMenuOpen} ImageIconSizeIcon={ImageIconSizeIcon} PaletteSizeIcon={PaletteSizeIcon} VideoSizeIcon={VideoSizeIcon} />
                                <input
                                    type="text"
                                    placeholder={`Rechercher des ${currentType.label.toLowerCase()}...`}
                                    className="w-full h-10 pl-3 pr-4 bg-transparent border-none outline-none text-sm font-medium text-gray-800 placeholder-gray-500"
                                    onFocus={() => setIsSearchFocused(true)}
                                    onBlur={() => setIsSearchFocused(false)}
                                    onKeyDown={handleSearch}
                                />
                                <div className="flex items-center pr-4 text-gray-400">
                                    <Search className="w-5 h-5" />
                                </div>
                            </div>
                        </div>

                        {/* Desktop Actions */}
                        <div className="hidden md:flex items-center gap-1 shrink-0">
                            <Link href="/" className="text-sm font-medium text-gray-500 hover:text-black px-4 py-2 rounded-full hover:bg-gray-100 transition-all">
                                Explorer
                            </Link>
                            {user ? (
                                <Link href="/submit" className="bg-black text-white text-sm font-medium px-5 py-2.5 rounded-full hover:bg-gray-800 active:scale-95 transition-all shadow-md hover:shadow-lg ml-2">
                                    Soumettre
                                </Link>
                            ) : (
                                <>
                                    <Link href="/login" className="text-sm font-medium text-gray-500 hover:text-black px-4 py-2 rounded-full hover:bg-gray-100 transition-all">
                                        Connexion
                                    </Link>
                                    <Link href="/submit" className="bg-black text-white text-sm font-medium px-5 py-2.5 rounded-full hover:bg-gray-800 active:scale-95 transition-all shadow-md hover:shadow-lg ml-2">
                                        Soumettre
                                    </Link>
                                </>
                            )}
                        </div>

                        {/* Mobile Right - Profile Avatar/Icon + Menu Toggle */}
                        <div className="md:hidden flex items-center gap-2">
                            {user ? (
                                <div className="relative" ref={mobileUserMenuRef}>
                                    <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="p-1 hover:opacity-80 transition-opacity">
                                        <img
                                            src={profile?.avatar_url || user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
                                            alt="Profile"
                                            className="w-8 h-8 rounded-full object-cover border-2 border-gray-200"
                                        />
                                    </button>
                                    {userMenuOpen && (
                                        <div className="absolute right-0 top-12 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-70 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                            <UserMenu user={user} onSignOut={handleSignOut} onClose={() => setUserMenuOpen(false)} />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <Link href="/login" className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                                    <UserIcon className="w-6 h-6" />
                                </Link>
                            )}
                            <button className="relative z-[60] p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors active:scale-90" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                            </button>
                        </div>
                    </div>

                    {/* Mobile Only: Secondary row for Search Bar */}
                    <div className="md:hidden pb-4">
                        <div className={`relative flex items-center bg-gray-100 rounded-full transition-all duration-300 ${isSearchFocused ? 'ring-2 ring-black/5 bg-white shadow-md' : ''}`}>
                            <div className="pl-4 text-gray-400">
                                <Search className="w-4 h-4" />
                            </div>
                            <input
                                type="text"
                                placeholder={`Explorer des ${currentType.label.toLowerCase()}...`}
                                className="w-full h-10 pl-3 pr-4 bg-transparent border-none outline-none text-sm font-medium text-gray-800 placeholder-gray-500"
                                onFocus={() => setIsSearchFocused(true)}
                                onBlur={() => setIsSearchFocused(false)}
                                onKeyDown={handleSearch}
                            />
                        </div>
                    </div>
                </div>

                {/* Mobile Floating Menu Overlay */}
                {mobileMenuOpen && (
                    <>
                        {/* Backdrop - Covers entire screen including navbar interactions except toggle */}
                        <div
                            className="fixed inset-0 bg-black/25 z-[55] animate-in fade-in duration-200"
                            onClick={() => setMobileMenuOpen(false)}
                        />


                        {/* Floating Menu Card mimicking Unsplash */}
                        <div className="absolute top-[70px] right-4 left-4 z-[60] bg-white rounded-xl shadow-2xl border border-gray-100 p-4 animate-in slide-in-from-top-2 duration-200 origin-top">
                            <div className="flex flex-col mb-4">
                                {/* Menu Items (Accordion Style) */}
                                {['Société', 'Produit', 'Communauté'].map((item, idx) => {
                                    const isOpen = openMenuSection === item;
                                    const subLinks = {
                                        'Société': [
                                            { label: 'À propos', href: '/about' },
                                            { label: 'Histoire', href: '/history' },
                                            { label: 'Rejoindre l\'équipe', href: '/team' },
                                            { label: 'Presse', href: '/press' },
                                            { label: 'Aide', href: '/help' }
                                        ],
                                        'Produit': [
                                            { label: 'Développeurs / API', href: '#' },
                                            { label: 'Applications', href: '#' },
                                            { label: 'Jealife Dataset', href: '#' },
                                            { label: 'Jealife pour iOS', href: '#' }
                                        ],
                                        'Communauté': [
                                            { label: 'Blog', href: '#' },
                                            { label: 'Forum', href: '#' },
                                            { label: 'Créateurs', href: '#' },
                                            { label: 'Événements', href: '#' },
                                            { label: 'Soutenir', href: '#' }
                                        ]
                                    };

                                    return (
                                        <div key={item} className="border-b border-gray-100 last:border-0">
                                            <button
                                                onClick={() => setOpenMenuSection(isOpen ? null : item)}
                                                className="w-full flex items-center justify-between py-4 group hover:text-black text-gray-600 transition-colors"
                                            >
                                                <div className="flex items-center gap-4">
                                                    {idx === 0 && <Building2 className="w-5 h-5 text-gray-900" />}
                                                    {idx === 1 && <LayoutGrid className="w-5 h-5 text-gray-900" />}
                                                    {idx === 2 && <Users className="w-5 h-5 text-gray-900" />}
                                                    <span className="font-bold text-base text-gray-900">{item}</span>
                                                </div>
                                                <ChevronDown className={`w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                                            </button>

                                            {/* Sub Links Accordion Content */}
                                            <div className={`grid transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'grid-rows-[1fr] opacity-100 mb-4' : 'grid-rows-[0fr] opacity-0'}`}>
                                                <div className="overflow-hidden">
                                                    <div className="flex flex-col gap-3 pl-[3.25rem] border-l-2 border-gray-100 ml-2.5">
                                                        {subLinks[item].map((link) => (
                                                            <Link
                                                                key={link.label}
                                                                href={link.href}
                                                                className="text-gray-500 hover:text-black text-sm font-medium transition-colors"
                                                                onClick={() => setMobileMenuOpen(false)}
                                                            >
                                                                {link.label}
                                                            </Link>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Static Links */}
                                <Link href="/" className="w-full flex items-center justify-between py-4 group border-b border-gray-100 hover:text-black text-gray-600 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                                    <div className="flex items-center gap-4">
                                        <Compass className="w-5 h-5 text-gray-900" />
                                        <span className="font-bold text-base text-gray-900">Explorer</span>
                                    </div>
                                </Link>
                            </div>

                            {/* Footer Buttons */}
                            <div className="flex gap-3 mb-6">
                                <Link href="/submit" onClick={() => setMobileMenuOpen(false)} className="flex-1 py-2.5 px-4 bg-white border border-gray-300 rounded text-gray-600 font-medium text-sm text-center shadow-sm hover:border-gray-400 hover:text-black transition-colors">
                                    Soumettre une image
                                </Link>
                                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="flex-1 py-2.5 px-4 bg-white border border-gray-300 rounded text-gray-600 font-medium text-sm text-center shadow-sm hover:border-gray-400 hover:text-black transition-colors">
                                    Connexion
                                </Link>
                            </div>

                            {/* Sign Up Footer */}
                            <div className="text-center">
                                <p className="text-gray-500 text-sm">
                                    Nouveau sur JEaLiFe ? <Link href="/join" onClick={() => setMobileMenuOpen(false)} className="text-gray-600 underline hover:text-black underline-offset-2">Inscrivez-vous gratuitement</Link>
                                </p>
                            </div>
                        </div>
                    </>
                )}
            </nav>

            {/* Desktop Floating Menu (Pop-up from Rail) */}
            {desktopSidebarOpen && (
                <>
                    {/* Invisible Backdrop to close on click outside */}
                    <div
                        className="fixed inset-0 z-[65]"
                        onClick={() => setDesktopSidebarOpen(false)}
                    />

                    {/* Floating Popover Container */}
                    <div className="fixed bottom-4 left-[70px] z-[70] w-[850px] max-h-[90vh] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden origin-bottom-left animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200 cursor-default">

                        {/* Content Reusing the 3-column Layout */}
                        {renderSidebarContent(() => setDesktopSidebarOpen(false))}
                    </div>
                </>
            )}
        </>
    );
}

// Sub-component for Search Dropdown to keep code clean
function SearchDropdown({ currentType, setTypeMenuOpen, typeMenuOpen, ImageIconSizeIcon, PaletteSizeIcon, VideoSizeIcon }) {
    return (
        <div className="relative z-20">
            <button
                onClick={() => setTypeMenuOpen(!typeMenuOpen)}
                className="flex items-center gap-1.5 pl-4 pr-3 h-10 border-r border-gray-300/50 text-gray-600 hover:text-black transition-colors"
            >
                {currentType.icon}
                <ChevronDown size={14} className={`opacity-50 transition-transform ${typeMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {typeMenuOpen && (
                <div className="absolute top-11 left-0 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="fixed inset-0 z-40" onClick={() => setTypeMenuOpen(false)}></div>
                    <div className="relative z-50">
                        <Link href="/" onClick={() => setTypeMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm font-medium text-gray-700">
                            <ImageIconSizeIcon /> Photos
                        </Link>
                        <Link href="/illustrations" onClick={() => setTypeMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm font-medium text-gray-700">
                            <PaletteSizeIcon /> Illustrations
                        </Link>
                        <Link href="/videos" onClick={() => setTypeMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm font-medium text-gray-700">
                            <VideoSizeIcon /> Vidéos
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
