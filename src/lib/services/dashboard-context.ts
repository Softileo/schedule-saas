/**
 * =============================================================================
 * DASHBOARD CONTEXT - Centralna funkcja do pobierania kontekstu dashboardu
 * =============================================================================
 *
 * Upraszcza pobieranie user + organizacji we wszystkich stronach dashboardu.
 * Eliminuje duplikację kodu auth-check + pobieranie organizacji.
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserOrganizationsWithRole } from "@/lib/core/organization/utils";
import { ROUTES } from "@/lib/constants/routes";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { OrganizationWithRole, Profile } from "@/types";

export interface DashboardContext {
    supabase: SupabaseClient<Database>;
    user: User;
    profile: Profile | null;
    currentOrg: OrganizationWithRole | null;
    organizations: OrganizationWithRole[];
}

interface GetDashboardContextOptions {
    /** Slug organizacji z URL params */
    orgSlug?: string;
    /** Czy wymagana jest organizacja (default: false) */
    requireOrg?: boolean;
}

/**
 * Pobiera pełny kontekst dashboardu: user, profil, organizacje, aktualną organizację.
 * Automatycznie robi redirect jeśli user niezalogowany.
 *
 * @example
 * ```tsx
 * export default async function SchedulePage({ searchParams }) {
 *   const params = await searchParams;
 *   const { supabase, user, currentOrg } = await getDashboardContext({
 *     orgSlug: params.org,
 *   });
 *
 *   if (!currentOrg) {
 *     return <EmptyState ... />;
 *   }
 *
 *   // Używaj supabase, user, currentOrg...
 * }
 * ```
 */
export async function getDashboardContext(
    options: GetDashboardContextOptions = {}
): Promise<DashboardContext> {
    const { orgSlug, requireOrg = false } = options;

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Redirect niezalogowanych do logowania
    if (!user) {
        redirect(ROUTES.LOGOWANIE);
    }

    // Pobierz profil użytkownika
    const { data: profile } = await supabase
        .from("profiles")
        .select(
            "id, full_name, onboarding_completed, avatar_url, email, created_at, updated_at, user_feedback"
        )
        .eq("id", user.id)
        .single();

    // Pobierz organizacje użytkownika (z rolami)
    const organizations = await getUserOrganizationsWithRole(supabase, user.id);

    // Znajdź aktualną organizację
    const currentOrg =
        organizations.find((o) => o.slug === orgSlug) ||
        organizations[0] ||
        null;

    // Logika sprawdzania dostępu / onboardingu
    const hasOrganizations = organizations.length > 0;
    const onboardingCompleted = profile?.onboarding_completed ?? false;

    // Jeśli wymagamy organizacji, a nie ma ani organizacji ani onboardingu, redirect
    if (
        requireOrg &&
        !currentOrg &&
        !hasOrganizations &&
        !onboardingCompleted
    ) {
        redirect(ROUTES.KONFIGURACJA);
    }

    // Jeśli użytkownik jest zalogowany ale nie ma organizacji i nie skończył onboardingu
    // to też może wymagać przekierowania (tak jak w oryginalnym layout)
    if (!hasOrganizations && !onboardingCompleted) {
        redirect(ROUTES.KONFIGURACJA);
    }

    return {
        supabase,
        user,
        profile,
        currentOrg,
        organizations,
    };
}
