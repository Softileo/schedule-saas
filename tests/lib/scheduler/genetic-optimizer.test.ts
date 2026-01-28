/**
 * @fileoverview Tests for Genetic Optimizer configuration
 *
 * Tests for genetic algorithm configuration and presets.
 */

import { describe, it, expect } from "vitest";
import {
    DEFAULT_GENETIC_CONFIG,
    FAST_GENETIC_CONFIG,
    type GeneticConfig,
} from "@/lib/scheduler/genetic-optimizer";

describe("GeneticConfig interface", () => {
    it("should have all required properties", () => {
        const config: GeneticConfig = {
            populationSize: 20,
            generations: 50,
            mutationRate: 0.1,
            crossoverRate: 0.8,
            eliteCount: 2,
            tournamentSize: 3,
            timeoutMs: 3000,
        };

        expect(config.populationSize).toBe(20);
        expect(config.generations).toBe(50);
        expect(config.mutationRate).toBe(0.1);
        expect(config.crossoverRate).toBe(0.8);
        expect(config.eliteCount).toBe(2);
        expect(config.tournamentSize).toBe(3);
        expect(config.timeoutMs).toBe(3000);
    });
});

describe("DEFAULT_GENETIC_CONFIG", () => {
    it("should have populationSize of 30", () => {
        expect(DEFAULT_GENETIC_CONFIG.populationSize).toBe(30);
    });

    it("should have 100 generations", () => {
        expect(DEFAULT_GENETIC_CONFIG.generations).toBe(100);
    });

    it("should have mutationRate of 0.2 (20%)", () => {
        expect(DEFAULT_GENETIC_CONFIG.mutationRate).toBe(0.2);
    });

    it("should have crossoverRate of 0.7 (70%)", () => {
        expect(DEFAULT_GENETIC_CONFIG.crossoverRate).toBe(0.7);
    });

    it("should have eliteCount of 2", () => {
        expect(DEFAULT_GENETIC_CONFIG.eliteCount).toBe(2);
    });

    it("should have tournamentSize of 3", () => {
        expect(DEFAULT_GENETIC_CONFIG.tournamentSize).toBe(3);
    });

    it("should have timeout of 5000ms (5 seconds)", () => {
        expect(DEFAULT_GENETIC_CONFIG.timeoutMs).toBe(5000);
    });

    it("should have all 7 configuration properties", () => {
        const keys = Object.keys(DEFAULT_GENETIC_CONFIG);
        expect(keys).toHaveLength(7);
        expect(keys).toContain("populationSize");
        expect(keys).toContain("generations");
        expect(keys).toContain("mutationRate");
        expect(keys).toContain("crossoverRate");
        expect(keys).toContain("eliteCount");
        expect(keys).toContain("tournamentSize");
        expect(keys).toContain("timeoutMs");
    });

    describe("genetic algorithm constraints", () => {
        it("should have positive population size", () => {
            expect(DEFAULT_GENETIC_CONFIG.populationSize).toBeGreaterThan(0);
        });

        it("should have positive generations", () => {
            expect(DEFAULT_GENETIC_CONFIG.generations).toBeGreaterThan(0);
        });

        it("should have mutation rate between 0 and 1", () => {
            expect(DEFAULT_GENETIC_CONFIG.mutationRate).toBeGreaterThanOrEqual(
                0
            );
            expect(DEFAULT_GENETIC_CONFIG.mutationRate).toBeLessThanOrEqual(1);
        });

        it("should have crossover rate between 0 and 1", () => {
            expect(DEFAULT_GENETIC_CONFIG.crossoverRate).toBeGreaterThanOrEqual(
                0
            );
            expect(DEFAULT_GENETIC_CONFIG.crossoverRate).toBeLessThanOrEqual(1);
        });

        it("should have elite count less than population size", () => {
            expect(DEFAULT_GENETIC_CONFIG.eliteCount).toBeLessThan(
                DEFAULT_GENETIC_CONFIG.populationSize
            );
        });

        it("should have tournament size less than or equal to population size", () => {
            expect(DEFAULT_GENETIC_CONFIG.tournamentSize).toBeLessThanOrEqual(
                DEFAULT_GENETIC_CONFIG.populationSize
            );
        });

        it("should have positive timeout", () => {
            expect(DEFAULT_GENETIC_CONFIG.timeoutMs).toBeGreaterThan(0);
        });
    });
});

