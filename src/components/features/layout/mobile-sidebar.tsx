"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    getNavItemStyles,
    getNavIconStyles,
} from "@/components/features/layout/nav-styles";
import { Building2, Plus, LogOut } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { OrganizationWithRole } from "@/types";
import { OrganizationSwitcher } from "./organization-switcher";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { NAVIGATION_ITEMS, getNavHref } from "@/lib/config/navigation";
import { ROUTES } from "@/lib/constants/routes";
import { useCurrentOrgSlug } from "@/lib/hooks";
import { createClient } from "@/lib/supabase/client";

interface MobileSidebarProps {
    organizations: OrganizationWithRole[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function MobileSidebar({
    organizations,
    open,
    onOpenChange,
}: MobileSidebarProps) {
    const pathname = usePathname();
    const currentOrgSlug = useCurrentOrgSlug();
    const router = useRouter();

    async function handleLogout() {
        const supabase = createClient();
        await supabase.auth.signOut();
        onOpenChange(false);
        router.push(ROUTES.LOGOWANIE);
        router.refresh();
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="left" className="w-72 p-0">
                <div className="flex h-full flex-col">
                    {/* Header */}
                    <SheetHeader className="border-b border-slate-200 p-4">
                        <SheetTitle asChild>
                            <Logo />
                        </SheetTitle>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto p-4">
                        {/* Organization Switcher */}
                        <div className="mb-6">
                            <OrganizationSwitcher
                                organizations={organizations}
                            />
                        </div>

                        {/* Navigation */}
                        <nav>
                            <ul className="space-y-1">
                                {NAVIGATION_ITEMS.map((item) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <li key={item.name}>
                                            <Link
                                                href={getNavHref(
                                                    item.href,
                                                    currentOrgSlug,
                                                    organizations,
                                                )}
                                                onClick={() =>
                                                    onOpenChange(false)
                                                }
                                                className={cn(
                                                    getNavItemStyles(isActive),
                                                    "p-3",
                                                )}
                                            >
                                                <item.icon
                                                    className={getNavIconStyles(
                                                        isActive,
                                                    )}
                                                />
                                                {item.name}
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </nav>
                    </div>

                    {/* Logout button at bottom */}
                    <div className="border-t border-slate-200 p-4">
                        <Button
                            onClick={handleLogout}
                            variant="ghost"
                            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                            <LogOut className="mr-2 h-5 w-5" />
                            Wyloguj się
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
