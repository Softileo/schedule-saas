/**
 * =============================================================================
 * TESTY JEDNOSTKOWE - WORK HOURS
 * =============================================================================
 */

import { describe, it, expect } from "vitest";
import {
    calculateWorkingHours,
    getRequiredHours,
} from "@/lib/core/schedule/work-hours";
import type { PublicHoliday } from "@/types";

// =============================================================================
// HELPERS
// =============================================================================

function createHoliday(date: string, name: string = "Święto"): PublicHoliday {
    return {
        date,
        name,
        localName: name,
        countryCode: "PL",
        fixed: true,
        global: true,
        counties: null,
        launchYear: null,
        types: ["Public"],
    };
}

// =============================================================================
// TESTY: calculateWorkingHours
// =============================================================================

describe("calculateWorkingHours", () => {
    it("oblicza dni robocze dla stycznia 2026 (bez świąt)", () => {
        // Styczeń 2026:
        // - 31 dni
        // - 4 soboty (3, 10, 17, 24, 31) + 4 niedziele (4, 11, 18, 25)
        // - 1 święto (Nowy Rok - 1.01, ale to środa więc nie weekend)
        // - 1 święto (Trzech Króli - 6.01, ale wtorek)
        // Dni robocze: 31 - 8 (weekendy) - 2 (święta, jeśli nie w weekend) = 21
        // Uwaga: bez świąt = 23 dni robocze

        const result = calculateWorkingHours(2026, 1, [], 8);

        expect(result.totalWorkingDays).toBe(22); // poniedziałek-piątek (bez weekendów)
        expect(result.totalWorkingHours).toBe(22 * 8);
        expect(result.saturdays).toBe(5); // 5 sobót w styczniu 2026
    });

    it("odejmuje święta od dni roboczych", () => {
        // Dodajmy święto w dzień roboczy
        const holidays = [
            createHoliday("2026-01-01", "Nowy Rok"), // czwartek
            createHoliday("2026-01-06", "Trzech Króli"), // wtorek
        ];

        const result = calculateWorkingHours(2026, 1, holidays, 8);

        expect(result.totalWorkingDays).toBe(20); // 22 - 2 święta
        expect(result.holidays).toHaveLength(2);
    });

    it("nie odejmuje świąt przypadających w weekendy", () => {
        // Święto w sobotę
        const holidays = [createHoliday("2026-01-03", "Test")]; // sobota

        const result = calculateWorkingHours(2026, 1, holidays, 8);

        // Sobota i tak nie jest dniem roboczym
        expect(result.totalWorkingDays).toBe(22);
    });

    it("oblicza godziny z różną liczbą godzin dziennie", () => {
        const result4h = calculateWorkingHours(2026, 1, [], 4);
        const result8h = calculateWorkingHours(2026, 1, [], 8);

        expect(result4h.totalWorkingHours).toBe(result4h.totalWorkingDays * 4);
        expect(result8h.totalWorkingHours).toBe(result8h.totalWorkingDays * 8);
    });

    it("poprawnie liczy soboty", () => {
        const result = calculateWorkingHours(2026, 1, [], 8);

        // Styczeń 2026 ma 5 sobót (3, 10, 17, 24, 31)
        expect(result.saturdays).toBe(5);
    });

    it("obsługuje luty (28/29 dni)", () => {
        // 2026 nie jest rokiem przestępnym
        const result2026 = calculateWorkingHours(2026, 2, [], 8);

        // Luty 2026 - 28 dni, 4 soboty + 4 niedziele = 20 dni roboczych
        expect(result2026.totalWorkingDays).toBe(20);

        // 2024 jest rokiem przestępnym
        const result2024 = calculateWorkingHours(2024, 2, [], 8);

        // Luty 2024 - 29 dni
        expect(result2024.totalWorkingDays).toBeGreaterThanOrEqual(19);
    });
});

// =============================================================================
// TESTY: getRequiredHours
// =============================================================================

describe("getRequiredHours", () => {
    const holidays: PublicHoliday[] = [];

    it("oblicza godziny dla pełnego etatu (8h/dzień)", () => {
        const result = getRequiredHours(2026, 1, holidays, "full");

        // Pełny etat = 8h/dzień * dni robocze
        expect(result).toBe(22 * 8); // 176h
    });

    it("oblicza godziny dla połowy etatu (4h/dzień)", () => {
        const result = getRequiredHours(2026, 1, holidays, "half");

        // Pół etatu = 4h/dzień * dni robocze
        expect(result).toBe(22 * 4); // 88h
    });

    it("oblicza godziny dla custom etatu", () => {
        const result = getRequiredHours(2026, 1, holidays, "custom", 6);

        // Custom 6h/dzień * dni robocze
        expect(result).toBe(22 * 6); // 132h
    });

    it("używa domyślnych 8h gdy custom bez wartości", () => {
        const result = getRequiredHours(2026, 1, holidays, "custom");

        // Brak customHours = domyślne 8h
        expect(result).toBe(22 * 8);
    });
});
