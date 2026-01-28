/**
 * =============================================================================
 * TESTY JEDNOSTKOWE - HOLIDAYS API
 * =============================================================================
 */

import { describe, it, expect } from "vitest";
import {
    calculateTradingSundays,
    getTradingSundays,
    isTradingSundayDate,
    translateHolidayName,
} from "@/lib/api/holidays";

// =============================================================================
// TESTY: calculateTradingSundays
// =============================================================================

describe("calculateTradingSundays", () => {
    it("zwraca 7 niedziel handlowych dla 2026", () => {
        const sundays = calculateTradingSundays(2026);

        // Zgodnie z polskim prawem:
        // 1. Ostatnia niedziela stycznia
        // 2. 2 niedziele przed Wielkanocą
        // 3. Ostatnia niedziela czerwca
        // 4. Ostatnia niedziela sierpnia
        // 5. 2 ostatnie niedziele grudnia
        expect(sundays).toHaveLength(7);
    });

    it("wszystkie daty są niedzielami", () => {
        const sundays = calculateTradingSundays(2026);

        sundays.forEach((dateStr) => {
            const date = new Date(dateStr);
            expect(date.getDay()).toBe(0); // 0 = niedziela
        });
    });

    it("zawiera ostatnią niedzielę stycznia", () => {
        const sundays = calculateTradingSundays(2026);

        // Styczeń 2026: ostatnia niedziela to 25.01
        expect(sundays).toContain("2026-01-25");
    });

    it("zawiera ostatnią niedzielę czerwca", () => {
        const sundays = calculateTradingSundays(2026);

        // Czerwiec 2026: ostatnia niedziela to 28.06
        expect(sundays).toContain("2026-06-28");
    });

    it("zawiera ostatnią niedzielę sierpnia", () => {
        const sundays = calculateTradingSundays(2026);

        // Sierpień 2026: ostatnia niedziela to 30.08
        expect(sundays).toContain("2026-08-30");
    });

    it("zawiera 2 ostatnie niedziele grudnia", () => {
        const sundays = calculateTradingSundays(2026);

        // Grudzień 2026: niedziele 20 i 27
        expect(sundays).toContain("2026-12-20");
        expect(sundays).toContain("2026-12-27");
    });

    it("zawiera 2 niedziele przed Wielkanocą", () => {
        // Wielkanoc 2026: 5 kwietnia
        // 2 niedziele przed: 22 marca i 29 marca
        const sundays = calculateTradingSundays(2026);

        expect(sundays).toContain("2026-03-22");
        expect(sundays).toContain("2026-03-29");
    });

    it("zwraca posortowane daty", () => {
        const sundays = calculateTradingSundays(2026);
        const sorted = [...sundays].sort();

        expect(sundays).toEqual(sorted);
    });

    it("działa dla różnych lat", () => {
        const sundays2024 = calculateTradingSundays(2024);
        const sundays2025 = calculateTradingSundays(2025);
        const sundays2027 = calculateTradingSundays(2027);

        expect(sundays2024).toHaveLength(7);
        expect(sundays2025).toHaveLength(7);
        expect(sundays2027).toHaveLength(7);

        // Różne lata powinny mieć różne daty
        expect(sundays2024).not.toEqual(sundays2025);
        expect(sundays2025).not.toEqual(sundays2027);
    });
});

// =============================================================================
// TESTY: getTradingSundays (z cache)
// =============================================================================

describe("getTradingSundays", () => {
    it("zwraca te same wartości co calculateTradingSundays", () => {
        const calculated = calculateTradingSundays(2026);
        const cached = getTradingSundays(2026);

        expect(cached).toEqual(calculated);
    });

    it("zwraca ten sam obiekt przy wielokrotnym wywołaniu (cache)", () => {
        const first = getTradingSundays(2026);
        const second = getTradingSundays(2026);

        // Powinien zwrócić ten sam obiekt z cache
        expect(first).toBe(second);
    });
});

// =============================================================================
// TESTY: isTradingSundayDate
// =============================================================================

describe("isTradingSundayDate", () => {
    it("zwraca true dla niedzieli handlowej (string)", () => {
        // Ostatnia niedziela stycznia 2026
        expect(isTradingSundayDate("2026-01-25")).toBe(true);
    });

    it("zwraca true dla niedzieli handlowej (Date)", () => {
        const date = new Date(2026, 0, 25); // 25 stycznia 2026
        expect(isTradingSundayDate(date)).toBe(true);
    });

    it("zwraca false dla zwykłej niedzieli", () => {
        // 4 stycznia 2026 to zwykła niedziela (nie handlowa)
        expect(isTradingSundayDate("2026-01-04")).toBe(false);
    });

    it("zwraca false dla dnia roboczego", () => {
        expect(isTradingSundayDate("2026-01-05")).toBe(false); // poniedziałek
    });
});

// =============================================================================
// TESTY: translateHolidayName
// =============================================================================

describe("translateHolidayName", () => {
    it("tłumaczy znane święta", () => {
        expect(translateHolidayName("New Year's Day")).toBe("Nowy Rok");
        expect(translateHolidayName("Epiphany")).toBe("Święto Trzech Króli");
        expect(translateHolidayName("Easter Sunday")).toBe("Wielkanoc");
        expect(translateHolidayName("Easter Monday")).toBe(
            "Poniedziałek Wielkanocny"
        );
        expect(translateHolidayName("May Day")).toBe("Święto Pracy");
        expect(translateHolidayName("Constitution Day")).toBe(
            "Święto Konstytucji 3 Maja"
        );
        expect(translateHolidayName("Corpus Christi")).toBe("Boże Ciało");
        expect(translateHolidayName("All Saints' Day")).toBe(
            "Wszystkich Świętych"
        );
        expect(translateHolidayName("Independence Day")).toBe(
            "Święto Niepodległości"
        );
        expect(translateHolidayName("Christmas Day")).toBe("Boże Narodzenie");
    });

    it("zwraca oryginalną nazwę dla nieznanych świąt", () => {
        expect(translateHolidayName("Unknown Holiday")).toBe("Unknown Holiday");
        expect(translateHolidayName("Custom Day")).toBe("Custom Day");
    });
});
