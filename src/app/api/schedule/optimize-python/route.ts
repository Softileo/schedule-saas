/**
 * =============================================================================
 * API ROUTE: SCHEDULE GENERATION WITH PYTHON OPTIMIZER
 * =============================================================================
 *
 * Endpoint wykorzystujący Python scheduler jako dodatkową warstwę optymalizacji
 */

import { z } from "zod";
import { apiSuccess, apiError, ErrorCodes } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";
import {
    optimizeScheduleWithPython,
    isPythonSchedulerEnabled,
    type GeneticConfig,
} from "@/lib/api/python-scheduler";
import type { GeneratedShift, SchedulerInput } from "@/lib/scheduler/types";

// =============================================================================
// SCHEMA
// =============================================================================

const optimizeScheduleSchema = z.object({
    scheduleId: z.string().uuid(),
    config: z
        .object({
            populationSize: z.number().int().min(10).max(100).optional(),
            generations: z.number().int().min(10).max(500).optional(),
            mutationRate: z.number().min(0).max(1).optional(),
            crossoverRate: z.number().min(0).max(1).optional(),
            timeoutMs: z.number().int().min(1000).max(60000).optional(),
        })
        .optional(),
});

// =============================================================================
// POST HANDLER
// =============================================================================

export async function POST(request: Request) {
    try {
        // Sprawdź czy Python scheduler jest dostępny
        if (!isPythonSchedulerEnabled()) {
            return apiError(
                ErrorCodes.SERVICE_UNAVAILABLE,
                "Python Scheduler Service is not configured",
                503,
            );
        }

        const body = await request.json();
        const validation = optimizeScheduleSchema.safeParse(body);

        if (!validation.success) {
            return apiError(
                ErrorCodes.INVALID_INPUT,
                "Nieprawidłowe dane wejściowe",
                400,
                validation.error.issues,
            );
        }

        const { scheduleId, config } = validation.data;

        logger.log(
            `\n🐍 Starting Python optimization for schedule: ${scheduleId}`,
        );

        const supabase = await createClient();

        // Get authenticated user
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return apiError(ErrorCodes.UNAUTHORIZED, "Brak autoryzacji", 401);
        }

        // Pobierz grafik z bazy
        const { data: schedule, error: scheduleError } = await supabase
            .from("schedules")
            .select(
                `
                *,
                organization:organizations(*)
            `,
            )
            .eq("id", scheduleId)
            .single();

        if (scheduleError || !schedule) {
            return apiError(
                ErrorCodes.NOT_FOUND,
                "Nie znaleziono grafiku",
                404,
            );
        }

        // Sprawdź dostęp użytkownika do organizacji
        const { data: membership } = await supabase
            .from("organization_members")
            .select("role")
            .eq("user_id", user.id)
            .eq("organization_id", schedule.organization_id)
            .single();

        if (!membership) {
            return apiError(
                ErrorCodes.FORBIDDEN,
                "Brak dostępu do tej organizacji",
                403,
            );
        }

        // Pobierz zmiany z grafiku
        const { data: shifts, error: shiftsError } = await supabase
            .from("shifts")
            .select("*")
            .eq("schedule_id", scheduleId);

        if (shiftsError) {
            return apiError(
                ErrorCodes.DATABASE_ERROR,
                "Błąd pobierania zmian",
                500,
            );
        }

        if (!shifts || shifts.length === 0) {
            return apiError(
                ErrorCodes.INVALID_INPUT,
                "Brak zmian do optymalizacji",
                400,
            );
        }

        // Konwertuj zmiany do formatu API
        const generatedShifts: GeneratedShift[] = shifts.map((s) => ({
            employee_id: s.employee_id,
            date: s.date,
            start_time: s.start_time,
            end_time: s.end_time,
            break_minutes: s.break_minutes || 0,
            template_id: undefined, // Template ID nie jest przechowywane w bazie
        }));

        // Przygotuj dane wejściowe dla Python schedulera
        // TODO: Pobierz pełne dane (employees, templates, settings, etc.)
        // Na razie używamy uproszczonej wersji
        const schedulerInput: Partial<SchedulerInput> = {
            year: schedule.year,
            month: schedule.month,
            // ... reszta danych
        };

        logger.log(
            `📊 Optymalizacja: ${generatedShifts.length} zmian w grafiku`,
        );

        // Wywołaj Python API
        const result = await optimizeScheduleWithPython(
            generatedShifts,
            schedulerInput as SchedulerInput,
            config,
        );

        logger.log(
            `✅ Optymalizacja zakończona. Poprawa: ${result.improvement.toFixed(2)}%`,
        );

        // Zapisz zoptymalizowane zmiany z powrotem do bazy
        if (result.improvement > 5.0) {
            // Tylko jeśli poprawa > 5%
            logger.log("💾 Zapisuję zoptymalizowane zmiany do bazy...");

            // Usuń stare zmiany
            await supabase
                .from("shifts")
                .delete()
                .eq("schedule_id", scheduleId);

            // Zapisz nowe zmiany
            const shiftsToInsert = result.shifts.map((s) => ({
                schedule_id: scheduleId,
                employee_id: s.employee_id,
                date: s.date,
                start_time: s.start_time,
                end_time: s.end_time,
                break_minutes: s.break_minutes,
                template_id: s.template_id,
            }));

            const { error: insertError } = await supabase
                .from("shifts")
                .insert(shiftsToInsert);

            if (insertError) {
                logger.error("Błąd zapisywania zmian:", insertError);
                return apiError(
                    ErrorCodes.DATABASE_ERROR,
                    "Błąd zapisywania zoptymalizowanych zmian",
                    500,
                );
            }

            // Zaktualizuj status grafiku
            await supabase
                .from("schedules")
                .update({
                    status: "optimized",
                    updated_at: new Date().toISOString(),
                })
                .eq("id", scheduleId);
        }

        return apiSuccess({
            scheduleId,
            shiftsCount: result.shifts.length,
            metrics: result.metrics,
            improvement: result.improvement,
            saved: result.improvement > 5.0,
        });
    } catch (error) {
        logger.error("Błąd podczas optymalizacji:", error);
        return apiError(
            ErrorCodes.INTERNAL_ERROR,
            error instanceof Error ? error.message : "Błąd optymalizacji",
            500,
        );
    }
}
