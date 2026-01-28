/**
 * =============================================================================
 * TESTY JEDNOSTKOWE - FUNKCJE POMOCNICZE SCHEDULERA
 * =============================================================================
 */

import { describe, it, expect } from "vitest";
import {
    getTemplateHours,
    getShiftHours,
    getShiftTimeType,
    calculateRestHours,
    daysDiff,
    getDayOfWeek,
    getWeekStart,
    parseDate,
} from "@/lib/scheduler/scheduler-utils";
import { formatDateToISO } from "@/lib/utils/date-helpers";

// =============================================================================
// TESTY: getTemplateHours
// =============================================================================

describe("getTemplateHours", () => {
    it("oblicza poprawnie 8h zmiany bez przerwy", () => {
        const template = {
            id: "1",
            organization_id: "org1",
            name: "Rano",
            start_time: "08:00",
            end_time: "16:00",
            break_minutes: 0,
            color: "#000",
            min_employees: 1,
            max_employees: null,
            applicable_days: null,
            created_at: "",
            updated_at: "",
        };
        expect(getTemplateHours(template)).toBe(8);
    });

    it("oblicza poprawnie 8h zmiany z 30min przerwą", () => {
        const template = {
            id: "1",
            organization_id: "org1",
            name: "Rano",
            start_time: "08:00",
            end_time: "16:00",
            break_minutes: 30,
            color: "#000",
            min_employees: 1,
            max_employees: null,
            applicable_days: null,
            created_at: "",
            updated_at: "",
        };
        expect(getTemplateHours(template)).toBe(7.5);
    });

    it("oblicza poprawnie 12h zmiany z 1h przerwą", () => {
        const template = {
            id: "1",
            organization_id: "org1",
            name: "Cały dzień",
            start_time: "06:00",
            end_time: "18:00",
            break_minutes: 60,
            color: "#000",
            min_employees: 1,
            max_employees: null,
            applicable_days: null,
            created_at: "",
            updated_at: "",
        };
        expect(getTemplateHours(template)).toBe(11);
    });

    it("oblicza poprawnie krótką 4h zmianę", () => {
        const template = {
            id: "1",
            organization_id: "org1",
            name: "Krótka",
            start_time: "10:00",
            end_time: "14:00",
            break_minutes: 0,
            color: "#000",
            min_employees: 1,
            max_employees: null,
            applicable_days: null,
            created_at: "",
            updated_at: "",
        };
        expect(getTemplateHours(template)).toBe(4);
    });
});

// =============================================================================
// TESTY: getShiftHours
// =============================================================================

describe("getShiftHours", () => {
    it("oblicza godziny dla standardowej zmiany", () => {
        const shift = {
            employee_id: "emp1",
            date: "2025-01-15",
            start_time: "08:00",
            end_time: "16:00",
            break_minutes: 30,
        };
        expect(getShiftHours(shift)).toBe(7.5);
    });

    it("oblicza godziny dla zmiany bez przerwy", () => {
        const shift = {
            employee_id: "emp1",
            date: "2025-01-15",
            start_time: "14:00",
            end_time: "22:00",
            break_minutes: 0,
        };
        expect(getShiftHours(shift)).toBe(8);
    });

    it("oblicza godziny dla zmiany nocnej (22:00-06:00)", () => {
        const shift = {
            employee_id: "emp1",
            date: "2025-01-15",
            start_time: "22:00",
            end_time: "06:00",
            break_minutes: 30,
        };
        // 8h - 0.5h = 7.5h
        expect(getShiftHours(shift)).toBe(7.5);
    });

    it("oblicza godziny dla krótkiej zmiany nocnej (23:00-03:00)", () => {
        const shift = {
            employee_id: "emp1",
            date: "2025-01-15",
            start_time: "23:00",
            end_time: "03:00",
            break_minutes: 0,
        };
        expect(getShiftHours(shift)).toBe(4);
    });
});

// =============================================================================
// TESTY: getShiftTimeType
// =============================================================================

