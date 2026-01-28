/**
 * Centralizacja stylów nawigacji
 * Używane w Sidebar, mobile-sidebar i innych komponentach nawigacyjnych
 */

import { cn } from "@/lib/utils";

/**
 * Style dla elementu nawigacji (link/przycisk)
 */
export function getNavItemStyles(isActive: boolean): string {
    return cn(
        "group flex items-center gap-x-3 rounded-md p-2 text-sm font-medium leading-6 transition-colors",
        isActive
            ? "bg-slate-100 text-primary"
            : "text-slate-700 hover:bg-slate-50"
    );
}

/**
 * Style dla ikony w elemencie nawigacji
 */
export function getNavIconStyles(isActive: boolean): string {
    return cn(
        "h-5 w-5 shrink-0",
        isActive ? "text-primary" : "text-slate-400 group-hover:text-primary"
    );
}

/**
 * Style dla elementu organizacji w liście
 */
export function getOrgItemStyles(isActive: boolean): string {
    return cn(
        "group flex items-center gap-x-3 rounded-md p-2 text-sm font-medium leading-6 transition-colors cursor-pointer",
        isActive
            ? "bg-primary/5 text-primary"
            : "text-slate-600 hover:bg-slate-50"
    );
}
