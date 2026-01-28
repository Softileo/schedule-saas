/**
 * =============================================================================
 * TESTY JEDNOSTKOWE - DATE HELPERS
 * =============================================================================
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
    MONTH_NAMES,
    DAY_NAMES,
    formatDatePL,
    getMonthName,
    getWeekDays,
    nextMonth,
    prevMonth,
    getYearOptions,
    getMonthOptions,
    formatTime,
    parseTime,
    timeToMinutes,
    minutesToTime,
    calculateWorkHours,
    formatDateToISO,
} from "@/lib/utils/date-helpers";

// =============================================================================
// TESTY: STAŁE
// =============================================================================

describe("Stałe", () => {
    it("MONTH_NAMES zawiera 12 miesięcy", () => {
        expect(MONTH_NAMES).toHaveLength(12);
        expect(MONTH_NAMES[0]).toBe("Styczeń");
        expect(MONTH_NAMES[11]).toBe("Grudzień");
    });

    it("DAY_NAMES zawiera 7 dni tygodnia", () => {
        expect(DAY_NAMES).toHaveLength(7);
        expect(DAY_NAMES[0]).toBe("Pon");
        expect(DAY_NAMES[6]).toBe("Nd");
    });
});

// =============================================================================
// TESTY: formatDatePL
// =============================================================================

describe("formatDatePL", () => {
    it("formatuje datę domyślnie (dd MMMM yyyy)", () => {
        const date = new Date(2026, 0, 15); // 15 stycznia 2026
        const result = formatDatePL(date);
        expect(result).toBe("15 stycznia 2026");
    });

    it("formatuje datę z własnym formatem", () => {
        const date = new Date(2026, 5, 20); // 20 czerwca 2026
        const result = formatDatePL(date, "d MMM yyyy");
        expect(result).toBe("20 cze 2026");
    });

    it("przyjmuje string daty", () => {
        const result = formatDatePL("2026-03-10", "dd.MM.yyyy");
        expect(result).toBe("10.03.2026");
    });
});

// =============================================================================
// TESTY: getMonthName
// =============================================================================

describe("getMonthName", () => {
    it("zwraca poprawną nazwę miesiąca", () => {
        expect(getMonthName(1)).toBe("Styczeń");
        expect(getMonthName(6)).toBe("Czerwiec");
        expect(getMonthName(12)).toBe("Grudzień");
    });

    it("zwraca pusty string dla nieprawidłowego miesiąca", () => {
        expect(getMonthName(0)).toBe("");
        expect(getMonthName(13)).toBe("");
        expect(getMonthName(-1)).toBe("");
    });
});

// =============================================================================
// TESTY: getWeekDays
// =============================================================================

describe("getWeekDays", () => {
    it("zwraca 7 dni tygodnia", () => {
        const date = new Date(2026, 0, 15); // czwartek
        const days = getWeekDays(date);

        expect(days).toHaveLength(7);
    });

    it("tydzień zaczyna się od poniedziałku", () => {
        const date = new Date(2026, 0, 15); // czwartek 15 stycznia 2026
        const days = getWeekDays(date);

        // Poniedziałek 12 stycznia 2026
        expect(days[0].getDay()).toBe(1); // poniedziałek
        expect(days[6].getDay()).toBe(0); // niedziela
    });
});

// =============================================================================
// TESTY: nextMonth / prevMonth
// =============================================================================

describe("nextMonth", () => {
    it("przechodzi do następnego miesiąca", () => {
        const date = new Date(2026, 0, 15); // styczeń
        const result = nextMonth(date);

        expect(result.getMonth()).toBe(1); // luty
        expect(result.getFullYear()).toBe(2026);
    });

    it("przechodzi do następnego roku", () => {
        const date = new Date(2026, 11, 15); // grudzień
        const result = nextMonth(date);

        expect(result.getMonth()).toBe(0); // styczeń
        expect(result.getFullYear()).toBe(2027);
    });
});

describe("prevMonth", () => {
    it("przechodzi do poprzedniego miesiąca", () => {
        const date = new Date(2026, 5, 15); // czerwiec
        const result = prevMonth(date);

        expect(result.getMonth()).toBe(4); // maj
        expect(result.getFullYear()).toBe(2026);
    });

    it("przechodzi do poprzedniego roku", () => {
        const date = new Date(2026, 0, 15); // styczeń
        const result = prevMonth(date);

        expect(result.getMonth()).toBe(11); // grudzień
        expect(result.getFullYear()).toBe(2025);
    });
});

// =============================================================================
// TESTY: getYearOptions
// =============================================================================

describe("getYearOptions", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 0, 6)); // 6 stycznia 2026
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("zwraca 4 lata (bieżący ± 1 i +2)", () => {
        const years = getYearOptions();

        expect(years).toHaveLength(4);
        expect(years).toContain(2025);
        expect(years).toContain(2026);
        expect(years).toContain(2027);
        expect(years).toContain(2028);
    });
});

// =============================================================================
// TESTY: getMonthOptions
// =============================================================================

describe("getMonthOptions", () => {
    it("zwraca 12 opcji miesięcy", () => {
        const options = getMonthOptions();

        expect(options).toHaveLength(12);
    });

    it("każda opcja ma value (1-12) i label", () => {
        const options = getMonthOptions();

        expect(options[0]).toEqual({ value: 1, label: "Styczeń" });
        expect(options[5]).toEqual({ value: 6, label: "Czerwiec" });
        expect(options[11]).toEqual({ value: 12, label: "Grudzień" });
    });
});

// =============================================================================
// TESTY: formatTime
// =============================================================================

describe("formatTime", () => {
    it("formatuje czas HH:MM:SS do HH:MM", () => {
        expect(formatTime("08:30:00")).toBe("08:30");
        expect(formatTime("16:00:00")).toBe("16:00");
    });

    it("obsługuje format HH:MM", () => {
        expect(formatTime("08:30")).toBe("08:30");
        expect(formatTime("23:59")).toBe("23:59");
    });
});

// =============================================================================
// TESTY: parseTime
// =============================================================================

describe("parseTime", () => {
    it("parsuje czas do obiektu", () => {
        expect(parseTime("08:30")).toEqual({ hours: 8, minutes: 30 });
        expect(parseTime("16:00")).toEqual({ hours: 16, minutes: 0 });
        expect(parseTime("00:00")).toEqual({ hours: 0, minutes: 0 });
    });

    it("parsuje czas z sekundami", () => {
        expect(parseTime("08:30:00")).toEqual({ hours: 8, minutes: 30 });
    });
});

// =============================================================================
// TESTY: timeToMinutes
// =============================================================================

describe("timeToMinutes", () => {
    it("konwertuje czas na minuty od północy", () => {
        expect(timeToMinutes("00:00")).toBe(0);
        expect(timeToMinutes("01:00")).toBe(60);
        expect(timeToMinutes("08:30")).toBe(510); // 8*60 + 30
        expect(timeToMinutes("12:00")).toBe(720);
        expect(timeToMinutes("23:59")).toBe(1439);
    });
});

// =============================================================================
// TESTY: minutesToTime
// =============================================================================

describe("minutesToTime", () => {
    it("konwertuje minuty na czas HH:MM", () => {
        expect(minutesToTime(0)).toBe("00:00");
        expect(minutesToTime(60)).toBe("01:00");
        expect(minutesToTime(510)).toBe("08:30");
        expect(minutesToTime(720)).toBe("12:00");
        expect(minutesToTime(1439)).toBe("23:59");
    });
});

// =============================================================================
// TESTY: calculateWorkHours
// =============================================================================

describe("calculateWorkHours", () => {
    it("oblicza standardową 8h zmianę bez przerwy", () => {
        expect(calculateWorkHours("08:00", "16:00", 0)).toBe("8h");
    });

    it("oblicza zmianę z przerwą", () => {
        expect(calculateWorkHours("08:00", "16:00", 30)).toBe("7h 30min");
        expect(calculateWorkHours("08:00", "16:00", 60)).toBe("7h");
    });

    it("oblicza krótką zmianę", () => {
        expect(calculateWorkHours("10:00", "14:00", 0)).toBe("4h");
    });

    it("oblicza zmianę nocną (przez północ)", () => {
        expect(calculateWorkHours("22:00", "06:00", 0)).toBe("8h");
    });

    it("oblicza zmianę z nietypowymi minutami", () => {
        expect(calculateWorkHours("08:15", "16:45", 0)).toBe("8h 30min");
        expect(calculateWorkHours("08:15", "16:45", 30)).toBe("8h");
    });
});

// =============================================================================
// TESTY: formatDateToISO
// =============================================================================

describe("formatDateToISO", () => {
    it("formatuje datę do ISO (YYYY-MM-DD)", () => {
        const date = new Date(2026, 0, 6); // 6 stycznia 2026
        expect(formatDateToISO(date)).toBe("2026-01-06");
    });

    it("dodaje wiodące zera", () => {
        const date = new Date(2026, 5, 9); // 9 czerwca 2026
        expect(formatDateToISO(date)).toBe("2026-06-09");
    });
});
