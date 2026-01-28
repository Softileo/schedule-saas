/**
 * =============================================================================
 * API ROUTE: SCHEDULE GENERATION
 * =============================================================================
 *
 * Clean 3-layer algorithm (no AI):
 * 1. Greedy Scheduler - fast initial generation
 * 2. ILP Optimizer - mathematical load balancing
 * 3. Genetic Optimizer - soft constraints optimization
 *
 * Compliant with Polish Labor Code (Art. 129, 132, 133, 147)
 */

import { z } from "zod";
import { apiSuccess, apiError, ErrorCodes } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";
import {
    checkRateLimit,
    getClientIP,
    RATE_LIMITS,
} from "@/lib/utils/rate-limit";
import {
    ScheduleGenerator,
    type SchedulerInput,
    type EmployeeWithData,
    type GeneratedShift,
    DEFAULT_GENERATOR_CONFIG,
    FAST_GENERATOR_CONFIG,
} from "@/lib/scheduler";
import type { QuarterlyShiftHistory } from "@/lib/scheduler/types";
import { getShiftTimeType } from "@/lib/scheduler/scheduler-utils";
import type { PublicHoliday } from "@/types";
import { isTradingSunday } from "@/lib/core/schedule/utils";
import { getPreviousMonthsInQuarter } from "@/lib/utils/date-helpers";
import { fetchHolidaysForMonth } from "@/lib/api/holidays";
import type { ShiftTemplate, OrganizationSettings } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Pobiera historię zmian z poprzednich miesięcy kwartału dla wyrównania
 */
