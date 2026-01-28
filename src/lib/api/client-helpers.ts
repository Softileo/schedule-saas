/**
 * =============================================================================
 * CLIENT-SIDE API HELPERS
 * =============================================================================
 *
 * Funkcje pomocnicze dla operacji na danych z poziomu client components.
 * Używają createClient() z @/lib/supabase/client.
 *
 * NOTE: Repositories są server-side only (używają createClient z /server).
 * Te helpery są dla client components.
 */

import { createClient } from "@/lib/supabase/client";
import type { Employee, EmployeeAbsence, ShiftTemplate } from "@/types";

// =============================================================================
// EMPLOYEE HELPERS
// =============================================================================

/**
 * Pobiera kolory używane przez pracowników w organizacji (client-side)
 */
export async function getUsedEmployeeColors(
    organizationId: string
): Promise<string[]> {
    const supabase = createClient();

    const { data } = await supabase
        .from("employees")
        .select("color")
        .eq("organization_id", organizationId);

    return (data || []).map((e) => e.color).filter(Boolean) as string[];
}

/**
 * Tworzy nowego pracownika (client-side)
 */
export async function createEmployee(
    employee: Omit<Employee, "id" | "created_at" | "updated_at">
): Promise<{ data: Employee | null; error: Error | null }> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("employees")
        .insert(employee)
        .select()
        .single();

    return {
        data,
        error: error ? new Error(error.message) : null,
    };
}

/**
 * Aktualizuje pracownika (client-side)
 */
export async function updateEmployee(
    id: string,
    updates: Partial<Omit<Employee, "id" | "created_at" | "updated_at">>
): Promise<{ data: Employee | null; error: Error | null }> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("employees")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

    return {
        data,
        error: error ? new Error(error.message) : null,
    };
}

// =============================================================================
// ABSENCE HELPERS
// =============================================================================

/**
 * Tworzy nieobecność pracownika (client-side)
 */
export async function createAbsence(
    absence: Omit<EmployeeAbsence, "id" | "created_at">
): Promise<{ data: EmployeeAbsence | null; error: Error | null }> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("employee_absences")
        .insert(absence)
        .select()
        .single();

    return {
        data,
        error: error ? new Error(error.message) : null,
    };
}

/**
 * Usuwa nieobecność (client-side)
 */
export async function deleteAbsence(
    id: string
): Promise<{ error: Error | null }> {
    const supabase = createClient();

    const { error } = await supabase
        .from("employee_absences")
        .delete()
        .eq("id", id);

    return {
        error: error ? new Error(error.message) : null,
    };
}

// =============================================================================
// SHIFT TEMPLATE HELPERS
// =============================================================================

/**
 * Tworzy szablon zmiany (client-side)
 */
export async function createShiftTemplate(
    template: Omit<ShiftTemplate, "id" | "created_at">
): Promise<{ data: ShiftTemplate | null; error: Error | null }> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("shift_templates")
        .insert(template)
        .select()
        .single();

    return {
        data,
        error: error ? new Error(error.message) : null,
    };
}

/**
 * Aktualizuje szablon zmiany (client-side)
 */
export async function updateShiftTemplate(
    id: string,
    updates: Partial<Omit<ShiftTemplate, "id" | "created_at">>
): Promise<{ data: ShiftTemplate | null; error: Error | null }> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("shift_templates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

    return {
        data,
        error: error ? new Error(error.message) : null,
    };
}

/**
 * Usuwa szablon zmiany (client-side)
 */
export async function deleteShiftTemplate(
    id: string
): Promise<{ error: Error | null }> {
    const supabase = createClient();

    const { error } = await supabase
        .from("shift_templates")
        .delete()
        .eq("id", id);

    return {
        error: error ? new Error(error.message) : null,
    };
}

// =============================================================================
// SHIFT HELPERS
// =============================================================================

interface ShiftInput {
    schedule_id: string;
    employee_id: string;
    date: string;
    start_time: string;
    end_time: string;
    break_minutes: number;
    notes?: string | null;
    color?: string | null;
}

/**
 * Tworzy nową zmianę (client-side)
 * Obsługuje fallback gdy kolumna color nie istnieje
 */
export async function createShift(
    shift: ShiftInput
): Promise<{ error: Error | null }> {
    const supabase = createClient();

    // Najpierw spróbuj z kolorem
    let result = await supabase.from("shifts").insert(shift);

    // Jeśli błąd dotyczy kolumny color, spróbuj bez niej
    if (
        result.error?.code === "PGRST204" &&
        result.error?.message?.includes("color")
    ) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { color: _color, ...shiftWithoutColor } = shift;
        result = await supabase.from("shifts").insert(shiftWithoutColor);
    }

    return {
        error: result.error ? new Error(result.error.message) : null,
    };
}

/**
 * Aktualizuje zmianę (client-side)
 * Obsługuje fallback gdy kolumna color nie istnieje
 */
export async function updateShift(
    id: string,
    updates: Partial<Omit<ShiftInput, "schedule_id" | "employee_id" | "date">>
): Promise<{ error: Error | null }> {
    const supabase = createClient();

    // Najpierw spróbuj z kolorem
    let result = await supabase
        .from("shifts")
        .update({
            ...updates,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id);

    // Jeśli błąd dotyczy kolumny color, spróbuj bez niej
    if (
        result.error?.code === "PGRST204" &&
        result.error?.message?.includes("color")
    ) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { color: _color, ...updatesWithoutColor } = updates;
        result = await supabase
            .from("shifts")
            .update({
                ...updatesWithoutColor,
                updated_at: new Date().toISOString(),
            })
            .eq("id", id);
    }

    return {
        error: result.error ? new Error(result.error.message) : null,
    };
}

/**
 * Usuwa zmianę (client-side)
 */
export async function deleteShift(
    id: string
): Promise<{ error: Error | null }> {
    const supabase = createClient();

    const { error } = await supabase.from("shifts").delete().eq("id", id);

    return {
        error: error ? new Error(error.message) : null,
    };
}

/**
 * Zapisuje zmiany w grafiku (batch insert/update/delete)
 */
export async function saveShifts(
    scheduleId: string,
    toInsert: Array<{
        schedule_id: string;
        employee_id: string;
        date: string;
        start_time: string;
        end_time: string;
        break_minutes: number;
    }>,
    toDelete: string[]
): Promise<{ error: Error | null }> {
    const supabase = createClient();

    // Usuń stare zmiany
    if (toDelete.length > 0) {
        const { error: deleteError } = await supabase
            .from("shifts")
            .delete()
            .in("id", toDelete);

        if (deleteError) {
            return { error: new Error(deleteError.message) };
        }
    }

    // Dodaj nowe zmiany
    if (toInsert.length > 0) {
        const { error: insertError } = await supabase
            .from("shifts")
            .upsert(toInsert, {
                onConflict: "schedule_id,employee_id,date",
            });

        if (insertError) {
            return { error: new Error(insertError.message) };
        }
    }

    return { error: null };
}
