"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    getNavItemStyles,
    getNavIconStyles,
} from "@/components/features/layout/nav-styles";
import { LogOut, User, Settings } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { OrganizationWithRole, Profile } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { useUnsavedChanges } from "@/lib/contexts/unsaved-changes-context";
import { NAVIGATION_ITEMS, getNavHref } from "@/lib/config/navigation";
import { ROUTES } from "@/lib/constants/routes";
import { useOrgSwitch } from "@/lib/hooks";
import Link from "next/link";
import { OrganizationSwitcher } from "./organization-switcher";

interface SidebarProps {
    organizations: OrganizationWithRole[];
    user?: Profile | null;
}

export function Sidebar({ organizations, user }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { confirmNavigation } = useUnsavedChanges();
    const { currentOrgSlug } = useOrgSwitch({
        organizations,
        confirmNavigation,
    });

    // Sidebar jest zawsze schowany, rozwija się przy hover
    const [isHovered, setIsHovered] = useState(false);
    // Blokuj zwijanie gdy dropdown jest otwarty
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const isCollapsed = !isHovered && !isDropdownOpen;

    async function handleLogout() {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push(ROUTES.LOGOWANIE);
        router.refresh();
    }

    const initials =
        user?.full_name
            ?.split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase() ||
        user?.email?.[0].toUpperCase() ||
        "U";

    const handleNavClick = (
        e: React.MouseEvent<HTMLAnchorElement>,
        href: string,
    ) => {
        e.preventDefault();
        confirmNavigation(() => {
            router.push(href);
        });
    };

    return (
        <div
            className={cn(
                "hidden lg:fixed z-999 lg:inset-y-0 lg:z-50 lg:flex lg:flex-col transition-all duration-200 ease-out",
                isCollapsed ? "lg:w-16" : "lg:w-72",
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="flex grow z-999 flex-col gap-y-5 overflow-hidden border-r border-slate-200 bg-white pb-4 px-3">
                <div className="flex h-16 shrink-0 items-center">
                    <Logo showText={!isCollapsed} />
                </div>

                {/* Organization Switcher */}
                <OrganizationSwitcher
                    organizations={organizations}
                    variant="sidebar"
                    collapsed={isCollapsed}
                    onOpenChange={setIsDropdownOpen}
                />

                {/* Navigation */}
                <nav className="flex flex-1 flex-col z-999">
                    <ul role="list" className="flex flex-1 flex-col gap-y-7">
                        <li>
                            <ul role="list" className="space-y-1">
                                {NAVIGATION_ITEMS.map((item) => {
                                    const isActive = pathname === item.href;
                                    const href = getNavHref(
                                        item.href,
                                        currentOrgSlug,
                                        organizations,
                                    );

                                    const linkContent = (
                                        <Link
                                            href={href}
                                            onClick={(e) =>
                                                handleNavClick(e, href)
                                            }
                                            className={cn(
                                                getNavItemStyles(isActive),
                                                "cursor-pointer",
                                            )}
                                        >
                                            <item.icon
                                                className={getNavIconStyles(
                                                    isActive,
                                                )}
                                            />
                                            <span
                                                className={cn(
                                                    "ml-1 whitespace-nowrap transition-all duration-200 ease-out overflow-hidden",
                                                    isCollapsed
                                                        ? "opacity-0 w-0"
                                                        : "opacity-100 w-auto",
                                                )}
                                            >
                                                {item.name}
                                            </span>
                                        </Link>
                                    );

                                    return (
                                        <li key={item.name}>{linkContent}</li>
                                    );
                                })}
                            </ul>
                        </li>

                        {/* User profile at the bottom */}
                        <li className="mt-auto">
                            <DropdownMenu onOpenChange={setIsDropdownOpen}>
                                <DropdownMenuTrigger asChild>
                                    <button className="flex items-center rounded-md p-2 text-sm font-medium leading-6 text-slate-700 hover:bg-slate-50 transition-colors w-full">
                                        <Avatar className="h-8 w-8 shrink-0">
                                            <AvatarImage
                                                src={
                                                    user?.avatar_url ||
                                                    undefined
                                                }
                                                alt={user?.full_name || "User"}
                                            />
                                            <AvatarFallback className="text-xs">
                                                {initials}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div
                                            className={cn(
                                                "ml-3 flex flex-col items-start text-left min-w-0 transition-all duration-200 ease-out overflow-hidden",
                                                isCollapsed
                                                    ? "opacity-0 w-0"
                                                    : "opacity-100 w-auto",
                                            )}
                                        >
                                            <span className="truncate font-medium whitespace-nowrap">
                                                {user?.full_name ||
                                                    "Użytkownik"}
                                            </span>
                                            <span className="truncate text-xs text-slate-500 whitespace-nowrap">
                                                {user?.email}
                                            </span>
                                        </div>
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="start"
                                    side="top"
                                    sideOffset={4}
                                    className="w-56"
                                >
                                    <DropdownMenuItem
                                        onClick={() =>
                                            confirmNavigation(() =>
                                                router.push(
                                                    `${ROUTES.USTAWIENIA}?tab=profile`,
                                                ),
                                            )
                                        }
                                        className="cursor-pointer"
                                    >
                                        <User className="mr-2 h-4 w-4" />
                                        Profil
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() =>
                                            confirmNavigation(() =>
                                                router.push(ROUTES.USTAWIENIA),
                                            )
                                        }
                                        className="cursor-pointer"
                                    >
                                        <Settings className="mr-2 h-4 w-4" />
                                        Ustawienia
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={handleLogout}
                                        className="cursor-pointer text-red-600"
                                    >
                                        <LogOut className="mr-2 h-4 w-4" />
                                        Wyloguj się
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </li>
                    </ul>
                </nav>
            </div>
        </div>
    );
}
