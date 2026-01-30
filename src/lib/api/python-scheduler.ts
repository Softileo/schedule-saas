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
import {
    transformInputForPython,
    transformInputForCPSAT,
    type PythonInput,
    type CPSATInput,
} from "@/lib/scheduler/data-transformer";

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
    quality_percent?: number;
    objective_value?: number;
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

async function callPythonAPI<T>(endpoint: string, body: unknown): Promise<T> {
    if (!isPythonSchedulerEnabled()) {
        throw new Error(
            "Python Scheduler Service is not configured. Set PYTHON_SCHEDULER_URL and PYTHON_SCHEDULER_API_KEY",
        );
    }

    const url = `${PYTHON_SCHEDULER_URL}${endpoint}`;

    logger.log(`🐍 Calling Python API: ${endpoint}`);

    // ========== DETAILED REQUEST LOGGING ==========
    console.log("\n" + "=".repeat(80));
    console.log("📤 NEXT.JS → PYTHON API REQUEST");
    console.log("=".repeat(80));
    console.log(`Endpoint: ${endpoint}`);
    console.log(`Full URL: ${url}`);
    console.log("\n📦 Request Body:");
    console.log(JSON.stringify(body, null, 2));
    console.log("=".repeat(80) + "\n");

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
    const transformedInput: PythonInput = transformInputForPython(input);

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
    const transformedInput: PythonInput = transformInputForPython(input);

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
    const transformedInput: PythonInput = transformInputForPython(input);

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
    const transformedInput: PythonInput = transformInputForPython(input);

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
    const cpsatInput: CPSATInput = transformInputForCPSAT(input);

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
