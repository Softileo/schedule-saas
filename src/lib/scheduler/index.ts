/**
 * =============================================================================
 * SYSTEM AUTOMATYCZNEGO GENEROWANIA GRAFIKÓW PRACY
 * =============================================================================
 *
 * Hybrydowy algorytm z Python Genetic Optimizer na Google Cloud Run:
 *   - Greedy Scheduler (TypeScript): szybkie wstępne generowanie
 *   - Python Genetic Optimizer (Cloud Run): zaawansowana optymalizacja
 *
 * Zgodny z Polskim Kodeksem Pracy (Art. 129, 132, 133, 147)
 *
 * @module scheduler
 * @version 6.0.0 - Python Cloud Run integration
 */

import type { GeneratedShift, SchedulerInput } from "./types";
import { GreedyScheduler } from "./greedy/greedy-scheduler";
import { logger } from "@/lib/utils/logger";

// ===================================
// GŁÓWNA FUNKCJA (FASADA)
// ===================================

/**
 * Generuje harmonogram na podstawie podanych danych (Fasada).
 * Używa lokalnego Greedy Schedulera jako fallback.
 * Dla optymalizacji użyj Python API przez /api/schedule/optimize-python
 */
export function generateSchedule(
    options: Omit<SchedulerInput, "quarterlyHistory">,
): GeneratedShift[] {
    logger.log("🔄 Uruchamiam generator grafików (v6.0 - Greedy)");

    const greedyScheduler = new GreedyScheduler(options);

    try {
        const shifts = greedyScheduler.generate();
        return shifts;
    } catch (e) {
        logger.error("Generator failed:", e);
        console.error(e);
        return [];
    }
}

// =============================================================================
// EWALUATOR I TYPY
// =============================================================================
export { type ScheduleMetrics, type EmployeeStats } from "./evaluator";
export {
    type SchedulerInput,
    type GeneratedShift,
    type EmployeeWithData,
} from "./types";
