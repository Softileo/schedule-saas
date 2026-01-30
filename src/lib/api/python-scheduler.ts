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
