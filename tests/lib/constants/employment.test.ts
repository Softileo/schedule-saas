/**
 * Employment Constants Tests
 *
 * Testy dla stałych i funkcji dotyczących typów etatów.
 */

import { describe, it, expect } from "vitest";
import {
    EMPLOYMENT_TYPES,
    EMPLOYMENT_TYPE_MAP,
    EMPLOYMENT_TYPE_VALUES,
    getEmploymentTypeLabel,
    getEmploymentTypeShortLabel,
    getEmploymentTypeHoursPerDay,
    getEmploymentTypeOptions,
} from "@/lib/constants/employment";

describe("constants/employment", () => {
    // =========================================================================
    // EMPLOYMENT_TYPES
    // =========================================================================
    describe("EMPLOYMENT_TYPES", () => {
        it("should contain all 5 employment types", () => {
            expect(EMPLOYMENT_TYPES.length).toBe(5);
        });

        it("should have full as first type", () => {
            expect(EMPLOYMENT_TYPES[0].value).toBe("full");
        });

        it("should have custom as last type", () => {
            expect(EMPLOYMENT_TYPES[EMPLOYMENT_TYPES.length - 1].value).toBe(
                "custom"
            );
        });

        it("should have required properties for each type", () => {
            EMPLOYMENT_TYPES.forEach((type) => {
                expect(type).toHaveProperty("value");
                expect(type).toHaveProperty("label");
                expect(type).toHaveProperty("shortLabel");
                expect(type).toHaveProperty("hoursPerDay");
            });
        });

        it("should have correct hours for full time", () => {
            const fullTime = EMPLOYMENT_TYPES.find((t) => t.value === "full");
            expect(fullTime?.hoursPerDay).toBe(8);
        });

        it("should have correct hours for half time", () => {
            const halfTime = EMPLOYMENT_TYPES.find((t) => t.value === "half");
            expect(halfTime?.hoursPerDay).toBe(4);
        });

        it("should have correct hours for three quarter", () => {
            const threeQuarter = EMPLOYMENT_TYPES.find(
                (t) => t.value === "three_quarter"
            );
            expect(threeQuarter?.hoursPerDay).toBe(6);
        });

        it("should have 0 hours for custom (defined elsewhere)", () => {
            const custom = EMPLOYMENT_TYPES.find((t) => t.value === "custom");
            expect(custom?.hoursPerDay).toBe(0);
        });
    });

    // =========================================================================
    // EMPLOYMENT_TYPE_MAP
    // =========================================================================
    describe("EMPLOYMENT_TYPE_MAP", () => {
        it("should have all types as keys", () => {
            expect(EMPLOYMENT_TYPE_MAP).toHaveProperty("full");
            expect(EMPLOYMENT_TYPE_MAP).toHaveProperty("three_quarter");
            expect(EMPLOYMENT_TYPE_MAP).toHaveProperty("half");
            expect(EMPLOYMENT_TYPE_MAP).toHaveProperty("one_third");
            expect(EMPLOYMENT_TYPE_MAP).toHaveProperty("custom");
        });

        it("should allow quick access by key", () => {
            expect(EMPLOYMENT_TYPE_MAP.full.label).toBe("Pełny etat");
            expect(EMPLOYMENT_TYPE_MAP.half.hoursPerDay).toBe(4);
        });
    });

    // =========================================================================
    // EMPLOYMENT_TYPE_VALUES
    // =========================================================================
    describe("EMPLOYMENT_TYPE_VALUES", () => {
        it("should contain all type values", () => {
            expect(EMPLOYMENT_TYPE_VALUES).toContain("full");
            expect(EMPLOYMENT_TYPE_VALUES).toContain("three_quarter");
            expect(EMPLOYMENT_TYPE_VALUES).toContain("half");
            expect(EMPLOYMENT_TYPE_VALUES).toContain("one_third");
            expect(EMPLOYMENT_TYPE_VALUES).toContain("custom");
        });

        it("should have 5 values", () => {
            expect(EMPLOYMENT_TYPE_VALUES.length).toBe(5);
        });

        it("should be usable as tuple type", () => {
            // TypeScript kompilacja sprawdzi to
            const value: (typeof EMPLOYMENT_TYPE_VALUES)[number] = "full";
            expect(value).toBe("full");
        });
    });

    // =========================================================================
    // getEmploymentTypeLabel
    // =========================================================================
    describe("getEmploymentTypeLabel", () => {
        it("should return full label for full time", () => {
            expect(getEmploymentTypeLabel("full")).toBe("Pełny etat");
        });

        it("should return correct label for half time", () => {
            expect(getEmploymentTypeLabel("half")).toBe("½ etatu");
        });

        it("should return correct label for three quarter", () => {
            expect(getEmploymentTypeLabel("three_quarter")).toBe("¾ etatu");
        });

        it("should return correct label for one third", () => {
            expect(getEmploymentTypeLabel("one_third")).toBe("⅓ etatu");
        });

        it("should return correct label for custom", () => {
            expect(getEmploymentTypeLabel("custom")).toBe("Niestandardowy");
        });

        it("should return type value for unknown type", () => {
            // @ts-expect-error testing unknown type
            expect(getEmploymentTypeLabel("unknown")).toBe("unknown");
        });
    });

    // =========================================================================
    // getEmploymentTypeShortLabel
    // =========================================================================
    describe("getEmploymentTypeShortLabel", () => {
        it("should return short label for full time", () => {
            expect(getEmploymentTypeShortLabel("full")).toBe("1/1");
        });

        it("should return short label for half time", () => {
            expect(getEmploymentTypeShortLabel("half")).toBe("1/2");
        });

        it("should return short label for three quarter", () => {
            expect(getEmploymentTypeShortLabel("three_quarter")).toBe("3/4");
        });

        it("should return short label for one third", () => {
            expect(getEmploymentTypeShortLabel("one_third")).toBe("1/3");
        });

        it("should return short label for custom", () => {
            expect(getEmploymentTypeShortLabel("custom")).toBe("Inne");
        });
    });

    // =========================================================================
    // getEmploymentTypeHoursPerDay
    // =========================================================================
    describe("getEmploymentTypeHoursPerDay", () => {
        it("should return 8 hours for full time", () => {
            expect(getEmploymentTypeHoursPerDay("full")).toBe(8);
        });

        it("should return 6 hours for three quarter", () => {
            expect(getEmploymentTypeHoursPerDay("three_quarter")).toBe(6);
        });

        it("should return 4 hours for half time", () => {
            expect(getEmploymentTypeHoursPerDay("half")).toBe(4);
        });

        it("should return 2.67 hours for one third", () => {
            expect(getEmploymentTypeHoursPerDay("one_third")).toBeCloseTo(
                2.67,
                2
            );
        });

        it("should return custom hours for custom type", () => {
            expect(getEmploymentTypeHoursPerDay("custom", 5)).toBe(5);
            expect(getEmploymentTypeHoursPerDay("custom", 7)).toBe(7);
        });

        it("should return 8 as default for custom without hours", () => {
            expect(getEmploymentTypeHoursPerDay("custom")).toBe(8);
            expect(getEmploymentTypeHoursPerDay("custom", undefined)).toBe(8);
        });

        it("should ignore custom hours for non-custom types", () => {
            expect(getEmploymentTypeHoursPerDay("full", 5)).toBe(8);
            expect(getEmploymentTypeHoursPerDay("half", 10)).toBe(4);
        });

        it("should return 8 for unknown type", () => {
            // @ts-expect-error testing unknown type
            expect(getEmploymentTypeHoursPerDay("unknown")).toBe(8);
        });
    });

    // =========================================================================
    // getEmploymentTypeOptions
    // =========================================================================
    describe("getEmploymentTypeOptions", () => {
        it("should return all options by default", () => {
            const options = getEmploymentTypeOptions();
            expect(options.length).toBe(5);
            expect(options.map((o) => o.value)).toContain("custom");
        });

        it("should return all options when includeCustom is true", () => {
            const options = getEmploymentTypeOptions(true);
            expect(options.length).toBe(5);
            expect(options.map((o) => o.value)).toContain("custom");
        });

        it("should exclude custom when includeCustom is false", () => {
            const options = getEmploymentTypeOptions(false);
            expect(options.length).toBe(4);
            expect(options.map((o) => o.value)).not.toContain("custom");
        });

        it("should maintain order when excluding custom", () => {
            const options = getEmploymentTypeOptions(false);
            expect(options[0].value).toBe("full");
            expect(options[options.length - 1].value).toBe("one_third");
        });
    });
});
