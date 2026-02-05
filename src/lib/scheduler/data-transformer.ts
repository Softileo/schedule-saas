import type { SchedulerInput, EmployeeWithData } from "@/lib/scheduler/types";
import type { ShiftTemplate } from "@/types";

// =============================================================================
// TYPES - Python API Format
// =============================================================================

export interface PythonEmployee {
    id: string;
    name: string;
    email: string;
    contract_type: string;
    weekly_hours: number;
    max_hours: number;
    custom_monthly_hours: number | null;
    is_supervisor?: boolean; // Kierownik/opiekun
    preferences: {
        preferred_days: number[];
        avoided_days: number[];
        preferred_shift_types: string[];
        max_hours_per_week: number | null;
        min_hours_per_week: number | null;
    } | null;
    absences: Array<{
        start_date: string;
        end_date: string;
        type: string;
    }>;
    template_assignments: string[];
}

export interface PythonTemplate {
    id: string;
    name: string;
    start_time: string; // HH:MM format (no seconds)
    end_time: string; // HH:MM format (no seconds)
    days_of_week: string[];
    is_weekend: boolean;
    min_employees: number;
    max_employees: number | null;
}

export interface PythonInput {
    year: number;
    month: number;
    monthly_hours_norm: number;
    employees: PythonEmployee[];
    templates: PythonTemplate[];
    holidays: Array<{
        date: string;
        name: string;
    }>;
    work_days: string[];
    saturday_days: string[];
    trading_sundays: string[];
    template_assignments_map: Record<string, string[]>;
    organization_settings?: {
        min_employees_per_shift?: number;
        enable_trading_sundays?: boolean;
        store_open_time?: string;
        store_close_time?: string;
        opening_hours?: Record<
            string,
            { open: string | null; close: string | null }
        >;
    };
}

export interface CPSATEmployee {
    id: string;
    first_name: string;
    last_name: string;
    employment_type: string;
    max_hours: number; // CRITICAL: Used in SC1 (employment type objective) and HC10 (max monthly hours)
    custom_hours?: number | null;
    is_active: boolean;
    is_supervisor?: boolean; // Supervisor/manager must be present on each shift
    // Note: position removed - SC3 (manager presence) disabled, treats all employees equally
    // Note: color removed - UI only, not needed for calculations
}

export interface CPSATTemplate {
    id: string;
    name: string;
    start_time: string; // HH:MM format (no seconds)
    end_time: string; // HH:MM format (no seconds)
    min_employees: number;
    max_employees: number | null;
    applicable_days?: string[] | null;
}

export interface CPSATInput {
    year: number;
    month: number;
    monthly_hours_norm: number;
    organization_settings: {
        min_employees_per_shift?: number;
        enable_trading_sundays?: boolean;
        opening_hours?: Record<
            string,
            { open: string | null; close: string | null }
        >;
    };
    shift_templates: CPSATTemplate[];
    employees: CPSATEmployee[];
    employee_preferences?: Array<{
        employee_id: string;
        preferred_start_time?: string | null;
        preferred_end_time?: string | null;
        max_hours_per_day?: number | null;
        max_hours_per_week?: number | null;
        can_work_weekends?: boolean | null;
        can_work_holidays?: boolean | null;
        preferred_days?: number[] | null;
        unavailable_days?: number[] | null;
    }>;
    employee_absences?: Array<{
        employee_id: string;
        start_date: string;
        end_date: string;
        absence_type: string;
    }>;
    scheduling_rules?: {
        max_consecutive_days?: number;
        min_daily_rest_hours?: number;
        max_weekly_work_hours?: number;
    };
    trading_sundays?: Array<{
        date: string;
        is_active: boolean;
    }>;
    solver_time_limit?: number;
}

// =============================================================================
// CONSTANTS - Employment Type Multipliers
// =============================================================================

/**
 * Mnożniki etatu względem pełnego etatu (100%)
 * Muszą być spójne z Python backend
 */
export const EMPLOYMENT_TYPE_MULTIPLIERS: Record<string, number> = {
    full: 1.0, // 100% normy
    three_quarter: 0.75, // 75% normy
    half: 0.5, // 50% normy
    one_third: 0.333, // 33.3% normy
};

/**
 * Godziny tygodniowe dla różnych typów umów
 */
export const WEEKLY_HOURS_BY_TYPE: Record<string, number> = {
    full: 40,
    three_quarter: 30,
    half: 20,
    one_third: 13.33,
};

// =============================================================================
// CORE UTILITIES - DRY Functions
// =============================================================================

/**
 * Konwertuje czas z HH:MM:SS do HH:MM
 * Python API expects HH:MM format (no seconds needed)
 *
 * Dlaczego bez sekund?
 * • CP-SAT operuje na minutach (integer scaling)
 * • Sekundy są zbędne dla planowania zmian
 * • Zmniejsza rozmiar danych przesyłanych do API
 */
