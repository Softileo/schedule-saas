/**
 * Testy dla scheduler/scheduler-utils.ts
 * Funkcje pomocnicze dla schedulera
 */

import { describe, it, expect } from "vitest";
import {
    getAvailableTemplatesForEmployee,
    getTemplatesForDay,
    sortDaysByPriority,
    calculateTotalRequiredHours,
    calculateAverageTemplateHours,
} from "@/lib/scheduler/scheduler-utils";
import type { EmployeeWithData } from "@/lib/scheduler/types";
import type { ShiftTemplate, OpeningHours } from "@/types";

// ============================================================================
// FIXTURES
// ============================================================================

const createEmployee = (id: string = "emp-1"): EmployeeWithData => ({
    id,
    organization_id: "org-1",
    first_name: "Jan",
    last_name: "Kowalski",
    email: "jan@example.com",
    phone: null,
    employment_type: "full",
    custom_hours: null,
    color: null,
    is_active: true,
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
    absences: [],
    preferences: null,
    position: null,
});

const createTemplate = (
    id: string,
    overrides: Partial<ShiftTemplate> = {}
): ShiftTemplate => ({
    id,
    organization_id: "org-1",
    name: `Szablon ${id}`,
    start_time: "08:00:00",
    end_time: "16:00:00",
    break_minutes: 30,
    color: "#3b82f6",
    min_employees: 1,
    max_employees: null,
    applicable_days: null,
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
    ...overrides,
});

const createOpeningHours = (
    overrides: Partial<OpeningHours> = {}
): OpeningHours => ({
    monday: { enabled: true, open: "08:00", close: "20:00" },
    tuesday: { enabled: true, open: "08:00", close: "20:00" },
    wednesday: { enabled: true, open: "08:00", close: "20:00" },
    thursday: { enabled: true, open: "08:00", close: "20:00" },
    friday: { enabled: true, open: "08:00", close: "20:00" },
    saturday: { enabled: true, open: "09:00", close: "18:00" },
    sunday: { enabled: false, open: "00:00", close: "00:00" },
    ...overrides,
});

// ============================================================================
// getAvailableTemplatesForEmployee
// ============================================================================

describe("getAvailableTemplatesForEmployee", () => {
    it("zwraca przypisane szablony gdy pracownik ma przypisania", () => {
        const emp = createEmployee("emp-1");
        const templates = [
            createTemplate("tpl-1"),
            createTemplate("tpl-2"),
            createTemplate("tpl-3"),
        ];
        const assignmentsMap = new Map<string, string[]>([
            ["tpl-1", ["emp-1", "emp-2"]],
            ["tpl-2", ["emp-2"]],
            ["tpl-3", []],
        ]);

        const result = getAvailableTemplatesForEmployee(
            emp,
            templates,
            assignmentsMap
        );

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("tpl-1");
    });

    it("zwraca wszystkie przypisane szablony dla pracownika", () => {
        const emp = createEmployee("emp-1");
        const templates = [
            createTemplate("tpl-1"),
            createTemplate("tpl-2"),
            createTemplate("tpl-3"),
        ];
        const assignmentsMap = new Map<string, string[]>([
            ["tpl-1", ["emp-1"]],
            ["tpl-2", ["emp-1"]],
            ["tpl-3", ["emp-2"]],
        ]);

        const result = getAvailableTemplatesForEmployee(
            emp,
            templates,
            assignmentsMap
        );

        expect(result).toHaveLength(2);
        expect(result.map((t) => t.id)).toContain("tpl-1");
        expect(result.map((t) => t.id)).toContain("tpl-2");
    });

    it("zwraca szablony uniwersalne gdy pracownik nie ma przypisań", () => {
        const emp = createEmployee("emp-1");
        const templates = [
            createTemplate("tpl-1"), // uniwersalny (brak przypisań)
            createTemplate("tpl-2"), // przypisany do innych
            createTemplate("tpl-3"), // uniwersalny
        ];
        const assignmentsMap = new Map<string, string[]>([
            ["tpl-1", []],
            ["tpl-2", ["emp-2", "emp-3"]],
            ["tpl-3", []],
        ]);

        const result = getAvailableTemplatesForEmployee(
            emp,
            templates,
            assignmentsMap
        );

        expect(result).toHaveLength(2);
        expect(result.map((t) => t.id)).toContain("tpl-1");
        expect(result.map((t) => t.id)).toContain("tpl-3");
    });

    it("zwraca puste gdy nie ma pasujących szablonów", () => {
        const emp = createEmployee("emp-1");
        const templates = [createTemplate("tpl-1"), createTemplate("tpl-2")];
        const assignmentsMap = new Map<string, string[]>([
            ["tpl-1", ["emp-2"]],
            ["tpl-2", ["emp-3"]],
        ]);

        const result = getAvailableTemplatesForEmployee(
            emp,
            templates,
            assignmentsMap
        );

        expect(result).toHaveLength(0);
    });

    it("obsługuje pustą mapę przypisań", () => {
        const emp = createEmployee("emp-1");
        const templates = [createTemplate("tpl-1"), createTemplate("tpl-2")];
        const assignmentsMap = new Map<string, string[]>();

        const result = getAvailableTemplatesForEmployee(
            emp,
            templates,
            assignmentsMap
        );

        // Wszystkie szablony są uniwersalne
        expect(result).toHaveLength(2);
    });
});

