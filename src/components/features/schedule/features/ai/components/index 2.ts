// Typy dla AI Generator Dialog

export interface GeneratedShift {
    employee_id: string;
    start_time: string;
    end_time: string;
    date: string;
}

export interface EmployeeStats {
    employee_id: string;
    name: string;
    scheduled_hours: number;
    required_hours: number;
    shifts_count: number;
    violations?: Array<{ type: string; description: string }>;
    hoursDiff?: number;
}

export interface OptimizationInfo {
    enabled: boolean;
    mode: string;
    executionTimeMs: number;
    improvementPercent?: number;
    explanations: string[];
}

export interface ScheduleQuality {
    qualityPercent: number;
    totalFitness: number;
    emptyDays: number;
    understaffedShifts: number;
    hoursImbalance: number;
    weekendImbalance: number;
    warnings: string[];
}

export { WarningsPanel } from "./warnings-panel";
