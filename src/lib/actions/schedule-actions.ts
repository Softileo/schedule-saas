"use server";

import { z } from "zod";
import { authenticatedAction } from "@/lib/actions/safe-action";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Schemat walidacji dla pojedynczej zmiany
const shiftSchema = z.object({
    schedule_id: z.string().uuid(),
    employee_id: z.string().uuid(),
    date: z.string(), // YYYY-MM-DD
    start_time: z.string(), // HH:mm:ss
    end_time: z.string(),
    break_minutes: z.number().nullable().optional(),
    notes: z.string().nullable().optional(),
    color: z.string().nullable().optional(),
});

const updateShiftSchema = shiftSchema.extend({
    id: z.string().uuid(),
});

// Schemat inputu dla akcji zapisu
const saveShiftsSchema = z.object({
    scheduleId: z.string().uuid(),
    toInsert: z.array(shiftSchema),
    toUpdate: z.array(updateShiftSchema),
    toDelete: z.array(z.string().uuid()),
});

// Schemat inputu dla akcji usuwania wszystkich grafików
const deleteAllSchedulesSchema = z.object({
    organizationId: z.string().uuid(),
});

type SaveShiftsInput = z.infer<typeof saveShiftsSchema>;

export async function deleteAllSchedulesAction(organizationId: string) {
    return authenticatedAction(
        deleteAllSchedulesSchema,
        { organizationId },
        async (data) => {
            const supabase = await createClient();

            // 1. Sprawdź czy użytkownik ma dostęp do organizacji (RLS to załatwia, ale dla pewności)
            // 2. Usuń wszystkie grafiki (shifts usuną się kaskadowo jeśli jest ON DELETE CASCADE,
            //    w przeciwnym razie trzeba najpierw usunąć shifts)

            // Zakładam CASCADE na kluczu obcym w shifts -> schedule_id
            const { error } = await supabase
                .from("schedules")
                .delete()
                .eq("organization_id", data.organizationId);

            if (error) {
                throw new Error(`Failed to delete schedules: ${error.message}`);
            }

            revalidatePath("/panel");
            revalidatePath("/grafik");

            return { success: true };
        },
    );
}

export async function saveShiftsAction(input: SaveShiftsInput) {
    return authenticatedAction(saveShiftsSchema, input, async (data) => {
        const { scheduleId, toInsert, toUpdate, toDelete } = data;
        const supabase = await createClient();

        // Transaction-like logic (Supabase doesn't support transactions in client-lib fully yet without RPC,
        // but we can execute sequentially. If something fails, we might have partial state.
        // For now, this mimics the client-side logic which was also sequential.)

        // 1. Clean up "toInsert" duplicates
        // Check for existing shifts that conflict with inserts (same emp, date, times) and delete them
        // to avoid unique constraint violations if the UI didn't catch them.
        // Or we can rely on Postgres constraints and return error.
        // The original logic did: delete matching scheduled shift before insert.

        if (toInsert.length > 0) {
            for (const shift of toInsert) {
                await supabase
                    .from("shifts")
                    .delete()
                    .eq("schedule_id", scheduleId)
                    .eq("employee_id", shift.employee_id)
                    .eq("date", shift.date)
                    .eq("start_time", shift.start_time)
                    .eq("end_time", shift.end_time);
            }

            const { error: insertError } = await supabase
                .from("shifts")
                .insert(toInsert);

            if (insertError) {
                throw new Error(`Błąd dodawania zmian: ${insertError.message}`);
            }
        }

        // 2. Update existing shifts
        if (toUpdate.length > 0) {
            for (const shift of toUpdate) {
                const { error: updateError } = await supabase
                    .from("shifts")
                    .update({
                        date: shift.date,
                        employee_id: shift.employee_id,
                        start_time: shift.start_time,
                        end_time: shift.end_time,
                        break_minutes: shift.break_minutes,
                        notes: shift.notes,
                        color: shift.color,
                    })
                    .eq("id", shift.id)
                    .eq("schedule_id", scheduleId); // Security check

                if (updateError) {
                    throw new Error(
                        `Błąd aktualizacji zmiany ${shift.id}: ${updateError.message}`,
                    );
                }
            }
        }

        // 3. Delete removed shifts
        if (toDelete.length > 0) {
            const { error: deleteError } = await supabase
                .from("shifts")
                .delete()
                .in("id", toDelete)
                .eq("schedule_id", scheduleId); // Security check

            if (deleteError) {
                throw new Error(`Błąd usuwania zmian: ${deleteError.message}`);
            }
        }

        // 4. Invalidate cache / Revalidate
        revalidatePath(`/dashboard/schedule/${scheduleId}`);

        // 5. Return fresh data
        const { data: latestShifts, error: fetchError } = await supabase
            .from("shifts")
            .select("*")
            .eq("schedule_id", scheduleId);

        if (fetchError) {
            throw new Error(
                `Błąd pobierania odświeżonych danych: ${fetchError.message}`,
            );
        }

        return latestShifts ?? [];
    });
}
