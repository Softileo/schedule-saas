/**
 * =============================================================================
 * GŁÓWNY GENERATOR GRAFIKÓW - ORKIESTRACJA WARSTW
 * =============================================================================
 *
 * Koordynuje 3 warstwy optymalizacji:
 *
 * 1. GREEDY SCHEDULER (Heurystyka) - szybkie wstępne generowanie
 * 2. ILP OPTIMIZER - matematyczna optymalizacja load balancing
 * 3. GENETIC OPTIMIZER - doszlifowanie soft constraints
 *
 * Używa wzorca pipeline do sekwencyjnego przetwarzania.
 */

import type { SchedulerInput, GeneratedShift } from "./types";
import { logger } from "@/lib/utils/logger";
import { GreedyScheduler } from "./greedy/greedy-scheduler";
import { ILPOptimizer, type ILPConfig } from "./ilp-optimizer";
import {
    GeneticOptimizer,
    type GeneticConfig,
    DEFAULT_GENETIC_CONFIG,
    FAST_GENETIC_CONFIG,
} from "./genetic-optimizer";
import { evaluateSchedule, type ScheduleMetrics } from "./evaluator";

// =============================================================================
// KONFIGURACJA
// =============================================================================

export interface ScheduleGeneratorConfig {
    /** Tryb optymalizacji */
    mode: "fast" | "balanced" | "thorough";
    /** Włącz warstwę ILP */
    enableILP: boolean;
    /** Włącz warstwę genetyczną */
    enableGenetic: boolean;
    /** Timeout całkowity w ms */
    totalTimeoutMs: number;
    /** Logowanie szczegółowe */
    verbose: boolean;
}

export const DEFAULT_GENERATOR_CONFIG: ScheduleGeneratorConfig = {
    mode: "balanced",
    enableILP: true,
    enableGenetic: true,
    totalTimeoutMs: 60000,
    verbose: true,
};

export const FAST_GENERATOR_CONFIG: ScheduleGeneratorConfig = {
    mode: "fast",
    enableILP: true,
    enableGenetic: true,
    totalTimeoutMs: 15000,
    verbose: true,
};

export interface GenerationResult {
    shifts: GeneratedShift[];
    metrics: ScheduleMetrics;
    executionTimeMs: number;
    layersExecuted: string[];
    improvementPercent: number;
}

// =============================================================================
// GŁÓWNA KLASA GENERATORA
// =============================================================================

export class ScheduleGenerator {
    private config: ScheduleGeneratorConfig;
    private input: SchedulerInput;

    constructor(
        input: SchedulerInput,
        config: Partial<ScheduleGeneratorConfig> = {},
    ) {
        this.config = { ...DEFAULT_GENERATOR_CONFIG, ...config };
        this.input = input;
    }

