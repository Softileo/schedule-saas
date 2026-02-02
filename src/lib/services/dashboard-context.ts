/**
 * =============================================================================
 * DASHBOARD CONTEXT - Centralna funkcja do pobierania kontekstu dashboardu
 * =============================================================================
 *
 * Upraszcza pobieranie user + organizacji we wszystkich stronach dashboardu.
 * Eliminuje duplikację kodu auth-check + pobieranie organizacji.
 */

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient, createServiceClient } from "@/lib/supabase/server";
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
    options: GetDashboardContextOptions = {},
): Promise<DashboardContext> {
    const { orgSlug, requireOrg = false } = options;

    const supabase = await createClient();

    // Sprawdź czy admin jest w trybie impersonation
    const cookieStore = await cookies();
    const isAdminImpersonating =
        cookieStore.get("admin-impersonation")?.value === "true";
    const adminImpersonationOrgId = cookieStore.get(
        "admin-impersonation-org",
    )?.value;

    // Jeśli admin impersonuje, pobierz organizację i symuluj dostęp
    if (isAdminImpersonating && adminImpersonationOrgId) {
        // Użyj service client aby ominąć RLS
        const serviceSupabase = await createServiceClient();
        
        // Pobierz organizację do impersonacji
        const { data: impersonatedOrg } = await serviceSupabase
            .from("organizations")
            .select("id, name, slug, owner_id, created_at, updated_at")
            .eq("id", adminImpersonationOrgId)
            .single();

        if (impersonatedOrg) {
            // Utwórz fikcyjnego usera (nie ma znaczenia, kto jest zalogowany)
            const fakeUser = {
                id: impersonatedOrg.owner_id,
            } as User;

            // Pobierz profil właściciela organizacji
            const { data: ownerProfile } = await serviceSupabase
                .from("profiles")
                .select(
                    "id, full_name, onboarding_completed, avatar_url, email, created_at, updated_at, user_feedback",
                )
                .eq("id", impersonatedOrg.owner_id)
                .single();

            // Pobierz wszystkie organizacje właściciela
            const organizations = await getUserOrganizationsWithRole(
                serviceSupabase,
                impersonatedOrg.owner_id,
            );

            // Znajdź organizację do impersonacji
            const currentOrg =
                organizations.find((o) => o.id === adminImpersonationOrgId) ||
                null;

            return {
                supabase: serviceSupabase, // Zwróć service client dla dalszych operacji
                user: fakeUser,
                profile: ownerProfile,
                currentOrg,
                organizations,
            };
        }
    }

    // Normalne zachowanie bez impersonation
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
            "id, full_name, onboarding_completed, avatar_url, email, created_at, updated_at, user_feedback",
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
