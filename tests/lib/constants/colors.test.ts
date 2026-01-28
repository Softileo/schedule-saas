/**
 * Colors Constants Tests
 *
 * Testy dla stałych i funkcji dotyczących kolorów.
 */

import { describe, it, expect } from "vitest";
import {
    APP_COLORS,
    PRESET_COLORS,
    TEMPLATE_COLORS,
    SHIFT_COLORS,
    DEFAULT_EMPLOYEE_COLOR,
    getUniqueEmployeeColor,
    getRandomColor,
    COLOR_NAME_MAP,
} from "@/lib/constants/colors";

describe("constants/colors", () => {
    // =========================================================================
    // APP_COLORS
    // =========================================================================
    describe("APP_COLORS", () => {
        it("should contain 16 colors", () => {
            expect(APP_COLORS.length).toBe(16);
        });

        it("should have required properties for each color", () => {
            APP_COLORS.forEach((color) => {
                expect(color).toHaveProperty("name");
                expect(color).toHaveProperty("value");
                expect(color).toHaveProperty("key");
                expect(color.value).toMatch(/^#[0-9a-fA-F]{6}$/);
            });
        });

        it("should have unique values", () => {
            const values = APP_COLORS.map((c) => c.value);
            const uniqueValues = new Set(values);
            expect(uniqueValues.size).toBe(values.length);
        });

        it("should have unique keys", () => {
            const keys = APP_COLORS.map((c) => c.key);
            const uniqueKeys = new Set(keys);
            expect(uniqueKeys.size).toBe(keys.length);
        });

        it("should start with red", () => {
            expect(APP_COLORS[0].key).toBe("red");
        });

        it("should have blue as second color", () => {
            expect(APP_COLORS[1].key).toBe("blue");
        });
    });

    // =========================================================================
    // PRESET_COLORS, TEMPLATE_COLORS
    // =========================================================================
    describe("PRESET_COLORS / TEMPLATE_COLORS", () => {
        it("should have same length as APP_COLORS", () => {
            expect(PRESET_COLORS.length).toBe(APP_COLORS.length);
            expect(TEMPLATE_COLORS.length).toBe(APP_COLORS.length);
        });

        it("should contain hex values only", () => {
            PRESET_COLORS.forEach((color) => {
                expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
            });
        });

        it("should be derived from APP_COLORS", () => {
            APP_COLORS.forEach((c, i) => {
                expect(PRESET_COLORS[i]).toBe(c.value);
            });
        });
    });

    // =========================================================================
    // SHIFT_COLORS
    // =========================================================================
    describe("SHIFT_COLORS", () => {
        it("should have name and value for each color", () => {
            SHIFT_COLORS.forEach((color) => {
                expect(color).toHaveProperty("name");
                expect(color).toHaveProperty("value");
                expect(typeof color.name).toBe("string");
                expect(color.value).toMatch(/^#[0-9a-fA-F]{6}$/);
            });
        });

        it("should have Polish names", () => {
            const names = SHIFT_COLORS.map((c) => c.name);
            expect(names).toContain("Czerwony");
            expect(names).toContain("Niebieski");
            expect(names).toContain("Zielony");
        });
    });

    // =========================================================================
    // DEFAULT_EMPLOYEE_COLOR
    // =========================================================================
    describe("DEFAULT_EMPLOYEE_COLOR", () => {
        it("should be a valid hex color", () => {
            expect(DEFAULT_EMPLOYEE_COLOR).toMatch(/^#[0-9a-fA-F]{6}$/);
        });

        it("should be blue", () => {
            expect(DEFAULT_EMPLOYEE_COLOR).toBe("#3b82f6");
        });
    });

    // =========================================================================
    // getUniqueEmployeeColor
    // =========================================================================
    describe("getUniqueEmployeeColor", () => {
        it("should return first color when no colors used", () => {
            const color = getUniqueEmployeeColor([]);
            expect(color).toBe(APP_COLORS[0].value);
        });

        it("should return second color when first is used", () => {
            const usedColors = [APP_COLORS[0].value];
            const color = getUniqueEmployeeColor(usedColors);
            expect(color).toBe(APP_COLORS[1].value);
        });

        it("should skip used colors", () => {
            const usedColors = [APP_COLORS[0].value, APP_COLORS[1].value];
            const color = getUniqueEmployeeColor(usedColors);
            expect(color).toBe(APP_COLORS[2].value);
        });

        it("should return least used color when all are taken", () => {
            const allColors: string[] = APP_COLORS.map((c) => c.value);
            const usedColors = [...allColors, allColors[0]]; // First color used twice
            const color = getUniqueEmployeeColor(usedColors);
            // Should return one of the colors used only once
            expect(allColors.includes(color)).toBe(true);
        });

        it("should handle empty array", () => {
            expect(() => getUniqueEmployeeColor([])).not.toThrow();
        });

        it("should return valid hex color", () => {
            const color = getUniqueEmployeeColor(["#ef4444"]);
            expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
        });
    });

    // =========================================================================
    // getRandomColor (misleading name - it's actually sequential)
    // =========================================================================
    describe("getRandomColor", () => {
        it("should return first available color (not random)", () => {
            const color1 = getRandomColor([]);
            expect(color1).toBe(APP_COLORS[0].value);
        });

        it("should skip used colors", () => {
            const usedColors = [APP_COLORS[0].value];
            const color = getRandomColor(usedColors);
            expect(color).toBe(APP_COLORS[1].value);
        });

        it("should find least used when all taken", () => {
            const allColors = APP_COLORS.map((c) => c.value);
            // Use all colors once, then use first color again
            const usedColors = [...allColors, allColors[5]];
            const color = getRandomColor(usedColors);
            // Should return one of the colors used only once (not the 6th one)
            expect(color).not.toBe(allColors[5]);
        });

        it("should be deterministic (same input = same output)", () => {
            const used = [APP_COLORS[0].value, APP_COLORS[1].value];
            const color1 = getRandomColor(used);
            const color2 = getRandomColor(used);
            expect(color1).toBe(color2);
        });
    });

    // =========================================================================
    // COLOR_NAME_MAP
    // =========================================================================
    describe("COLOR_NAME_MAP", () => {
        it("should have all color keys", () => {
            APP_COLORS.forEach((c) => {
                expect(COLOR_NAME_MAP).toHaveProperty(c.key);
            });
        });

        it("should map keys to hex values", () => {
            expect(COLOR_NAME_MAP.red).toBe("#ef4444");
            expect(COLOR_NAME_MAP.blue).toBe("#3b82f6");
            expect(COLOR_NAME_MAP.green).toBe("#22c55e");
        });

        it("should have 16 entries", () => {
            expect(Object.keys(COLOR_NAME_MAP).length).toBe(16);
        });
    });
});
