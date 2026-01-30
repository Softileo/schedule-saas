/**
 * =============================================================================
 * KLIENT API - PYTHON SCHEDULER SERVICE
 * =============================================================================
 *
 * Komunikacja z serwisem Python na Google Cloud Run
 */

import type { SchedulerInput, GeneratedShift } from "@/lib/scheduler/types";
import type { ScheduleMetrics } from "@/lib/scheduler/evaluator";
import { logger } from "@/lib/utils/logger";

// =============================================================================
// KONFIGURACJA - RÓŻNE ŚRODOWISKA
// =============================================================================

const isDevelopment = process.env.NODE_ENV === "development";

const PYTHON_SCHEDULER_URL = isDevelopment
    ? process.env.PYTHON_SCHEDULER_URL_DEV || "http://localhost:8080"
    : process.env.PYTHON_SCHEDULER_URL ||
      process.env.NEXT_PUBLIC_PYTHON_SCHEDULER_URL;

const PYTHON_SCHEDULER_API_KEY = isDevelopment
    ? process.env.PYTHON_SCHEDULER_API_KEY_DEV || "schedule-saas-local-dev-2026"
    : process.env.PYTHON_SCHEDULER_API_KEY;

// =============================================================================
// TYPY
// =============================================================================

export interface GeneticConfig {
    populationSize?: number;
    generations?: number;
    mutationRate?: number;
    crossoverRate?: number;
    eliteCount?: number;
    tournamentSize?: number;
    timeoutMs?: number;
    useORTools?: boolean; // Użyj OR-Tools CP-SAT (domyślnie true)
}

/**
 * Metryki zwracane przez Python API (różnią się od TypeScript ScheduleMetrics)
 */
export interface PythonScheduleMetrics {
    fitness: number;
    total_shifts: number;
    employees_count: number;
    hours_balance: number;
    shift_balance: number;
    weekend_balance: number;
    preferences_score: number;
    shift_type_balance: number;
    labor_code_score: number;
}

interface OptimizeResponse {
    success: boolean;
    data?: {
        shifts: GeneratedShift[];
        metrics: PythonScheduleMetrics;
        improvement: {
            initial: PythonScheduleMetrics;
            final: PythonScheduleMetrics;
            improvementPercent: number;
        };
    };
    error?: string;
}

interface ValidateResponse {
    success: boolean;
    data?: {
        violations: Array<{
            employee_id: string;
            date: string;
            rule: string;
            description: string;
            severity: "error" | "warning";
        }>;
        metrics: PythonScheduleMetrics;
        isValid: boolean;
    };
    error?: string;
}

interface EvaluateResponse {
    success: boolean;
    data?: PythonScheduleMetrics;
    error?: string;
}

// =============================================================================
// HELPER
// =============================================================================

function isPythonSchedulerEnabled(): boolean {
    return !!(PYTHON_SCHEDULER_URL && PYTHON_SCHEDULER_API_KEY);
}

/**
 * Transform Next.js SchedulerInput to Python API format
 */
