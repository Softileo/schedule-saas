/**
 * Testy dla scheduler/greedy/helpers.ts
 * Funkcje pomocnicze dla GreedyScheduler
 */

import { describe, it, expect } from "vitest";
import {
    sortTemplatesByDuration,
    sortTemplatesByDurationDesc,
    sortDaysByStaffing,
    calculateHoursDeficit,
    calculateHoursSurplus,
    hasSignificantDeficit,
    calculateHoursUtilization,
    filterEmployeesWithDeficit,
    filterEmployeesWithSurplus,
    formatEmployeeStats,
    formatDayStaffing,
} from "@/lib/scheduler/greedy/helpers";
import type {
    EmployeeScheduleState,
    GeneratedShift,
} from "@/lib/scheduler/types";
import type { ShiftTemplate } from "@/types";

// ============================================================================
// FIXTURES
// ============================================================================

const createTemplate = (
    id: string,
    startTime: string,
    endTime: string,
    breakMinutes: number = 30
): ShiftTemplate => ({
    id,
    organization_id: "org-1",
    name: `Zmiana ${id}`,
    start_time: `${startTime}:00`,
    end_time: `${endTime}:00`,
    break_minutes: breakMinutes,
    color: "#3b82f6",
    min_employees: 1,
    max_employees: null,
    applicable_days: null,
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
});

const createState = (
    empId: string,
    currentHours: number,
    requiredHours: number,
    overrides: Partial<EmployeeScheduleState> = {}
): EmployeeScheduleState => ({
    emp: {
        id: empId,
        organization_id: "org-1",
        first_name: "Jan",
        last_name: "Kowalski",
        email: `${empId}@example.com`,
        phone: null,
        employment_type: "full",
        custom_hours: null,
        color: null,
        is_active: true,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
        position: null,
        absences: [],
        preferences: null,
    },
    requiredHours,
    currentHours,
    shifts: [],
    occupiedDates: new Set(),
    availableTemplates: [],
    ...overrides,
    weekendShiftCount: overrides.weekendShiftCount ?? 0,
    saturdayShiftCount: overrides.saturdayShiftCount ?? 0,
    sundayShiftCount: overrides.sundayShiftCount ?? 0,
    morningShiftCount: overrides.morningShiftCount ?? 0,
    afternoonShiftCount: overrides.afternoonShiftCount ?? 0,
    eveningShiftCount: overrides.eveningShiftCount ?? 0,
    consecutiveShiftDays: overrides.consecutiveShiftDays ?? 0,
    lastShiftType: overrides.lastShiftType ?? null,
    lastShiftTemplate: overrides.lastShiftTemplate ?? null,
    lastShiftDate: overrides.lastShiftDate ?? null,
    lastShiftEndTime: overrides.lastShiftEndTime ?? null,
    consecutiveWorkDays: overrides.consecutiveWorkDays ?? 0,
    quarterlyShiftCount: overrides.quarterlyShiftCount ?? 0,
    quarterlyShiftTypes: overrides.quarterlyShiftTypes ?? {
        morning: 0,
        afternoon: 0,
        evening: 0,
    },
    quarterlyHours: overrides.quarterlyHours ?? 0,
});

const createShift = (employeeId: string, date: string): GeneratedShift => ({
    employee_id: employeeId,
    date,
    start_time: "08:00",
    end_time: "16:00",
    break_minutes: 30,
});

// ============================================================================
// sortTemplatesByDuration
// ============================================================================

describe("sortTemplatesByDuration", () => {
    it("sortuje szablony od najkrótszego", () => {
        const templates = [
            createTemplate("tpl-1", "08:00", "16:00", 30), // 7.5h
            createTemplate("tpl-2", "08:00", "12:00", 0), // 4h
            createTemplate("tpl-3", "08:00", "20:00", 60), // 11h
        ];

        const result = sortTemplatesByDuration(templates);

        expect(result[0].id).toBe("tpl-2"); // 4h
        expect(result[1].id).toBe("tpl-1"); // 7.5h
        expect(result[2].id).toBe("tpl-3"); // 11h
    });

    it("nie modyfikuje oryginalnej tablicy", () => {
        const templates = [
            createTemplate("tpl-1", "08:00", "16:00"),
            createTemplate("tpl-2", "08:00", "12:00"),
        ];

        sortTemplatesByDuration(templates);

        expect(templates[0].id).toBe("tpl-1");
    });

    it("obsługuje pustą tablicę", () => {
        const result = sortTemplatesByDuration([]);

        expect(result).toEqual([]);
    });

    it("obsługuje jeden szablon", () => {
        const templates = [createTemplate("tpl-1", "08:00", "16:00")];

        const result = sortTemplatesByDuration(templates);

        expect(result).toHaveLength(1);
    });
});

// ============================================================================
// sortTemplatesByDurationDesc
// ============================================================================

