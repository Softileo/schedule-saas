import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsTabs } from "@/components/features/settings/settings-tabs";
import { cookies } from "next/headers";
import { OrganizationSettings, ShiftTemplate, Employee } from "@/types";
import { getUserOrganizationsWithRole } from "@/lib/core/organization/utils";
import { ROUTES } from "@/lib/constants/routes";

export default async function SettingsPage({
    searchParams,
}: {
    searchParams: Promise<{ tab?: string; org?: string }>;
}) {
    const params = await searchParams;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect(ROUTES.LOGOWANIE);
    }

    // Get profile
    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    // Get user organizations with ownership info using centralized utility
    const organizations = await getUserOrganizationsWithRole(supabase, user.id);

    // Get current organization from URL param or cookie
    const cookieStore = await cookies();
    const currentOrgSlug = params.org;
    const currentOrgIdFromCookie = cookieStore.get(
        "current_organization"
    )?.value;

    // Znajdź organizację - najpierw z URL, potem z cookie, potem pierwszą dostępną
    const currentOrg = currentOrgSlug
        ? organizations.find((o) => o.slug === currentOrgSlug)
        : organizations.find((o) => o.id === currentOrgIdFromCookie) ||
          organizations[0];

    // Pobierz szablony zmian dla aktualnej organizacji
    let shiftTemplates: ShiftTemplate[] = [];
    let employees: Employee[] = [];

    // Pobierz ustawienia organizacji
    let organizationSettings: OrganizationSettings | null = null;

    if (currentOrg) {
        const { data: templates } = await supabase
            .from("shift_templates")
            .select("*")
            .eq("organization_id", currentOrg.id)
            .order("name");

        shiftTemplates = templates || [];

        const { data: emps } = await supabase
            .from("employees")
            .select("*")
            .eq("organization_id", currentOrg.id)
            .eq("is_active", true)
            .order("first_name");

        employees = emps || [];

        const { data: settings } = await supabase
            .from("organization_settings")
            .select("*")
            .eq("organization_id", currentOrg.id)
            .single();

        organizationSettings = settings;
    }

    const defaultTab = params.tab || "profile";

    return (
        <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">
                    Ustawienia
                </h1>
                <p className="text-slate-600">
                    Zarządzaj kontem i organizacjami
                </p>
            </div>

            <SettingsTabs
                profile={profile}
                organizations={organizations}
                defaultTab={defaultTab}
                userId={user.id}
                shiftTemplates={shiftTemplates}
                employees={employees}
                currentOrganizationId={currentOrg?.id}
                organizationSettings={organizationSettings}
            />
        </div>
    );
}
