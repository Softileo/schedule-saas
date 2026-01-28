/**
 * Evaluator Tests
 *
 * Testy dla ewaluatora jakości grafiku.
 * Funkcje do oceny wygenerowanego grafiku pod kątem zgodności z prawem pracy.
 */

import { describe, it, expect } from "vitest";
import {
    evaluateSchedule,
    quickFitness,
    WEIGHTS,
} from "@/lib/scheduler/evaluator";
import type {
    SchedulerInput,
    GeneratedShift,
    EmployeeWithData,
} from "@/lib/scheduler/types";

// =============================================================================
// HELPERS
// =============================================================================

const createEmployee = (
    id: string,
    firstName: string,
    lastName: string,
    options: Partial<EmployeeWithData> = {}
): EmployeeWithData => ({
    id,
    organization_id: "org-1",
    first_name: firstName,
    last_name: lastName,
    is_active: true,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    email: null,
    color: null,
    custom_hours: null,
    employment_type: "full",
    absences: [],
    preferences: null,
    position: null,
    ...options,
    phone: options.phone ?? null,
});

const createShift = (
    employeeId: string,
    date: string,
    startTime: string,
    endTime: string,
    templateId?: string
): GeneratedShift => ({
    employee_id: employeeId,
    date,
    start_time: startTime,
    end_time: endTime,
    break_minutes: 0,
    template_id: templateId,
});

const createTemplate = (
    id: string,
    startTime: string,
    endTime: string,
    minEmployees = 1
) => ({
    id,
    organization_id: "org-1",
    name: `${startTime.slice(0, 5)}-${endTime.slice(0, 5)}`,
    start_time: startTime,
    end_time: endTime,
    break_minutes: 0,
    color: "#3B82F6",
    is_active: true,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    min_employees: minEmployees,
    max_employees: null,
    applicable_days: null,
});

const createBaseInput = (): SchedulerInput => ({
    year: 2026,
    month: 1,
    employees: [
        createEmployee("emp-1", "Jan", "Kowalski"),
        createEmployee("emp-2", "Anna", "Nowak"),
    ],
    templates: [
        createTemplate("tpl-1", "08:00:00", "16:00:00"),
        createTemplate("tpl-2", "14:00:00", "22:00:00"),
    ],
    settings: {
        id: "settings-1",
        organization_id: "org-1",
        min_employees_per_shift: 1,
        opening_hours: {},
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
        default_break_minutes: 15,
        default_shift_duration: 480,
        enable_trading_sundays: false,
        custom_trading_sundays: [],
        store_open_time: null,
        store_close_time: null,
        trading_sundays_mode: "auto",
    },
    holidays: [],
    workDays: [
        "2026-01-05",
        "2026-01-06",
        "2026-01-07",
        "2026-01-08",
        "2026-01-09",
    ],
    saturdayDays: ["2026-01-10"],
    tradingSundays: [],
    templateAssignmentsMap: new Map(),
});

// =============================================================================
// TESTY
// =============================================================================