// ============================================================================
// getTemplatesForDay
// ============================================================================

describe("getTemplatesForDay", () => {
    describe("applicable_days filtering", () => {
        it("zwraca szablon gdy applicable_days jest null", () => {
            const templates = [
                createTemplate("tpl-1", { applicable_days: null }),
            ];

            const result = getTemplatesForDay(
                templates,
                "2024-01-15",
                null,
                false
            ); // poniedziałek

            expect(result).toHaveLength(1);
        });

        it("zwraca szablon gdy applicable_days jest puste", () => {
            const templates = [
                createTemplate("tpl-1", { applicable_days: [] }),
            ];

            const result = getTemplatesForDay(
                templates,
                "2024-01-15",
                null,
                false
            );

            expect(result).toHaveLength(1);
        });

        it("filtruje szablony po applicable_days", () => {
            const templates = [
                createTemplate("tpl-1", {
                    applicable_days: [
                        "monday",
                        "tuesday",
                        "wednesday",
                    ] as never[],
                }),
                createTemplate("tpl-2", {
                    applicable_days: ["thursday", "friday"] as never[],
                }),
            ];

            // 2024-01-15 to poniedziałek
            const result = getTemplatesForDay(
                templates,
                "2024-01-15",
                null,
                false
            );

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe("tpl-1");
        });

        it("zwraca szablony dla weekendu", () => {
            const templates = [
                createTemplate("tpl-1", {
                    applicable_days: ["saturday", "sunday"] as never[],
                }),
                createTemplate("tpl-2", {
                    applicable_days: ["monday"] as never[],
                }),
            ];

            // 2024-01-13 to sobota
            const result = getTemplatesForDay(
                templates,
                "2024-01-13",
                null,
                false
            );

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe("tpl-1");
        });
    });

    describe("opening hours filtering", () => {
        it("zwraca puste dla wyłączonego dnia", () => {
            const templates = [createTemplate("tpl-1")];
            const openingHours = createOpeningHours({
                monday: { enabled: false, open: "00:00", close: "00:00" },
            });

            // 2024-01-15 to poniedziałek
            const result = getTemplatesForDay(
                templates,
                "2024-01-15",
                openingHours,
                false
            );

            expect(result).toHaveLength(0);
        });

        it("filtruje szablony wg godzin otwarcia", () => {
            const templates = [
                createTemplate("tpl-1", {
                    start_time: "08:00:00",
                    end_time: "16:00:00",
                }), // OK
                createTemplate("tpl-2", {
                    start_time: "06:00:00",
                    end_time: "14:00:00",
                }), // za wcześnie
                createTemplate("tpl-3", {
                    start_time: "14:00:00",
                    end_time: "22:00:00",
                }), // za późno
            ];
            const openingHours = createOpeningHours({
                monday: { enabled: true, open: "08:00", close: "20:00" },
            });

            const result = getTemplatesForDay(
                templates,
                "2024-01-15",
                openingHours,
                false
            );

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe("tpl-1");
        });

        it("akceptuje szablony z tolerancją 30 min", () => {
            const templates = [
                createTemplate("tpl-1", {
                    start_time: "07:30:00",
                    end_time: "15:30:00",
                }), // 30 min przed otwarciem - OK
                createTemplate("tpl-2", {
                    start_time: "14:00:00",
                    end_time: "20:30:00",
                }), // 30 min po zamknięciu - OK
            ];
            const openingHours = createOpeningHours({
                monday: { enabled: true, open: "08:00", close: "20:00" },
            });

            const result = getTemplatesForDay(
                templates,
                "2024-01-15",
                openingHours,
                false
            );

            expect(result).toHaveLength(2);
        });

        it("akceptuje wszystkie szablony w niedzielę handlową", () => {
            const templates = [
                createTemplate("tpl-1", {
                    start_time: "06:00:00",
                    end_time: "14:00:00",
                }),
                createTemplate("tpl-2", {
                    start_time: "14:00:00",
                    end_time: "22:00:00",
                }),
            ];
            const openingHours = createOpeningHours({
                sunday: { enabled: false, open: "00:00", close: "00:00" },
            });

            // 2024-01-14 to niedziela
            const result = getTemplatesForDay(
                templates,
                "2024-01-14",
                openingHours,
                true
            ); // niedziela handlowa

            expect(result).toHaveLength(2);
        });
    });

    describe("combined filtering", () => {
        it("filtruje po applicable_days i godzinach otwarcia", () => {
            const templates = [
                createTemplate("tpl-1", {
                    applicable_days: ["monday"] as never[],
                    start_time: "08:00:00",
                    end_time: "16:00:00",
                }), // OK
                createTemplate("tpl-2", {
                    applicable_days: ["tuesday"] as never[],
                    start_time: "08:00:00",
                    end_time: "16:00:00",
                }), // zły dzień
                createTemplate("tpl-3", {
                    applicable_days: ["monday"] as never[],
                    start_time: "05:00:00",
                    end_time: "13:00:00",
                }), // za wcześnie
            ];
            const openingHours = createOpeningHours({
                monday: { enabled: true, open: "08:00", close: "20:00" },
            });

            const result = getTemplatesForDay(
                templates,
                "2024-01-15",
                openingHours,
                false
            );

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe("tpl-1");
        });
    });
});

