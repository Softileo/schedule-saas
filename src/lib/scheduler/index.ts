/**
 * =============================================================================
 * SYSTEM AUTOMATYCZNEGO GENEROWANIA GRAFIKÓW PRACY
 * =============================================================================
 *
 * Pipeline 3-warstwowy:
 *
 * ScheduleGenerator (Greedy → LocalSearch → Genetic)
 *   - Greedy: Szybkie wstępne generowanie
 *   - ILP Optimizer: Load balancing
 *   - Genetic: Optymalizacja soft constraints
 *
 * Zgodny z Polskim Kodeksem Pracy (Art. 129, 132, 133, 147)
 *
 * @module scheduler
 * @version 5.0.0 - Modular architecture
 */

// =============================================================================
// GŁÓWNY GENERATOR - 3-warstwowy pipeline
// =============================================================================
export {
    ScheduleGenerator,
    type ScheduleGeneratorConfig,
    type GenerationResult,
    DEFAULT_GENERATOR_CONFIG,
    FAST_GENERATOR_CONFIG,
} from "./generator";

import type { GeneratedShift, SchedulerInput } from "./types";
import { ScheduleGenerator, FAST_GENERATOR_CONFIG } from "./generator";
import { logger } from "@/lib/utils/logger";

// ===================================
// GŁÓWNA FUNKCJA (FASADA)
// ===================================

/**
 * Generuje harmonogram na podstawie podanych danych (Fasada).
 * Używa 3-warstwowego pipeline'u (Greedy → ILP → Genetic).
 */
export function generateSchedule(
    options: Omit<SchedulerInput, "quarterlyHistory">,
): GeneratedShift[] {
    logger.log("🔄 Uruchamiam generator grafików (v5.0)");

    const generator = new ScheduleGenerator(options, FAST_GENERATOR_CONFIG);

    try {
        const result = generator.generate();
        return result.shifts;
    } catch (e) {
        logger.error("Generator failed:", e);
        console.error(e);
        return [];
    }
}

export { ILPOptimizer, type ILPConfig } from "./ilp-optimizer";
export { GeneticOptimizer, type GeneticConfig } from "./genetic-optimizer";

// =============================================================================
// EWALUATOR I TYPY
// =============================================================================
export {
    evaluateSchedule,
    type ScheduleMetrics,
    type EmployeeStats,
    type TemplateShiftCount,
} from "./evaluator";
export {
    POLISH_LABOR_CODE,
    type SchedulerInput,
    type GeneratedShift,
    type EmployeeWithData,
    type EmployeeScheduleState,
    type EmployeeState,
    type ShiftTimeType,
    type QuarterlyShiftHistory,
    type ShiftTypeDistribution,
} from "./types";

export {
    getTemplateHours,
    getShiftHours,
    getShiftTimeType,
    parseDate,
    daysDiff,
    getDayOfWeek,
} from "./scheduler-utils";

// =============================================================================
// NOWE MODUŁY (v5.0) - Wydzielone funkcje
// =============================================================================
export {
    canEmployeeWorkOnDate,
    checkDailyRest,
    checkDailyRestSimple,
    checkConsecutiveDays,
    canAddShift,
    canAddShiftSimple,
} from "./validation";

export {
    getAvailableTemplatesForEmployee,
    getTemplatesForDay,
    sortDaysByPriority,
    calculateTotalRequiredHours,
    calculateAverageTemplateHours,
} from "./scheduler-utils";
