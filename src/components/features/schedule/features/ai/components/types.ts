/**
 * =============================================================================
 * AI GENERATE DIALOG - TYPY
 * =============================================================================
 */

/**
 * Wygenerowana zmiana
 */
export interface GeneratedShift {
    employee_id: string;
    date: string;
    start_time: string;
    end_time: string;
    break_minutes: number;
    template_id?: string;
}

/**
 * Liczba zmian per szablon
 */
export interface TemplateShiftCount {
    templateId: string;
    templateName: string;
    templateColor: string;
    templateStartTime: string;
    count: number;
}

/**
 * Statystyki pracownika
 */
export interface EmployeeStats {
    employeeId: string;
    employeeName: string;
    totalShifts: number;
    totalHours: number;
    requiredHours: number;
    hoursDiff: number;
    absenceHours?: number; // Godziny "zjedzone" przez nieobecności
    weekendShifts: number;
    morningShifts: number;
    afternoonShifts: number;
    eveningShifts: number;
    shiftsByTemplate?: TemplateShiftCount[];
    violations: string[];
}

/**
 * Informacje o optymalizacji
 */
export interface OptimizationInfo {
    enabled: boolean;
    mode: string;
    improvementPercent?: number;
    executionTimeMs?: number;
    generationsRun?: number;
    explanations?: string[];
    qualityBefore?: number;
    qualityAfter?: number;
}

/**
 * Jakość grafiku
 */
export interface ScheduleQuality {
    qualityPercent: number;
    totalFitness: number;
    emptyDays: number;
    understaffedShifts: number;
    hoursImbalance: number;
    weekendImbalance: number;
    warnings: string[];
}
