/**
 * Testy dla scheduler/greedy/config.ts
 *
 * Testuje:
 * - Stałe prawne (Kodeks Pracy)
 * - Parametry algorytmu
 * - Wagi scoringu
 * - createSchedulerConfig() - tworzenie konfiguracji
 * - meetsRestRequirement() - sprawdzanie wymagań odpoczynku
 * - meetsConsecutiveDaysLimit() - sprawdzanie limitu dni
 */

import { describe, it, expect } from "vitest";
import {
    MIN_DAILY_REST_HOURS,
    MAX_CONSECUTIVE_WORK_DAYS,
    MAX_WEEKLY_OVERTIME_HOURS,
    EMERGENCY_STAFFING_ATTEMPTS,
    SIGNIFICANT_HOURS_DEFICIT,
    SIGNIFICANT_HOURS_SURPLUS,
    SWAP_HOURS_THRESHOLD,
    SCORING_WEIGHTS,
    DEFAULT_SCHEDULER_CONFIG,
    createSchedulerConfig,
    meetsRestRequirement,
    meetsConsecutiveDaysLimit,
} from "@/lib/scheduler/greedy/config";

// =========================================================================
// Stałe prawne (Kodeks Pracy)
// =========================================================================
describe("legal constants (Labor Code)", () => {
    describe("MIN_DAILY_REST_HOURS", () => {
        it("should be 11 hours (Art. 132 KP)", () => {
            expect(MIN_DAILY_REST_HOURS).toBe(11);
        });

        it("should be a positive number", () => {
            expect(MIN_DAILY_REST_HOURS).toBeGreaterThan(0);
        });
    });

    describe("MAX_CONSECUTIVE_WORK_DAYS", () => {
        it("should be 6 days", () => {
            expect(MAX_CONSECUTIVE_WORK_DAYS).toBe(6);
        });

        it("should allow at least 5 working days", () => {
            expect(MAX_CONSECUTIVE_WORK_DAYS).toBeGreaterThanOrEqual(5);
        });
    });

    describe("MAX_WEEKLY_OVERTIME_HOURS", () => {
        it("should be 8 hours", () => {
            expect(MAX_WEEKLY_OVERTIME_HOURS).toBe(8);
        });

        it("should be a positive number", () => {
            expect(MAX_WEEKLY_OVERTIME_HOURS).toBeGreaterThan(0);
        });
    });
});

// =========================================================================
// Parametry algorytmu
// =========================================================================
describe("algorithm parameters", () => {
    describe("EMERGENCY_STAFFING_ATTEMPTS", () => {
        it("should be 20 attempts", () => {
            expect(EMERGENCY_STAFFING_ATTEMPTS).toBe(20);
        });

        it("should be at least 1", () => {
            expect(EMERGENCY_STAFFING_ATTEMPTS).toBeGreaterThanOrEqual(1);
        });
    });

    describe("SIGNIFICANT_HOURS_DEFICIT", () => {
        it("should be 2 hours", () => {
            expect(SIGNIFICANT_HOURS_DEFICIT).toBe(2);
        });

        it("should be a positive number", () => {
            expect(SIGNIFICANT_HOURS_DEFICIT).toBeGreaterThan(0);
        });
    });

    describe("SIGNIFICANT_HOURS_SURPLUS", () => {
        it("should be 2 hours", () => {
            expect(SIGNIFICANT_HOURS_SURPLUS).toBe(2);
        });

        it("should equal SIGNIFICANT_HOURS_DEFICIT", () => {
            expect(SIGNIFICANT_HOURS_SURPLUS).toBe(SIGNIFICANT_HOURS_DEFICIT);
        });
    });

    describe("SWAP_HOURS_THRESHOLD", () => {
        it("should be 2 hours", () => {
            expect(SWAP_HOURS_THRESHOLD).toBe(2);
        });

        it("should be reasonable for swap decisions", () => {
            expect(SWAP_HOURS_THRESHOLD).toBeGreaterThan(0);
            expect(SWAP_HOURS_THRESHOLD).toBeLessThanOrEqual(4);
        });
    });
});

