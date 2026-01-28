/**
 * =============================================================================
 * GREEDY SCHEDULER - TYPY I HELPERY
 * =============================================================================
 *
 * Wydzielone typy i funkcje pomocnicze dla GreedyScheduler.
 * Pozwala na lepszą organizację kodu i łatwiejsze testowanie.
 */

import type { ShiftTemplate } from "@/types";
import type { GeneratedShift, EmployeeScheduleState } from "../types";
import { getTemplateHours } from "../scheduler-utils";

// =============================================================================
// TYPY
// =============================================================================

/**
 * Wynik optymalizacji pojedynczego pracownika
 */
export interface OptimizationResult {
    swapped: boolean;
    added: boolean;
}

/**
 * Kandydat do obsadzenia zmiany
 */
export interface ShiftCandidate {
    employeeId: string;
    score: number;
    state: EmployeeScheduleState;
}

/**
 * Statystyki dnia
 */
export interface DayStats {
    date: string;
    totalShifts: number;
    shiftsPerTemplate: Map<string, number>;
    isWeekend: boolean;
    isTradingSunday: boolean;
}

// =============================================================================
// FUNKCJE POMOCNICZE - SORTOWANIE
// =============================================================================

/**
 * Sortuje szablony od najkrótszego do najdłuższego
 */
export function sortTemplatesByDuration(
    templates: ShiftTemplate[],
): ShiftTemplate[] {
    return [...templates].sort(
        (a, b) => getTemplateHours(a) - getTemplateHours(b),
    );
}

/**
 * Sortuje szablony od najdłuższego do najkrótszego
 */
export function sortTemplatesByDurationDesc(
    templates: ShiftTemplate[],
): ShiftTemplate[] {
    return [...templates].sort(
        (a, b) => getTemplateHours(b) - getTemplateHours(a),
    );
}

/**
 * Sortuje dni od najmniej do najbardziej obsadzonego
 */
export function sortDaysByStaffing(
    dailyStaffing: Map<string, GeneratedShift[]>,
    days: string[],
): string[] {
    return [...days].sort((a, b) => {
        const aStaff = dailyStaffing.get(a)?.length || 0;
        const bStaff = dailyStaffing.get(b)?.length || 0;
        return aStaff - bStaff;
    });
}

// =============================================================================
// FUNKCJE POMOCNICZE - KALKULACJE
// =============================================================================

/**
 * Oblicza deficyt godzin pracownika
 */
export function calculateHoursDeficit(state: EmployeeScheduleState): number {
    return state.requiredHours - state.currentHours;
}

export function getCurrentBillingPeriod() {
    const now = new Date();
    return {
        year: now.getUTCFullYear(),
        month: now.getUTCMonth() + 1, // 1–12
    };
}

/**
 * Oblicza nadwyżkę godzin pracownika
 */
export function calculateHoursSurplus(state: EmployeeScheduleState): number {
    return state.currentHours - state.requiredHours;
}

/**
 * Sprawdza czy pracownik ma znaczący deficyt godzin (>2h)
 */
export function hasSignificantDeficit(state: EmployeeScheduleState): boolean {
    return calculateHoursDeficit(state) > 2;
}

/**
 * Oblicza współczynnik wykorzystania godzin (0-1+)
 */
export function calculateHoursUtilization(
    state: EmployeeScheduleState,
): number {
    if (state.requiredHours === 0) return 1;
    return state.currentHours / state.requiredHours;
}

// =============================================================================
// FUNKCJE POMOCNICZE - FILTROWANIE
// =============================================================================

/**
 * Filtruje pracowników z deficytem godzin
 */
export function filterEmployeesWithDeficit(
    states: Map<string, EmployeeScheduleState>,
    minDeficit: number = 2,
): EmployeeScheduleState[] {
    const result: EmployeeScheduleState[] = [];
    for (const state of states.values()) {
        if (calculateHoursDeficit(state) > minDeficit) {
            result.push(state);
        }
    }
    return result;
}

/**
 * Filtruje pracowników z nadwyżką godzin
 */
export function filterEmployeesWithSurplus(
    states: Map<string, EmployeeScheduleState>,
    minSurplus: number = 2,
): EmployeeScheduleState[] {
    const result: EmployeeScheduleState[] = [];
    for (const state of states.values()) {
        if (calculateHoursSurplus(state) > minSurplus) {
            result.push(state);
        }
    }
    return result;
}

// =============================================================================
// FUNKCJE POMOCNICZE - LOGGING
// =============================================================================

/**
 * Formatuje statystyki pracownika do logu
 */
export function formatEmployeeStats(state: EmployeeScheduleState): string {
    const deficit = calculateHoursDeficit(state);
    const status =
        deficit > 0
            ? `deficyt ${deficit.toFixed(1)}h`
            : deficit < 0
              ? `nadwyżka ${Math.abs(deficit).toFixed(1)}h`
              : "OK";
    return `${state.emp.first_name} ${
        state.emp.last_name
    }: ${state.currentHours.toFixed(1)}h/${state.requiredHours}h (${status})`;
}

/**
 * Formatuje podsumowanie obsady dnia
 */
export function formatDayStaffing(
    day: string,
    shifts: GeneratedShift[],
    minRequired: number,
): string {
    const status = shifts.length >= minRequired ? "✅" : "⚠️";
    return `${status} ${day}: ${shifts.length}/${minRequired} pracowników`;
}