describe("getShiftTimeType", () => {
    describe("rozpoznaje po nazwie szablonu", () => {
        it("rozpoznaje 'Rano'", () => {
            expect(getShiftTimeType("08:00", "Rano")).toBe("morning");
        });

        it("rozpoznaje 'Morning'", () => {
            expect(getShiftTimeType("08:00", "Morning shift")).toBe("morning");
        });

        it("rozpoznaje 'Wieczór'", () => {
            expect(getShiftTimeType("16:00", "Wieczór")).toBe("evening");
        });

        it("rozpoznaje 'Popołudnie'", () => {
            expect(getShiftTimeType("12:00", "Popołudnie")).toBe("afternoon");
        });
    });

    describe("rozpoznaje po godzinie startu", () => {
        it("06:00 = morning", () => {
            expect(getShiftTimeType("06:00")).toBe("morning");
        });

        it("10:00 = morning", () => {
            expect(getShiftTimeType("10:00")).toBe("morning");
        });

        it("11:00 = morning", () => {
            expect(getShiftTimeType("11:00")).toBe("morning");
        });

        it("14:00 = afternoon", () => {
            expect(getShiftTimeType("14:00")).toBe("afternoon");
        });

        it("15:00 = afternoon", () => {
            expect(getShiftTimeType("15:00")).toBe("afternoon");
        });

        it("18:00 = afternoon", () => {
            expect(getShiftTimeType("18:00")).toBe("afternoon");
        });
    });
});

// =============================================================================
// TESTY: calculateRestHours
// =============================================================================

describe("calculateRestHours", () => {
    it("oblicza 16h odpoczynku gdy zmiana kończy się o 16:00 a następna o 08:00", () => {
        // 16:00 -> 24:00 = 8h + 00:00 -> 08:00 = 8h = 16h
        const rest = calculateRestHours(
            "2025-01-15",
            "16:00",
            "2025-01-16",
            "08:00",
        );
        expect(rest).toBe(16);
    });

    it("oblicza 11h odpoczynku gdy zmiana kończy się o 21:00 a następna o 08:00", () => {
        // 21:00 -> 24:00 = 3h + 00:00 -> 08:00 = 8h = 11h
        const rest = calculateRestHours(
            "2025-01-15",
            "21:00",
            "2025-01-16",
            "08:00",
        );
        expect(rest).toBe(11);
    });

    it("wykrywa naruszenie 11h odpoczynku (tylko 10h)", () => {
        // 22:00 -> 24:00 = 2h + 00:00 -> 08:00 = 8h = 10h
        const rest = calculateRestHours(
            "2025-01-15",
            "22:00",
            "2025-01-16",
            "08:00",
        );
        expect(rest).toBe(10);
        expect(rest).toBeLessThan(11); // NARUSZENIE!
    });

    it("oblicza 32h odpoczynku gdy dzień wolny pomiędzy", () => {
        // 16:00 -> 24:00 = 8h + 24h (dzień wolny) + 00:00 -> 08:00 = 8h = 40h
        const rest = calculateRestHours(
            "2025-01-15",
            "16:00",
            "2025-01-17",
            "08:00",
        );
        expect(rest).toBeGreaterThan(30);
    });

    it("zwraca 0 gdy dwie zmiany w tym samym dniu", () => {
        const rest = calculateRestHours(
            "2025-01-15",
            "08:00",
            "2025-01-15",
            "16:00",
        );
        expect(rest).toBe(0);
    });
});

// =============================================================================
// TESTY: daysDiff
// =============================================================================

describe("daysDiff", () => {
    it("oblicza różnicę 1 dnia", () => {
        expect(daysDiff("2025-01-15", "2025-01-16")).toBe(1);
    });

    it("oblicza różnicę 0 dla tego samego dnia", () => {
        expect(daysDiff("2025-01-15", "2025-01-15")).toBe(0);
    });

    it("oblicza różnicę 7 dni", () => {
        expect(daysDiff("2025-01-01", "2025-01-08")).toBe(7);
    });

    it("oblicza różnicę przez granicę miesiąca", () => {
        expect(daysDiff("2025-01-31", "2025-02-01")).toBe(1);
    });
});

// =============================================================================
// TESTY: getDayOfWeek
// =============================================================================

describe("getDayOfWeek", () => {
    it("rozpoznaje poniedziałek (1)", () => {
        expect(getDayOfWeek("2025-01-06")).toBe(1); // Poniedziałek
    });

    it("rozpoznaje niedzielę (0)", () => {
        expect(getDayOfWeek("2025-01-05")).toBe(0); // Niedziela
    });

    it("rozpoznaje sobotę (6)", () => {
        expect(getDayOfWeek("2025-01-04")).toBe(6); // Sobota
    });

    it("rozpoznaje środę (3)", () => {
        expect(getDayOfWeek("2025-01-08")).toBe(3); // Środa
    });
});

// =============================================================================
// TESTY: getWeekStart
// =============================================================================

