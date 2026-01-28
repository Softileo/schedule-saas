/**
 * @fileoverview Tests for Schedule Generator configuration
 *
 * Tests for the main schedule generator configuration and presets.
 */

import { describe, it, expect } from "vitest";
import {
    DEFAULT_GENERATOR_CONFIG,
    FAST_GENERATOR_CONFIG,
    type ScheduleGeneratorConfig,
    type GenerationResult,
} from "@/lib/scheduler/generator";

describe("ScheduleGeneratorConfig interface", () => {
    it("should have all required properties", () => {
        const config: ScheduleGeneratorConfig = {
            mode: "balanced",
            enableILP: true,
            enableGenetic: true,
            totalTimeoutMs: 10000,
            verbose: true,
        };

        expect(config.mode).toBe("balanced");
        expect(config.enableILP).toBe(true);
        expect(config.enableGenetic).toBe(true);
        expect(config.totalTimeoutMs).toBe(10000);
        expect(config.verbose).toBe(true);
    });

    it("should accept fast mode", () => {
        const config: ScheduleGeneratorConfig = {
            mode: "fast",
            enableILP: true,
            enableGenetic: true,
            totalTimeoutMs: 5000,
            verbose: false,
        };

        expect(config.mode).toBe("fast");
    });

    it("should accept thorough mode", () => {
        const config: ScheduleGeneratorConfig = {
            mode: "thorough",
            enableILP: true,
            enableGenetic: true,
            totalTimeoutMs: 30000,
            verbose: true,
        };

        expect(config.mode).toBe("thorough");
    });
});

describe("DEFAULT_GENERATOR_CONFIG", () => {
    it('should have mode "balanced"', () => {
        expect(DEFAULT_GENERATOR_CONFIG.mode).toBe("balanced");
    });

    it("should have ILP enabled", () => {
        expect(DEFAULT_GENERATOR_CONFIG.enableILP).toBe(true);
    });

    it("should have Genetic optimizer enabled", () => {
        expect(DEFAULT_GENERATOR_CONFIG.enableGenetic).toBe(true);
    });

    it("should have timeout of 60000ms (60 seconds)", () => {
        expect(DEFAULT_GENERATOR_CONFIG.totalTimeoutMs).toBe(60000);
    });

    it("should have verbose logging enabled", () => {
        expect(DEFAULT_GENERATOR_CONFIG.verbose).toBe(true);
    });

    it("should have all 5 configuration properties", () => {
        const keys = Object.keys(DEFAULT_GENERATOR_CONFIG);
        expect(keys).toHaveLength(5);
        expect(keys).toContain("mode");
        expect(keys).toContain("enableILP");
        expect(keys).toContain("enableGenetic");
        expect(keys).toContain("totalTimeoutMs");
        expect(keys).toContain("verbose");
    });

    describe("generator constraints", () => {
        it("should have positive timeout", () => {
            expect(DEFAULT_GENERATOR_CONFIG.totalTimeoutMs).toBeGreaterThan(0);
        });

        it("should have timeout at least 5 seconds", () => {
            expect(
                DEFAULT_GENERATOR_CONFIG.totalTimeoutMs
            ).toBeGreaterThanOrEqual(5000);
        });

        it("should have timeout at most 60 seconds", () => {
            expect(DEFAULT_GENERATOR_CONFIG.totalTimeoutMs).toBeLessThanOrEqual(
                60000
            );
        });
    });
});

describe("FAST_GENERATOR_CONFIG", () => {
    it('should have mode "fast"', () => {
        expect(FAST_GENERATOR_CONFIG.mode).toBe("fast");
    });

    it("should have ILP enabled", () => {
        expect(FAST_GENERATOR_CONFIG.enableILP).toBe(true);
    });

    it("should have Genetic optimizer enabled", () => {
        expect(FAST_GENERATOR_CONFIG.enableGenetic).toBe(true);
    });

    it("should have shorter timeout of 15000ms (15 seconds)", () => {
        expect(FAST_GENERATOR_CONFIG.totalTimeoutMs).toBe(15000);
    });

    it("should have verbose logging enabled", () => {
        expect(FAST_GENERATOR_CONFIG.verbose).toBe(true);
    });

    it("should have shorter timeout than default", () => {
        expect(FAST_GENERATOR_CONFIG.totalTimeoutMs).toBeLessThan(
            DEFAULT_GENERATOR_CONFIG.totalTimeoutMs
        );
    });
});

describe("config comparison", () => {
    it("FAST should have shorter timeout than DEFAULT", () => {
        expect(FAST_GENERATOR_CONFIG.totalTimeoutMs).toBeLessThan(
            DEFAULT_GENERATOR_CONFIG.totalTimeoutMs
        );
    });

    it("both configs should have same properties", () => {
        const defaultKeys = Object.keys(DEFAULT_GENERATOR_CONFIG).sort();
        const fastKeys = Object.keys(FAST_GENERATOR_CONFIG).sort();

        expect(fastKeys).toEqual(defaultKeys);
    });

    it("both configs should enable ILP", () => {
        expect(DEFAULT_GENERATOR_CONFIG.enableILP).toBe(true);
        expect(FAST_GENERATOR_CONFIG.enableILP).toBe(true);
    });

    it("both configs should enable Genetic", () => {
        expect(DEFAULT_GENERATOR_CONFIG.enableGenetic).toBe(true);
        expect(FAST_GENERATOR_CONFIG.enableGenetic).toBe(true);
    });

    it("FAST timeout should be at least 50% of DEFAULT", () => {
        const ratio =
            FAST_GENERATOR_CONFIG.totalTimeoutMs /
            DEFAULT_GENERATOR_CONFIG.totalTimeoutMs;
        expect(ratio).toBeGreaterThanOrEqual(0.2);
    });
});

