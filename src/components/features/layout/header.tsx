"use client";

import { Profile } from "@/types";
import { OrganizationWithRole } from "@/types";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { usePathname } from "next/navigation";
import { Save } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { MobileSidebar } from "./mobile-sidebar";
import { useUnsavedChanges } from "@/lib/contexts/unsaved-changes-context";
import { getErrorMessage } from "@/lib/utils/error";
import { logger } from "@/lib/utils/logger";
import { useState, useMemo } from "react";
import { ROUTES } from "@/lib/constants/routes";
import { useCurrentOrgSlug } from "@/lib/hooks";
import MenuBurger from "@/components/ui/header/menu-burger-button";
import { cn } from "@/lib/utils";

interface HeaderProps {
    user: Profile | null;
    organizations?: OrganizationWithRole[];
}

export function Header({ organizations = [] }: HeaderProps) {
    const pathname = usePathname();
    const currentOrgSlug = useCurrentOrgSlug();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const {
        hasUnsavedChanges,
        saveFunction,
        isSaving,
        setIsSaving,
        setHasUnsavedChanges,
    } = useUnsavedChanges();

    // Pobierz aktualną organizację z URL
    const currentOrg = useMemo(() => {
        if (currentOrgSlug) {
            return organizations.find((o) => o.slug === currentOrgSlug);
        }
        return organizations[0];
    }, [currentOrgSlug, organizations]);

    // Tytuł strony na podstawie pathname
    const pageTitle = useMemo(() => {
        if (pathname === ROUTES.PANEL) return null;
        if (pathname === ROUTES.PRACOWNICY) return "Pracownicy";
        if (pathname === ROUTES.USTAWIENIA) return "Ustawienia";
        if (pathname === ROUTES.GRAFIK) return currentOrg?.name || null;
        return null;
    }, [pathname, currentOrg]);

    const handleSave = async () => {
        if (saveFunction) {
            setIsSaving(true);
            try {
                await saveFunction();
                setHasUnsavedChanges(false);
            } catch (error) {
                const message = getErrorMessage(error);
                logger.error("Error saving:", message);
            } finally {
                setIsSaving(false);
            }
        }
    };

    return (
        <>
            <header
                className={`sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-slate-200 bg-white px-4 sm:gap-x-6 sm:px-6 ${hasUnsavedChanges ? "translate-y-0" : "lg:-translate-y-full"} transition-transform duration-300 ease-out`}
            >
                <div className="flex items-center gap-x-2 justify-between w-full lg:hidden">
                    {/* Mobile */}
                    <Logo />
                    <div className="flex items-center justify-center gap-x-3">
                        {/* Save button mobile - tylko gdy są zmiany */}
                        <div
                            className={`relative ${hasUnsavedChanges ? "translate-y-0" : "-translate-y-[2000%]"} transition-transform duration-300 ease-out`}
                        >
                            <Button
                                onClick={handleSave}
                                disabled={isSaving}
                                size="icon"
                                className={`bg-slate-100 border border-slate-200 text-blue-600 `}
                            >
                                {isSaving ? (
                                    <Spinner className="h-4 w-4 z-50" />
                                ) : (
                                    <Save className="h-4 w-4" />
                                )}
                            </Button>
                            <div
                                className={cn(
                                    "absolute top-0 right-0 transition-opacity duration-300 ease-out",
                                    isSaving ? "opacity-0" : "opacity-100",
                                )}
                            >
                                <span className="relative block h-2 w-2">
                                    <span className="absolute inset-0 rounded-full bg-amber-500" />
                                    <span className="absolute inset-0 rounded-full bg-amber-500 animate-ping" />
                                </span>
                            </div>
                        </div>

                        <MenuBurger onClick={() => setMobileMenuOpen(true)} />
                    </div>
                </div>

                <div className="hidden lg:flex flex-1 gap-x-4 self-stretch lg:gap-x-6 max-w-400 mx-auto">
                    {/* Page title */}
                    <div className="flex items-center">
                        {pageTitle && (
                            <h1 className="text-lg font-semibold text-slate-900">
                                {pageTitle}
                            </h1>
                        )}
                    </div>

                    <div className="flex flex-1" />

                    {/* Save button - zawsze widoczny, disabled gdy brak zmian */}
                    <div className="flex items-center gap-x-4 lg:gap-x-6 overflow-hidden">
                        <Button
                            onClick={handleSave}
                            disabled={!hasUnsavedChanges || isSaving}
                            className={`gap-2 transition-transform duration-300 ease-out ${
                                hasUnsavedChanges
                                    ? "translate-y-0"
                                    : "-translate-y-12"
                            }`}
                            variant={hasUnsavedChanges ? "default" : "outline"}
                        >
                            {isSaving ? (
                                <Spinner />
                            ) : (
                                <Save className="h-4 w-4" />
                            )}
                            <span className="hidden sm:inline">
                                {isSaving ? "Zapisuję..." : "Zapisz zmiany"}
                            </span>
                        </Button>
                    </div>
                </div>
            </header>

            {/* Mobile Sidebar */}
            <MobileSidebar
                organizations={organizations}
                open={mobileMenuOpen}
                onOpenChange={setMobileMenuOpen}
            />
        </>
    );
}