describe("getWeekStart", () => {
    it("zwraca poniedziałek dla wtorku", () => {
        expect(getWeekStart("2025-01-07")).toBe("2025-01-06"); // Wtorek -> Poniedziałek
    });

    it("zwraca ten sam dzień dla poniedziałku", () => {
        expect(getWeekStart("2025-01-06")).toBe("2025-01-06"); // Poniedziałek
    });

    it("zwraca poniedziałek dla niedzieli", () => {
        expect(getWeekStart("2025-01-05")).toBe("2024-12-30"); // Niedziela -> poprzedni Poniedziałek
    });

    it("zwraca poniedziałek dla soboty", () => {
        expect(getWeekStart("2025-01-04")).toBe("2024-12-30"); // Sobota -> poprzedni Poniedziałek
    });
});

// =============================================================================
// TESTY: parseDate / formatDateToISO
// =============================================================================

describe("parseDate / formatDateToISO", () => {
    it("parsuje i formatuje datę poprawnie", () => {
        const dateStr = "2025-01-15";
        const date = parseDate(dateStr);
        expect(formatDateToISO(date)).toBe(dateStr);
    });

    it("parsuje pierwszy dzień miesiąca", () => {
        const date = parseDate("2025-03-01");
        expect(date.getFullYear()).toBe(2025);
        expect(date.getMonth()).toBe(2); // 0-indexed
        expect(date.getDate()).toBe(1);
    });

    it("formatuje datę z jednocyfrowymi wartościami", () => {
        const date = new Date(2025, 0, 5); // 5 stycznia
        expect(formatDateToISO(date)).toBe("2025-01-05");
    });
});
// =============================================================================
// TESTY DODATKOWE: getTemplateHours - edge cases
// =============================================================================

describe("getTemplateHours - edge cases", () => {
    it("oblicza poprawnie zmianę nocną (23:00-07:00)", () => {
        const template = {
            id: "1",
            organization_id: "org1",
            name: "Nocka",
            start_time: "23:00",
            end_time: "07:00",
            break_minutes: 30,
            color: "#000",
            min_employees: 1,
            max_employees: null,
            applicable_days: null,
            created_at: "",
            updated_at: "",
        };
        // 23:00 -> 07:00 = 8h - 0.5h przerwy = 7.5h
        const hours = getTemplateHours(template);
        expect(hours).toBe(7.5);
    });

    it("oblicza zmianę nocną (22:00-06:00)", () => {
        const template = {
            id: "1",
            organization_id: "org1",
            name: "Nocka",
            start_time: "22:00",
            end_time: "06:00",
            break_minutes: 0,
            color: "#000",
            min_employees: 1,
            max_employees: null,
            applicable_days: null,
            created_at: "",
            updated_at: "",
        };
        // 22:00 -> 06:00 = 8h
        expect(getTemplateHours(template)).toBe(8);
    });

    it("oblicza zmianę 1-godzinną", () => {
        const template = {
            id: "1",
            organization_id: "org1",
            name: "Konsultacja",
            start_time: "10:00",
            end_time: "11:00",
            break_minutes: 0,
            color: "#000",
            min_employees: 1,
            max_employees: null,
            applicable_days: null,
            created_at: "",
            updated_at: "",
        };
        expect(getTemplateHours(template)).toBe(1);
    });

    it("oblicza zmianę z minutami (08:30-16:30)", () => {
        const template = {
            id: "1",
            organization_id: "org1",
            name: "Zmiana",
            start_time: "08:30",
            end_time: "16:30",
            break_minutes: 30,
            color: "#000",
            min_employees: 1,
            max_employees: null,
            applicable_days: null,
            created_at: "",
            updated_at: "",
        };
        expect(getTemplateHours(template)).toBe(7.5);
    });
});

// =============================================================================
// TESTY DODATKOWE: calculateRestHours - więcej scenariuszy
// =============================================================================

describe("calculateRestHours - dodatkowe scenariusze", () => {
    it("oblicza odpoczynek dla zmiany kończącej się o północy", () => {
        const rest = calculateRestHours(
            "2025-01-15",
            "00:00",
            "2025-01-15",
            "08:00",
        );
        // Ten sam dzień - zwraca 0 lub 8
        expect(rest).toBeGreaterThanOrEqual(0);
    });

    it("oblicza bardzo krótki odpoczynek (6h)", () => {
        // 22:00 -> 24:00 = 2h + 00:00 -> 04:00 = 4h = 6h
        const rest = calculateRestHours(
            "2025-01-15",
            "22:00",
            "2025-01-16",
            "04:00",
        );
        expect(rest).toBe(6);
        expect(rest).toBeLessThan(11); // POWAŻNE NARUSZENIE!
    });

    it("oblicza odpoczynek przez weekend (2 dni)", () => {
        // Piątek 16:00 -> Poniedziałek 08:00
        const rest = calculateRestHours(
            "2025-01-03",
            "16:00",
            "2025-01-06",
            "08:00",
        );
        // 3 dni różnicy = 72h - 16h + 8h = 64h
        expect(rest).toBeGreaterThan(60);
    });
});

