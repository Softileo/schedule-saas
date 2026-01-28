import { Clock, Plus } from "lucide-react";
import { getDashboardContext } from "@/lib/services/dashboard-context";
import { ROUTES } from "@/lib/constants/routes";
import { EmptyState } from "@/components/common/feedback";
import { ShiftTemplatesList } from "@/components/features/settings/shift-templates-list";

import { OpeningHours } from "@/types";
import { OpeningHoursCard } from "@/components/features/schedule/opening-hours-card";

export default async function ShiftTemplatesPage({
    searchParams,
}: {
    searchParams: Promise<{ org?: string }>;
}) {
    const params = await searchParams;
    const { supabase, currentOrg } = await getDashboardContext({
        orgSlug: params.org,
    });

    if (!currentOrg) {
        return (
            <div className="min-h-screen bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <EmptyState
                        icon={Clock}
                        title="Brak organizacji"
                        description="Utwórz organizację, aby zarządzać szablonami zmian"
                        action={{
                            label: "Utwórz organizację",
                            href: ROUTES.USTAWIENIA_ORGANIZACJE,
                            icon: Plus,
                        }}
                        card
                        size="lg"
                    />
                </div>
            </div>
        );
    }

    // Pobierz szablony zmian
    const { data: templates } = await supabase
        .from("shift_templates")
        .select("*")
        .eq("organization_id", currentOrg.id)
        .order("start_time", { ascending: true });

    // Pobierz pracowników
    const { data: employees } = await supabase
        .from("employees")
        .select("*")
        .eq("organization_id", currentOrg.id)
        .eq("is_active", true)
        .order("first_name");

    // Pobierz godziny otwarcia
    const { data: settings } = await supabase
        .from("organization_settings")
        .select("opening_hours")
        .eq("organization_id", currentOrg.id)
        .single();

    return (
        <div className="min-h-screen">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
                <ShiftTemplatesList
                    templates={templates || []}
                    organizationId={currentOrg.id}
                    employees={employees || []}
                >
                    <OpeningHoursCard
                        initialData={
                            (settings?.opening_hours as unknown as OpeningHours) ||
                            null
                        }
                    />
                </ShiftTemplatesList>
            </div>
        </div>
    );
}