// =========================================================================
// SCORING_WEIGHTS
// =========================================================================
describe("SCORING_WEIGHTS", () => {
    describe("structure", () => {
        it("should have all required weights", () => {
            expect(SCORING_WEIGHTS).toHaveProperty("HOURS_DEFICIT");
            expect(SCORING_WEIGHTS).toHaveProperty("PREFERRED_SHIFT");
            expect(SCORING_WEIGHTS).toHaveProperty("AVAILABILITY");
            expect(SCORING_WEIGHTS).toHaveProperty("OVERTIME_PENALTY");
            expect(SCORING_WEIGHTS).toHaveProperty("REST_VIOLATION_PENALTY");
            expect(SCORING_WEIGHTS).toHaveProperty("BALANCE_BONUS");
            expect(SCORING_WEIGHTS).toHaveProperty("WEEKEND_PENALTY");
        });

        it("should have numeric values", () => {
            Object.values(SCORING_WEIGHTS).forEach((weight) => {
                expect(typeof weight).toBe("number");
            });
        });
    });

    describe("positive weights (bonuses)", () => {
        it("HOURS_DEFICIT should be positive", () => {
            expect(SCORING_WEIGHTS.HOURS_DEFICIT).toBeGreaterThan(0);
        });

        it("PREFERRED_SHIFT should be positive", () => {
            expect(SCORING_WEIGHTS.PREFERRED_SHIFT).toBeGreaterThan(0);
        });

        it("AVAILABILITY should be positive", () => {
            expect(SCORING_WEIGHTS.AVAILABILITY).toBeGreaterThan(0);
        });

        it("BALANCE_BONUS should be positive", () => {
            expect(SCORING_WEIGHTS.BALANCE_BONUS).toBeGreaterThan(0);
        });
    });

    describe("negative weights (penalties)", () => {
        it("OVERTIME_PENALTY should be negative", () => {
            expect(SCORING_WEIGHTS.OVERTIME_PENALTY).toBeLessThan(0);
        });

        it("REST_VIOLATION_PENALTY should be negative", () => {
            expect(SCORING_WEIGHTS.REST_VIOLATION_PENALTY).toBeLessThan(0);
        });

        it("WEEKEND_PENALTY should be negative", () => {
            expect(SCORING_WEIGHTS.WEEKEND_PENALTY).toBeLessThan(0);
        });
    });

    describe("weight priorities", () => {
        it("REST_VIOLATION_PENALTY should be the most severe penalty", () => {
            expect(
                Math.abs(SCORING_WEIGHTS.REST_VIOLATION_PENALTY)
            ).toBeGreaterThan(Math.abs(SCORING_WEIGHTS.OVERTIME_PENALTY));
        });

        it("HOURS_DEFICIT should have higher weight than AVAILABILITY", () => {
            expect(SCORING_WEIGHTS.HOURS_DEFICIT).toBeGreaterThan(
                SCORING_WEIGHTS.AVAILABILITY
            );
        });

        it("OVERTIME_PENALTY absolute value should exceed most bonuses", () => {
            expect(Math.abs(SCORING_WEIGHTS.OVERTIME_PENALTY)).toBeGreaterThan(
                SCORING_WEIGHTS.PREFERRED_SHIFT
            );
        });
    });

    describe("specific values", () => {
        it("should have expected default values", () => {
            expect(SCORING_WEIGHTS.HOURS_DEFICIT).toBe(10);
            expect(SCORING_WEIGHTS.PREFERRED_SHIFT).toBe(5);
            expect(SCORING_WEIGHTS.AVAILABILITY).toBe(3);
            expect(SCORING_WEIGHTS.OVERTIME_PENALTY).toBe(-15);
            expect(SCORING_WEIGHTS.REST_VIOLATION_PENALTY).toBe(-100);
            expect(SCORING_WEIGHTS.BALANCE_BONUS).toBe(2);
            expect(SCORING_WEIGHTS.WEEKEND_PENALTY).toBe(-3);
        });
    });
});

