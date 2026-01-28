"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";
import {
    Menu,
    X,
    ChevronDown,
    Calculator,
    Calendar,
    FileSpreadsheet,
    Briefcase,
    BookOpen,
    Sparkles,
    ArrowRight,
    Clock,
    Building2,
    Users,
    Scale,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";

// Struktura menu nawigacji
const navigationItems = [
    {
        label: "Narzędzia",
        href: ROUTES.NARZEDZIA,
        submenu: [
            {
                label: "Niedziele handlowe 2026",
                description: "Pełna lista niedziel handlowych",
                href: ROUTES.NIEDZIELE_HANDLOWE,
                icon: Calendar,
            },
            {
                label: "Wymiar czasu pracy",
                description: "zobacz wymiar czasu pracy",
                href: ROUTES.KALKULATOR_CZASU,
                icon: Clock,
            },
            {
                label: "Kalkulator wynagrodzeń",
                description: "Przelicz brutto na netto",
                href: ROUTES.KALKULATOR_WYNAGRODZEN,
                icon: Calculator,
            },
            {
                label: "Kalendarz dni roboczych",
                description: "Dni robocze i długie weekendy",
                href: ROUTES.KALENDARZ_DNI_ROBOCZYCH,
                icon: Calendar,
            },
        ],
    },
    {
        label: "Grafik pracy",
        href: ROUTES.GRAFIK_PRACY,
        submenu: [
            {
                label: "Generator grafiku",
                description: "Stwórz grafik automatycznie",
                href: ROUTES.GRAFIK_PRACY,
                icon: Sparkles,
            },
            {
                label: "Szablony do pobrania",
                description: "Excel, PDF, Google Sheets",
                href: ROUTES.GRAFIK_SZABLONY,
                icon: FileSpreadsheet,
            },
            {
                label: "Dla sklepów",
                description: "Grafik dla handlu detalicznego",
                href: "/grafik-pracy/sklep",
                icon: Building2,
            },
            {
                label: "Dla restauracji",
                description: "Grafik dla gastronomii",
                href: "/grafik-pracy/restauracja",
                icon: Users,
            },
            {
                label: "Dla produkcji",
                description: "Grafik zmianowy 24/7",
                href: "/grafik-pracy/produkcja",
                icon: Briefcase,
            },
        ],
    },
    {
        label: "Blog",
        href: ROUTES.BLOG,
        submenu: [
            {
                label: "Wszystkie artykuły",
                description: "Poradniki i aktualności",
                href: ROUTES.BLOG,
                icon: BookOpen,
            },
            {
                label: "Jak ułożyć grafik pracy",
                description: "Kompletny poradnik",
                href: "/blog/jak-ulozyc-grafik-pracy",
                icon: FileSpreadsheet,
            },
            {
                label: "Kary PIP za zły grafik",
                description: "Czego unikać",
                href: "/blog/kary-pip-za-zly-grafik",
                icon: Scale,
            },
        ],
    },
    {
        label: "Baza wiedzy",
        href: "/poradniki",
    },
];

interface MarketingHeaderProps {
    variant?: "default" | "transparent";
}

export function MarketingHeader({ variant = "default" }: MarketingHeaderProps) {
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
    const [scrolled, setScrolled] = useState(false);

    // Efekt scrollowania
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 10);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Zamknij mobile menu przy zmianie ścieżki
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [pathname]);

    const isActive = (href: string) => {
        if (href === "/") return pathname === "/";
        return pathname.startsWith(href);
    };

    return (
        <header
            className={cn(
                "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
                scrolled || variant === "default"
                    ? "bg-white/80 backdrop-blur-sm border-b border-gray-200"
                    : "bg-transparent"
            )}
        >
            <div className="container mx-auto px-2 lg:px-4 py-1.5">
                <div className="relative flex items-center justify-between h-12">
                    {/* Logo - lewa strona */}
                    <Logo />

                    {/* Desktop Navigation - IDEALNIE na środku (absolute positioning) */}
                    <nav className="hidden lg:flex items-center justify-center gap-1 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                        {navigationItems.map((item) => (
                            <div
                                key={item.label}
                                className="relative"
                                onMouseEnter={() =>
                                    item.submenu && setActiveSubmenu(item.label)
                                }
                                onMouseLeave={() => setActiveSubmenu(null)}
                            >
                                <Link
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                                        isActive(item.href)
                                            ? "text-blue-600 bg-blue-50"
                                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                                    )}
                                >
                                    {item.label}
                                    {item.submenu && (
                                        <ChevronDown
                                            className={cn(
                                                "w-4 h-4 transition-transform duration-200",
                                                activeSubmenu === item.label &&
                                                    "rotate-180"
                                            )}
                                        />
                                    )}
                                </Link>

                                {/* Dropdown Submenu */}
                                {item.submenu &&
                                    activeSubmenu === item.label && (
                                        <div className="absolute top-full left-0 pt-2 w-72">
                                            <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
                                                <div className="p-2">
                                                    {item.submenu.map(
                                                        (subitem) => (
                                                            <Link
                                                                key={
                                                                    subitem.href
                                                                }
                                                                href={
                                                                    subitem.href
                                                                }
                                                                className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group/item"
                                                            >
                                                                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 group-hover/item:bg-blue-100 transition-colors">
                                                                    <subitem.icon className="w-5 h-5 text-blue-600" />
                                                                </div>
                                                                <div>
                                                                    <div className="text-sm font-medium text-gray-900 group-hover/item:text-blue-600 transition-colors">
                                                                        {
                                                                            subitem.label
                                                                        }
                                                                    </div>
                                                                    <div className="text-xs text-gray-500 mt-0.5">
                                                                        {
                                                                            subitem.description
                                                                        }
                                                                    </div>
                                                                </div>
                                                            </Link>
                                                        )
                                                    )}
                                                </div>
                                                {/* Submenu footer link */}
                                                <div className="border-t border-gray-100 p-2 bg-gray-50/50">
                                                    <Link
                                                        href={item.href}
                                                        className="flex items-center justify-between p-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                                                    >
                                                        Zobacz wszystko
                                                        <ArrowRight className="w-4 h-4" />
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                            </div>
                        ))}
                    </nav>

                    {/* CTA Buttons - prawa strona */}
                    <div className="hidden lg:flex items-center gap-3 shrink-0">
                        <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="text-gray-600 hover:text-gray-900"
                        >
                            <Link href={ROUTES.LOGOWANIE}>Zaloguj się</Link>
                        </Button>
                        <Button
                            asChild
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all"
                        >
                            <Link href={ROUTES.REJESTRACJA}>
                                Rozpocznij za darmo
                                <ArrowRight className="w-4 h-4 ml-1" />
                            </Link>
                        </Button>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        type="button"
                        className="lg:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        <span className="sr-only">Otwórz menu</span>
                        {mobileMenuOpen ? (
                            <X className="w-6 h-6" />
                        ) : (
                            <Menu className="w-6 h-6" />
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            <div
                className={cn(
                    "lg:hidden fixed inset-x-0 top-16 bg-white border-b border-gray-100 shadow-lg transition-all duration-300 overflow-hidden",
                    mobileMenuOpen
                        ? "max-h-[calc(100vh-4rem)] opacity-100"
                        : "max-h-0 opacity-0"
                )}
            >
                <div className="container mx-auto px-4 py-4 overflow-y-auto max-h-[calc(100vh-8rem)]">
                    <nav className="space-y-1">
                        {navigationItems.map((item) => (
                            <div key={item.label}>
                                {item.submenu ? (
                                    <div className="space-y-1">
                                        <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                            {item.label}
                                        </div>
                                        {item.submenu.map((subitem) => (
                                            <Link
                                                key={subitem.href}
                                                href={subitem.href}
                                                className={cn(
                                                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                                                    isActive(subitem.href)
                                                        ? "bg-blue-50 text-blue-600"
                                                        : "text-gray-700 hover:bg-gray-50"
                                                )}
                                            >
                                                <subitem.icon className="w-5 h-5" />
                                                <div>
                                                    <div className="font-medium">
                                                        {subitem.label}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {subitem.description}
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <Link
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                                            isActive(item.href)
                                                ? "bg-blue-50 text-blue-600"
                                                : "text-gray-700 hover:bg-gray-50"
                                        )}
                                    >
                                        <span className="font-medium">
                                            {item.label}
                                        </span>
                                    </Link>
                                )}
                            </div>
                        ))}
                    </nav>

                    {/* Mobile CTA */}
                    <div className="mt-6 pt-6 border-t border-gray-100 space-y-3">
                        <Button
                            asChild
                            variant="outline"
                            className="w-full rounded-xl"
                        >
                            <Link href={ROUTES.LOGOWANIE}>Zaloguj się</Link>
                        </Button>
                        <Button
                            asChild
                            className="w-full bg-blue-600 hover:bg-blue-700 rounded-xl"
                        >
                            <Link href={ROUTES.REJESTRACJA}>
                                Rozpocznij za darmo
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Link>
                        </Button>
                    </div>

                    {/* Promo Badge */}
                    <div className="mt-4 p-4 bg-linear-to-r from-blue-50 to-violet-50 rounded-xl border border-blue-100">
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-semibold text-blue-900">
                                14 dni za darmo
                            </span>
                        </div>
                        <p className="text-xs text-blue-700">
                            Bez karty kredytowej. Pełna funkcjonalność.
                        </p>
                    </div>
                </div>
            </div>
        </header>
    );
}