describe("evaluator", () => {
    // =========================================================================
    // WEIGHTS
    // =========================================================================
    describe("WEIGHTS", () => {
        it("should have negative values for violations", () => {
            expect(WEIGHTS.DAILY_REST_VIOLATION).toBeLessThan(0);
            expect(WEIGHTS.CONSECUTIVE_DAYS_VIOLATION).toBeLessThan(0);
            expect(WEIGHTS.WEEKLY_HOURS_VIOLATION).toBeLessThan(0);
            expect(WEIGHTS.ABSENCE_VIOLATION).toBeLessThan(0);
            expect(WEIGHTS.UNDERSTAFFED_SHIFT).toBeLessThan(0);
            expect(WEIGHTS.EMPTY_DAY).toBeLessThan(0);
        });

        it("should have positive values for bonuses", () => {
            expect(WEIGHTS.PERFECT_HOURS).toBeGreaterThan(0);
            expect(WEIGHTS.BALANCED_WEEKENDS).toBeGreaterThan(0);
            expect(WEIGHTS.GOOD_SHIFT_BLOCK).toBeGreaterThan(0);
        });

        it("should have absence violation as most severe", () => {
            expect(Math.abs(WEIGHTS.ABSENCE_VIOLATION)).toBeGreaterThan(
                Math.abs(WEIGHTS.DAILY_REST_VIOLATION)
            );
        });
    });

    // =========================================================================
    // evaluateSchedule - podstawowe przypadki
    // =========================================================================
    describe("evaluateSchedule", () => {
        it("should return valid metrics object", () => {
            const input = createBaseInput();
            const shifts: GeneratedShift[] = [];

            const result = evaluateSchedule(shifts, input);

            expect(result).toHaveProperty("totalFitness");
            expect(result).toHaveProperty("qualityPercent");
            expect(result).toHaveProperty("dailyRestViolations");
            expect(result).toHaveProperty("consecutiveDaysViolations");
            expect(result).toHaveProperty("employeeStats");
            expect(result).toHaveProperty("warnings");
        });

        it("should detect empty days", () => {
            const input = createBaseInput();
            const shifts: GeneratedShift[] = [];

            const result = evaluateSchedule(shifts, input);

            expect(result.emptyDays).toBeGreaterThan(0);
            expect(result.coveredDays).toBe(0);
        });

        it("should count covered days", () => {
            const input = createBaseInput();
            const shifts: GeneratedShift[] = [
                createShift(
                    "emp-1",
                    "2026-01-05",
                    "08:00:00",
                    "16:00:00",
                    "tpl-1"
                ),
                createShift(
                    "emp-2",
                    "2026-01-06",
                    "08:00:00",
                    "16:00:00",
                    "tpl-1"
                ),
            ];

            const result = evaluateSchedule(shifts, input);

            expect(result.coveredDays).toBe(2);
        });

        it("should calculate employee stats for each employee", () => {
            const input = createBaseInput();
            const shifts: GeneratedShift[] = [
                createShift(
                    "emp-1",
                    "2026-01-05",
                    "08:00:00",
                    "16:00:00",
                    "tpl-1"
                ),
            ];

            const result = evaluateSchedule(shifts, input);

            expect(result.employeeStats.length).toBe(input.employees.length);

            const emp1Stats = result.employeeStats.find(
                (s) => s.employeeId === "emp-1"
            );
            expect(emp1Stats).toBeDefined();
            expect(emp1Stats?.totalShifts).toBe(1);
            expect(emp1Stats?.totalHours).toBe(8);
        });
    });

    // =========================================================================
    // evaluateSchedule - daily rest violations (11h)
    // =========================================================================
    describe("evaluateSchedule - odpoczynek 11h", () => {
        it("should detect 11h rest violation", () => {
            const input = createBaseInput();
            // Zmiana kończy się o 22:00, następna zaczyna o 06:00 (8h odpoczynku < 11h)
            const shifts: GeneratedShift[] = [
                createShift(
                    "emp-1",
                    "2026-01-05",
                    "14:00:00",
                    "22:00:00",
                    "tpl-2"
                ),
                createShift(
                    "emp-1",
                    "2026-01-06",
                    "06:00:00",
                    "14:00:00",
                    "tpl-1"
                ),
            ];

            const result = evaluateSchedule(shifts, input);

            expect(result.dailyRestViolations).toBeGreaterThan(0);
        });

        it("should not detect violation when rest is >= 11h", () => {
            const input = createBaseInput();
            // Zmiana kończy się o 16:00, następna zaczyna o 08:00 następnego dnia (16h odpoczynku)
            const shifts: GeneratedShift[] = [
                createShift(
                    "emp-1",
                    "2026-01-05",
                    "08:00:00",
                    "16:00:00",
                    "tpl-1"
                ),
                createShift(
                    "emp-1",
                    "2026-01-06",
                    "08:00:00",
                    "16:00:00",
                    "tpl-1"
                ),
            ];

            const result = evaluateSchedule(shifts, input);

            expect(result.dailyRestViolations).toBe(0);
        });
    });

    // =========================================================================
    // evaluateSchedule - consecutive days
    // =========================================================================
    describe("evaluateSchedule - consecutive days", () => {
        it("should detect more than 6 consecutive days", () => {
            const input = {
                ...createBaseInput(),
                workDays: [
                    "2026-01-05",
                    "2026-01-06",
                    "2026-01-07",
                    "2026-01-08",
                    "2026-01-09",
                    "2026-01-10",
                    "2026-01-11",
                    "2026-01-12",
                    "2026-01-13",
                ],
            };

            // 7 dni z rzędu
            const shifts: GeneratedShift[] = [
                createShift(
                    "emp-1",
                    "2026-01-05",
                    "08:00:00",
                    "16:00:00",
                    "tpl-1"
                ),
                createShift(
                    "emp-1",
                    "2026-01-06",
                    "08:00:00",
                    "16:00:00",
                    "tpl-1"
                ),
                createShift(
                    "emp-1",
                    "2026-01-07",
                    "08:00:00",
                    "16:00:00",
                    "tpl-1"
                ),
                createShift(
                    "emp-1",
                    "2026-01-08",
                    "08:00:00",
                    "16:00:00",
                    "tpl-1"
                ),
                createShift(
                    "emp-1",
                    "2026-01-09",
                    "08:00:00",
                    "16:00:00",
                    "tpl-1"
                ),
                createShift(
                    "emp-1",
                    "2026-01-10",
                    "08:00:00",
                    "16:00:00",
                    "tpl-1"
                ),
                createShift(
                    "emp-1",
                    "2026-01-11",
                    "08:00:00",
                    "16:00:00",
                    "tpl-1"
                ), // 7. dzień
            ];

            const result = evaluateSchedule(shifts, input);

            expect(result.consecutiveDaysViolations).toBeGreaterThan(0);
        });

        it("should not detect violation for 6 or fewer consecutive days", () => {
            const input = createBaseInput();

            const shifts: GeneratedShift[] = [
                createShift(
                    "emp-1",
                    "2026-01-05",
                    "08:00:00",
                    "16:00:00",
                    "tpl-1"
                ),
                createShift(
                    "emp-1",
                    "2026-01-06",
                    "08:00:00",
                    "16:00:00",
                    "tpl-1"
                ),
                createShift(
                    "emp-1",
                    "2026-01-07",
                    "08:00:00",
                    "16:00:00",
                    "tpl-1"
                ),
                createShift(
                    "emp-1",
                    "2026-01-08",
                    "08:00:00",
                    "16:00:00",
                    "tpl-1"
                ),
                createShift(
                    "emp-1",
                    "2026-01-09",
                    "08:00:00",
                    "16:00:00",
                    "tpl-1"
                ),
            ];

            const result = evaluateSchedule(shifts, input);

            expect(result.consecutiveDaysViolations).toBe(0);
        });
    });

    // =========================================================================
    // evaluateSchedule - absences
    // =========================================================================
    describe("evaluateSchedule - absences", () => {
        it("should detect work during absence", () => {
            const input = {
                ...createBaseInput(),
                employees: [
                    createEmployee("emp-1", "Jan", "Kowalski", {
                        absences: [
                            {
                                id: "abs-1",
                                organization_id: "org-1",
                                employee_id: "emp-1",
                                absence_type: "vacation",
                                start_date: "2026-01-05",
                                end_date: "2026-01-07",
                                is_paid: true,
                                notes: null,
                                created_at: "2026-01-01",
                                updated_at: "2026-01-01",
                                created_by: "user-1",
                            },
                        ],
                    }),
                ],
            };

            const shifts: GeneratedShift[] = [
                createShift(
                    "emp-1",
                    "2026-01-06",
                    "08:00:00",
                    "16:00:00",
                    "tpl-1"
                ),
            ];

            const result = evaluateSchedule(shifts, input);

            expect(result.absenceViolations).toBeGreaterThan(0);
        });

        it("should not detect violation for work outside absence period", () => {
            const input = {
                ...createBaseInput(),
                employees: [
                    createEmployee("emp-1", "Jan", "Kowalski", {
                        absences: [
                            {
                                id: "abs-1",
                                organization_id: "org-1",
                                employee_id: "emp-1",
                                absence_type: "vacation",
                                start_date: "2026-01-20",
                                end_date: "2026-01-25",
                                is_paid: true,
                                notes: null,
                                created_at: "2026-01-01",
                                updated_at: "2026-01-01",
                                created_by: "user-1",
                            },
                        ],
                    }),
                ],
            };

            const shifts: GeneratedShift[] = [
                createShift(
                    "emp-1",
                    "2026-01-05",
                    "08:00:00",
                    "16:00:00",
                    "tpl-1"
                ),
            ];

            const result = evaluateSchedule(shifts, input);

            expect(result.absenceViolations).toBe(0);
        });
    });

    // =========================================================================
    // evaluateSchedule - hours balance
    // =========================================================================
    describe("evaluateSchedule - hours balance", () => {
        it("should calculate hours difference", () => {
            const input = createBaseInput();
            const shifts: GeneratedShift[] = [
                createShift(
                    "emp-1",
                    "2026-01-05",
                    "08:00:00",
                    "16:00:00",
                    "tpl-1"
                ),
            ];

            const result = evaluateSchedule(shifts, input);

            const emp1Stats = result.employeeStats.find(
                (s) => s.employeeId === "emp-1"
            );
            expect(emp1Stats?.totalHours).toBe(8);
            expect(emp1Stats?.hoursDiff).toBeLessThan(0); // ma mniej niż wymagane
        });
    });

    // =========================================================================
    // evaluateSchedule - weekend balance
    // =========================================================================
    describe("evaluateSchedule - weekend balance", () => {
        it("should count weekend shifts", () => {
            const input = {
                ...createBaseInput(),
                saturdayDays: ["2026-01-10"],
                tradingSundays: ["2026-01-11"],
            };

            const shifts: GeneratedShift[] = [
                createShift(
                    "emp-1",
                    "2026-01-10",
                    "08:00:00",
                    "16:00:00",
                    "tpl-1"
                ),
                createShift(
                    "emp-1",
                    "2026-01-11",
                    "08:00:00",
                    "16:00:00",
                    "tpl-1"
                ),
            ];

            const result = evaluateSchedule(shifts, input);

            const emp1Stats = result.employeeStats.find(
                (s) => s.employeeId === "emp-1"
            );
            expect(emp1Stats?.weekendShifts).toBe(2);
        });
    });

    // =========================================================================
    // evaluateSchedule - shift types
    // =========================================================================
    describe("evaluateSchedule - shift types", () => {
        it("should categorize morning shifts", () => {
            const input = createBaseInput();
            const shifts: GeneratedShift[] = [
                createShift(
                    "emp-1",
                    "2026-01-05",
                    "06:00:00",
                    "14:00:00",
                    "tpl-1"
                ),
            ];

            const result = evaluateSchedule(shifts, input);

            const emp1Stats = result.employeeStats.find(
                (s) => s.employeeId === "emp-1"
            );
            expect(emp1Stats?.morningShifts).toBe(1);
        });

        it("should categorize afternoon shifts", () => {
            const input = createBaseInput();
            const shifts: GeneratedShift[] = [
                createShift(
                    "emp-1",
                    "2026-01-05",
                    "14:00:00",
                    "22:00:00",
                    "tpl-2"
                ),
            ];

            const result = evaluateSchedule(shifts, input);

            const emp1Stats = result.employeeStats.find(
                (s) => s.employeeId === "emp-1"
            );
            expect(emp1Stats?.afternoonShifts).toBe(1);
        });
    });

    // =========================================================================
    // evaluateSchedule - warnings
    // =========================================================================
    describe("evaluateSchedule - warnings", () => {
        it("should add warnings for understaffed shifts", () => {
            const input = {
                ...createBaseInput(),
                templates: [createTemplate("tpl-1", "08:00:00", "16:00:00", 2)], // wymaga 2 osób
            };

            const shifts: GeneratedShift[] = [
                createShift(
                    "emp-1",
                    "2026-01-05",
                    "08:00:00",
                    "16:00:00",
                    "tpl-1"
                ),
            ];

            const result = evaluateSchedule(shifts, input);

            expect(result.warnings.length).toBeGreaterThan(0);
            expect(result.understaffedShifts).toBeGreaterThan(0);
        });

        it("should add warnings for empty days", () => {
            const input = createBaseInput();
            const shifts: GeneratedShift[] = [];

            const result = evaluateSchedule(shifts, input);

            expect(result.warnings.some((w) => w.includes("BRAK OBSADY"))).toBe(
                true
            );
        });
    });

    // =========================================================================
    // quickFitness
    // =========================================================================
    describe("quickFitness", () => {
        it("should return a number", () => {
            const input = createBaseInput();
            const shifts: GeneratedShift[] = [];

            const result = quickFitness(shifts, input);

            expect(typeof result).toBe("number");
        });

        it("should penalize empty days", () => {
            const input = createBaseInput();
            const shiftsEmpty: GeneratedShift[] = [];
            const shiftsWithCoverage: GeneratedShift[] = input.workDays.map(
                (day) =>
                    createShift("emp-1", day, "08:00:00", "16:00:00", "tpl-1")
            );

            const fitnessEmpty = quickFitness(shiftsEmpty, input);
            const fitnessCovered = quickFitness(shiftsWithCoverage, input);

            expect(fitnessCovered).toBeGreaterThan(fitnessEmpty);
        });

        it("should penalize 11h rest violations", () => {
            const input = createBaseInput();
            const shiftsValid: GeneratedShift[] = [
                createShift(
                    "emp-1",
                    "2026-01-05",
                    "08:00:00",
                    "16:00:00",
                    "tpl-1"
                ),
                createShift(
                    "emp-1",
                    "2026-01-06",
                    "08:00:00",
                    "16:00:00",
                    "tpl-1"
                ),
            ];

            const shiftsViolation: GeneratedShift[] = [
                createShift(
                    "emp-1",
                    "2026-01-05",
                    "14:00:00",
                    "22:00:00",
                    "tpl-2"
                ),
                createShift(
                    "emp-1",
                    "2026-01-06",
                    "06:00:00",
                    "14:00:00",
                    "tpl-1"
                ),
            ];

            const fitnessValid = quickFitness(shiftsValid, input);
            const fitnessViolation = quickFitness(shiftsViolation, input);

            expect(fitnessValid).toBeGreaterThan(fitnessViolation);
        });

        it("should be faster than full evaluateSchedule", () => {
            const input = createBaseInput();
            const shifts: GeneratedShift[] = input.workDays.flatMap((day) => [
                createShift("emp-1", day, "08:00:00", "16:00:00", "tpl-1"),
                createShift("emp-2", day, "14:00:00", "22:00:00", "tpl-2"),
            ]);

            const startQuick = performance.now();
            for (let i = 0; i < 100; i++) {
                quickFitness(shifts, input);
            }
            const quickTime = performance.now() - startQuick;

            const startFull = performance.now();
            for (let i = 0; i < 100; i++) {
                evaluateSchedule(shifts, input);
            }
            const fullTime = performance.now() - startFull;

            // quickFitness powinno być szybsze lub podobne (wysoka tolerancja dla flaky CI)
            expect(quickTime).toBeLessThanOrEqual(fullTime * 5);
        });
    });

    // =========================================================================
    // evaluateSchedule - quality percent
    // =========================================================================
    describe("evaluateSchedule - quality percent", () => {
        it("should return quality between 0 and 100", () => {
            const input = createBaseInput();
            const shifts: GeneratedShift[] = [];

            const result = evaluateSchedule(shifts, input);

            expect(result.qualityPercent).toBeGreaterThanOrEqual(0);
            expect(result.qualityPercent).toBeLessThanOrEqual(100);
        });
    });

    // =========================================================================
    // evaluateSchedule - shifts by template
    // =========================================================================
    describe("evaluateSchedule - shifts by template", () => {
        it("should group shifts by template", () => {
            const input = createBaseInput();
            const shifts: GeneratedShift[] = [
                createShift(
                    "emp-1",
                    "2026-01-05",
                    "08:00:00",
                    "16:00:00",
                    "tpl-1"
                ),
                createShift(
                    "emp-1",
                    "2026-01-06",
                    "08:00:00",
                    "16:00:00",
                    "tpl-1"
                ),
                createShift(
                    "emp-1",
                    "2026-01-07",
                    "14:00:00",
                    "22:00:00",
                    "tpl-2"
                ),
            ];

            const result = evaluateSchedule(shifts, input);

            const emp1Stats = result.employeeStats.find(
                (s) => s.employeeId === "emp-1"
            );
            expect(emp1Stats?.shiftsByTemplate.length).toBeGreaterThan(0);

            const tpl1Count = emp1Stats?.shiftsByTemplate.find(
                (t) => t.templateId === "tpl-1"
            )?.count;
            expect(tpl1Count).toBe(2);
        });
    });

    // =========================================================================
    // evaluateSchedule - weekly hours violations (KP Art. 131 § 1)
    // =========================================================================
    describe("evaluateSchedule - weekly hours violations", () => {
        it("should detect weekly hours violation when employee works >48h/week", () => {
            const input = createBaseInput();
            // Tydzień: pon-pt (5-9 stycznia 2026)
            // 5x 10h = 50h > 48h limit
            const shifts: GeneratedShift[] = [
                createShift("emp-1", "2026-01-05", "08:00:00", "18:00:00"), // pon 10h
                createShift("emp-1", "2026-01-06", "08:00:00", "18:00:00"), // wt 10h
                createShift("emp-1", "2026-01-07", "08:00:00", "18:00:00"), // śr 10h
                createShift("emp-1", "2026-01-08", "08:00:00", "18:00:00"), // czw 10h
                createShift("emp-1", "2026-01-09", "08:00:00", "18:00:00"), // pt 10h
            ];

            const result = evaluateSchedule(shifts, input);

            expect(result.weeklyHoursViolations).toBe(1);
            expect(result.totalFitness).toBeLessThan(0); // Kara za naruszenie

            const emp1Stats = result.employeeStats.find(
                (s) => s.employeeId === "emp-1"
            );
            expect(emp1Stats?.violations.length).toBeGreaterThan(0);
            expect(
                emp1Stats?.violations.some((v) =>
                    v.includes("Przekroczenie 48h/tydzień")
                )
            ).toBe(true);
        });

        it("should NOT detect violation when employee works <=48h/week", () => {
            const input = createBaseInput();
            // 5x 9h = 45h (< 48h limit)
            const shifts: GeneratedShift[] = [
                createShift("emp-1", "2026-01-05", "08:00:00", "17:00:00"),
                createShift("emp-1", "2026-01-06", "08:00:00", "17:00:00"),
                createShift("emp-1", "2026-01-07", "08:00:00", "17:00:00"),
                createShift("emp-1", "2026-01-08", "08:00:00", "17:00:00"),
                createShift("emp-1", "2026-01-09", "08:00:00", "17:00:00"),
            ];

            const result = evaluateSchedule(shifts, input);

            expect(result.weeklyHoursViolations).toBe(0);
        });

        it("should NOT detect violation when employee works <40h/week", () => {
            const input = createBaseInput();
            // 4x 8h = 32h < 40h
            const shifts: GeneratedShift[] = [
                createShift("emp-1", "2026-01-05", "08:00:00", "16:00:00"),
                createShift("emp-1", "2026-01-06", "08:00:00", "16:00:00"),
                createShift("emp-1", "2026-01-07", "08:00:00", "16:00:00"),
                createShift("emp-1", "2026-01-08", "08:00:00", "16:00:00"),
            ];

            const result = evaluateSchedule(shifts, input);

            expect(result.weeklyHoursViolations).toBe(0);
        });

        it("should detect multiple violations across multiple weeks", () => {
            const input = createBaseInput();
            input.workDays = [
                // Tydzień 1 (5-9): 42.5h
                "2026-01-05",
                "2026-01-06",
                "2026-01-07",
                "2026-01-08",
                "2026-01-09",
                // Tydzień 2 (12-16): 42.5h
                "2026-01-12",
                "2026-01-13",
                "2026-01-14",
                "2026-01-15",
                "2026-01-16",
            ];

            const shifts: GeneratedShift[] = [
                // Tydzień 1: 50h
                createShift("emp-1", "2026-01-05", "08:00:00", "18:00:00"),
                createShift("emp-1", "2026-01-06", "08:00:00", "18:00:00"),
                createShift("emp-1", "2026-01-07", "08:00:00", "18:00:00"),
                createShift("emp-1", "2026-01-08", "08:00:00", "18:00:00"),
                createShift("emp-1", "2026-01-09", "08:00:00", "18:00:00"),
                // Tydzień 2: 50h
                createShift("emp-1", "2026-01-12", "08:00:00", "18:00:00"),
                createShift("emp-1", "2026-01-13", "08:00:00", "18:00:00"),
                createShift("emp-1", "2026-01-14", "08:00:00", "18:00:00"),
                createShift("emp-1", "2026-01-15", "08:00:00", "18:00:00"),
                createShift("emp-1", "2026-01-16", "08:00:00", "18:00:00"),
            ];

            const result = evaluateSchedule(shifts, input);

            expect(result.weeklyHoursViolations).toBe(2); // Dwa tygodnie z naruszeniem

            const emp1Stats = result.employeeStats.find(
                (s) => s.employeeId === "emp-1"
            );
            expect(emp1Stats?.violations.length).toBe(2);
        });

        it("should handle weekend shifts correctly in weekly calculation", () => {
            const input = createBaseInput();
            input.saturdayDays = ["2026-01-10"]; // sobota tego samego tygodnia
            input.workDays = [
                "2026-01-05",
                "2026-01-06",
                "2026-01-07",
                "2026-01-08",
                "2026-01-09",
            ];

            // Tydzień (5-11 sty): pon-pt (5x9h) + sob (9h) = 54h > 48h
            const shifts: GeneratedShift[] = [
                createShift("emp-1", "2026-01-05", "08:00:00", "17:00:00"),
                createShift("emp-1", "2026-01-06", "08:00:00", "17:00:00"),
                createShift("emp-1", "2026-01-07", "08:00:00", "17:00:00"),
                createShift("emp-1", "2026-01-08", "08:00:00", "17:00:00"),
                createShift("emp-1", "2026-01-09", "08:00:00", "17:00:00"),
                createShift("emp-1", "2026-01-10", "08:00:00", "17:00:00"), // sobota
            ];

            const result = evaluateSchedule(shifts, input);

            expect(result.weeklyHoursViolations).toBe(1);
        });
    });
});
