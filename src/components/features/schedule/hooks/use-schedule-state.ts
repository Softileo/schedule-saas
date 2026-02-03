import { useState, useMemo, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { sortShiftTemplatesByTime } from "@/lib/core/schedule/utils";
import { getEmployeeFullName } from "@/lib/core/employees/utils";
import { useUnsavedChanges } from "@/lib/contexts/unsaved-changes-context";
import { useLocalShifts } from "@/lib/hooks/use-local-shifts";
import { useRestViolations } from "@/lib/hooks/use-rest-violations";
import { useScheduleViolations } from "@/lib/hooks/use-schedule-violations";

import type {
    Employee,
    ShiftTemplate,
    PublicHoliday,
    OrganizationSettings,
    EmployeeAbsence,
    LocalShift,
    ShiftFromDB,
} from "@/types";

interface UseScheduleStateProps {
    year: number;
    month: number;
    holidays: PublicHoliday[];
    employees: Employee[];
    initialShifts: ShiftFromDB[];
    scheduleId: string;
    shiftTemplates: ShiftTemplate[];
    organizationSettings: OrganizationSettings | null;
    initialAbsences: EmployeeAbsence[];
}

export function useScheduleState({
    year,
    month,
    holidays,
    employees,
    initialShifts,
    scheduleId,
    shiftTemplates,
    organizationSettings,
    initialAbsences,
}: UseScheduleStateProps) {
    const { setHasUnsavedChanges } = useUnsavedChanges();

    // Lokalny stan nieobecności
    const [employeeAbsences, setEmployeeAbsences] =
        useState<EmployeeAbsence[]>(initialAbsences);

    // Synchronizuj stan z nowymi danymi gdy zmienia się miesiąc/rok
    useEffect(() => {
        console.log(
            "🔄 Syncing employeeAbsences with initialAbsences:",
            initialAbsences.length,
            "items",
        );
        setEmployeeAbsences(initialAbsences);
    }, [initialAbsences]);

    // Debug: track absences state changes
    useEffect(() => {
        console.log(
            "🔵 use-schedule-state: employeeAbsences changed:",
            employeeAbsences.length,
            "items",
        );
    }, [employeeAbsences]);

    // Filtrowanie pracowników
    const [filteredEmployeeIds, setFilteredEmployeeIds] = useState<Set<string>>(
        new Set(),
    );

    // Sortuj szablony po godzinie startu
    const sortedShiftTemplates = useMemo(
        () => sortShiftTemplatesByTime(shiftTemplates),
        [shiftTemplates],
    );

    // Mapa świąt
    const holidaysMap = useMemo(() => {
        const map = new Map<string, PublicHoliday>();
        holidays.forEach((h) => map.set(h.date, h));
        return map;
    }, [holidays]);

    // Funkcja do odświeżenia nieobecności z bazy
    const refreshAbsences = useCallback(async () => {
        try {
            const employeeIds = employees.map((e) => e.id);
            if (employeeIds.length === 0) {
                console.log("⚠️ No employees, clearing absences");
                setEmployeeAbsences([]);
                return;
            }

            // Oblicz ostatni dzień miesiąca (prawidłowo dla lutego, kwietnia, etc.)
            const lastDay = new Date(year, month, 0).getDate();
            const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
            const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

            const supabase = createClient();

            console.log("🔄 refreshAbsences START:", {
                employeeIds: employeeIds.length,
                startDate,
                endDate,
            });

            const { data, error } = await supabase
                .from("employee_absences")
                .select("*")
                .in("employee_id", employeeIds)
                .lte("start_date", endDate)
                .gte("end_date", startDate);

            console.log("🔄 refreshAbsences COMPLETE:", {
                absencesCount: data?.length || 0,
                hasError: !!error,
                errorDetails: error ? JSON.stringify(error) : null,
                data,
            });

            if (error) {
                console.error("❌ Error refreshing absences:", {
                    error,
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code,
                });
                // Nie czyścimy stanu - zostawiamy poprzednie dane
                return;
            }

            if (data) {
                console.log(
                    "✅ Setting employeeAbsences state with",
                    data.length,
                    "items",
                );
                // Tworzymy nową tablicę z nowymi obiektami aby wymusić re-render
                setEmployeeAbsences(data.map((item) => ({ ...item })));
            } else {
                // Brak danych (nie błąd) - ustaw pustą tablicę
                console.log("ℹ️ No absences found, setting empty array");
                setEmployeeAbsences([]);
            }
        } catch (err) {
            console.error("❌ Exception in refreshAbsences:", err);
        }
    }, [employees, year, month]);

    // Hook do zarządzania stanem zmian
    const {
        localShifts,
        activeShifts,
        hasUnsavedChanges,
        employeeHoursMap,
        employeeAbsenceInfo,
        removeShift,
        updateShift,
        clearAllShifts,
        refreshFromDB,
        saveAll,
        setLocalShifts,
    } = useLocalShifts({
        scheduleId,
        initialShifts,
        employees,
        holidays,
        employeeAbsences,
        year,
        month,
        organizationSettings,
    });

    // Hook do wykrywania wszystkich naruszeń
    const violations = useScheduleViolations({
        employees,
        activeShifts,
        absences: employeeAbsences,
        shiftTemplates,
    });

    // Hook do sprawdzania naruszeń 11h przy dodawaniu zmian
    const { checkViolationForCell } = useRestViolations({
        employees,
        activeShifts,
    });

    // Synchronizuj stan z globalnym kontekstem
    useEffect(() => {
        setHasUnsavedChanges(hasUnsavedChanges);
    }, [hasUnsavedChanges, setHasUnsavedChanges]);

    // Dodaj zmianę (dla mobile/compact view)
    const handleAddShift = useCallback(
        (shift: LocalShift) => {
            setLocalShifts((prev) => [...prev, shift]);
        },
        [setLocalShifts],
    );

    // Funkcja do dodawania zmiany z szablonu (dla widoku mobilnego)
    const handleAddShiftFromTemplate = useCallback(
        (employeeId: string, date: string) => {
            const employee = employees.find((e) => e.id === employeeId);
            if (!employee) return false;

            const existingShift = activeShifts.find(
                (s) => s.employee_id === employeeId && s.date === date,
            );
            if (existingShift) {
                toast.warning(
                    `${getEmployeeFullName(employee)} już pracuje tego dnia!`,
                );
                return false;
            }

            return true; // Zwracamy true, jeśli walidacja przeszła, komponent wywołujący musi dodać zmianę
        },
        [employees, activeShifts],
    );

    return {
        // Dane
        employeeAbsences,
        filteredEmployeeIds,
        sortedShiftTemplates,
        holidaysMap,
        localShifts,
        activeShifts,
        employeeHoursMap,
        employeeAbsenceInfo,
        violations,

        // Akcje / Settery
        setFilteredEmployeeIds,
        setEmployeeAbsences,
        refreshAbsences,
        removeShift,
        updateShift,
        clearAllShifts,
        refreshFromDB: async () => {
            const shifts = await refreshFromDB();
            return shifts;
        },
        saveAll,
        setLocalShifts,
        handleAddShift,
        handleAddShiftFromTemplate,
        checkViolationForCell,
    };
}
