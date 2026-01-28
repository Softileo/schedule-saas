/**
 * =============================================================================
 * GREEDY SCHEDULER - KONFIGURACJA I STAŁE
 * =============================================================================
 *
 * Centralna konfiguracja algorytmu Greedy Scheduler.
 * Wszystkie "magic numbers" w jednym miejscu.
 */

import {
    MIN_DAILY_REST_HOURS,
    RECOMMENDED_MAX_CONSECUTIVE_WORK_DAYS,
    RECOMMENDED_WEEKLY_OVERTIME_HOURS,
    SIGNIFICANT_HOURS_DEFICIT as LABOR_CODE_HOURS_DEFICIT,
    SIGNIFICANT_HOURS_SURPLUS as LABOR_CODE_HOURS_SURPLUS,
    HOURS_TOLERANCE as LABOR_CODE_HOURS_TOLERANCE,
} from "@/lib/constants/labor-code";

// Re-export dla backward compatibility
export { MIN_DAILY_REST_HOURS };

/**
 * Maksymalna liczba dni pracy pod rząd (polityka firmy, nie KP)
 */
export const MAX_CONSECUTIVE_WORK_DAYS = RECOMMENDED_MAX_CONSECUTIVE_WORK_DAYS;

/**
 * Tygodniowy limit nadgodzin (heurystyka)
 */
export const MAX_WEEKLY_OVERTIME_HOURS = RECOMMENDED_WEEKLY_OVERTIME_HOURS;

// =============================================================================
// PARAMETRY ALGORYTMU
// =============================================================================

/**
 * Minimalna liczba prób awaryjnego staffingu
 */
export const EMERGENCY_STAFFING_ATTEMPTS = 20;

/**
 * Próg deficytu godzin uznawany za znaczący
 */
export const SIGNIFICANT_HOURS_DEFICIT = LABOR_CODE_HOURS_DEFICIT;

/**
 * Próg nadwyżki godzin uznawany za znaczący
 */
export const SIGNIFICANT_HOURS_SURPLUS = LABOR_CODE_HOURS_SURPLUS;

/**
 * Próg optymalizacji - ile godzin różnicy uzasadnia swap
 */
export const SWAP_HOURS_THRESHOLD = LABOR_CODE_HOURS_TOLERANCE;

// =============================================================================
// WAGI SCORINGU (dla findBestCandidate)
// =============================================================================

/**
 * Wagi używane przy obliczaniu score kandydata
 * @deprecated Use SCORING_CONFIG instead for new engine
 */
export const SCORING_WEIGHTS = {
    /** Waga deficytu godzin */
    HOURS_DEFICIT: 10,
    /** Waga preferowanej zmiany */
    PREFERRED_SHIFT: 5,
    /** Waga za dostępność w preferencjach */
    AVAILABILITY: 3,
    /** Kara za przekroczenie godzin */
    OVERTIME_PENALTY: -15,
    /** Kara za złamanie odpoczynku dobowego */
    REST_VIOLATION_PENALTY: -100,
    /** Bonus za równomierne rozłożenie zmian */
    BALANCE_BONUS: 2,
    /** Kara za pracę w weekend (jeśli nie preferuje) */
    WEEKEND_PENALTY: -3,
} as const;

/**
 * ZAAWANSOWANA KONFIGURACJA PUNKTACJI (v2)
 * Używana przez scoring-engine.ts
 */