function transformInputForPython(input: SchedulerInput): unknown {
    // Helper to get weekly hours based on employment type
    const getWeeklyHours = (
        employmentType: string | null,
        customHours: number | null,
    ): number => {
        switch (employmentType) {
            case "full":
                return 40;
            case "half":
                return 20;
            case "three_quarter":
                return 30; // 3/4 × 40 = 30h
            case "one_third":
                return 13.33; // 1/3 × 40 ≈ 13.33h
            case "custom":
                return customHours || 20;
            default:
                return 40;
        }
    };

    // Helper to convert time from HH:MM:SS to HH:MM (Python expects HH:MM)
    const formatTime = (time: string): string => {
        // If time is already in HH:MM format, return as is
        if (time.split(":").length === 2) return time;
        // If time is in HH:MM:SS format, strip seconds
        return time.substring(0, 5);
    };

    return {
        year: input.year,
        month: input.month,
        employees: input.employees.map((emp) => {
            const weeklyHours = getWeeklyHours(
                emp.employment_type,
                emp.custom_hours,
            );
            return {
                id: emp.id,
                name: `${emp.first_name} ${emp.last_name}`,
                email: emp.email || "",
                contract_type: emp.employment_type || "full",
                weekly_hours: weeklyHours,
                max_hours: weeklyHours * 1.2, // 20% buffer for overtime
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
        }),
        templates: input.templates.map((tmpl) => ({
            id: tmpl.id,
            name: tmpl.name,
            start_time: formatTime(tmpl.start_time),
            end_time: formatTime(tmpl.end_time),
            break_minutes: tmpl.break_minutes || 0,
            days_of_week: tmpl.applicable_days || [],
            is_weekend: false, // Calculate based on applicable_days if needed
            min_employees: tmpl.min_employees || 1,
            max_employees: tmpl.max_employees || null,
            color: tmpl.color || "#3b82f6",
        })),
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

async function callPythonAPI<T>(endpoint: string, body: unknown): Promise<T> {
    if (!isPythonSchedulerEnabled()) {
        throw new Error(
            "Python Scheduler Service is not configured. Set PYTHON_SCHEDULER_URL and PYTHON_SCHEDULER_API_KEY",
        );
    }

    const url = `${PYTHON_SCHEDULER_URL}${endpoint}`;

    logger.log(`🐍 Calling Python API: ${endpoint}`);

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-API-Key": PYTHON_SCHEDULER_API_KEY!,
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        logger.error(`Python API error: ${response.status} - ${errorText}`);
        throw new Error(
            `Python Scheduler API error: ${response.status} - ${errorText}`,
        );
    }

    return response.json();
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Generuje pełny grafik za pomocą Python API (Greedy + Genetic)
 */
export async function generateScheduleWithPython(
    input: SchedulerInput,
    config?: GeneticConfig,
): Promise<{
    shifts: GeneratedShift[];
    metrics: PythonScheduleMetrics;
    improvement: number;
}> {
    const transformedInput = transformInputForPython(input);

    // Konwertuj config z camelCase na snake_case dla Python API
    const pythonConfig = config
        ? {
              population_size: config.populationSize,
              generations: config.generations,
              mutation_rate: config.mutationRate,
              crossover_rate: config.crossoverRate,
              elite_count: config.eliteCount,
              tournament_size: config.tournamentSize,
              timeout_ms: config.timeoutMs,
          }
        : {};

    const response = await callPythonAPI<OptimizeResponse>("/api/generate", {
        input: transformedInput,
        config: pythonConfig,
    });

    if (!response.success || !response.data) {
        throw new Error(response.error || "Generation failed");
    }

    logger.log(
        `✅ Python generation complete. Improvement: ${response.data.improvement.improvementPercent.toFixed(2)}%`,
    );

    return {
        shifts: response.data.shifts,
        metrics: response.data.metrics,
        improvement: response.data.improvement.improvementPercent,
    };
}

/**
 * Optymalizuje grafik algorytmem genetycznym w Python
 */
export async function optimizeScheduleWithPython(
    shifts: GeneratedShift[],
    input: SchedulerInput,
    config?: GeneticConfig,
): Promise<{
    shifts: GeneratedShift[];
    metrics: PythonScheduleMetrics;
    improvement: number;
}> {
    const transformedInput = transformInputForPython(input);

    // Konwertuj config z camelCase na snake_case dla Python API
    const pythonConfig = config
        ? {
              population_size: config.populationSize,
              generations: config.generations,
              mutation_rate: config.mutationRate,
              crossover_rate: config.crossoverRate,
              elite_count: config.eliteCount,
              tournament_size: config.tournamentSize,
              timeout_ms: config.timeoutMs,
          }
        : {};

    const response = await callPythonAPI<OptimizeResponse>("/api/optimize", {
        shifts,
        input: transformedInput,
        config: pythonConfig,
    });

    if (!response.success || !response.data) {
        throw new Error(response.error || "Optimization failed");
    }

    logger.log(
        `✅ Python optimization complete. Improvement: ${response.data.improvement.improvementPercent.toFixed(2)}%`,
    );

    return {
        shifts: response.data.shifts,
        metrics: response.data.metrics,
        improvement: response.data.improvement.improvementPercent,
    };
}

/**
 * Waliduje grafik w Python
 */
export async function validateScheduleWithPython(
    shifts: GeneratedShift[],
    input: SchedulerInput,
): Promise<{
    violations: Array<{
        employee_id: string;
        date: string;
        rule: string;
        description: string;
        severity: "error" | "warning";
    }>;
    isValid: boolean;
    metrics: PythonScheduleMetrics;
}> {
    const transformedInput = transformInputForPython(input);

    const response = await callPythonAPI<ValidateResponse>("/api/validate", {
        shifts,
        input: transformedInput,
    });

    if (!response.success || !response.data) {
        throw new Error(response.error || "Validation failed");
    }

    return response.data;
}

/**
 * Ewaluuje jakość grafiku w Python
 */
export async function evaluateScheduleWithPython(
    shifts: GeneratedShift[],
    input: SchedulerInput,
): Promise<PythonScheduleMetrics> {
    const transformedInput = transformInputForPython(input);

    const response = await callPythonAPI<EvaluateResponse>("/api/evaluate", {
        shifts,
        input: transformedInput,
    });

    if (!response.success || !response.data) {
        throw new Error(response.error || "Evaluation failed");
    }

    return response.data;
}

/**
 * Health check Python service
 */
export async function checkPythonSchedulerHealth(): Promise<{
    healthy: boolean;
    version?: string;
    error?: string;
}> {
    if (!isPythonSchedulerEnabled()) {
        return {
            healthy: false,
            error: "Python Scheduler not configured",
        };
    }

    try {
        const response = await fetch(`${PYTHON_SCHEDULER_URL}/health`);

        if (!response.ok) {
            return {
                healthy: false,
                error: `HTTP ${response.status}`,
            };
        }

        const data = await response.json();

        return {
            healthy: data.status === "healthy",
            version: data.version,
        };
    } catch (error) {
        return {
            healthy: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Sprawdza czy Python scheduler jest dostępny
 */
export { isPythonSchedulerEnabled };

// =============================================================================
// CP-SAT OPTIMIZER (NEW)
// =============================================================================

interface CPSATGenerateInput {
    year: number;
    month: number;
    organization_settings: {
        store_open_time?: string;
        store_close_time?: string;
        min_employees_per_shift?: number;
        enable_trading_sundays?: boolean;
    };
    shift_templates: Array<{
        id: string;
        name: string;
        start_time: string;
        end_time: string;
        break_minutes: number;
        min_employees: number;
        max_employees: number | null;
        color?: string;
        applicable_days?: string[];
    }>;
    employees: Array<{
        id: string;
        first_name: string;
        last_name: string;
        position?: string;
        employment_type: string;
        custom_hours?: number;
        is_active: boolean;
        color?: string;
    }>;
    employee_preferences?: Array<{
        employee_id: string;
        preferred_start_time?: string;
        preferred_end_time?: string;
        max_hours_per_day?: number;
        max_hours_per_week?: number;
        can_work_weekends?: boolean;
        can_work_holidays?: boolean;
        preferred_days?: number[];
        unavailable_days?: number[];
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

interface CPSATGenerateResponse {
    status: "SUCCESS" | "INFEASIBLE" | "ERROR";
    shifts?: Array<{
        employee_id: string;
        employee_name: string;
        date: string;
        start_time: string;
        end_time: string;
        break_minutes: number;
        template_id: string;
        template_name: string;
        color?: string;
        notes?: string;
    }>;
    statistics?: {
        status: string;
        objective_value?: number;
        solve_time_seconds: number;
        total_shifts_assigned: number;
        total_variables: number;
        hard_constraints: number;
        soft_constraints: number;
        conflicts: number;
        branches: number;
    };
    year?: number;
    month?: number;
    error?: string;
    reasons?: string[];
    suggestions?: string[];
}

/**
 * Konwertuje dane z SchedulerInput do formatu CP-SAT
 */
function transformInputForCPSAT(input: SchedulerInput): CPSATGenerateInput {
    return {
        year: input.year,
        month: input.month,
        organization_settings: {
            store_open_time: "08:00:00",
            store_close_time: "20:00:00",
            min_employees_per_shift:
                input.settings.min_employees_per_shift || 1,
            enable_trading_sundays: input.tradingSundays.length > 0,
        },
        shift_templates: input.templates.map((tmpl) => ({
            id: tmpl.id,
            name: tmpl.name,
            start_time: formatTime(tmpl.start_time),
            end_time: formatTime(tmpl.end_time),
            break_minutes: tmpl.break_minutes || 0,
            min_employees: tmpl.min_employees || 1,
            max_employees: tmpl.max_employees || null,
            color: tmpl.color,
            applicable_days: tmpl.applicable_days || [],
        })),
        employees: input.employees.map((emp) => ({
            id: emp.id,
            first_name: emp.first_name,
            last_name: emp.last_name,
            position: emp.position,
            employment_type: emp.employment_type || "full",
            custom_hours: emp.custom_hours,
            is_active: emp.is_active !== false,
            color: emp.color,
        })),
        employee_preferences: input.employees
            .filter((emp) => emp.preferences)
            .map((emp) => ({
                employee_id: emp.id,
                preferred_start_time: emp.preferences?.preferred_start_time
                    ? formatTime(emp.preferences.preferred_start_time)
                    : undefined,
                max_hours_per_week: emp.preferences?.max_hours_per_week,
                can_work_weekends: emp.preferences?.can_work_weekends !== false,
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

/**
 * Generuje grafik z użyciem CP-SAT optimizer
 */
export async function generateScheduleWithCPSAT(
    input: SchedulerInput,
    timeLimit?: number,
): Promise<{
    shifts: GeneratedShift[];
    statistics: CPSATGenerateResponse["statistics"];
    status: string;
}> {
    const cpsatInput = transformInputForCPSAT(input);

    if (timeLimit) {
        cpsatInput.solver_time_limit = timeLimit;
    }

    logger.log(
        `🔧 Calling CP-SAT optimizer (time limit: ${timeLimit || 300}s)`,
    );

    const response = await callPythonAPI<CPSATGenerateResponse>(
        "/api/generate",
        cpsatInput,
    );

    if (response.status === "SUCCESS" && response.shifts) {
        logger.log(
            `✅ CP-SAT generation successful: ${response.shifts.length} shifts in ${response.statistics?.solve_time_seconds}s`,
        );

        // Konwertuj zmiany do formatu GeneratedShift
        const shifts: GeneratedShift[] = response.shifts.map((shift) => ({
            employee_id: shift.employee_id,
            date: shift.date,
            start_time: shift.start_time,
            end_time: shift.end_time,
            break_minutes: shift.break_minutes,
            template_id: shift.template_id,
            color: shift.color,
            notes: shift.notes || undefined,
        }));

        return {
            shifts,
            statistics: response.statistics,
            status: response.status,
        };
    } else if (response.status === "INFEASIBLE") {
        logger.error(`❌ CP-SAT INFEASIBLE: ${response.reasons?.join(", ")}`);
        throw new Error(
            `Schedule is infeasible: ${response.reasons?.join(", ") || "Unknown reasons"}. Suggestions: ${response.suggestions?.join(", ") || "None"}`,
        );
    } else {
        logger.error(`❌ CP-SAT ERROR: ${response.error}`);
        throw new Error(response.error || "CP-SAT generation failed");
    }
}
