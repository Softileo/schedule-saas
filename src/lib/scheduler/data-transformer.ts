/**
 * =============================================================================
 * DATA TRANSFORMER - DRY PRINCIPLE
 * =============================================================================
 *
 * Centralized data transformation utilities for Python API integration.
 * All data formatting, calculations, and transformations in one place.
 */

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
    start_time: string;
    end_time: string;
    break_minutes: number;
    days_of_week: string[];
    is_weekend: boolean;
    min_employees: number;
    max_employees: number | null;
    color: string;
}

export interface PythonInput {
    year: number;
    month: number;
    monthly_hours_norm: number;
    employees: PythonEmployee[];
    templates: PythonTemplate[];
    settings: {
        work_days_per_week: number;
        enforce_daily_rest: boolean;
        enforce_weekly_rest: boolean;
        max_consecutive_work_days: number;
        min_staff_per_shift: number;
        max_sunday_shifts_per_month: number;
        balance_shift_distribution: boolean;
    };
    holidays: Array<{
        date: string;
        name: string;
    }>;
    work_days: string[];
    saturday_days: string[];
    trading_sundays: string[];
    template_assignments_map: Record<string, string[]>;
}

export interface CPSATEmployee {
    id: string;
    first_name: string;
    last_name: string;
    position?: string | null;
    employment_type: string;
    custom_hours?: number | null;
    is_active: boolean;
    color?: string | null;
}

export interface CPSATTemplate {
    id: string;
    name: string;
    start_time: string;
    end_time: string;
    break_minutes: number;
    min_employees: number;
    max_employees: number | null;
    color?: string | null;
    applicable_days?: string[] | null;
}

export interface CPSATInput {
    year: number;
    month: number;
    monthly_hours_norm: number;
    organization_settings: {
        store_open_time?: string;
        store_close_time?: string;
        min_employees_per_shift?: number;
        enable_trading_sundays?: boolean;
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
 * Python API expects HH:MM format
 */
export function formatTime(time: string): string {
    if (!time) return "00:00";
    const parts = time.split(":");
    if (parts.length === 2) return time; // Already HH:MM
    return time.substring(0, 5); // Strip seconds from HH:MM:SS
}

/**
 * Oblicza normę godzin dla pełnego etatu w danym miesiącu
 * Bazuje na liczbie dni roboczych + soboty + handlowe niedziele
 */
export function calculateMonthlyHoursNorm(
    workDaysCount: number,
    saturdayCount: number,
    tradingSundayCount: number,
): number {
    // Każdy dzień roboczy = 8h dla pełnego etatu
    return (workDaysCount + saturdayCount + tradingSundayCount) * 8;
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
 * Bazuje na normie miesięcznej i typie zatrudnienia + 20% buffer
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
            maxHours: customMonthlyHours * 1.2, // 20% buffer
            customMonthlyHours,
        };
    }

    // Dla standardowych etatów: norma miesięczna * mnożnik + 20% buffer
    const multiplier =
        EMPLOYMENT_TYPE_MULTIPLIERS[employmentType || "full"] || 1.0;
    return {
        maxHours: monthlyHoursNorm * multiplier * 1.2,
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
        start_time: formatTime(tmpl.start_time),
        end_time: formatTime(tmpl.end_time),
        break_minutes: tmpl.break_minutes || 0,
        days_of_week: tmpl.applicable_days || [],
        is_weekend: false, // Can calculate based on applicable_days if needed
        min_employees: tmpl.min_employees || 1,
        max_employees: tmpl.max_employees || null,
        color: tmpl.color || "#3b82f6",
    };
}

/**
 * Konwertuje pracownika do formatu CP-SAT
 */
export function transformEmployeeToCPSAT(emp: EmployeeWithData): CPSATEmployee {
    return {
        id: emp.id,
        first_name: emp.first_name,
        last_name: emp.last_name,
        position: emp.position,
        employment_type: emp.employment_type || "full",
        custom_hours: emp.custom_hours,
        is_active: emp.is_active !== false,
        color: emp.color,
    };
}

/**
 * Konwertuje template do formatu CP-SAT
 */
export function transformTemplateToCPSAT(tmpl: ShiftTemplate): CPSATTemplate {
    return {
        id: tmpl.id,
        name: tmpl.name,
        start_time: formatTime(tmpl.start_time),
        end_time: formatTime(tmpl.end_time),
        break_minutes: tmpl.break_minutes || 0,
        min_employees: tmpl.min_employees || 1,
        max_employees: tmpl.max_employees,
        color: tmpl.color,
        applicable_days: tmpl.applicable_days,
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
    const monthlyHoursNorm = calculateMonthlyHoursNorm(
        workDaysCount,
        saturdayCount,
        tradingSundayCount,
    );

    return {
        year: input.year,
        month: input.month,
        monthly_hours_norm: monthlyHoursNorm,
        employees: input.employees.map((emp) =>
            transformEmployeeToPython(emp, monthlyHoursNorm, totalWorkableDays),
        ),
        templates: input.templates.map(transformTemplateToPython),
        settings: {
            work_days_per_week: 5,
            enforce_daily_rest: true,
            enforce_weekly_rest: true,
            max_consecutive_work_days: 6,
            min_staff_per_shift: input.settings.min_employees_per_shift || 1,
            max_sunday_shifts_per_month: 2,
            balance_shift_distribution: true,
        },
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
    };
}

/**
 * Konwertuje SchedulerInput do formatu CP-SAT
 */
export function transformInputForCPSAT(input: SchedulerInput): CPSATInput {
    const workDaysCount = input.workDays.length;
    const saturdayCount = input.saturdayDays.length;
    const tradingSundayCount = input.tradingSundays.length;

    // Oblicz normę godzin dla pełnego etatu
    const monthlyHoursNorm = calculateMonthlyHoursNorm(
        workDaysCount,
        saturdayCount,
        tradingSundayCount,
    );

    return {
        year: input.year,
        month: input.month,
        monthly_hours_norm: monthlyHoursNorm,
        organization_settings: {
            // ⚠️ IMPORTANT: These should come from input.settings (from database)
            store_open_time: input.settings.store_open_time
                ? formatTime(input.settings.store_open_time)
                : "08:00",
            store_close_time: input.settings.store_close_time
                ? formatTime(input.settings.store_close_time)
                : "20:00",
            min_employees_per_shift:
                input.settings.min_employees_per_shift || 1,
            enable_trading_sundays: input.tradingSundays.length > 0,
        },
        shift_templates: input.templates.map(transformTemplateToCPSAT),
        employees: input.employees.map(transformEmployeeToCPSAT),
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