// =========================================================================
// DEFAULT_SCHEDULER_CONFIG
// =========================================================================
describe("DEFAULT_SCHEDULER_CONFIG", () => {
    it("should have correct minDailyRestHours", () => {
        expect(DEFAULT_SCHEDULER_CONFIG.minDailyRestHours).toBe(
            MIN_DAILY_REST_HOURS
        );
    });

    it("should have correct maxConsecutiveWorkDays", () => {
        expect(DEFAULT_SCHEDULER_CONFIG.maxConsecutiveWorkDays).toBe(
            MAX_CONSECUTIVE_WORK_DAYS
        );
    });

    it("should have correct significantHoursDeficit", () => {
        expect(DEFAULT_SCHEDULER_CONFIG.significantHoursDeficit).toBe(
            SIGNIFICANT_HOURS_DEFICIT
        );
    });

    it("should have verbose disabled by default", () => {
        expect(DEFAULT_SCHEDULER_CONFIG.verbose).toBe(false);
    });

    it("should have all required properties", () => {
        expect(DEFAULT_SCHEDULER_CONFIG).toHaveProperty("minDailyRestHours");
        expect(DEFAULT_SCHEDULER_CONFIG).toHaveProperty(
            "maxConsecutiveWorkDays"
        );
        expect(DEFAULT_SCHEDULER_CONFIG).toHaveProperty(
            "significantHoursDeficit"
        );
        expect(DEFAULT_SCHEDULER_CONFIG).toHaveProperty("verbose");
    });
});

// =========================================================================
// createSchedulerConfig
// =========================================================================
describe("createSchedulerConfig", () => {
    describe("without overrides", () => {
        it("should return default config", () => {
            const config = createSchedulerConfig();

            expect(config).toEqual(DEFAULT_SCHEDULER_CONFIG);
        });

        it("should return a new object", () => {
            const config = createSchedulerConfig();

            expect(config).not.toBe(DEFAULT_SCHEDULER_CONFIG);
        });
    });

    describe("with overrides", () => {
        it("should override minDailyRestHours", () => {
            const config = createSchedulerConfig({ minDailyRestHours: 12 });

            expect(config.minDailyRestHours).toBe(12);
            expect(config.maxConsecutiveWorkDays).toBe(
                DEFAULT_SCHEDULER_CONFIG.maxConsecutiveWorkDays
            );
        });

        it("should override maxConsecutiveWorkDays", () => {
            const config = createSchedulerConfig({ maxConsecutiveWorkDays: 5 });

            expect(config.maxConsecutiveWorkDays).toBe(5);
        });

        it("should override verbose", () => {
            const config = createSchedulerConfig({ verbose: true });

            expect(config.verbose).toBe(true);
        });

        it("should override multiple properties", () => {
            const config = createSchedulerConfig({
                minDailyRestHours: 10,
                maxConsecutiveWorkDays: 5,
                verbose: true,
            });

            expect(config.minDailyRestHours).toBe(10);
            expect(config.maxConsecutiveWorkDays).toBe(5);
            expect(config.verbose).toBe(true);
        });

        it("should not modify DEFAULT_SCHEDULER_CONFIG", () => {
            createSchedulerConfig({ verbose: true });

            expect(DEFAULT_SCHEDULER_CONFIG.verbose).toBe(false);
        });
    });

    describe("with empty overrides", () => {
        it("should return default config when empty object passed", () => {
            const config = createSchedulerConfig({});

            expect(config).toEqual(DEFAULT_SCHEDULER_CONFIG);
        });
    });
});