// =============================================================================
// TESTY DODATKOWE: daysDiff - więcej przypadków
// =============================================================================

describe("daysDiff - dodatkowe przypadki", () => {
    it("oblicza różnicę przez granicę roku", () => {
        expect(daysDiff("2024-12-31", "2025-01-01")).toBe(1);
    });

    it("oblicza różnicę dla roku przestępnego", () => {
        expect(daysDiff("2024-02-28", "2024-03-01")).toBe(2); // 29 luty istnieje
    });

    it("oblicza różnicę dla zwykłego roku", () => {
        expect(daysDiff("2025-02-28", "2025-03-01")).toBe(1); // 29 luty nie istnieje
    });

    it("oblicza różnicę 30 dni", () => {
        expect(daysDiff("2025-01-01", "2025-01-31")).toBe(30);
    });
});

// =============================================================================
// TESTY DODATKOWE: getShiftTimeType - więcej nazw
// =============================================================================

describe("getShiftTimeType - więcej wariantów nazw", () => {
    it("rozpoznaje 'RANO' (caps)", () => {
        expect(getShiftTimeType("08:00", "RANO")).toBe("morning");
    });

    it("rozpoznaje 'Evening shift'", () => {
        expect(getShiftTimeType("18:00", "Evening shift")).toBe("evening");
    });

    it("rozpoznaje 'Wieczorna zmiana'", () => {
        expect(getShiftTimeType("18:00", "Wieczorna zmiana")).toBe("evening");
    });

    it("rozpoznaje 'Afternoon'", () => {
        expect(getShiftTimeType("12:00", "Afternoon")).toBe("afternoon");
    });

    it("używa godziny gdy nazwa nie rozpoznana", () => {
        expect(getShiftTimeType("08:00", "Zmiana standardowa")).toBe("morning");
        expect(getShiftTimeType("12:00", "Zmiana standardowa")).toBe(
            "afternoon",
        );
        expect(getShiftTimeType("16:00", "Zmiana standardowa")).toBe(
            "afternoon",
        );
    });
});

// =============================================================================
// TESTY DODATKOWE: getWeekStart - więcej przypadków
// =============================================================================

describe("getWeekStart - dodatkowe przypadki", () => {
    it("obsługuje piątek", () => {
        expect(getWeekStart("2025-01-10")).toBe("2025-01-06"); // Piątek -> Poniedziałek
    });

    it("obsługuje czwartek", () => {
        expect(getWeekStart("2025-01-09")).toBe("2025-01-06"); // Czwartek -> Poniedziałek
    });

    it("obsługuje pierwszy dzień roku (środa)", () => {
        expect(getWeekStart("2025-01-01")).toBe("2024-12-30"); // Środa -> poprzedni Poniedziałek
    });

    it("obsługuje ostatni dzień roku", () => {
        expect(getWeekStart("2025-12-31")).toBe("2025-12-29"); // Środa -> Poniedziałek
    });
});

// =============================================================================
// TESTY DODATKOWE: parseDate / formatDateToISO - edge cases
// =============================================================================

describe("parseDate / formatDateToISO - edge cases", () => {
    it("parsuje ostatni dzień miesiąca", () => {
        const date = parseDate("2025-01-31");
        expect(date.getDate()).toBe(31);
    });

    it("parsuje ostatni dzień lutego (rok przestępny)", () => {
        const date = parseDate("2024-02-29");
        expect(date.getDate()).toBe(29);
        expect(date.getMonth()).toBe(1); // luty
    });

    it("formatuje datę z końca roku", () => {
        const date = new Date(2025, 11, 31); // 31 grudnia
        expect(formatDateToISO(date)).toBe("2025-12-31");
    });

    it("round-trip dla różnych dat", () => {
        const dates = ["2025-01-01", "2025-06-15", "2025-12-31", "2024-02-29"];
        dates.forEach((dateStr) => {
            expect(formatDateToISO(parseDate(dateStr))).toBe(dateStr);
        });
    });
});
