import { NextResponse } from "next/server";
import {
    checkUserAuth,
    verifyOrganizationAccess,
} from "@/lib/api/auth-helpers";
import { logger } from "@/lib/utils/logger";
import type { EmployeePreferences, EmployeeAbsence } from "@/types";

export async function GET(request: Request) {
    try {
        // AUTH: Sprawdź czy użytkownik jest zalogowany
        const authResult = await checkUserAuth();
        if (authResult instanceof NextResponse) {
            return authResult;
        }
        const [user, supabase] = authResult;

        const { searchParams } = new URL(request.url);
        const organizationId = searchParams.get("organizationId");
        const year = searchParams.get("year");
        const month = searchParams.get("month");

        if (!organizationId) {
            return NextResponse.json(
                { error: "Missing organizationId" },
                { status: 400 },
            );
        }

        // SECURITY: Sprawdź czy użytkownik ma dostęp do tej organizacji
        const accessError = await verifyOrganizationAccess(
            supabase,
            user.id,
            organizationId,
        );
        if (accessError) {
            return accessError;
        }

        // Pobierz pracowników organizacji (pełne dane)
        const { data: employees } = await supabase
            .from("employees")
            .select("*")
            .eq("organization_id", organizationId)
            .eq("is_active", true);

        const employeeIds = employees?.map((e) => e.id) || [];

        // Pobierz szablony zmian
        const { data: templates } = await supabase
            .from("shift_templates")
            .select("*")
            .eq("organization_id", organizationId)
            .order("start_time", { ascending: true });

        if (employeeIds.length === 0) {
            return NextResponse.json({
                employees: employees || [],
                templates: templates || [],
                preferences: {},
                absences: {},
            });
        }

        // Pobierz preferencje
        const { data: preferencesData } = await supabase
            .from("employee_preferences")
            .select("*")
            .in("employee_id", employeeIds);

        // Pobierz nieobecności (filtruj po miesiącu jeśli podano)
        let absencesQuery = supabase
            .from("employee_absences")
            .select("*")
            .eq("organization_id", organizationId);

        if (year && month) {
            const monthStart = `${year}-${month.padStart(2, "0")}-01`;
            const lastDay = new Date(Number(year), Number(month), 0).getDate();
            const monthEnd = `${year}-${month.padStart(2, "0")}-${lastDay}`;

            // Nieobecności, które nachodzą na ten miesiąc
            absencesQuery = absencesQuery
                .lte("start_date", monthEnd)
                .gte("end_date", monthStart);
        }

        const { data: absencesData } = await absencesQuery;

        // Grupuj preferencje po pracowniku
        const preferences: Record<string, EmployeePreferences | null> = {};
        for (const emp of employeeIds) {
            preferences[emp] =
                preferencesData?.find((p) => p.employee_id === emp) || null;
        }

        // Grupuj nieobecności po pracowniku
        const absences: Record<string, EmployeeAbsence[]> = {};
        for (const emp of employeeIds) {
            absences[emp] =
                absencesData?.filter((a) => a.employee_id === emp) || [];
        }

        return NextResponse.json({
            employees: employees || [],
            templates: templates || [],
            preferences,
            absences,
        });
    } catch (error) {
        logger.error("Błąd pobierania danych pracowników:", error);
        return NextResponse.json({ error: "Wystąpił błąd" }, { status: 500 });
    }
}