export function formatTime(time: string): string {
    if (!time) return "00:00";
    const parts = time.split(":");
    if (parts.length === 2) return time; // Already HH:MM
    return time.substring(0, 5); // Strip seconds from HH:MM:SS
}

/**
 * Oblicza miesięczną normę godzin pracy dla pełnego etatu.
 *
 * WAŻNE: Norma = tylko dni robocze (Pn-Pt) × 8h
 * Soboty i niedziele handlowe NIE wliczają się do normy!
 * Są dodatkowymi możliwościami pracy, ale nie częścią nominalnego wymiaru.
 *
 * Przykład: Styczeń 2026
 * - 20 dni roboczych (Pn-Pt) → 160h normy
 * - 5 sobót + 4 niedziele = 9 dni dodatkowych (możliwych, ale poza normą)
 */
export function calculateMonthlyHoursNorm(workDaysCount: number): number {
    // NORMA = tylko dni robocze (Pn-Pt) × 8h
    return workDaysCount * 8;
}

/**
 * Oblicza godziny tygodniowe na podstawie typu zatrudnienia
 */
export function getWeeklyHours(
    employmentType: string | null,
    customHours: number | null,
): number {
    if (employmentType === "custom" && customHours) {
        // custom_hours w bazie = godziny TYGODNIOWE
        return customHours;
    }
    return WEEKLY_HOURS_BY_TYPE[employmentType || "full"] || 40;
}

/**
 * Oblicza maksymalne godziny miesięczne dla pracownika
 * Bazuje na normie miesięcznej i typie zatrudnienia
 */
export function calculateMaxMonthlyHours(
    employmentType: string | null,
    customHours: number | null,
    monthlyHoursNorm: number,
    totalWorkableDays: number,
): {
    maxHours: number;
    customMonthlyHours: number | null;
} {
    if (employmentType === "custom" && customHours) {
        // custom_hours w bazie = godziny TYGODNIOWE
        // Obliczamy stosunek do pełnego etatu (40h/tyg)
        const weeklyRatio = customHours / 40;
        // Miesięczne godziny = norma × stosunek
        const customMonthlyHours = monthlyHoursNorm * weeklyRatio;
        return {
            maxHours: customMonthlyHours * 1,
            customMonthlyHours,
        };
    }

    // Dla standardowych etatów: norma miesięczna * mnożnik
    const multiplier =
        EMPLOYMENT_TYPE_MULTIPLIERS[employmentType || "full"] || 1.0;
    return {
        maxHours: monthlyHoursNorm * multiplier,
        customMonthlyHours: null,
    };
}

/**
 * Sprawdza czy dana data jest weekendem
 */
export function isWeekend(
    dateStr: string,
    saturdayDays: string[],
    tradingSundays: string[],
): boolean {
    return saturdayDays.includes(dateStr) || tradingSundays.includes(dateStr);
}

// =============================================================================
// TRANSFORMATION FUNCTIONS - DRY
// =============================================================================

/**
 * Konwertuje pracownika do formatu Python API
 */
export function transformEmployeeToPython(
    emp: EmployeeWithData,
    monthlyHoursNorm: number,
    totalWorkableDays: number,
): PythonEmployee {
    const weeklyHours = getWeeklyHours(emp.employment_type, emp.custom_hours);
    const { maxHours, customMonthlyHours } = calculateMaxMonthlyHours(
        emp.employment_type,
        emp.custom_hours,
        monthlyHoursNorm,
        totalWorkableDays,
    );

    return {
        id: emp.id,
        name: `${emp.first_name} ${emp.last_name}`,
        email: emp.email || "",
        contract_type: emp.employment_type || "full",
        weekly_hours: weeklyHours,
        max_hours: maxHours,
        custom_monthly_hours: customMonthlyHours,
        is_supervisor: emp.is_supervisor === true,
        preferences: emp.preferences
            ? {
                  preferred_days: emp.preferences.preferred_days || [],
                  avoided_days: emp.preferences.unavailable_days || [],
                  preferred_shift_types: [],
                  max_hours_per_week:
                      emp.preferences.max_hours_per_week || null,
                  min_hours_per_week: null,
              }
            : null,
        absences: (emp.absences || []).map((abs) => ({
            start_date: abs.start_date,
            end_date: abs.end_date,
            type: abs.absence_type,
        })),
        template_assignments: emp.templateAssignments || [],
    };
}

/**
 * Konwertuje template do formatu Python API
 */