describe("sortTemplatesByDurationDesc", () => {
    it("sortuje szablony od najdłuższego", () => {
        const templates = [
            createTemplate("tpl-1", "08:00", "16:00", 30), // 7.5h
            createTemplate("tpl-2", "08:00", "12:00", 0), // 4h
            createTemplate("tpl-3", "08:00", "20:00", 60), // 11h
        ];

        const result = sortTemplatesByDurationDesc(templates);

        expect(result[0].id).toBe("tpl-3"); // 11h
        expect(result[1].id).toBe("tpl-1"); // 7.5h
        expect(result[2].id).toBe("tpl-2"); // 4h
    });

    it("nie modyfikuje oryginalnej tablicy", () => {
        const templates = [
            createTemplate("tpl-1", "08:00", "12:00"),
            createTemplate("tpl-2", "08:00", "16:00"),
        ];

        sortTemplatesByDurationDesc(templates);

        expect(templates[0].id).toBe("tpl-1");
    });
});

// ============================================================================
// sortDaysByStaffing
// ============================================================================

describe("sortDaysByStaffing", () => {
    it("sortuje dni od najmniej obsadzonego", () => {
        const dailyStaffing = new Map<string, GeneratedShift[]>([
            [
                "2024-01-15",
                [
                    createShift("e1", "2024-01-15"),
                    createShift("e2", "2024-01-15"),
                ],
            ],
            ["2024-01-16", [createShift("e1", "2024-01-16")]],
            [
                "2024-01-17",
                [
                    createShift("e1", "2024-01-17"),
                    createShift("e2", "2024-01-17"),
                    createShift("e3", "2024-01-17"),
                ],
            ],
        ]);
        const days = ["2024-01-15", "2024-01-16", "2024-01-17"];

        const result = sortDaysByStaffing(dailyStaffing, days);

        expect(result[0]).toBe("2024-01-16"); // 1 pracownik
        expect(result[1]).toBe("2024-01-15"); // 2 pracowników
        expect(result[2]).toBe("2024-01-17"); // 3 pracowników
    });

    it("obsługuje dni bez obsady", () => {
        const dailyStaffing = new Map<string, GeneratedShift[]>([
            ["2024-01-15", [createShift("e1", "2024-01-15")]],
        ]);
        const days = ["2024-01-15", "2024-01-16"]; // 16 nie ma w mapie

        const result = sortDaysByStaffing(dailyStaffing, days);

        expect(result[0]).toBe("2024-01-16"); // 0 pracowników
        expect(result[1]).toBe("2024-01-15"); // 1 pracownik
    });

    it("nie modyfikuje oryginalnej tablicy", () => {
        const dailyStaffing = new Map<string, GeneratedShift[]>();
        const days = ["2024-01-17", "2024-01-15", "2024-01-16"];

        sortDaysByStaffing(dailyStaffing, days);

        expect(days[0]).toBe("2024-01-17");
    });
});

// ============================================================================
// calculateHoursDeficit
// ============================================================================

describe("calculateHoursDeficit", () => {
    it("oblicza deficyt gdy brak godzin", () => {
        const state = createState("emp-1", 0, 160);

        expect(calculateHoursDeficit(state)).toBe(160);
    });

    it("oblicza deficyt gdy częściowo obsadzony", () => {
        const state = createState("emp-1", 80, 160);

        expect(calculateHoursDeficit(state)).toBe(80);
    });

    it("zwraca 0 gdy godziny równe", () => {
        const state = createState("emp-1", 160, 160);

        expect(calculateHoursDeficit(state)).toBe(0);
    });

    it("zwraca ujemną wartość przy nadwyżce", () => {
        const state = createState("emp-1", 170, 160);

        expect(calculateHoursDeficit(state)).toBe(-10);
    });
});

// ============================================================================
// calculateHoursSurplus
// ============================================================================

describe("calculateHoursSurplus", () => {
    it("oblicza nadwyżkę", () => {
        const state = createState("emp-1", 170, 160);

        expect(calculateHoursSurplus(state)).toBe(10);
    });

    it("zwraca ujemną wartość przy deficycie", () => {
        const state = createState("emp-1", 80, 160);

        expect(calculateHoursSurplus(state)).toBe(-80);
    });

    it("zwraca 0 gdy godziny równe", () => {
        const state = createState("emp-1", 160, 160);

        expect(calculateHoursSurplus(state)).toBe(0);
    });
});

// ============================================================================
// hasSignificantDeficit
// ============================================================================

describe("hasSignificantDeficit", () => {
    it("zwraca true przy deficycie > 2h", () => {
        const state = createState("emp-1", 155, 160);

        expect(hasSignificantDeficit(state)).toBe(true);
    });

    it("zwraca false przy deficycie = 2h", () => {
        const state = createState("emp-1", 158, 160);

        expect(hasSignificantDeficit(state)).toBe(false);
    });

    it("zwraca false przy deficycie < 2h", () => {
        const state = createState("emp-1", 159, 160);

        expect(hasSignificantDeficit(state)).toBe(false);
    });

    it("zwraca false przy nadwyżce", () => {
        const state = createState("emp-1", 170, 160);

        expect(hasSignificantDeficit(state)).toBe(false);
    });
});

// ============================================================================
// calculateHoursUtilization
// ============================================================================

