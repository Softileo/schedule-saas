import { ScheduleCalendarDnD } from "@/components/features/schedule/views/schedule-calendar-dnd";
import { fetchHolidays } from "@/lib/api/holidays";
import { EmptyState } from "@/components/common/feedback";
import { Briefcase, Plus } from "lucide-react";
import { getDashboardContext } from "@/lib/services/dashboard-context";
import { ROUTES } from "@/lib/constants/routes";

export default async function SchedulePage({
    searchParams,
}: {
    searchParams: Promise<{ org?: string; year?: string; month?: string }>;
}) {
    const params = await searchParams;
    const { supabase, currentOrg } = await getDashboardContext({
        orgSlug: params.org,
    });

    if (!currentOrg) {
        return (
            <EmptyState
                icon={Briefcase}
                title="Grafik"
                description="Utwórz organizację, aby zarządzać grafikami"
                action={{
                    label: "Utwórz organizację",
                    href: ROUTES.USTAWIENIA_ORGANIZACJE,
                    icon: Plus,
                }}
            />
        );
    }

    const organizationId = currentOrg.id;

    // Pobierz rok i miesiąc z parametrów lub użyj bieżących
    const currentDate = new Date();
    const year = params.year
        ? parseInt(params.year)
        : currentDate.getFullYear();
    const month = params.month
        ? parseInt(params.month)
        : currentDate.getMonth() + 1;

    // OPTIMIZED: Parallel queries for independent data
    const [
        holidays,
        { data: employees },
        { data: shiftTemplates },
        { data: orgSettings },
        { data: existingSchedule },
    ] = await Promise.all([
        // Pobierz święta
        fetchHolidays(year),
        // Pobierz pracowników
        supabase
            .from("employees")
            .select("*")
            .eq("organization_id", organizationId)
            .eq("is_active", true)
            .order("last_name", { ascending: true }),
        // Pobierz szablony zmian
        supabase
            .from("shift_templates")
            .select("*")
            .eq("organization_id", organizationId)
            .order("name"),
        // Pobierz ustawienia organizacji (niedziele handlowe)
        supabase
            .from("organization_settings")
            .select("*")
            .eq("organization_id", organizationId)
            .single(),
        // Pobierz grafik dla danego miesiąca
        supabase
            .from("schedules")
            .select("*")
            .eq("organization_id", organizationId)
            .eq("year", year)
            .eq("month", month)
            .single(),
    ]);

    // Create schedule if doesn't exist
    let schedule = existingSchedule;
    if (!schedule) {
        const { data: newSchedule } = await supabase
            .from("schedules")
            .insert({
                organization_id: organizationId,
                year,
                month,
            })
            .select()
            .single();
        schedule = newSchedule;
    }

    // Second batch: queries that depend on first batch results
    const employeeIds = employees?.map((e) => e.id) || [];
    const templateIds = shiftTemplates?.map((t) => t.id) || [];
    // Oblicz ostatni dzień miesiąca (prawidłowo dla lutego, kwietnia, etc.)
    const lastDay = new Date(year, month, 0).getDate();
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const [
        { data: employeePreferences },
        { data: employeeAbsences },
        { data: templateAssignments },
        { data: shifts },
    ] = await Promise.all([
        // Pobierz preferencje pracowników
        employeeIds.length > 0
            ? supabase
                  .from("employee_preferences")
                  .select("*")
                  .in("employee_id", employeeIds)
            : Promise.resolve({ data: [] }),
        // Pobierz nieobecności pracowników dla tego miesiąca
        employeeIds.length > 0
            ? supabase
                  .from("employee_absences")
                  .select("*")
                  .in("employee_id", employeeIds)
                  .lte("start_date", endDate)
                  .gte("end_date", startDate)
            : Promise.resolve({ data: [] }),
        // Pobierz przypisania szablonów
        templateIds.length > 0
            ? supabase
                  .from("shift_template_assignments")
                  .select("*")
                  .in("template_id", templateIds)
            : Promise.resolve({ data: [] }),
        // Pobierz zmiany dla grafiku
        supabase
            .from("shifts")
            .select(
                `
          *,
          employee:employees (
            id,
            first_name,
            last_name,
            employment_type,
            custom_hours
          )
        `,
            )
            .eq("schedule_id", schedule?.id || ""),
    ]);

    return (
        <div className="space-y-4 max-w-400 mx-auto px-0 py-2 min-h-dvh pb-24">
            <ScheduleCalendarDnD
                year={year}
                month={month}
                holidays={holidays}
                employees={employees || []}
                shifts={shifts || []}
                scheduleId={schedule?.id || ""}
                shiftTemplates={shiftTemplates || []}
                organizationSettings={orgSettings}
                employeePreferences={employeePreferences || []}
                employeeAbsences={employeeAbsences || []}
                templateAssignments={templateAssignments || []}
                organizationId={organizationId}
                organizationName={currentOrg.name}
            />
        </div>
    );
}