// ============================================================================
// sortDaysByPriority
// ============================================================================

describe("sortDaysByPriority", () => {
    it("sortuje soboty przed innymi dniami", () => {
        const days = ["2024-01-15", "2024-01-13", "2024-01-16"]; // pon, sob, wt
        const saturdays = new Set(["2024-01-13"]);
        const tradingSundays = new Set<string>();

        const result = sortDaysByPriority(days, saturdays, tradingSundays);

        expect(result[0]).toBe("2024-01-13"); // sobota pierwsza
    });

    it("sortuje niedziele handlowe przed dniami roboczymi", () => {
        const days = ["2024-01-15", "2024-01-14", "2024-01-16"]; // pon, nd, wt
        const saturdays = new Set<string>();
        const tradingSundays = new Set(["2024-01-14"]);

        const result = sortDaysByPriority(days, saturdays, tradingSundays);

        expect(result[0]).toBe("2024-01-14"); // niedziela handlowa pierwsza
    });

    it("sortuje soboty przed niedzielami handlowymi", () => {
        const days = ["2024-01-14", "2024-01-13"]; // nd, sob
        const saturdays = new Set(["2024-01-13"]);
        const tradingSundays = new Set(["2024-01-14"]);

        const result = sortDaysByPriority(days, saturdays, tradingSundays);

        expect(result[0]).toBe("2024-01-13"); // sobota
        expect(result[1]).toBe("2024-01-14"); // niedziela
    });

    it("sortuje dni robocze chronologicznie", () => {
        const days = ["2024-01-17", "2024-01-15", "2024-01-16"]; // śr, pon, wt
        const saturdays = new Set<string>();
        const tradingSundays = new Set<string>();

        const result = sortDaysByPriority(days, saturdays, tradingSundays);

        expect(result).toEqual(["2024-01-15", "2024-01-16", "2024-01-17"]);
    });

    it("nie modyfikuje oryginalnej tablicy", () => {
        const days = ["2024-01-15", "2024-01-13"];
        const saturdays = new Set(["2024-01-13"]);
        const tradingSundays = new Set<string>();

        sortDaysByPriority(days, saturdays, tradingSundays);

        expect(days[0]).toBe("2024-01-15"); // oryginalna kolejność
    });

    it("obsługuje pustą tablicę", () => {
        const result = sortDaysByPriority([], new Set(), new Set());

        expect(result).toEqual([]);
    });

    it("obsługuje mieszankę wszystkich typów dni", () => {
        const days = [
            "2024-01-15", // pon
            "2024-01-13", // sob
            "2024-01-14", // nd handlowa
            "2024-01-16", // wt
            "2024-01-20", // sob
        ];
        const saturdays = new Set(["2024-01-13", "2024-01-20"]);
        const tradingSundays = new Set(["2024-01-14"]);

        const result = sortDaysByPriority(days, saturdays, tradingSundays);

        // Soboty pierwsze (chronologicznie), potem niedziela handlowa, potem dni robocze
        expect(result[0]).toBe("2024-01-13");
        expect(result[1]).toBe("2024-01-20");
        expect(result[2]).toBe("2024-01-14");
    });
});

