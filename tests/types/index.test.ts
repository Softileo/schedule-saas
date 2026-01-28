/**
 * @fileoverview Tests for type constants and mappings
 *
 * Tests for absence types, labels, and colors.
 */

import { describe, it, expect } from "vitest";
import {
    ABSENCE_TYPE_LABELS,
    ABSENCE_TYPE_COLORS,
    type AbsenceType,
} from "@/types";

describe("AbsenceType constants", () => {
    const ALL_ABSENCE_TYPES: AbsenceType[] = [
        "vacation",
        "sick_leave",
        "uz",
        "maternity",
        "paternity",
        "unpaid",
        "childcare",
        "bereavement",
        "training",
        "remote",
        "blood_donation",
        "court_summons",
        "other",
    ];

    describe("ABSENCE_TYPE_LABELS", () => {
        it("should have labels for all absence types", () => {
            for (const type of ALL_ABSENCE_TYPES) {
                expect(ABSENCE_TYPE_LABELS[type]).toBeDefined();
                expect(typeof ABSENCE_TYPE_LABELS[type]).toBe("string");
            }
        });

        it("should have exactly 13 absence types", () => {
            expect(Object.keys(ABSENCE_TYPE_LABELS)).toHaveLength(13);
        });

        it("should have Polish labels", () => {
            expect(ABSENCE_TYPE_LABELS.vacation).toBe("Urlop wypoczynkowy");
            expect(ABSENCE_TYPE_LABELS.sick_leave).toBe("Zwolnienie lekarskie");
            expect(ABSENCE_TYPE_LABELS.uz).toBe("Urlop na żądanie");
            expect(ABSENCE_TYPE_LABELS.maternity).toBe("Urlop macierzyński");
            expect(ABSENCE_TYPE_LABELS.paternity).toBe("Urlop ojcowski");
            expect(ABSENCE_TYPE_LABELS.unpaid).toBe("Urlop bezpłatny");
            expect(ABSENCE_TYPE_LABELS.childcare).toBe("Opieka nad dzieckiem");
            expect(ABSENCE_TYPE_LABELS.bereavement).toBe(
                "Urlop okolicznościowy"
            );
            expect(ABSENCE_TYPE_LABELS.training).toBe("Szkolenie");
            expect(ABSENCE_TYPE_LABELS.remote).toBe("Praca zdalna");
            expect(ABSENCE_TYPE_LABELS.blood_donation).toBe("Krwiodawstwo");
            expect(ABSENCE_TYPE_LABELS.court_summons).toBe("Wezwanie sądowe");
            expect(ABSENCE_TYPE_LABELS.other).toBe("Inna nieobecność");
        });

        it("should have non-empty labels", () => {
            for (const type of ALL_ABSENCE_TYPES) {
                expect(ABSENCE_TYPE_LABELS[type].length).toBeGreaterThan(0);
            }
        });

        it("should have unique labels", () => {
            const labels = Object.values(ABSENCE_TYPE_LABELS);
            const uniqueLabels = new Set(labels);
            expect(uniqueLabels.size).toBe(labels.length);
        });
    });

    describe("ABSENCE_TYPE_COLORS", () => {
        it("should have colors for all absence types", () => {
            for (const type of ALL_ABSENCE_TYPES) {
                expect(ABSENCE_TYPE_COLORS[type]).toBeDefined();
                expect(typeof ABSENCE_TYPE_COLORS[type]).toBe("string");
            }
        });

        it("should have exactly 13 colors", () => {
            expect(Object.keys(ABSENCE_TYPE_COLORS)).toHaveLength(13);
        });

        it("should have valid hex color format", () => {
            const hexColorRegex = /^#[0-9a-fA-F]{6}$/;
            for (const type of ALL_ABSENCE_TYPES) {
                expect(ABSENCE_TYPE_COLORS[type]).toMatch(hexColorRegex);
            }
        });

        it("should have specific colors for common types", () => {
            // Green for vacation
            expect(ABSENCE_TYPE_COLORS.vacation).toBe("#10b981");
            // Red for sick leave
            expect(ABSENCE_TYPE_COLORS.sick_leave).toBe("#ef4444");
            // Gray for unpaid
            expect(ABSENCE_TYPE_COLORS.unpaid).toBe("#6b7280");
        });

        it("should use red tones for medical-related absences", () => {
            // Sick leave and blood donation should be red-ish
            expect(ABSENCE_TYPE_COLORS.sick_leave).toMatch(/^#[e-f]/i);
            expect(ABSENCE_TYPE_COLORS.blood_donation).toMatch(/^#[d-f]/i);
        });
    });

    describe("consistency between labels and colors", () => {
        it("should have same keys in both objects", () => {
            const labelKeys = Object.keys(ABSENCE_TYPE_LABELS).sort();
            const colorKeys = Object.keys(ABSENCE_TYPE_COLORS).sort();
            expect(labelKeys).toEqual(colorKeys);
        });

        it("should match ALL_ABSENCE_TYPES array", () => {
            const labelKeys = Object.keys(ABSENCE_TYPE_LABELS).sort();
            const sortedTypes = [...ALL_ABSENCE_TYPES].sort();
            expect(labelKeys).toEqual(sortedTypes);
        });
    });

    describe("absence type categories", () => {
        it("should have leave types (urlop)", () => {
            const leaveTypes = [
                "vacation",
                "uz",
                "maternity",
                "paternity",
                "unpaid",
                "bereavement",
            ];
            for (const type of leaveTypes) {
                expect(
                    ABSENCE_TYPE_LABELS[type as AbsenceType].toLowerCase()
                ).toMatch(/urlop|na żądanie|okolicznościowy/);
            }
        });

        it("should have work-related types", () => {
            expect(ABSENCE_TYPE_LABELS.training).toContain("Szkolenie");
            expect(ABSENCE_TYPE_LABELS.remote).toContain("zdalna");
        });

        it('should have catch-all "other" type', () => {
            expect(ABSENCE_TYPE_LABELS.other).toBeDefined();
            expect(ABSENCE_TYPE_COLORS.other).toBeDefined();
        });
    });
});