// =========================================================================
// meetsRestRequirement
// =========================================================================
describe("meetsRestRequirement", () => {
    describe("valid rest periods", () => {
        it("should return true for exactly 11 hours", () => {
            expect(meetsRestRequirement(11)).toBe(true);
        });

        it("should return true for more than 11 hours", () => {
            expect(meetsRestRequirement(12)).toBe(true);
            expect(meetsRestRequirement(15)).toBe(true);
            expect(meetsRestRequirement(24)).toBe(true);
        });
    });

    describe("invalid rest periods", () => {
        it("should return false for less than 11 hours", () => {
            expect(meetsRestRequirement(10)).toBe(false);
            expect(meetsRestRequirement(10.9)).toBe(false);
        });

        it("should return false for 0 hours", () => {
            expect(meetsRestRequirement(0)).toBe(false);
        });

        it("should return false for negative hours", () => {
            expect(meetsRestRequirement(-1)).toBe(false);
        });
    });

    describe("edge cases", () => {
        it("should handle decimal values near boundary", () => {
            expect(meetsRestRequirement(10.99)).toBe(false);
            expect(meetsRestRequirement(11.0)).toBe(true);
            expect(meetsRestRequirement(11.01)).toBe(true);
        });
    });
});

// =========================================================================
// meetsConsecutiveDaysLimit
// =========================================================================
describe("meetsConsecutiveDaysLimit", () => {
    describe("valid consecutive days", () => {
        it("should return true for 0 days", () => {
            expect(meetsConsecutiveDaysLimit(0)).toBe(true);
        });

        it("should return true for 1-5 days", () => {
            expect(meetsConsecutiveDaysLimit(1)).toBe(true);
            expect(meetsConsecutiveDaysLimit(2)).toBe(true);
            expect(meetsConsecutiveDaysLimit(3)).toBe(true);
            expect(meetsConsecutiveDaysLimit(4)).toBe(true);
            expect(meetsConsecutiveDaysLimit(5)).toBe(true);
        });

        it("should return true for exactly MAX_CONSECUTIVE_WORK_DAYS", () => {
            expect(meetsConsecutiveDaysLimit(MAX_CONSECUTIVE_WORK_DAYS)).toBe(
                true
            );
            expect(meetsConsecutiveDaysLimit(6)).toBe(true);
        });
    });

    describe("invalid consecutive days", () => {
        it("should return false for more than MAX_CONSECUTIVE_WORK_DAYS", () => {
            expect(meetsConsecutiveDaysLimit(7)).toBe(false);
            expect(meetsConsecutiveDaysLimit(8)).toBe(false);
            expect(meetsConsecutiveDaysLimit(10)).toBe(false);
        });
    });

    describe("edge cases", () => {
        it("should handle negative days (technically invalid input)", () => {
            expect(meetsConsecutiveDaysLimit(-1)).toBe(true);
        });
    });
});

// =========================================================================
// Integration tests
// =========================================================================
describe("config integration", () => {
    it("should have consistent values between constants and defaults", () => {
        expect(DEFAULT_SCHEDULER_CONFIG.minDailyRestHours).toBe(
            MIN_DAILY_REST_HOURS
        );
        expect(DEFAULT_SCHEDULER_CONFIG.maxConsecutiveWorkDays).toBe(
            MAX_CONSECUTIVE_WORK_DAYS
        );
    });

    it("should use constants in helper functions", () => {
        // meetsRestRequirement uses MIN_DAILY_REST_HOURS
        expect(meetsRestRequirement(MIN_DAILY_REST_HOURS)).toBe(true);
        expect(meetsRestRequirement(MIN_DAILY_REST_HOURS - 1)).toBe(false);

        // meetsConsecutiveDaysLimit uses MAX_CONSECUTIVE_WORK_DAYS
        expect(meetsConsecutiveDaysLimit(MAX_CONSECUTIVE_WORK_DAYS)).toBe(true);
        expect(meetsConsecutiveDaysLimit(MAX_CONSECUTIVE_WORK_DAYS + 1)).toBe(
            false
        );
    });
});
