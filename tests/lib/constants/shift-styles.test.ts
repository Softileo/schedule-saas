/**
 * Testy dla constants/shift-styles.ts
 *
 * Testuje:
 * - SHIFT_TYPE_STYLES - style dla typów zmian
 * - getShiftTypeFromTime() - określanie typu zmiany na podstawie godziny
 */

import { describe, it, expect } from "vitest";
import {
    SHIFT_TYPE_STYLES,
    getShiftTypeFromTime,
    type ShiftType,
} from "@/lib/constants/shift-styles";

// =========================================================================
// SHIFT_TYPE_STYLES
// =========================================================================
describe("SHIFT_TYPE_STYLES", () => {
    describe("structure", () => {
        it("should have three shift types", () => {
            const types = Object.keys(SHIFT_TYPE_STYLES);
            expect(types).toHaveLength(3);
            expect(types).toContain("morning");
            expect(types).toContain("afternoon");
            expect(types).toContain("night");
        });

        it("should have all required style properties for each type", () => {
            const requiredProps = [
                "bg",
                "text",
                "border",
                "darkBg",
                "darkText",
                "darkBorder",
            ];

            for (const type of Object.keys(SHIFT_TYPE_STYLES)) {
                const styles =
                    SHIFT_TYPE_STYLES[type as keyof typeof SHIFT_TYPE_STYLES];
                for (const prop of requiredProps) {
                    expect(styles).toHaveProperty(prop);
                    expect(typeof styles[prop as keyof typeof styles]).toBe(
                        "string"
                    );
                }
            }
        });
    });

    describe("morning styles", () => {
        it("should have blue color scheme", () => {
            const { morning } = SHIFT_TYPE_STYLES;
            expect(morning.bg).toContain("blue");
            expect(morning.text).toContain("blue");
            expect(morning.border).toContain("blue");
            expect(morning.darkBg).toContain("blue");
            expect(morning.darkText).toContain("blue");
            expect(morning.darkBorder).toContain("blue");
        });

        it("should have valid Tailwind classes", () => {
            const { morning } = SHIFT_TYPE_STYLES;
            expect(morning.bg).toMatch(/^bg-/);
            expect(morning.text).toMatch(/^text-/);
            expect(morning.border).toMatch(/^border-/);
            expect(morning.darkBg).toMatch(/^dark:bg-/);
            expect(morning.darkText).toMatch(/^dark:text-/);
            expect(morning.darkBorder).toMatch(/^dark:border-/);
        });
    });

    describe("afternoon styles", () => {
        it("should have violet color scheme", () => {
            const { afternoon } = SHIFT_TYPE_STYLES;
            expect(afternoon.bg).toContain("violet");
            expect(afternoon.text).toContain("violet");
            expect(afternoon.border).toContain("violet");
            expect(afternoon.darkBg).toContain("violet");
            expect(afternoon.darkText).toContain("violet");
            expect(afternoon.darkBorder).toContain("violet");
        });

        it("should have valid Tailwind classes", () => {
            const { afternoon } = SHIFT_TYPE_STYLES;
            expect(afternoon.bg).toMatch(/^bg-/);
            expect(afternoon.text).toMatch(/^text-/);
            expect(afternoon.border).toMatch(/^border-/);
        });
    });

    describe("night styles", () => {
        it("should have slate color scheme", () => {
            const { night } = SHIFT_TYPE_STYLES;
            expect(night.bg).toContain("slate");
            expect(night.text).toContain("slate");
            expect(night.border).toContain("slate");
            expect(night.darkBg).toContain("slate");
            expect(night.darkText).toContain("slate");
            expect(night.darkBorder).toContain("slate");
        });

        it("should have valid Tailwind classes", () => {
            const { night } = SHIFT_TYPE_STYLES;
            expect(night.bg).toMatch(/^bg-/);
            expect(night.text).toMatch(/^text-/);
            expect(night.border).toMatch(/^border-/);
        });
    });

    describe("immutability", () => {
        it("should be readonly (as const)", () => {
            // TypeScript enforces this at compile time
            // At runtime, we can check the object exists
            expect(SHIFT_TYPE_STYLES).toBeDefined();
            expect(Object.isFrozen(SHIFT_TYPE_STYLES)).toBe(false); // as const doesn't freeze
        });
    });
});