describe("calculateHoursUtilization", () => {
    it("oblicza wykorzystanie 100%", () => {
        const state = createState("emp-1", 160, 160);

        expect(calculateHoursUtilization(state)).toBe(1);
    });

    it("oblicza wykorzystanie 50%", () => {
        const state = createState("emp-1", 80, 160);

        expect(calculateHoursUtilization(state)).toBe(0.5);
    });

    it("oblicza wykorzystanie > 100%", () => {
        const state = createState("emp-1", 200, 160);

        expect(calculateHoursUtilization(state)).toBe(1.25);
    });

    it("zwraca 1 gdy requiredHours = 0", () => {
        const state = createState("emp-1", 0, 0);

        expect(calculateHoursUtilization(state)).toBe(1);
    });
});

// ============================================================================
// filterEmployeesWithDeficit
// ============================================================================

describe("filterEmployeesWithDeficit", () => {
    it("filtruje pracowników z deficytem > 2h", () => {
        const states = new Map<string, EmployeeScheduleState>([
            ["emp-1", createState("emp-1", 150, 160)], // deficyt 10h
            ["emp-2", createState("emp-2", 158, 160)], // deficyt 2h
            ["emp-3", createState("emp-3", 160, 160)], // 0h
        ]);

        const result = filterEmployeesWithDeficit(states);

        expect(result).toHaveLength(1);
        expect(result[0].emp.id).toBe("emp-1");
    });

    it("używa custom minDeficit", () => {
        const states = new Map<string, EmployeeScheduleState>([
            ["emp-1", createState("emp-1", 150, 160)], // deficyt 10h
            ["emp-2", createState("emp-2", 155, 160)], // deficyt 5h
        ]);

        const result = filterEmployeesWithDeficit(states, 6);

        expect(result).toHaveLength(1);
        expect(result[0].emp.id).toBe("emp-1");
    });

    it("zwraca pustą tablicę gdy nikt nie ma deficytu", () => {
        const states = new Map<string, EmployeeScheduleState>([
            ["emp-1", createState("emp-1", 160, 160)],
            ["emp-2", createState("emp-2", 165, 160)],
        ]);

        const result = filterEmployeesWithDeficit(states);

        expect(result).toHaveLength(0);
    });
});

// ============================================================================
// filterEmployeesWithSurplus
// ============================================================================

describe("filterEmployeesWithSurplus", () => {
    it("filtruje pracowników z nadwyżką > 2h", () => {
        const states = new Map<string, EmployeeScheduleState>([
            ["emp-1", createState("emp-1", 170, 160)], // nadwyżka 10h
            ["emp-2", createState("emp-2", 162, 160)], // nadwyżka 2h
            ["emp-3", createState("emp-3", 150, 160)], // deficyt
        ]);

        const result = filterEmployeesWithSurplus(states);

        expect(result).toHaveLength(1);
        expect(result[0].emp.id).toBe("emp-1");
    });

    it("używa custom minSurplus", () => {
        const states = new Map<string, EmployeeScheduleState>([
            ["emp-1", createState("emp-1", 180, 160)], // nadwyżka 20h
            ["emp-2", createState("emp-2", 168, 160)], // nadwyżka 8h
        ]);

        const result = filterEmployeesWithSurplus(states, 10);

        expect(result).toHaveLength(1);
        expect(result[0].emp.id).toBe("emp-1");
    });
});

// ============================================================================
// formatEmployeeStats
// ============================================================================

describe("formatEmployeeStats", () => {
    it("formatuje pracownika z deficytem", () => {
        const state = createState("emp-1", 150, 160);

        const result = formatEmployeeStats(state);

        expect(result).toContain("Jan Kowalski");
        expect(result).toContain("150.0h/160h");
        expect(result).toContain("deficyt 10.0h");
    });

    it("formatuje pracownika z nadwyżką", () => {
        const state = createState("emp-1", 170, 160);

        const result = formatEmployeeStats(state);

        expect(result).toContain("nadwyżka 10.0h");
    });

    it("formatuje pracownika OK", () => {
        const state = createState("emp-1", 160, 160);

        const result = formatEmployeeStats(state);

        expect(result).toContain("OK");
    });
});

// ============================================================================
// formatDayStaffing
// ============================================================================

describe("formatDayStaffing", () => {
    it("formatuje dzień z wystarczającą obsadą", () => {
        const shifts = [
            createShift("e1", "2024-01-15"),
            createShift("e2", "2024-01-15"),
        ];

        const result = formatDayStaffing("2024-01-15", shifts, 2);

        expect(result).toContain("✅");
        expect(result).toContain("2024-01-15");
        expect(result).toContain("2/2");
    });

    it("formatuje dzień z niewystarczającą obsadą", () => {
        const shifts = [createShift("e1", "2024-01-15")];

        const result = formatDayStaffing("2024-01-15", shifts, 2);

        expect(result).toContain("⚠️");
        expect(result).toContain("1/2");
    });

    it("formatuje dzień bez obsady", () => {
        const result = formatDayStaffing("2024-01-15", [], 2);

        expect(result).toContain("⚠️");
        expect(result).toContain("0/2");
    });
});