describe("FAST_GENETIC_CONFIG", () => {
    it("should have smaller populationSize than default", () => {
        expect(FAST_GENETIC_CONFIG.populationSize).toBe(15);
        expect(FAST_GENETIC_CONFIG.populationSize).toBeLessThan(
            DEFAULT_GENETIC_CONFIG.populationSize
        );
    });

    it("should have fewer generations than default", () => {
        expect(FAST_GENETIC_CONFIG.generations).toBe(30);
        expect(FAST_GENETIC_CONFIG.generations).toBeLessThan(
            DEFAULT_GENETIC_CONFIG.generations
        );
    });

    it("should have higher mutationRate than default (0.25)", () => {
        expect(FAST_GENETIC_CONFIG.mutationRate).toBe(0.25);
        expect(FAST_GENETIC_CONFIG.mutationRate).toBeGreaterThan(
            DEFAULT_GENETIC_CONFIG.mutationRate
        );
    });

    it("should have lower crossoverRate than default (0.6)", () => {
        expect(FAST_GENETIC_CONFIG.crossoverRate).toBe(0.6);
        expect(FAST_GENETIC_CONFIG.crossoverRate).toBeLessThan(
            DEFAULT_GENETIC_CONFIG.crossoverRate
        );
    });

    it("should have smaller eliteCount of 1", () => {
        expect(FAST_GENETIC_CONFIG.eliteCount).toBe(1);
        expect(FAST_GENETIC_CONFIG.eliteCount).toBeLessThan(
            DEFAULT_GENETIC_CONFIG.eliteCount
        );
    });

    it("should have smaller tournamentSize of 2", () => {
        expect(FAST_GENETIC_CONFIG.tournamentSize).toBe(2);
        expect(FAST_GENETIC_CONFIG.tournamentSize).toBeLessThan(
            DEFAULT_GENETIC_CONFIG.tournamentSize
        );
    });

    it("should have shorter timeout of 2000ms", () => {
        expect(FAST_GENETIC_CONFIG.timeoutMs).toBe(2000);
        expect(FAST_GENETIC_CONFIG.timeoutMs).toBeLessThan(
            DEFAULT_GENETIC_CONFIG.timeoutMs
        );
    });

    describe("fast config constraints", () => {
        it("should have positive population size", () => {
            expect(FAST_GENETIC_CONFIG.populationSize).toBeGreaterThan(0);
        });

        it("should have mutation rate between 0 and 1", () => {
            expect(FAST_GENETIC_CONFIG.mutationRate).toBeGreaterThanOrEqual(0);
            expect(FAST_GENETIC_CONFIG.mutationRate).toBeLessThanOrEqual(1);
        });

        it("should have crossover rate between 0 and 1", () => {
            expect(FAST_GENETIC_CONFIG.crossoverRate).toBeGreaterThanOrEqual(0);
            expect(FAST_GENETIC_CONFIG.crossoverRate).toBeLessThanOrEqual(1);
        });

        it("should have elite count less than population size", () => {
            expect(FAST_GENETIC_CONFIG.eliteCount).toBeLessThan(
                FAST_GENETIC_CONFIG.populationSize
            );
        });
    });
});

describe("config comparison", () => {
    it("FAST should be faster than DEFAULT (total work units)", () => {
        // Total work = populationSize * generations
        const defaultWork =
            DEFAULT_GENETIC_CONFIG.populationSize *
            DEFAULT_GENETIC_CONFIG.generations;
        const fastWork =
            FAST_GENETIC_CONFIG.populationSize *
            FAST_GENETIC_CONFIG.generations;

        expect(fastWork).toBeLessThan(defaultWork);
    });

    it("FAST should complete in less time (timeout)", () => {
        expect(FAST_GENETIC_CONFIG.timeoutMs).toBeLessThan(
            DEFAULT_GENETIC_CONFIG.timeoutMs
        );
    });

    it("both configs should have same properties", () => {
        const defaultKeys = Object.keys(DEFAULT_GENETIC_CONFIG).sort();
        const fastKeys = Object.keys(FAST_GENETIC_CONFIG).sort();

        expect(fastKeys).toEqual(defaultKeys);
    });

    it("FAST should have at least 50% of default population", () => {
        const ratio =
            FAST_GENETIC_CONFIG.populationSize /
            DEFAULT_GENETIC_CONFIG.populationSize;
        expect(ratio).toBeGreaterThanOrEqual(0.5);
    });

    it("FAST should have at least 10% of default generations", () => {
        const ratio =
            FAST_GENETIC_CONFIG.generations /
            DEFAULT_GENETIC_CONFIG.generations;
        expect(ratio).toBeGreaterThanOrEqual(0.1);
    });
});

describe("genetic algorithm theory", () => {
    it("mutation + crossover rates should allow for evolution", () => {
        // At least some genetic diversity should be maintained
        expect(DEFAULT_GENETIC_CONFIG.mutationRate).toBeGreaterThan(0.05);
        expect(DEFAULT_GENETIC_CONFIG.crossoverRate).toBeGreaterThan(0.5);
    });

    it("elite count should preserve best solutions", () => {
        // At least 1 elite to preserve best solution
        expect(DEFAULT_GENETIC_CONFIG.eliteCount).toBeGreaterThanOrEqual(1);
        expect(FAST_GENETIC_CONFIG.eliteCount).toBeGreaterThanOrEqual(1);
    });

    it("tournament size should allow selection pressure", () => {
        // Tournament size >= 2 for meaningful selection
        expect(DEFAULT_GENETIC_CONFIG.tournamentSize).toBeGreaterThanOrEqual(2);
        expect(FAST_GENETIC_CONFIG.tournamentSize).toBeGreaterThanOrEqual(2);
    });

    it("population should be large enough for genetic diversity", () => {
        // Minimum population for meaningful evolution
        expect(DEFAULT_GENETIC_CONFIG.populationSize).toBeGreaterThanOrEqual(
            10
        );
        expect(FAST_GENETIC_CONFIG.populationSize).toBeGreaterThanOrEqual(10);
    });

    it("generations should be enough for convergence", () => {
        expect(DEFAULT_GENETIC_CONFIG.generations).toBeGreaterThanOrEqual(20);
        expect(FAST_GENETIC_CONFIG.generations).toBeGreaterThanOrEqual(20);
    });
});