// =========================================================================
// getShiftTypeFromTime
// =========================================================================
describe("getShiftTypeFromTime", () => {
    describe("morning shifts (before 12:00)", () => {
        it("should return morning for 00:00", () => {
            expect(getShiftTypeFromTime("00:00")).toBe("morning");
        });

        it("should return morning for 06:00", () => {
            expect(getShiftTypeFromTime("06:00")).toBe("morning");
        });

        it("should return morning for 07:30", () => {
            expect(getShiftTypeFromTime("07:30")).toBe("morning");
        });

        it("should return morning for 08:00", () => {
            expect(getShiftTypeFromTime("08:00")).toBe("morning");
        });

        it("should return morning for 09:00", () => {
            expect(getShiftTypeFromTime("09:00")).toBe("morning");
        });

        it("should return morning for 10:00", () => {
            expect(getShiftTypeFromTime("10:00")).toBe("morning");
        });

        it("should return morning for 11:00", () => {
            expect(getShiftTypeFromTime("11:00")).toBe("morning");
        });

        it("should return morning for 11:59", () => {
            expect(getShiftTypeFromTime("11:59")).toBe("morning");
        });
    });

    describe("afternoon shifts (12:00 - 19:59)", () => {
        it("should return afternoon for 12:00", () => {
            expect(getShiftTypeFromTime("12:00")).toBe("afternoon");
        });

        it("should return afternoon for 13:00", () => {
            expect(getShiftTypeFromTime("13:00")).toBe("afternoon");
        });

        it("should return afternoon for 14:00", () => {
            expect(getShiftTypeFromTime("14:00")).toBe("afternoon");
        });

        it("should return afternoon for 15:00", () => {
            expect(getShiftTypeFromTime("15:00")).toBe("afternoon");
        });

        it("should return afternoon for 16:00", () => {
            expect(getShiftTypeFromTime("16:00")).toBe("afternoon");
        });

        it("should return afternoon for 17:00", () => {
            expect(getShiftTypeFromTime("17:00")).toBe("afternoon");
        });

        it("should return afternoon for 18:00", () => {
            expect(getShiftTypeFromTime("18:00")).toBe("afternoon");
        });

        it("should return afternoon for 19:00", () => {
            expect(getShiftTypeFromTime("19:00")).toBe("afternoon");
        });

        it("should return afternoon for 19:59", () => {
            expect(getShiftTypeFromTime("19:59")).toBe("afternoon");
        });
    });

    describe("night shifts (20:00+)", () => {
        it("should return night for 20:00", () => {
            expect(getShiftTypeFromTime("20:00")).toBe("night");
        });

        it("should return night for 21:00", () => {
            expect(getShiftTypeFromTime("21:00")).toBe("night");
        });

        it("should return night for 22:00", () => {
            expect(getShiftTypeFromTime("22:00")).toBe("night");
        });

        it("should return night for 23:00", () => {
            expect(getShiftTypeFromTime("23:00")).toBe("night");
        });

        it("should return night for 23:59", () => {
            expect(getShiftTypeFromTime("23:59")).toBe("night");
        });
    });

    describe("edge cases", () => {
        it("should handle single digit hours with leading zero", () => {
            expect(getShiftTypeFromTime("05:00")).toBe("morning");
            expect(getShiftTypeFromTime("09:30")).toBe("morning");
        });

        it("should handle various minute values", () => {
            expect(getShiftTypeFromTime("08:15")).toBe("morning");
            expect(getShiftTypeFromTime("14:45")).toBe("afternoon");
            expect(getShiftTypeFromTime("22:30")).toBe("night");
        });

        it("should return valid ShiftType", () => {
            const validTypes: ShiftType[] = ["morning", "afternoon", "night"];

            expect(validTypes).toContain(getShiftTypeFromTime("08:00"));
            expect(validTypes).toContain(getShiftTypeFromTime("14:00"));
            expect(validTypes).toContain(getShiftTypeFromTime("22:00"));
        });
    });

    describe("boundary conditions", () => {
        it("should correctly handle 11:59 -> 12:00 boundary", () => {
            expect(getShiftTypeFromTime("11:59")).toBe("morning");
            expect(getShiftTypeFromTime("12:00")).toBe("afternoon");
        });

        it("should correctly handle 19:59 -> 20:00 boundary", () => {
            expect(getShiftTypeFromTime("19:59")).toBe("afternoon");
            expect(getShiftTypeFromTime("20:00")).toBe("night");
        });
    });
});

// =========================================================================
// Integration tests
// =========================================================================
describe("shift styles integration", () => {
    it("should be able to get styles for any time", () => {
        const times = ["06:00", "14:00", "22:00"];

        for (const time of times) {
            const shiftType = getShiftTypeFromTime(time);
            const styles = SHIFT_TYPE_STYLES[shiftType];

            expect(styles).toBeDefined();
            expect(styles.bg).toBeDefined();
            expect(styles.text).toBeDefined();
        }
    });

    it("should return different styles for different shift types", () => {
        const morningStyles = SHIFT_TYPE_STYLES[getShiftTypeFromTime("08:00")];
        const afternoonStyles =
            SHIFT_TYPE_STYLES[getShiftTypeFromTime("14:00")];
        const nightStyles = SHIFT_TYPE_STYLES[getShiftTypeFromTime("22:00")];

        expect(morningStyles.bg).not.toBe(afternoonStyles.bg);
        expect(afternoonStyles.bg).not.toBe(nightStyles.bg);
        expect(morningStyles.bg).not.toBe(nightStyles.bg);
    });
});