export function transformTemplateToPython(tmpl: ShiftTemplate): PythonTemplate {
    return {
        id: tmpl.id,
        name: tmpl.name,
        start_time: formatTime(tmpl.start_time), // Always HH:MM
        end_time: formatTime(tmpl.end_time), // Always HH:MM
        days_of_week: tmpl.applicable_days || [],
        is_weekend: false, // Can calculate based on applicable_days if needed
        min_employees: tmpl.min_employees || 1,
        max_employees: tmpl.max_employees || null,
        // color omitted - UI only
    };
}

/**
 * Konwertuje pracownika do formatu CP-SAT
 */
export function transformEmployeeToCPSAT(
    emp: EmployeeWithData,
    monthlyHoursNorm: number,
): CPSATEmployee {
    // Oblicz max_hours (używane w SC1 i HC10)
    const { maxHours } = calculateMaxMonthlyHours(
        emp.employment_type,
        emp.custom_hours,
        monthlyHoursNorm,
        0, // totalWorkableDays not needed for this calculation
    );

    return {
        id: emp.id,
        first_name: emp.first_name,
        last_name: emp.last_name,
        employment_type: emp.employment_type || "full",
        max_hours: maxHours,
        custom_hours: emp.custom_hours,
        is_active: emp.is_active !== false,
        is_supervisor: emp.is_supervisor === true,
        // position omitted - SC3 disabled, all employees treated equally
        // color omitted - UI only
    };
}

/**
 * Konwertuje template do formatu CP-SAT
 */
export function transformTemplateToCPSAT(tmpl: ShiftTemplate): CPSATTemplate {
    return {
        id: tmpl.id,
        name: tmpl.name,
        start_time: formatTime(tmpl.start_time), // Always HH:MM
        end_time: formatTime(tmpl.end_time), // Always HH:MM
        min_employees: tmpl.min_employees || 1,
        max_employees: tmpl.max_employees,
        applicable_days: tmpl.applicable_days,
        // color omitted - UI only
    };
}

// =============================================================================
// MAIN TRANSFORMATION FUNCTIONS
// =============================================================================

/**
 * Konwertuje SchedulerInput do formatu Python API (Genetic)
 */
export function transformInputForPython(input: SchedulerInput): PythonInput {
    const workDaysCount = input.workDays.length;
    const saturdayCount = input.saturdayDays.length;
    const tradingSundayCount = input.tradingSundays.length;
    const totalWorkableDays =
        workDaysCount + saturdayCount + tradingSundayCount;

    // Oblicz normę godzin dla pełnego etatu
    const monthlyHoursNorm = calculateMonthlyHoursNorm(workDaysCount);

    // Parsuj opening_hours z JSON jeśli dostępne
    const openingHoursFromSettings =
        typeof input.settings.opening_hours === "string"
            ? JSON.parse(input.settings.opening_hours)
            : input.settings.opening_hours;

    // Helper function dla pojedynczego dnia
    const getDayHours = (
        dayName: string,
        defaultOpen = "08:00",
        defaultClose = "20:00",
    ) => {
        // Jeśli mamy opening_hours, użyj ich
        if (
            openingHoursFromSettings &&
            typeof openingHoursFromSettings === "object"
        ) {
            const dayHours = openingHoursFromSettings[dayName];
            if (dayHours && typeof dayHours === "object") {
                // Sprawdź czy dzień jest włączony (enabled)
                if ("enabled" in dayHours && !dayHours.enabled) {
                    return { open: null, close: null }; // Zamknięte
                }
                // Jeśli są godziny otwarcia, użyj ich
                if (dayHours.open && dayHours.close) {
                    return {
                        open: formatTime(dayHours.open),
                        close: formatTime(dayHours.close),
                    };
                }
            }
        }

        // Fallback do store_open_time/store_close_time
        return {
            open: input.settings.store_open_time
                ? formatTime(input.settings.store_open_time)
                : defaultOpen,
            close: input.settings.store_close_time
                ? formatTime(input.settings.store_close_time)
                : defaultClose,
        };
    };

    return {
        year: input.year,
        month: input.month,
        monthly_hours_norm: monthlyHoursNorm,
        employees: input.employees.map((emp) =>
            transformEmployeeToPython(emp, monthlyHoursNorm, totalWorkableDays),
        ),
        templates: input.templates.map(transformTemplateToPython),
        holidays: input.holidays.map((hol) => ({
            date: hol.date,
            name: hol.localName || hol.name,
        })),
        work_days: input.workDays || [],
        saturday_days: input.saturdayDays || [],
        trading_sundays: input.tradingSundays || [],
        template_assignments_map: input.templateAssignmentsMap
            ? Object.fromEntries(input.templateAssignmentsMap)
            : {},
        organization_settings: {
            min_employees_per_shift:
                input.settings.min_employees_per_shift || 1,
            enable_trading_sundays: input.tradingSundays.length > 0,
            store_open_time: input.settings.store_open_time
                ? formatTime(input.settings.store_open_time)
                : "08:00",
            store_close_time: input.settings.store_close_time
                ? formatTime(input.settings.store_close_time)
                : "20:00",
            opening_hours: {
                monday: getDayHours("monday"),
                tuesday: getDayHours("tuesday"),
                wednesday: getDayHours("wednesday"),
                thursday: getDayHours("thursday"),
                friday: getDayHours("friday"),
                saturday: getDayHours("saturday", "08:00", "16:00"),
                sunday: { open: null, close: null },
            },
        },
    };
}