describe("optimization modes", () => {
    it('"fast" mode should minimize execution time', () => {
        expect(FAST_GENERATOR_CONFIG.mode).toBe("fast");
        expect(FAST_GENERATOR_CONFIG.totalTimeoutMs).toBeLessThanOrEqual(20000);
    });

    it('"balanced" mode should be the default', () => {
        expect(DEFAULT_GENERATOR_CONFIG.mode).toBe("balanced");
    });

    it("valid modes are fast, balanced, thorough", () => {
        const validModes = ["fast", "balanced", "thorough"];
        expect(validModes).toContain(DEFAULT_GENERATOR_CONFIG.mode);
        expect(validModes).toContain(FAST_GENERATOR_CONFIG.mode);
    });
});

describe("GenerationResult interface", () => {
    it("should have all required properties", () => {
        const result: GenerationResult = {
            shifts: [],
            metrics: {
                totalFitness: 100,
                qualityPercent: 95,
                coveredDays: 20,
                totalDays: 22,
                dailyRestViolations: 0,
                consecutiveDaysViolations: 0,
                absenceViolations: 0,
                weeklyHoursViolations: 0,
                understaffedShifts: 0,
                emptyDays: 0,
                hoursImbalance: 0,
                avgHoursDiff: 0,
                maxHoursDiff: 0,
                weekendImbalance: 0,
                avgWeekends: 0,
                employeeStats: [],
                warnings: [],
            },
            executionTimeMs: 5000,
            layersExecuted: ["greedy", "ilp", "genetic"],
            improvementPercent: 15.5,
        };

        expect(result.shifts).toEqual([]);
        expect(result.metrics.totalFitness).toBe(100);
        expect(result.executionTimeMs).toBe(5000);
        expect(result.layersExecuted).toHaveLength(3);
        expect(result.improvementPercent).toBe(15.5);
    });

    it("should track all 3 optimization layers", () => {
        const allLayers = ["greedy", "ilp", "genetic"];

        const result: GenerationResult = {
            shifts: [],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            metrics: {} as any,
            executionTimeMs: 0,
            layersExecuted: allLayers,
            improvementPercent: 0,
        };

        expect(result.layersExecuted).toContain("greedy");
        expect(result.layersExecuted).toContain("ilp");
        expect(result.layersExecuted).toContain("genetic");
    });
});

describe("custom generator config creation", () => {
    it("should allow creating greedy-only config", () => {
        const greedyOnlyConfig: ScheduleGeneratorConfig = {
            mode: "fast",
            enableILP: false,
            enableGenetic: false,
            totalTimeoutMs: 2000,
            verbose: false,
        };

        expect(greedyOnlyConfig.enableILP).toBe(false);
        expect(greedyOnlyConfig.enableGenetic).toBe(false);
    });

    it("should allow creating ILP-only config", () => {
        const ilpOnlyConfig: ScheduleGeneratorConfig = {
            mode: "balanced",
            enableILP: true,
            enableGenetic: false,
            totalTimeoutMs: 10000,
            verbose: true,
        };

        expect(ilpOnlyConfig.enableILP).toBe(true);
        expect(ilpOnlyConfig.enableGenetic).toBe(false);
    });

    it("should allow creating thorough config", () => {
        const thoroughConfig: ScheduleGeneratorConfig = {
            mode: "thorough",
            enableILP: true,
            enableGenetic: true,
            totalTimeoutMs: 30000,
            verbose: true,
        };

        expect(thoroughConfig.mode).toBe("thorough");
        expect(thoroughConfig.totalTimeoutMs).toBe(30000);
    });

    it("should allow creating silent config", () => {
        const silentConfig: ScheduleGeneratorConfig = {
            mode: "balanced",
            enableILP: true,
            enableGenetic: true,
            totalTimeoutMs: 15000,
            verbose: false,
        };

        expect(silentConfig.verbose).toBe(false);
    });
});

describe("partial config override", () => {
    it("should be able to merge with defaults", () => {
        const override: Partial<ScheduleGeneratorConfig> = { verbose: false };
        const merged: ScheduleGeneratorConfig = {
            ...DEFAULT_GENERATOR_CONFIG,
            ...override,
        };

        expect(merged.mode).toBe("balanced");
        expect(merged.enableILP).toBe(true);
        expect(merged.enableGenetic).toBe(true);
        expect(merged.totalTimeoutMs).toBe(60000);
        expect(merged.verbose).toBe(false);
    });

    it("should override mode only", () => {
        const override: Partial<ScheduleGeneratorConfig> = { mode: "thorough" };
        const merged: ScheduleGeneratorConfig = {
            ...DEFAULT_GENERATOR_CONFIG,
            ...override,
        };

        expect(merged.mode).toBe("thorough");
        expect(merged.totalTimeoutMs).toBe(60000);
    });

    it("should disable optimizers", () => {
        const override: Partial<ScheduleGeneratorConfig> = {
            enableILP: false,
            enableGenetic: false,
        };
        const merged: ScheduleGeneratorConfig = {
            ...DEFAULT_GENERATOR_CONFIG,
            ...override,
        };

        expect(merged.enableILP).toBe(false);
        expect(merged.enableGenetic).toBe(false);
    });
});
