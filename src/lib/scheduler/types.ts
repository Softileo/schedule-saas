/**
 * =============================================================================
 * TYPY I STAŁE DLA SYSTEMU HARMONOGRAMOWANIA
 * =============================================================================
 */

import type {
    Employee,
    ShiftTemplate,
    OrganizationSettings,
    EmployeePreferences,
    EmployeeAbsence,
    PublicHoliday,
} from "@/types";

// =============================================================================
// STAŁE ZGODNE Z POLSKIM KODEKSEM PRACY
// =============================================================================

/**
 * Re-eksport z centralnego pliku labor-code.ts
 * WAŻNE: Wszystkie zmiany w wartościach Kodeksu Pracy należy wprowadzać
 * w pliku @/lib/constants/labor-code.ts
 */
export { POLISH_LABOR_CODE } from "@/lib/constants/labor-code";

// =============================================================================
// TYPY GŁÓWNE
// =============================================================================

/** Rozszerzony typ pracownika z danymi kontekstowymi */
export interface EmployeeWithData extends Employee {
    preferences?: EmployeePreferences | null;
    absences?: EmployeeAbsence[];
    templateAssignments?: string[];
}

/** Wygenerowana zmiana (przed zapisem do bazy) */
export interface GeneratedShift {
    employee_id: string;
    date: string; // YYYY-MM-DD
    start_time: string; // HH:MM
    end_time: string; // HH:MM
    break_minutes: number;
    template_id?: string;
}

/** Rozkład zmian według pory dnia dla pracownika */
export interface ShiftTypeDistribution {
    morning: number;
    afternoon: number;
    evening: number;
}

/** Historia zmian pracownika w kwartale (do wyrównywania) */
export interface QuarterlyShiftHistory {
    /** Mapa: employee_id -> liczba zmian w poprzednich miesiącach kwartału */
    shiftsPerEmployee: Map<string, number>;
    /** Mapa: employee_id -> suma godzin w poprzednich miesiącach kwartału */
    hoursPerEmployee: Map<string, number>;
    /** Mapa: employee_id -> rozkład zmian rano/popołudnie/wieczór */
    shiftTypeDistribution: Map<string, ShiftTypeDistribution>;
    /** Średnia liczba zmian na pracownika w kwartale (do tej pory) */
    averageShifts: number;
    /** Średnia liczba godzin na pracownika w kwartale (do tej pory) */
    averageHours: number;
    /** Średni rozkład typów zmian na pracownika */
    averageShiftTypes: ShiftTypeDistribution;
}

/** Dane wejściowe do generatora */
export interface SchedulerInput {
    year: number;
    month: number;
    employees: EmployeeWithData[];
    templates: ShiftTemplate[];
    settings: OrganizationSettings;
    holidays: PublicHoliday[];
    workDays: string[];
    saturdayDays: string[];
    tradingSundays: string[];
    templateAssignmentsMap: Map<string, string[]>;
    /** Historia zmian z poprzednich miesięcy kwartału (opcjonalne) */
    quarterlyHistory?: QuarterlyShiftHistory;
}

/** Typy zmian według pory dnia */
export type ShiftTimeType = "morning" | "afternoon" | "evening";

/** Stan pracownika podczas generowania */
export interface EmployeeScheduleState {
    emp: EmployeeWithData;
    requiredHours: number;
    currentHours: number;
    shifts: GeneratedShift[];
    weekendShiftCount: number;
    saturdayShiftCount: number;
    sundayShiftCount: number;
    morningShiftCount: number;
    afternoonShiftCount: number;
    eveningShiftCount: number;
    availableTemplates: ShiftTemplate[];
    occupiedDates: Set<string>;
    lastShiftType: ShiftTimeType | null;
    consecutiveShiftDays: number;
    lastShiftTemplate: ShiftTemplate | null;
    lastShiftDate: string | null;
    lastShiftEndTime: string | null;
    consecutiveWorkDays: number;
    /** Liczba zmian w poprzednich miesiącach kwartału */
    quarterlyShiftCount: number;
    /** Suma godzin w poprzednich miesiącach kwartału */
    quarterlyHours: number;
    /** Rozkład typów zmian z poprzednich miesięcy kwartału */
    quarterlyShiftTypes: ShiftTypeDistribution;
}

/** Uproszczony stan pracownika dla modułu staffing */
export interface EmployeeState {
    requiredHours: number;
    assignedHours: number;
    occupiedDates: Set<string>;
    assignedShifts: { date: string; template: ShiftTemplate }[];
}