/**
 * Konwertuje SchedulerInput do formatu CP-SAT
 */
export function transformInputForCPSAT(input: SchedulerInput): CPSATInput {
    const workDaysCount = input.workDays.length;

    // Oblicz normę godzin dla pełnego etatu
    const monthlyHoursNorm = calculateMonthlyHoursNorm(workDaysCount);

    // Parsuj opening_hours z JSON jeśli dostępne
    const openingHoursFromSettings =
        typeof input.settings.opening_hours === "string"
            ? JSON.parse(input.settings.opening_hours)
            : input.settings.opening_hours;

    // Helper function dla pojedynczego dnia
    const getDayHours = (
        dayName: string,
        defaultOpen = "08:00",
        defaultClose = "20:00",
    ) => {
        // Jeśli mamy opening_hours, użyj ich
        if (
            openingHoursFromSettings &&
            typeof openingHoursFromSettings === "object"
        ) {
            const dayHours = openingHoursFromSettings[dayName];
            if (dayHours && typeof dayHours === "object") {
                // Sprawdź czy dzień jest włączony (enabled)
                if ("enabled" in dayHours && !dayHours.enabled) {
                    return { open: null, close: null }; // Zamknięte
                }
                // Jeśli są godziny otwarcia, użyj ich
                if (dayHours.open && dayHours.close) {
                    return {
                        open: formatTime(dayHours.open),
                        close: formatTime(dayHours.close),
                    };
                }
            }
        }

        // Fallback do store_open_time/store_close_time
        return {
            open: input.settings.store_open_time
                ? formatTime(input.settings.store_open_time)
                : defaultOpen,
            close: input.settings.store_close_time
                ? formatTime(input.settings.store_close_time)
                : defaultClose,
        };
    };

    return {
        year: input.year,
        month: input.month,
        monthly_hours_norm: monthlyHoursNorm,
        organization_settings: {
            min_employees_per_shift:
                input.settings.min_employees_per_shift || 1,
            enable_trading_sundays: input.tradingSundays.length > 0,
            opening_hours: {
                monday: getDayHours("monday"),
                tuesday: getDayHours("tuesday"),
                wednesday: getDayHours("wednesday"),
                thursday: getDayHours("thursday"),
                friday: getDayHours("friday"),
                saturday: getDayHours("saturday", "08:00", "16:00"), // Sobota krótsza
                sunday: { open: null, close: null }, // Zamknięte (chyba że trading_sunday)
            },
        },
        shift_templates: input.templates.map(transformTemplateToCPSAT),
        employees: input.employees.map((emp) =>
            transformEmployeeToCPSAT(emp, monthlyHoursNorm),
        ),
        employee_preferences: input.employees
            .filter((emp) => emp.preferences)
            .map((emp) => ({
                employee_id: emp.id,
                preferred_start_time: emp.preferences?.preferred_start_time
                    ? formatTime(emp.preferences.preferred_start_time)
                    : undefined,
                preferred_end_time: emp.preferences?.preferred_end_time
                    ? formatTime(emp.preferences.preferred_end_time)
                    : undefined,
                max_hours_per_day: emp.preferences?.max_hours_per_day,
                max_hours_per_week: emp.preferences?.max_hours_per_week,
                can_work_weekends: emp.preferences?.can_work_weekends !== false,
                can_work_holidays: emp.preferences?.can_work_holidays !== false,
                preferred_days: emp.preferences?.preferred_days || [],
                unavailable_days: emp.preferences?.unavailable_days || [],
            })),
        employee_absences: input.employees.flatMap((emp) =>
            (emp.absences || []).map((abs) => ({
                employee_id: emp.id,
                start_date: abs.start_date,
                end_date: abs.end_date,
                absence_type: abs.absence_type,
            })),
        ),
        scheduling_rules: {
            max_consecutive_days: 6,
            min_daily_rest_hours: 11,
            max_weekly_work_hours: 48,
        },
        trading_sundays: input.tradingSundays.map((date) => ({
            date,
            is_active: true,
        })),
        solver_time_limit: 300,
    };
}