// ============================================================================
// calculateTotalRequiredHours
// ============================================================================

describe("calculateTotalRequiredHours", () => {
    it("sumuje wymagane godziny wszystkich pracowników", () => {
        const states = new Map([
            ["emp-1", { requiredHours: 160 }],
            ["emp-2", { requiredHours: 80 }],
            ["emp-3", { requiredHours: 120 }],
        ]);

        const result = calculateTotalRequiredHours(states);

        expect(result).toBe(360);
    });

    it("zwraca 0 dla pustej mapy", () => {
        const states = new Map<string, { requiredHours: number }>();

        const result = calculateTotalRequiredHours(states);

        expect(result).toBe(0);
    });

    it("obsługuje pojedynczego pracownika", () => {
        const states = new Map([["emp-1", { requiredHours: 160 }]]);

        const result = calculateTotalRequiredHours(states);

        expect(result).toBe(160);
    });
});

// ============================================================================
// calculateAverageTemplateHours
// ============================================================================

describe("calculateAverageTemplateHours", () => {
    it("oblicza średnią długość zmiany", () => {
        const templates = [
            createTemplate("tpl-1", {
                start_time: "08:00:00",
                end_time: "16:00:00",
                break_minutes: 30,
            }), // 7.5h
            createTemplate("tpl-2", {
                start_time: "08:00:00",
                end_time: "16:00:00",
                break_minutes: 30,
            }), // 7.5h
        ];

        const result = calculateAverageTemplateHours(templates);

        expect(result).toBe(7.5);
    });

    it("uwzględnia różne długości zmian", () => {
        const templates = [
            createTemplate("tpl-1", {
                start_time: "08:00:00",
                end_time: "16:00:00",
                break_minutes: 0,
            }), // 8h
            createTemplate("tpl-2", {
                start_time: "08:00:00",
                end_time: "12:00:00",
                break_minutes: 0,
            }), // 4h
        ];

        const result = calculateAverageTemplateHours(templates);

        expect(result).toBe(6); // (8 + 4) / 2
    });

    it("uwzględnia przerwy", () => {
        const templates = [
            createTemplate("tpl-1", {
                start_time: "08:00:00",
                end_time: "16:00:00",
                break_minutes: 60,
            }), // 7h
        ];

        const result = calculateAverageTemplateHours(templates);

        expect(result).toBe(7);
    });

    it("zwraca 8 dla pustej listy", () => {
        const result = calculateAverageTemplateHours([]);

        expect(result).toBe(8);
    });

    it("obsługuje szablony bez przerwy", () => {
        const templates = [
            createTemplate("tpl-1", {
                start_time: "08:00:00",
                end_time: "12:00:00",
                break_minutes: null as unknown as number,
            }),
        ];

        const result = calculateAverageTemplateHours(templates);

        expect(result).toBe(4);
    });
});
