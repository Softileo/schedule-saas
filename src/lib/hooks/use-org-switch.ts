"use client";

import { useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCurrentOrgSlug } from "./use-current-org-slug";
import type { OrganizationWithRole } from "@/types";

interface UseOrgSwitchOptions {
    organizations: OrganizationWithRole[];
    /** Czy ustawiać cookie przy zmianie organizacji */
    setCookie?: boolean;
    /** Callback po zmianie organizacji */
    onSwitch?: (slug: string) => void;
    /** Callback potwierdzenia przed zmianą (np. dla unsaved changes) */
    confirmNavigation?: (callback: () => void) => void;
}

interface UseOrgSwitchReturn {
    /** Aktualnie wybrana organizacja */
    currentOrg: OrganizationWithRole | undefined;
    /** Slug aktualnej organizacji */
    currentOrgSlug: string | null;
    /** Lista wszystkich organizacji */
    organizations: OrganizationWithRole[];
    /** Zmień aktualną organizację */
    switchOrganization: (slug: string) => void;
    /** Czy podana organizacja jest aktualnie wybrana */
    isCurrentOrg: (org: OrganizationWithRole) => boolean;
}

/**
 * Hook do zarządzania przełączaniem organizacji
 *
 * @example
 * // Proste użycie
 * const { currentOrg, switchOrganization, isCurrentOrg } = useOrgSwitch({ organizations });
 *
 * // Z potwierdzeniem (dla unsaved changes)
 * const { switchOrganization } = useOrgSwitch({
 *   organizations,
 *   confirmNavigation: (callback) => {
 *     if (hasUnsavedChanges) {
 *       showConfirmDialog().then(() => callback());
 *     } else {
 *       callback();
 *     }
 *   }
 * });
 */
export function useOrgSwitch({
    organizations,
    setCookie = true,
    onSwitch,
    confirmNavigation,
}: UseOrgSwitchOptions): UseOrgSwitchReturn {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const currentOrgSlug = useCurrentOrgSlug();

    // Znajdź aktualną organizację
    const currentOrg =
        organizations.find((o) => o.slug === currentOrgSlug) ||
        organizations[0];

    // Ustaw cookie gdy organizacja się zmieni
    useEffect(() => {
        if (setCookie && currentOrg) {
            document.cookie = `current_organization=${currentOrg.id}; path=/; max-age=31536000`;
        }
    }, [setCookie, currentOrg]);

    // Zmień organizację
    const switchOrganization = useCallback(
        (slug: string) => {
            const doSwitch = () => {
                // Zachowaj parametry year, month, tab
                const newParams = new URLSearchParams();
                newParams.set("org", slug);

                const year = searchParams.get("year");
                const month = searchParams.get("month");
                const tab = searchParams.get("tab");

                if (year) newParams.set("year", year);
                if (month) newParams.set("month", month);
                if (tab) newParams.set("tab", tab);

                router.push(`${pathname}?${newParams.toString()}`);
                router.refresh();
                onSwitch?.(slug);
            };

            if (confirmNavigation) {
                confirmNavigation(doSwitch);
            } else {
                doSwitch();
            }
        },
        [router, pathname, searchParams, onSwitch, confirmNavigation]
    );

    // Sprawdź czy organizacja jest aktualnie wybrana
    const isCurrentOrg = useCallback(
        (org: OrganizationWithRole) => {
            return (
                org.slug === currentOrgSlug ||
                (!currentOrgSlug && org === organizations[0])
            );
        },
        [currentOrgSlug, organizations]
    );

    return {
        currentOrg,
        currentOrgSlug,
        organizations,
        switchOrganization,
        isCurrentOrg,
    };
}