export const SCORING_CONFIG = {
    ASSIGNED_TEMPLATE: {
        PRIORITY_VERY_HIGH: 500000, // 1-2 templates
        PRIORITY_HIGH: 200000, // 3-4 templates
        PRIORITY_STANDARD: 50000,
        NOT_ASSIGNED_PENALTY: -100000,
        BALANCE_BONUS: 30000,
        BALANCE_PENALTY: 20000,
        FIRST_SHIFT_BONUS: 10000,
    },
    HOURS: {
        ALREADY_MET_PENALTY: -100000,
        OVERTIME_PENALTY: -50000,
        PERFECT_MATCH: 15000, // Deficit <= 0.5h
        NEAR_MATCH: 8000, // Deficit <= 2h
        CLOSE_MATCH: 5000, // Deficit <= 4h
        DEFICIT_MULTIPLIER: 30,
        FUTURE_MATCH_BONUS: 3000,
    },
    WEEKEND: {
        SATURDAY_MAX_PENALTY: 15000,
        SATURDAY_PENALTY: 2000,
        SUNDAY_MAX_PENALTY: 20000,
        SUNDAY_PENALTY: 3000,
        WEEKEND_PENALTY: 100,
    },
    PREFERENCES: {
        PREFERRED_DAY: 2000,
    },
    SHIFT_TYPE_BALANCE: {
        KICKSTART_BONUS: 2000,
        DOMINANCE_PENALTY_HARD: 80000, // > 5% off
        DOMINANCE_PENALTY_SOFT: 25000, // (unused in code but implicit concept)
        MINORITY_BONUS: 30000,
    },
    START_TIME_BALANCE: {
        DOMINANCE_PENALTY: 60000, // > 10% off
        MINORITY_BONUS: 20000, // < -10% off
        REPETITION_PENALTY: 5000, // Per occurrence > 8
        MAX_REPETITIONS: 8,
    },
    QUARTERLY: {
        DEFICIT_BONUS_MULTIPLIER: 25000,
        IMBALANCE_PENALTY_MULTIPLIER: 15000,
        SHIFT_DEFICIT_BONUS: 2000,
        SHIFT_SURPLUS_PENALTY: 1500,
        HOURS_DEFICIT_BONUS: 100,
        HOURS_SURPLUS_PENALTY: 80,
    },
    DAY_STAFFING: {
        OVER_STAFFING_PENALTY: 500,
        UNDER_STAFFING_BONUS: 200,
    },
    CONTINUITY: {
        TEMPLATE_CONTINUITY_BONUS: 10,
    },
} as const;

// =============================================================================
// TYPY KONFIGURACJI
// =============================================================================

export interface GreedySchedulerConfig {
    /** Minimalny odpoczynek dobowy */
    minDailyRestHours: number;
    /** Maksymalna liczba dni pracy pod rząd */
    maxConsecutiveWorkDays: number;
    /** Próg znaczącego deficytu godzin */
    significantHoursDeficit: number;
    /** Włącz szczegółowe logi */
    verbose: boolean;
}

/**
 * Domyślna konfiguracja schedulera
 */
export const DEFAULT_SCHEDULER_CONFIG: GreedySchedulerConfig = {
    minDailyRestHours: MIN_DAILY_REST_HOURS,
    maxConsecutiveWorkDays: MAX_CONSECUTIVE_WORK_DAYS,
    significantHoursDeficit: SIGNIFICANT_HOURS_DEFICIT,
    verbose: false,
};

// =============================================================================
// FUNKCJE POMOCNICZE KONFIGURACJI
// =============================================================================

/**
 * Tworzy konfigurację schedulera z nadpisaniami
 */
export function createSchedulerConfig(
    overrides?: Partial<GreedySchedulerConfig>,
): GreedySchedulerConfig {
    return {
        ...DEFAULT_SCHEDULER_CONFIG,
        ...overrides,
    };
}

/**
 * Sprawdza czy czas odpoczynku spełnia wymagania prawne
 */
export function meetsRestRequirement(restHours: number): boolean {
    return restHours >= MIN_DAILY_REST_HOURS;
}

/**
 * Sprawdza czy liczba dni pracy pod rząd jest dozwolona
 */
export function meetsConsecutiveDaysLimit(consecutiveDays: number): boolean {
    return consecutiveDays <= MAX_CONSECUTIVE_WORK_DAYS;
}