async function fetchQuarterlyHistory(
    supabase: SupabaseClient,
    organizationId: string,
    year: number,
    month: number,
    employeeIds: string[],
): Promise<QuarterlyShiftHistory | undefined> {
    const previousMonths = getPreviousMonthsInQuarter(month);

    if (previousMonths.length === 0) {
        // Pierwszy miesiąc kwartału - brak historii
        return undefined;
    }

    // Ustaw rok dla wszystkich miesięcy
    previousMonths.forEach((m) => (m.year = year));

    // Pobierz schedule IDs dla poprzednich miesięcy
    const { data: schedules } = await supabase
        .from("schedules")
        .select("id, year, month")
        .eq("organization_id", organizationId)
        .eq("year", year)
        .in(
            "month",
            previousMonths.map((m) => m.month),
        );

    if (!schedules || schedules.length === 0) {
        return undefined;
    }

    const scheduleIds = schedules.map((s) => s.id);

    // Pobierz wszystkie zmiany z tych miesięcy
    const { data: shifts } = await supabase
        .from("shifts")
        .select("employee_id, start_time, end_time, break_minutes")
        .in("schedule_id", scheduleIds)
        .in("employee_id", employeeIds);

    if (!shifts || shifts.length === 0) {
        return undefined;
    }

    // Oblicz statystyki per pracownik
    const shiftsPerEmployee = new Map<string, number>();
    const hoursPerEmployee = new Map<string, number>();
    const shiftTypeDistribution = new Map<
        string,
        { morning: number; afternoon: number; evening: number }
    >();

    // Inicjalizuj rozkład typów dla wszystkich pracowników
    for (const empId of employeeIds) {
        shiftTypeDistribution.set(empId, {
            morning: 0,
            afternoon: 0,
            evening: 0,
        });
    }

    // Zlicz totale dla średnich
    let totalMorning = 0;
    let totalAfternoon = 0;
    let totalEvening = 0;

    for (const shift of shifts) {
        const empId = shift.employee_id;

        // Liczba zmian
        shiftsPerEmployee.set(empId, (shiftsPerEmployee.get(empId) || 0) + 1);

        // Godziny pracy
        const startMinutes =
            parseInt(shift.start_time.split(":")[0]) * 60 +
            parseInt(shift.start_time.split(":")[1]);
        const endMinutes =
            parseInt(shift.end_time.split(":")[0]) * 60 +
            parseInt(shift.end_time.split(":")[1]);
        let workMinutes = endMinutes - startMinutes;
        if (workMinutes < 0) workMinutes += 24 * 60; // Zmiana nocna
        workMinutes -= shift.break_minutes || 0;

        hoursPerEmployee.set(
            empId,
            (hoursPerEmployee.get(empId) || 0) + workMinutes / 60,
        );

        // Rozkład typów zmian
        const shiftType = getShiftTimeType(shift.start_time);
        const empTypes = shiftTypeDistribution.get(empId) || {
            morning: 0,
            afternoon: 0,
            evening: 0,
        };
        empTypes[shiftType]++;
        shiftTypeDistribution.set(empId, empTypes);

        // Totale dla średnich
        if (shiftType === "morning") totalMorning++;
        else if (shiftType === "afternoon") totalAfternoon++;
        else totalEvening++;
    }

    // Oblicz średnie (uwzględniając WSZYSTKICH pracowników, nie tylko tych z historią)
    let totalShifts = 0;
    let totalHours = 0;
    shiftsPerEmployee.forEach((count) => (totalShifts += count));
    hoursPerEmployee.forEach((hours) => (totalHours += hours));

    const averageShifts =
        employeeIds.length > 0 ? totalShifts / employeeIds.length : 0;
    const averageHours =
        employeeIds.length > 0 ? totalHours / employeeIds.length : 0;
    const averageShiftTypes = {
        morning: employeeIds.length > 0 ? totalMorning / employeeIds.length : 0,
        afternoon:
            employeeIds.length > 0 ? totalAfternoon / employeeIds.length : 0,
        evening: employeeIds.length > 0 ? totalEvening / employeeIds.length : 0,
    };

    logger.log(
        `📊 Historia kwartalna: ${schedules.length} miesięcy, ${shifts.length} zmian`,
    );
    logger.log(
        `   Średnia: ${averageShifts.toFixed(1)} zmian, ${averageHours.toFixed(
            1,
        )}h na pracownika`,
    );
    logger.log(
        `   Rozkład typów (śr.): rano=${averageShiftTypes.morning.toFixed(
            1,
        )}, popoł.=${averageShiftTypes.afternoon.toFixed(
            1,
        )}, wiecz.=${averageShiftTypes.evening.toFixed(1)}`,
    );

    return {
        shiftsPerEmployee,
        hoursPerEmployee,
        shiftTypeDistribution,
        averageShifts,
        averageHours,
        averageShiftTypes,
    };
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Schema walidacji danych wejściowych dla generowania grafiku
 */
const generateScheduleSchema = z.object({
    year: z.number().int().min(2020).max(2100),
    month: z.number().int().min(1).max(12),
    mode: z.enum(["fast", "balanced"]).default("balanced"),
    organizationId: z.string().uuid().optional(),
});

/**
 * Generuje listę niedziel handlowych na podstawie ustawień organizacji
 */
function getTradingSundaysFromSettings(
    year: number,
    month: number,
    settings: OrganizationSettings,
): string[] {
    const tradingSundays: string[] = [];
    const lastDay = new Date(year, month, 0).getDate();

    for (let day = 1; day <= lastDay; day++) {
        const date = new Date(year, month - 1, day);
        if (date.getDay() === 0) {
            // Niedziela
            if (isTradingSunday(date, settings)) {
                tradingSundays.push(
                    `${year}-${String(month).padStart(2, "0")}-${String(
                        day,
                    ).padStart(2, "0")}`,
                );
            }
        }
    }

    return tradingSundays;
}

/**
 * Generuje listę dni roboczych i sobót dla miesiąca
 * UWAGA: Niedziele handlowe są w osobnej liście tradingSundays, NIE w workDays
 * Uwzględnia opening_hours z ustawień organizacji - jeśli sobota zamknięta, nie dodaje jej
 */
function getWorkDaysAndSaturdays(
    year: number,
    month: number,
    holidays: PublicHoliday[],
    _tradingSundays: string[],
    settings?: OrganizationSettings | null,
): { workDays: string[]; saturdayDays: string[] } {
    const workDays: string[] = [];
    const saturdayDays: string[] = [];
    const holidayDates = new Set(holidays.map((h) => h.date));
    const lastDay = new Date(year, month, 0).getDate();

    // Sprawdź czy sobota jest otwarta w ustawieniach
    const openingHours = settings?.opening_hours as {
        saturday?: { enabled?: boolean };
    } | null;
    const isSaturdayOpen = openingHours?.saturday?.enabled !== false; // domyślnie otwarta

    for (let day = 1; day <= lastDay; day++) {
        const date = new Date(year, month - 1, day);
        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(
            day,
        ).padStart(2, "0")}`;
        const dayOfWeek = date.getDay();

        // Pomiń święta
        if (holidayDates.has(dateStr)) continue;

        // Niedziela - NIE dodawaj do workDays (niedziele handlowe są w tradingSundays)
        if (dayOfWeek === 0) {
            // Niedziele (handlowe i niehandlowe) - pomijamy tutaj
            // Niedziele handlowe są już w tradingSundays
            continue;
        } else if (dayOfWeek === 6) {
            // Soboty - tylko jeśli otwarte w ustawieniach
            if (isSaturdayOpen) {
                saturdayDays.push(dateStr);
            }
        } else {
            // Dni robocze (pon-pt)
            workDays.push(dateStr);
        }
    }

    logger.log(
        `📅 Dni robocze: ${workDays.length}, Soboty: ${saturdayDays.length}${
            !isSaturdayOpen ? " (zamknięte)" : ""
        }, Niedziele handlowe: ${_tradingSundays.length}`,
    );

    return { workDays, saturdayDays };
}

// =============================================================================
// POST HANDLER
// =============================================================================

export async function POST(request: Request) {
    const startTime = Date.now();

    try {
        // Rate limiting for schedule generation
        const clientIP = getClientIP(request);
        const rateLimit = checkRateLimit(
            `schedule-gen:${clientIP}`,
            RATE_LIMITS.scheduleGeneration,
        );

        if (!rateLimit.success) {
            const retryAfter = Math.ceil(
                (rateLimit.resetTime - Date.now()) / 1000,
            );
            return apiError(
                ErrorCodes.RATE_LIMITED,
                "Zbyt wiele prób generowania grafiku. Spróbuj ponownie później.",
                429,
                { retryAfter },
                { "Retry-After": retryAfter.toString() },
            );
        }

        const body = await request.json();

        // Walidacja danych wejściowych z Zod
        const validation = generateScheduleSchema.safeParse(body);

        if (!validation.success) {
            return apiError(
                ErrorCodes.INVALID_INPUT,
                "Nieprawidłowe dane wejściowe",
                400,
                validation.error.issues.map((i) => i.message),
            );
        }

        const {
            year,
            month,
            mode,
            organizationId: bodyOrgId,
        } = validation.data;

        logger.log(
            `\n🚀 Starting schedule generation: ${month}/${year}, mode: ${mode}`,
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

        // Determine organization ID
        let organizationId = bodyOrgId;

        if (!organizationId) {
            // No org ID provided, get first membership
            const { data: membership } = await supabase
                .from("organization_members")
                .select("organization_id")
                .eq("user_id", user.id)
                .single();

            if (!membership) {
                return apiError(
                    ErrorCodes.NOT_FOUND,
                    "Nie znaleziono organizacji",
                    404,
                );
            }

            organizationId = membership.organization_id;
        } else {
            // Org ID provided - verify user has access (SECURITY: prevent IDOR)
            const { data: membership } = await supabase
                .from("organization_members")
                .select("organization_id")
                .eq("user_id", user.id)
                .eq("organization_id", organizationId)
                .single();

            if (!membership) {
                return apiError(
                    ErrorCodes.FORBIDDEN,
                    "Brak dostępu do tej organizacji",
                    403,
                );
            }
        }

        logger.log("Organization ID:", organizationId);

        // =====================================================================
        // POBIERZ DANE Z BAZY
        // =====================================================================

        // 1. Pracownicy (bez join bo RLS może nie działać)
        const { data: employees, error: empError } = await supabase
            .from("employees")
            .select("*")
            .eq("organization_id", organizationId)
            .eq("is_active", true);

        logger.log(
            "🔍 DEBUG - employees count:",
            employees?.length,
            "error:",
            empError?.message,
        );

        if (empError || !employees || employees.length === 0) {
            return apiError(
                ErrorCodes.INVALID_INPUT,
                "Brak aktywnych pracowników",
                400,
            );
        }

        // 1b. Pobierz preferencje osobno (join czasem nie działa z RLS)
        const employeeIds = employees.map((e) => e.id);
        const { data: preferencesData, error: prefError } = await supabase
            .from("employee_preferences")
            .select("*")
            .in("employee_id", employeeIds);

        logger.log(
            "🔍 DEBUG - preferences count:",
            preferencesData?.length,
            "error:",
            prefError?.message,
        );

        // 1c. Pobierz nieobecności osobno (join czasem nie działa z RLS)
        // Filtrujemy tylko nieobecności które nachodzą na generowany miesiąc
        const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const monthEnd = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

        const { data: absencesData, error: absError } = await supabase
            .from("employee_absences")
            .select("*")
            .eq("organization_id", organizationId)
            .lte("start_date", monthEnd)
            .gte("end_date", monthStart);

        logger.log(
            "🔍 DEBUG - absences count:",
            absencesData?.length,
            "error:",
            absError?.message,
            "monthRange:",
            monthStart,
            "to",
            monthEnd,
        );

        // Mapuj nieobecności po employee_id
        type EmployeeAbsenceData = NonNullable<typeof absencesData>[number];
        const absencesMap = new Map<string, EmployeeAbsenceData[]>();
        if (absencesData) {
            for (const absence of absencesData) {
                const existing = absencesMap.get(absence.employee_id) || [];
                existing.push(absence);
                absencesMap.set(absence.employee_id, existing);
                logger.log(
                    `🚫 Nieobecność: ${absence.employee_id} - ${absence.absence_type}: ${absence.start_date} do ${absence.end_date}`,
                );
            }
        }

        // Mapuj preferencje po employee_id
        type EmployeePref = NonNullable<typeof preferencesData>[number];
        const preferencesMap = new Map<string, EmployeePref>();
        if (preferencesData) {
            for (const pref of preferencesData) {
                preferencesMap.set(pref.employee_id, pref);
                logger.log(
                    `📋 Preferencje ${
                        pref.employee_id
                    }: unavailable_days=${JSON.stringify(
                        pref.unavailable_days,
                    )}, can_work_weekends=${pref.can_work_weekends}`,
                );
            }
        }

        // 2. Szablony zmian
        const { data: templates, error: templError } = await supabase
            .from("shift_templates")
            .select("*")
            .eq("organization_id", organizationId);

        logger.log(
            "🔍 DEBUG - templates count:",
            templates?.length,
            "error:",
            templError?.message,
        );

        if (templError || !templates || templates.length === 0) {
            return apiError(
                ErrorCodes.INVALID_INPUT,
                "Brak aktywnych szablonów zmian",
                400,
                { hint: "Utwórz szablony zmian w Ustawienia → Szablony zmian" },
            );
        }

        // 3. Przypisania szablonów do pracowników
        const { data: templateAssignments } = await supabase
            .from("shift_template_assignments")
            .select("employee_id, template_id")
            .in(
                "employee_id",
                employees.map((e) => e.id),
            );

        // Buduj mapę przypisań: templateId → employeeIds[]
        // Używana przez greedy-scheduler i ILP do sprawdzania kto może pracować na danym szablonie
        const templateAssignmentsMap = new Map<string, string[]>();
        if (templateAssignments) {
            for (const assignment of templateAssignments) {
                const existing =
                    templateAssignmentsMap.get(assignment.template_id) || [];
                existing.push(assignment.employee_id);
                templateAssignmentsMap.set(assignment.template_id, existing);
            }
        }

        // 4. Ustawienia organizacji
        const { data: settings, error: settingsError } = await supabase
            .from("organization_settings")
            .select("*")
            .eq("organization_id", organizationId)
            .single();

        if (settingsError || !settings) {
            return apiError(
                ErrorCodes.INVALID_INPUT,
                "Brak ustawień organizacji",
                400,
            );
        }

        // 5. Święta i dni robocze
        const holidays = await fetchHolidaysForMonth(year, month);
        const tradingSundays = getTradingSundaysFromSettings(
            year,
            month,
            settings as OrganizationSettings,
        );
        const { workDays, saturdayDays } = getWorkDaysAndSaturdays(
            year,
            month,
            holidays,
            tradingSundays,
            settings as OrganizationSettings,
        );

        // =====================================================================
        // PRZYGOTUJ DANE WEJŚCIOWE DLA GENERATORA
        // =====================================================================

        // Zbuduj odwrotną mapę dla EmployeeWithData: employeeId → templateIds[]
        const employeeToTemplatesMap = new Map<string, string[]>();
        if (templateAssignments) {
            for (const assignment of templateAssignments) {
                const existing =
                    employeeToTemplatesMap.get(assignment.employee_id) || [];
                existing.push(assignment.template_id);
                employeeToTemplatesMap.set(assignment.employee_id, existing);
            }
        }

        const employeesWithData: EmployeeWithData[] = employees.map((emp) => {
            const prefs = preferencesMap.get(emp.id) || null;
            // Używamy absencesMap zamiast emp.absences bo join z RLS może nie działać
            const absences = absencesMap.get(emp.id) || [];

            // Log absences dla debugowania
            if (absences.length > 0) {
                logger.log(
                    `🚫 ${emp.first_name} ${emp.last_name}: ma ${absences.length} nieobecności:`,
                );
                for (const absence of absences) {
                    logger.log(
                        `   - ${absence.absence_type}: ${absence.start_date} do ${absence.end_date}`,
                    );
                }
            }

            if (prefs) {
                logger.log(
                    `✅ ${emp.first_name} ${
                        emp.last_name
                    }: ma preferencje - unavailable_days=${JSON.stringify(
                        prefs.unavailable_days,
                    )}, can_work_weekends=${prefs.can_work_weekends}`,
                );
            } else {
                logger.log(
                    `⚠️ ${emp.first_name} ${emp.last_name}: BRAK PREFERENCJI`,
                );
            }
            return {
                ...emp,
                preferences: prefs,
                absences,
                templateAssignments: employeeToTemplatesMap.get(emp.id) || [],
            };
        });

        // Pobierz historię kwartalną dla wyrównania zmian między pracownikami
        const quarterlyHistory = await fetchQuarterlyHistory(
            supabase,
            organizationId,
            year,
            month,
            employeeIds,
        );

        const schedulerInput: SchedulerInput = {
            year,
            month,
            employees: employeesWithData,
            templates: templates as ShiftTemplate[],
            settings: settings as OrganizationSettings,
            holidays,
            workDays,
            saturdayDays,
            tradingSundays,
            templateAssignmentsMap,
            quarterlyHistory,
        };

        // =====================================================================
        // GENERUJ GRAFIK
        // =====================================================================

        const generatorConfig =
            mode === "fast" ? FAST_GENERATOR_CONFIG : DEFAULT_GENERATOR_CONFIG;

        const generator = new ScheduleGenerator(
            schedulerInput,
            generatorConfig,
        );
        const result = generator.generate();

        // =====================================================================
        // ZAPISZ DO BAZY DANYCH
        // =====================================================================

        if (result.shifts.length > 0) {
            // Znajdź lub utwórz schedule dla tego miesiąca
            let scheduleId: string;

            const { data: existingSchedule } = await supabase
                .from("schedules")
                .select("id")
                .eq("organization_id", organizationId)
                .eq("year", year)
                .eq("month", month)
                .single();

            if (existingSchedule) {
                scheduleId = existingSchedule.id;

                // Usuń WSZYSTKIE istniejące zmiany dla tego schedule
                const { error: deleteError } = await supabase
                    .from("shifts")
                    .delete()
                    .eq("schedule_id", scheduleId);

                if (deleteError) {
                    logger.error("Błąd usuwania starych zmian:", deleteError);
                    return apiError(
                        ErrorCodes.INTERNAL_ERROR,
                        "Nie udało się usunąć starych zmian",
                        500,
                    );
                }
                logger.log(
                    `🗑️ Usunięto stare zmiany dla schedule ${scheduleId}`,
                );
            } else {
                // Utwórz nowy schedule
                const { data: newSchedule, error: scheduleError } =
                    await supabase
                        .from("schedules")
                        .insert({
                            organization_id: organizationId,
                            year,
                            month,
                            is_published: false,
                        })
                        .select("id")
                        .single();

                if (scheduleError || !newSchedule) {
                    logger.error("Błąd tworzenia schedule:", scheduleError);
                    return apiError(
                        ErrorCodes.INTERNAL_ERROR,
                        "Błąd tworzenia grafiku",
                        500,
                    );
                }

                scheduleId = newSchedule.id;
            }

            // Wstaw nowe zmiany - deduplikacja po (schedule_id, employee_id, date, start_time, end_time)
            const seenKeys = new Set<string>();
            const uniqueShifts: GeneratedShift[] = [];

            for (const shift of result.shifts) {
                // Klucz musi zawierać wszystkie kolumny z constraint
                const key = `${scheduleId}:${shift.employee_id}:${shift.date}:${shift.start_time}:${shift.end_time}`;
                if (!seenKeys.has(key)) {
                    seenKeys.add(key);
                    uniqueShifts.push(shift);
                } else {
                    logger.warn(
                        `⚠️ Duplikat usunięty: employee=${shift.employee_id}, date=${shift.date}, ${shift.start_time}-${shift.end_time}`,
                    );
                }
            }

            logger.log(
                `📊 Wstawianie ${uniqueShifts.length} zmian (z ${result.shifts.length} wygenerowanych)`,
            );

            const shiftsToInsert = uniqueShifts.map(
                (shift: GeneratedShift) => ({
                    schedule_id: scheduleId,
                    employee_id: shift.employee_id,
                    date: shift.date,
                    start_time: shift.start_time,
                    end_time: shift.end_time,
                    break_minutes: shift.break_minutes,
                }),
            );

            // Wstaw zmiany - upsert z ignorowaniem duplikatów
            const { error: insertError } = await supabase
                .from("shifts")
                .upsert(shiftsToInsert, {
                    onConflict:
                        "schedule_id,employee_id,date,start_time,end_time",
                });

            if (insertError) {
                logger.error("Błąd zapisu zmian:", insertError);
                logger.error(
                    "Szczegóły:",
                    JSON.stringify(insertError, null, 2),
                );
                return apiError(
                    ErrorCodes.INTERNAL_ERROR,
                    `Błąd zapisu grafiku: ${insertError.message}`,
                    500,
                );
            }
        }

        // =====================================================================
        // ZWRÓĆ ODPOWIEDŹ
        // =====================================================================

        const totalTime = Date.now() - startTime;

        logger.log(`✅ Generowanie zakończone w ${totalTime}ms`);
        logger.log(`   Wygenerowano ${result.shifts.length} zmian`);
        logger.log(`   Jakość: ${result.metrics.qualityPercent.toFixed(1)}%`);

        return apiSuccess({
            shifts: result.shifts,
            metrics: {
                totalShifts: result.shifts.length,
                qualityPercent: result.metrics.qualityPercent,
                fitness: result.metrics.totalFitness,
                coveredDays: result.metrics.coveredDays,
                totalDays: result.metrics.totalDays,
                emptyDays: result.metrics.emptyDays,
                understaffedShifts: result.metrics.understaffedShifts,
                violations: {
                    dailyRest: result.metrics.dailyRestViolations,
                    consecutiveDays: result.metrics.consecutiveDaysViolations,
                    absence: result.metrics.absenceViolations,
                },
                balance: {
                    hoursImbalance: result.metrics.hoursImbalance,
                    weekendImbalance: result.metrics.weekendImbalance,
                },
                employeeStats: result.metrics.employeeStats,
                warnings: result.metrics.warnings,
            },
            execution: {
                timeMs: totalTime,
                algorithmTimeMs: result.executionTimeMs,
                layers: result.layersExecuted,
                mode,
            },
        });
    } catch (error) {
        logger.error("Błąd generowania grafiku:", error);
        return apiError(
            ErrorCodes.INTERNAL_ERROR,
            "Wewnętrzny błąd serwera",
            500,
            error instanceof Error ? error.message : "Nieznany błąd",
        );
    }
}
