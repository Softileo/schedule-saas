/**
 * @fileoverview Tests for ILP Optimizer configuration
 *
 * Tests for Integer Linear Programming optimizer configuration.
 */

import { describe, it, expect } from "vitest";
import {
    DEFAULT_ILP_CONFIG,
    type ILPConfig,
} from "@/lib/scheduler/ilp-optimizer";

describe("ILPConfig interface", () => {
    it("should have all required properties", () => {
        const config: ILPConfig = {
            maxIterations: 500,
            timeoutMs: 3000,
            verbose: false,
        };

        expect(config.maxIterations).toBe(500);
        expect(config.timeoutMs).toBe(3000);
        expect(config.verbose).toBe(false);
    });
});

describe("DEFAULT_ILP_CONFIG", () => {
    it("should have maxIterations of 1000", () => {
        expect(DEFAULT_ILP_CONFIG.maxIterations).toBe(1000);
    });

    it("should have timeout of 5000ms (5 seconds)", () => {
        expect(DEFAULT_ILP_CONFIG.timeoutMs).toBe(5000);
    });

    it("should have verbose logging enabled", () => {
        expect(DEFAULT_ILP_CONFIG.verbose).toBe(true);
    });

    it("should have all 3 configuration properties", () => {
        const keys = Object.keys(DEFAULT_ILP_CONFIG);
        expect(keys).toHaveLength(3);
        expect(keys).toContain("maxIterations");
        expect(keys).toContain("timeoutMs");
        expect(keys).toContain("verbose");
    });

    describe("ILP optimizer constraints", () => {
        it("should have positive max iterations", () => {
            expect(DEFAULT_ILP_CONFIG.maxIterations).toBeGreaterThan(0);
        });

        it("should have reasonable iteration count", () => {
            // Not too many to cause timeout, not too few to miss solutions
            expect(DEFAULT_ILP_CONFIG.maxIterations).toBeGreaterThanOrEqual(
                100
            );
            expect(DEFAULT_ILP_CONFIG.maxIterations).toBeLessThanOrEqual(10000);
        });

        it("should have positive timeout", () => {
            expect(DEFAULT_ILP_CONFIG.timeoutMs).toBeGreaterThan(0);
        });

        it("should have timeout at least 1 second", () => {
            expect(DEFAULT_ILP_CONFIG.timeoutMs).toBeGreaterThanOrEqual(1000);
        });

        it("should have verbose as boolean", () => {
            expect(typeof DEFAULT_ILP_CONFIG.verbose).toBe("boolean");
        });
    });
});

describe("ILP configuration use cases", () => {
    it("default config allows enough iterations for optimization", () => {
        // ILP needs enough iterations to find good swaps
        expect(DEFAULT_ILP_CONFIG.maxIterations).toBeGreaterThanOrEqual(500);
    });

    it("timeout allows reasonable computation time", () => {
        // 5 seconds is reasonable for ILP optimization
        expect(DEFAULT_ILP_CONFIG.timeoutMs).toBeGreaterThanOrEqual(2000);
        expect(DEFAULT_ILP_CONFIG.timeoutMs).toBeLessThanOrEqual(10000);
    });

    it("iterations per second ratio is reasonable", () => {
        // Rough estimate: at least 100 iterations per second should be possible
        const iterationsPerSecond =
            DEFAULT_ILP_CONFIG.maxIterations /
            (DEFAULT_ILP_CONFIG.timeoutMs / 1000);
        expect(iterationsPerSecond).toBeGreaterThan(50);
    });
});

describe("custom ILP config creation", () => {
    it("should allow creating fast config", () => {
        const fastConfig: ILPConfig = {
            maxIterations: 500,
            timeoutMs: 2000,
            verbose: false,
        };

        expect(fastConfig.maxIterations).toBeLessThan(
            DEFAULT_ILP_CONFIG.maxIterations
        );
        expect(fastConfig.timeoutMs).toBeLessThan(DEFAULT_ILP_CONFIG.timeoutMs);
    });

    it("should allow creating thorough config", () => {
        const thoroughConfig: ILPConfig = {
            maxIterations: 5000,
            timeoutMs: 15000,
            verbose: true,
        };

        expect(thoroughConfig.maxIterations).toBeGreaterThan(
            DEFAULT_ILP_CONFIG.maxIterations
        );
        expect(thoroughConfig.timeoutMs).toBeGreaterThan(
            DEFAULT_ILP_CONFIG.timeoutMs
        );
    });

    it("should allow silent config", () => {
        const silentConfig: ILPConfig = {
            maxIterations: 1000,
            timeoutMs: 5000,
            verbose: false,
        };

        expect(silentConfig.verbose).toBe(false);
    });
});

describe("partial config override", () => {
    it("should be able to merge with defaults", () => {
        const override: Partial<ILPConfig> = { verbose: false };
        const merged: ILPConfig = { ...DEFAULT_ILP_CONFIG, ...override };

        expect(merged.maxIterations).toBe(1000);
        expect(merged.timeoutMs).toBe(5000);
        expect(merged.verbose).toBe(false);
    });

    it("should override maxIterations only", () => {
        const override: Partial<ILPConfig> = { maxIterations: 2000 };
        const merged: ILPConfig = { ...DEFAULT_ILP_CONFIG, ...override };

        expect(merged.maxIterations).toBe(2000);
        expect(merged.timeoutMs).toBe(5000);
        expect(merged.verbose).toBe(true);
    });

    it("should override timeout only", () => {
        const override: Partial<ILPConfig> = { timeoutMs: 10000 };
        const merged: ILPConfig = { ...DEFAULT_ILP_CONFIG, ...override };

        expect(merged.maxIterations).toBe(1000);
        expect(merged.timeoutMs).toBe(10000);
        expect(merged.verbose).toBe(true);
    });

    it("should override all properties", () => {
        const override: Partial<ILPConfig> = {
            maxIterations: 500,
            timeoutMs: 2000,
            verbose: false,
        };
        const merged: ILPConfig = { ...DEFAULT_ILP_CONFIG, ...override };

        expect(merged.maxIterations).toBe(500);
        expect(merged.timeoutMs).toBe(2000);
        expect(merged.verbose).toBe(false);
    });
});