    /**
     * Generuje zoptymalizowany grafik pracy
     */
    generate(): GenerationResult {
        const startTime = Date.now();
        const layersExecuted: string[] = [];

        logger.log("\n" + "=".repeat(60));
        logger.log("📅 SCHEDULE GENERATOR - WIELOWARSTWOWA OPTYMALIZACJA");
        logger.log("=".repeat(60));
        logger.log(`Tryb: ${this.config.mode}`);
        logger.log(`ILP: ${this.config.enableILP ? "✓" : "✗"}`);
        logger.log(`Genetic: ${this.config.enableGenetic ? "✓" : "✗"}`);
        logger.log(`Timeout: ${this.config.totalTimeoutMs}ms`);
        logger.log("=".repeat(60) + "\n");

        // =====================================================================
        // WARSTWA 1: GREEDY SCHEDULER
        // =====================================================================
        logger.log("▶ WARSTWA 1: Greedy Scheduler (Heurystyka)");

        const greedy = new GreedyScheduler(this.input);
        let shifts = greedy.generate();
        layersExecuted.push("greedy");

        const greedyMetrics = evaluateSchedule(shifts, this.input);
        logger.log(
            `  Fitness: ${
                greedyMetrics.totalFitness
            }, Jakość: ${greedyMetrics.qualityPercent.toFixed(1)}%`,
        );
        logger.log(
            `  Obsadzono: ${greedyMetrics.coveredDays}/${greedyMetrics.totalDays} dni`,
        );

        // =====================================================================
        // SHORT-CIRCUIT: Pomiń dalsze warstwy jeśli Greedy osiągnął optimum
        // =====================================================================
        // Wymagamy:
        // 1. Jakość >= 98%
        // 2. Zero twardych naruszeń (odpoczynek, absencje)
        // 3. Zero niedoobsadzonych zmian
        // 4. Max różnica godzin < 6h (aby nie przepuścić deficytu > 4h)
        if (
            greedyMetrics.qualityPercent >= 98 &&
            greedyMetrics.dailyRestViolations === 0 &&
            greedyMetrics.absenceViolations === 0 &&
            greedyMetrics.understaffedShifts === 0 &&
            greedyMetrics.maxHoursDiff < 6
        ) {
            logger.log(
                "✓ Greedy achieved optimal result - skipping further optimization",
            );
            return this.buildResult(
                shifts,
                startTime,
                layersExecuted,
                greedyMetrics,
            );
        }

        // Sprawdź timeout
        if (Date.now() - startTime > this.config.totalTimeoutMs * 0.6) {
            logger.log("⚠️ Timeout - pomijam dalsze warstwy");
            return this.buildResult(
                shifts,
                startTime,
                layersExecuted,
                greedyMetrics,
            );
        }

        // =====================================================================
        // WARSTWA 2: ILP OPTIMIZER (tylko gdy potrzebna optymalizacja)
        // =====================================================================
        const needsOptimization =
            greedyMetrics.qualityPercent < 95 ||
            greedyMetrics.dailyRestViolations > 0 ||
            this.input.employees.length > 15;

        if (this.config.enableILP && needsOptimization) {
            logger.log("\n▶ WARSTWA 2: ILP Optimizer (Load Balancing)");

            const ilpConfig: Partial<ILPConfig> = {
                maxIterations: this.config.mode === "fast" ? 500 : 1000,
                timeoutMs: this.config.mode === "fast" ? 2000 : 4000,
                verbose: this.config.verbose,
            };

            const ilp = new ILPOptimizer(this.input, ilpConfig);
            shifts = ilp.optimize(shifts);
            layersExecuted.push("ilp");

            const ilpMetrics = evaluateSchedule(shifts, this.input);
            logger.log(
                `  Fitness: ${
                    ilpMetrics.totalFitness
                }, Jakość: ${ilpMetrics.qualityPercent.toFixed(1)}%`,
            );
        }

        // Sprawdź timeout
        if (Date.now() - startTime > this.config.totalTimeoutMs * 0.85) {
            logger.log("⚠️ Timeout - pomijam warstwę genetyczną");
            const finalMetrics = evaluateSchedule(shifts, this.input);
            return this.buildResult(
                shifts,
                startTime,
                layersExecuted,
                finalMetrics,
            );
        }

        // =====================================================================
        // WARSTWA 3: GENETIC OPTIMIZER (tylko gdy potrzebna optymalizacja)
        // =====================================================================
        if (this.config.enableGenetic && needsOptimization) {
            logger.log("\n▶ WARSTWA 3: Genetic Optimizer (Soft Constraints)");

            const geneticConfig: Partial<GeneticConfig> =
                this.config.mode === "fast"
                    ? FAST_GENETIC_CONFIG
                    : DEFAULT_GENETIC_CONFIG;

            // Dostosuj timeout
            const remainingTime =
                this.config.totalTimeoutMs - (Date.now() - startTime);
            geneticConfig.timeoutMs = Math.min(
                geneticConfig.timeoutMs || 5000,
                remainingTime - 500,
            );

            if (geneticConfig.timeoutMs > 1000) {
                const genetic = new GeneticOptimizer(this.input, geneticConfig);
                shifts = genetic.optimize(shifts);
                layersExecuted.push("genetic");

                const geneticMetrics = evaluateSchedule(shifts, this.input);
                logger.log(
                    `  Fitness: ${
                        geneticMetrics.totalFitness
                    }, Jakość: ${geneticMetrics.qualityPercent.toFixed(1)}%`,
                );
            } else {
                logger.log("  ⚠️ Zbyt mało czasu na optymalizację genetyczną");
            }
        }

        // =====================================================================
        // WYNIK KOŃCOWY
        // =====================================================================
        const finalMetrics = evaluateSchedule(shifts, this.input);
        return this.buildResult(
            shifts,
            startTime,
            layersExecuted,
            finalMetrics,
        );
    }

    private buildResult(
        shifts: GeneratedShift[],
        startTime: number,
        layersExecuted: string[],
        metrics: ScheduleMetrics,
    ): GenerationResult {
        const executionTimeMs = Date.now() - startTime;

        // Oblicz poprawę (względem teoretycznego minimum)
        const improvementPercent = metrics.qualityPercent;

        logger.log("\n" + "=".repeat(60));
        logger.log("📊 PODSUMOWANIE GENEROWANIA");
        logger.log("=".repeat(60));
        logger.log(`Czas wykonania: ${executionTimeMs}ms`);
        logger.log(`Warstwy: ${layersExecuted.join(" → ")}`);
        logger.log(`Jakość grafiku: ${metrics.qualityPercent.toFixed(1)}%`);
        logger.log(`Fitness: ${metrics.totalFitness}`);
        logger.log("");
        logger.log("Hard Constraints:");
        logger.log(
            `  • Naruszenia odpoczynku 11h: ${metrics.dailyRestViolations}`,
        );
        logger.log(
            `  • Naruszenia max dni z rzędu: ${metrics.consecutiveDaysViolations}`,
        );
        logger.log(`  • Naruszenia absencji: ${metrics.absenceViolations}`);
        logger.log("");
        logger.log("Obsada:");
        logger.log(`  • Dni bez obsady: ${metrics.emptyDays}`);
        logger.log(
            `  • Niedostateczna obsada: ${metrics.understaffedShifts} zmian`,
        );
        logger.log("");
        logger.log("Balans:");
        logger.log(
            `  • Nierównomierność godzin: ${metrics.hoursImbalance.toFixed(1)}h`,
        );
        logger.log(
            `  • Nierównomierność weekendów: ${metrics.weekendImbalance}`,
        );
        logger.log("=".repeat(60) + "\n");

        return {
            shifts,
            metrics,
            executionTimeMs,
            layersExecuted,
            improvementPercent,
        };
    }
}
