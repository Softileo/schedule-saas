"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { saveShiftsAction } from "@/lib/actions/schedule-actions";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/utils/logger";
import {
    mapShiftFieldsWithoutId,
    mapShiftFieldsWithId,
    toLocalShift,
} from "@/lib/utils/shift-mappers";
import {
    calculateEmployeesScheduledHours,
    calculateEmployeesAbsenceInfo,
} from "@/lib/services/schedule-calculator.service";
import type {
    Employee,
    PublicHoliday,
    LocalShift,
    ShiftFromDB,
    EmployeeAbsence,
    OrganizationSettings,
} from "@/types";

// Re-export types for backward compatibility
export type { LocalShift, ShiftFromDB } from "@/types";

interface UseLocalShiftsProps {
    scheduleId: string;
    initialShifts: ShiftFromDB[];
    employees: Employee[];
    holidays: PublicHoliday[];
    employeeAbsences: EmployeeAbsence[];
    year: number;
    month: number;
    organizationSettings?: OrganizationSettings | null;
}

export function useLocalShifts({
    scheduleId,
    initialShifts,
    employees,
    holidays,
    employeeAbsences,
    year,
    month,
    organizationSettings,
}: UseLocalShiftsProps) {
    const supabase = createClient();
    const prevKeyRef = useRef<string>(`${scheduleId}-${year}-${month}`);
    const [isSaving, setIsSaving] = useState(false);

    // Stan lokalnych zmian
    const [localShifts, setLocalShifts] = useState<LocalShift[]>(() =>
        initialShifts.map((s) => ({
            ...s,
            status: "unchanged" as const,
        })),
    );

    // Reset przy zmianie miesiąca/roku/scheduleId (bez initialShifts w deps!)
    useEffect(() => {
        const currentKey = `${scheduleId}-${year}-${month}`;
        if (prevKeyRef.current !== currentKey) {
            prevKeyRef.current = currentKey;
            setLocalShifts(
                initialShifts.map((s) => ({
                    ...s,
                    status: "unchanged" as const,
                })),
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scheduleId, year, month]);

    // Aktywne zmiany (nie usunięte)
    const activeShifts = useMemo(
        () => localShifts.filter((s) => s.status !== "deleted"),
        [localShifts],
    );

    // Czy są niezapisane zmiany
    const hasUnsavedChanges = useMemo(
        () => localShifts.some((s) => s.status !== "unchanged"),
        [localShifts],
    );

    // Oblicz godziny dla każdego pracownika (NIE pomniejszamy o nieobecności w wyświetlaniu)
    const employeeHoursMap = useMemo(() => {
        return calculateEmployeesScheduledHours(
            employees,
            activeShifts,
            year,
            month,
            holidays,
        );
    }, [employees, activeShifts, year, month, holidays]);

    // Oblicz informacje o nieobecnościach dla każdego pracownika (do wyświetlenia etykiety)
    const employeeAbsenceInfo = useMemo(() => {
        return calculateEmployeesAbsenceInfo(
            employees,
            employeeAbsences,
            year,
            month,
            holidays,
            organizationSettings,
        );
    }, [
        employees,
        year,
        month,
        holidays,
        employeeAbsences,
        organizationSettings,
    ]);

    // Remove shift
    const removeShift = useCallback((shiftId: string) => {
        setLocalShifts((prev) =>
            prev.map((s) => {
                if (s.id !== shiftId) return s;
                if (s.status === "new") {
                    return { ...s, status: "deleted" as const };
                }
                return { ...s, status: "deleted" as const };
            }),
        );
    }, []);

    // Edit shift
    const updateShift = useCallback(
        (shiftId: string, updates: Partial<LocalShift>) => {
            setLocalShifts((prev) =>
                prev.map((s) => {
                    if (s.id !== shiftId) return s;
                    return {
                        ...s,
                        ...updates,
                        status: s.status === "new" ? "new" : "modified",
                    };
                }),
            );
        },
        [],
    );

    // Clear entire schedule
    const clearAllShifts = useCallback(() => {
        setLocalShifts([]);
    }, []);

    // Apply generated shifts (AI)
    const applyGeneratedShifts = useCallback(
        (
            generatedShifts: Array<{
                employee_id: string;
                date: string;
                start_time: string;
                end_time: string;
                break_minutes: number;
            }>,
            mode: "fast" | "balanced",
        ) => {
            logger.log("applyGeneratedShifts called with:", {
                shiftsCount: generatedShifts.length,
                mode,
            });

            const validEmployeeIds = new Set(employees.map((e) => e.id));
            const validShifts = generatedShifts.filter((shift) => {
                if (!validEmployeeIds.has(shift.employee_id)) {
                    logger.warn(
                        `Pominięto zmianę - nieznany pracownik: ${shift.employee_id}`,
                    );
                    return false;
                }
                return true;
            });

            const timestamp = Date.now();
            const newShifts: LocalShift[] = validShifts.map((shift, index) => ({
                id: `ai-${timestamp}-${index}-${shift.employee_id.slice(0, 8)}`,
                schedule_id: scheduleId,
                employee_id: shift.employee_id,
                date: shift.date,
                start_time: shift.start_time,
                end_time: shift.end_time,
                break_minutes: shift.break_minutes,
                notes: null,
                color: null,
                status: "unchanged" as const,
            }));

            setLocalShifts(newShifts);

            toast.success(`Wygenerowano ${newShifts.length} zmian`, {
                description:
                    mode === "fast"
                        ? "Grafik wygenerowany w trybie szybkim"
                        : "Grafik wygenerowany w trybie zbalansowanym",
            });

            return newShifts.length;
        },
        [scheduleId, employees],
    );

    // Odśwież z bazy danych
    const refreshFromDB = useCallback(async () => {
        if (!scheduleId) return;

        const { data, error } = await supabase
            .from("shifts")
            .select("*")
            .eq("schedule_id", scheduleId);

        if (error) {
            logger.error("Błąd odświeżania zmian:", error);
            return;
        }

        if (data) {
            setLocalShifts(data.map(toLocalShift));
        }
    }, [scheduleId, supabase]);

    // Zapisz wszystko do bazy
    const saveAll = useCallback(async (): Promise<void> => {
        if (!scheduleId) {
            toast.error("Brak identyfikatora grafiku");
            logger.error("scheduleId jest pusty!");
            return;
        }

        setIsSaving(true);
        logger.log("=== ROZPOCZYNAM ZAPIS (Server Action) ===");

        try {
            const toInsert = localShifts
                .filter((s) => s.status === "new")
                .map(mapShiftFieldsWithoutId);

            const toUpdate = localShifts
                .filter((s) => s.status === "modified")
                .map(mapShiftFieldsWithId);

            const toDelete = localShifts
                .filter(
                    (s) => s.status === "deleted" && !s.id.startsWith("temp-"),
                )
                .map((s) => s.id);

            const result = await saveShiftsAction({
                scheduleId,
                toInsert,
                toUpdate,
                toDelete,
            });

            if (result.error) {
                throw new Error(result.error);
            }

            if (result.fieldErrors) {
                const fields = Object.keys(result.fieldErrors).join(", ");
                throw new Error(`Błędy walidacji: ${fields}`);
            }

            const refreshedShifts = result.data || [];

            setLocalShifts(
                refreshedShifts.map((s) => ({
                    ...s,
                    status: "unchanged" as const,
                })),
            );

            logger.log("=== ZAPIS ZAKOŃCZONY ===");
            toast.success("Grafik został zapisany");
        } catch (error: unknown) {
            logger.error("Błąd zapisu:", error);
            const errorMessage =
                error instanceof Error ? error.message : JSON.stringify(error);
            toast.error(`Błąd: ${errorMessage}`);
        } finally {
            setIsSaving(false);
        }
    }, [localShifts, scheduleId]);

    return {
        localShifts,
        activeShifts,
        hasUnsavedChanges,
        employeeHoursMap,
        employeeAbsenceInfo,
        isSaving,
        removeShift,
        updateShift,
        clearAllShifts,
        applyGeneratedShifts,
        refreshFromDB,
        saveAll,
        setLocalShifts,
    };
}
