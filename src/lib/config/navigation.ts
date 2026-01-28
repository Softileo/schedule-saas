import {
    LayoutDashboard,
    Users,
    CalendarDays,
    Settings,
    Clock,
    type LucideIcon,
} from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";

export interface NavItem {
    name: string;
    href: string;
    icon: LucideIcon;
}

export const NAVIGATION_ITEMS: NavItem[] = [
    { name: "Panel", href: ROUTES.PANEL, icon: LayoutDashboard },
    { name: "Grafik", href: ROUTES.GRAFIK, icon: CalendarDays },
    { name: "Pracownicy", href: ROUTES.PRACOWNICY, icon: Users },
    { name: "Zmiany", href: ROUTES.ZMIANY, icon: Clock },
    { name: "Ustawienia", href: ROUTES.USTAWIENIA, icon: Settings },
];

/**
 * Generuje href z parametrem organizacji
 */
export function getNavHref(
    baseHref: string,
    currentOrgSlug: string | null,
    organizations: { slug: string }[]
): string {
    if (currentOrgSlug) {
        return `${baseHref}?org=${currentOrgSlug}`;
    }
    if (organizations.length > 0) {
        return `${baseHref}?org=${organizations[0].slug}`;
    }
    return baseHref;
}
