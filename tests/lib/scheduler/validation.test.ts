/**
 * Testy dla scheduler/validation.ts
 * Walidacja zgodności z Kodeksem Pracy
 */

import { describe, it, expect } from "vitest";
import {
    canEmployeeWorkOnDate,
    checkHardConstraintsForShift,
    checkDailyRest,
    checkConsecutiveDays,
    canAddShift,
    checkDailyRestSimple,
    canAddShiftSimple,
} from "@/lib/scheduler/validation";
import type {
    EmployeeWithData,
    GeneratedShift,
    EmployeeScheduleState,
    EmployeeState,
} from "@/lib/scheduler/types";
import type {
    ShiftTemplate,
    PublicHoliday,
    EmployeePreferences,
} from "@/types";

// ============================================================================
// FIXTURES
// ============================================================================

const DEFAULT_PREFERENCES: EmployeePreferences = {
    id: "pref-1",
    employee_id: "emp-1",
    can_work_weekends: true,
    can_work_holidays: true,
    unavailable_days: [],
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
    max_hours_per_day: null,
    max_hours_per_week: null,
    notes: null,
    preferred_days: null,
    preferred_end_time: null,
    preferred_start_time: null,
};

const createEmployee = (
    overrides: Partial<EmployeeWithData> = {}
): EmployeeWithData => ({
    id: "emp-1",
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
    position: null,
    preferences: {
        ...DEFAULT_PREFERENCES,
    },
    ...overrides,
});

const createTemplate = (
    overrides: Partial<ShiftTemplate> = {}
): ShiftTemplate => ({
    id: "tpl-1",
    organization_id: "org-1",
    name: "Zmiana poranna",
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

const createShift = (
    overrides: Partial<GeneratedShift> = {}
): GeneratedShift => ({
    employee_id: "emp-1",
    date: "2024-01-15",
    start_time: "08:00",
    end_time: "16:00",
    break_minutes: 30,
    ...overrides,
});

const holidays: PublicHoliday[] = [
    {
        date: "2024-01-01",
        name: "Nowy Rok",
        localName: "Nowy Rok",
        countryCode: "PL",
        fixed: true,
        global: true,
        counties: null,
        launchYear: null,
        types: ["Public"],
    },
    {
        date: "2024-05-01",
        name: "Labour Day",
        localName: "Święto Pracy",
        countryCode: "PL",
        fixed: true,
        global: true,
        counties: null,
        launchYear: null,
        types: ["Public"],
    },
];

// ============================================================================
// canEmployeeWorkOnDate
// ============================================================================

describe("canEmployeeWorkOnDate", () => {
    describe("absencje", () => {
        it("blokuje pracę gdy pracownik ma urlop", () => {
            const emp = createEmployee({
                absences: [
                    {
                        id: "abs-1",
                        employee_id: "emp-1",
                        start_date: "2024-01-10",
                        end_date: "2024-01-20",
                        absence_type: "vacation",
                        notes: null,
                        created_at: "2024-01-01",
                        updated_at: "2024-01-01",
                        organization_id: "org-1",
                        created_by: null,
                        is_paid: true,
                    },
                ],
            });

            expect(canEmployeeWorkOnDate(emp, "2024-01-15", [])).toBe(false);
        });

        it("blokuje pracę gdy pracownik jest chory", () => {
            const emp = createEmployee({
                absences: [
                    {
                        id: "abs-1",
                        employee_id: "emp-1",
                        start_date: "2024-01-14",
                        end_date: "2024-01-16",
                        absence_type: "sick_leave",
                        notes: null,
                        created_at: "2024-01-01",
                        updated_at: "2024-01-01",
                        organization_id: "org-1",
                        created_by: null,
                        is_paid: true,
                    },
                ],
            });

            expect(canEmployeeWorkOnDate(emp, "2024-01-15", [])).toBe(false);
        });

        it("pozwala na pracę poza okresem absencji", () => {
            const emp = createEmployee({
                absences: [
                    {
                        id: "abs-1",
                        employee_id: "emp-1",
                        start_date: "2024-01-10",
                        end_date: "2024-01-14",
                        absence_type: "vacation",
                        notes: null,
                        created_at: "2024-01-01",
                        updated_at: "2024-01-01",
                        organization_id: "org-1",
                        created_by: null,
                        is_paid: true,
                    },
                ],
            });

            expect(canEmployeeWorkOnDate(emp, "2024-01-15", [])).toBe(true);
        });

        it("obsługuje pierwszy i ostatni dzień absencji", () => {
            const emp = createEmployee({
                absences: [
                    {
                        id: "abs-1",
                        employee_id: "emp-1",
                        start_date: "2024-01-15",
                        end_date: "2024-01-15",
                        absence_type: "vacation",
                        notes: null,
                        created_at: "2024-01-01",
                        updated_at: "2024-01-01",
                        organization_id: "org-1",
                        created_by: null,
                        is_paid: true,
                    },
                ],
            });

            expect(canEmployeeWorkOnDate(emp, "2024-01-15", [])).toBe(false);
            expect(canEmployeeWorkOnDate(emp, "2024-01-14", [])).toBe(true);
            expect(canEmployeeWorkOnDate(emp, "2024-01-16", [])).toBe(true);
        });
    });

    describe("preferencje - unavailable_days", () => {
        it("blokuje pracę w niedostępny dzień tygodnia", () => {
            const emp = createEmployee({
                preferences: {
                    ...DEFAULT_PREFERENCES,
                    unavailable_days: [1], // poniedziałek
                    can_work_weekends: true,
                    can_work_holidays: true,
                },
            });

            // 2024-01-15 to poniedziałek
            expect(canEmployeeWorkOnDate(emp, "2024-01-15", [])).toBe(false);
        });

        it("pozwala na pracę w dostępny dzień tygodnia", () => {
            const emp = createEmployee({
                preferences: {
                    ...DEFAULT_PREFERENCES,
                    unavailable_days: [1], // poniedziałek
                    can_work_weekends: true,
                    can_work_holidays: true,
                },
            });

            // 2024-01-16 to wtorek
            expect(canEmployeeWorkOnDate(emp, "2024-01-16", [])).toBe(true);
        });

        it("obsługuje unavailable_days jako stringi", () => {
            const emp = createEmployee({
                preferences: {
                    ...DEFAULT_PREFERENCES,
                    unavailable_days: ["1", "2"] as unknown as number[], // dane z bazy mogą być stringami
                    can_work_weekends: true,
                    can_work_holidays: true,
                },
            });

            expect(canEmployeeWorkOnDate(emp, "2024-01-15", [])).toBe(false); // poniedziałek
            expect(canEmployeeWorkOnDate(emp, "2024-01-16", [])).toBe(false); // wtorek
            expect(canEmployeeWorkOnDate(emp, "2024-01-17", [])).toBe(true); // środa
        });
    });

    describe("preferencje - weekendy", () => {
        it("blokuje pracę w weekend gdy can_work_weekends = false", () => {
            const emp = createEmployee({
                preferences: {
                    ...DEFAULT_PREFERENCES,
                    unavailable_days: [],
                    can_work_weekends: false,
                    can_work_holidays: true,
                },
            });

            // 2024-01-13 to sobota, 2024-01-14 to niedziela
            expect(canEmployeeWorkOnDate(emp, "2024-01-13", [])).toBe(false);
            expect(canEmployeeWorkOnDate(emp, "2024-01-14", [])).toBe(false);
        });

        it("pozwala na pracę w weekend gdy can_work_weekends = true", () => {
            const emp = createEmployee({
                preferences: {
                    ...DEFAULT_PREFERENCES,
                    unavailable_days: [],
                    can_work_weekends: true,
                    can_work_holidays: true,
                },
            });

            expect(canEmployeeWorkOnDate(emp, "2024-01-13", [])).toBe(true);
            expect(canEmployeeWorkOnDate(emp, "2024-01-14", [])).toBe(true);
        });
    });

    describe("preferencje - święta", () => {
        it("blokuje pracę w święto gdy can_work_holidays = false", () => {
            const emp = createEmployee({
                preferences: {
                    ...DEFAULT_PREFERENCES,
                    unavailable_days: [],
                    can_work_weekends: true,
                    can_work_holidays: false,
                },
            });

            expect(canEmployeeWorkOnDate(emp, "2024-01-01", holidays)).toBe(
                false
            );
            expect(canEmployeeWorkOnDate(emp, "2024-05-01", holidays)).toBe(
                false
            );
        });

        it("pozwala na pracę w święto gdy can_work_holidays = true", () => {
            const emp = createEmployee({
                preferences: {
                    ...DEFAULT_PREFERENCES,
                    unavailable_days: [],
                    can_work_weekends: true,
                    can_work_holidays: true,
                },
            });

            expect(canEmployeeWorkOnDate(emp, "2024-01-01", holidays)).toBe(
                true
            );
        });
    });

    describe("brak preferencji", () => {
        it("pozwala na pracę gdy brak preferencji", () => {
            const emp = createEmployee({ preferences: undefined });

            expect(canEmployeeWorkOnDate(emp, "2024-01-15", [])).toBe(true);
        });
    });
});

// ============================================================================
// checkHardConstraintsForShift
// ============================================================================

describe("checkHardConstraintsForShift", () => {
    describe("11h odpoczynku (Art. 132 KP)", () => {
        it("blokuje zmianę z niewystarczającym odpoczynkiem - poprzedni dzień", () => {
            const existingShifts: GeneratedShift[] = [
                createShift({
                    date: "2024-01-14",
                    start_time: "14:00",
                    end_time: "22:00",
                }),
            ];
            const newShift = createShift({
                date: "2024-01-15",
                start_time: "06:00",
                end_time: "14:00",
            });

            // Od 22:00 do 06:00 = 8h odpoczynku (< 11h)
            expect(
                checkHardConstraintsForShift(
                    "emp-1",
                    "2024-01-15",
                    newShift,
                    existingShifts
                )
            ).toBe(false);
        });

        it("blokuje zmianę z niewystarczającym odpoczynkiem - następny dzień", () => {
            const existingShifts: GeneratedShift[] = [
                createShift({
                    date: "2024-01-16",
                    start_time: "06:00",
                    end_time: "14:00",
                }),
            ];
            const newShift = createShift({
                date: "2024-01-15",
                start_time: "14:00",
                end_time: "22:00",
            });

            // Od 22:00 do 06:00 = 8h odpoczynku (< 11h)
            expect(
                checkHardConstraintsForShift(
                    "emp-1",
                    "2024-01-15",
                    newShift,
                    existingShifts
                )
            ).toBe(false);
        });

        it("pozwala na zmianę z wystarczającym odpoczynkiem", () => {
            const existingShifts: GeneratedShift[] = [
                createShift({
                    date: "2024-01-14",
                    start_time: "08:00",
                    end_time: "16:00",
                }),
            ];
            const newShift = createShift({
                date: "2024-01-15",
                start_time: "08:00",
                end_time: "16:00",
            });

            // Od 16:00 do 08:00 = 16h odpoczynku (>= 11h)
            expect(
                checkHardConstraintsForShift(
                    "emp-1",
                    "2024-01-15",
                    newShift,
                    existingShifts
                )
            ).toBe(true);
        });

        it("pozwala na zmianę w nieprzyległe dni", () => {
            const existingShifts: GeneratedShift[] = [
                createShift({
                    date: "2024-01-13",
                    start_time: "14:00",
                    end_time: "22:00",
                }),
            ];
            const newShift = createShift({
                date: "2024-01-15",
                start_time: "06:00",
                end_time: "14:00",
            });

            // Dni nie są przyległe - brak sprawdzania 11h
            expect(
                checkHardConstraintsForShift(
                    "emp-1",
                    "2024-01-15",
                    newShift,
                    existingShifts
                )
            ).toBe(true);
        });

        it("nie sprawdza odpoczynku dla innych pracowników", () => {
            const existingShifts: GeneratedShift[] = [
                createShift({
                    employee_id: "emp-2",
                    date: "2024-01-14",
                    start_time: "14:00",
                    end_time: "22:00",
                }),
            ];
            const newShift = createShift({
                date: "2024-01-15",
                start_time: "06:00",
                end_time: "14:00",
            });

            expect(
                checkHardConstraintsForShift(
                    "emp-1",
                    "2024-01-15",
                    newShift,
                    existingShifts
                )
            ).toBe(true);
        });
    });

    describe("max 6 dni z rzędu (polityka firmy)", () => {
        it("blokuje 7. dzień pracy z rzędu", () => {
            const existingShifts: GeneratedShift[] = [
                createShift({ date: "2024-01-10" }),
                createShift({ date: "2024-01-11" }),
                createShift({ date: "2024-01-12" }),
                createShift({ date: "2024-01-13" }),
                createShift({ date: "2024-01-14" }),
                createShift({ date: "2024-01-15" }),
            ];
            const newShift = createShift({ date: "2024-01-16" });

            // 7 dni z rzędu (> 6)
            expect(
                checkHardConstraintsForShift(
                    "emp-1",
                    "2024-01-16",
                    newShift,
                    existingShifts
                )
            ).toBe(false);
        });

        it("pozwala na 6. dzień pracy z rzędu", () => {
            const existingShifts: GeneratedShift[] = [
                createShift({ date: "2024-01-11" }),
                createShift({ date: "2024-01-12" }),
                createShift({ date: "2024-01-13" }),
                createShift({ date: "2024-01-14" }),
                createShift({ date: "2024-01-15" }),
            ];
            const newShift = createShift({ date: "2024-01-16" });

            // 6 dni z rzędu (== 6)
            expect(
                checkHardConstraintsForShift(
                    "emp-1",
                    "2024-01-16",
                    newShift,
                    existingShifts
                )
            ).toBe(true);
        });

        it("pozwala na pracę po przerwie", () => {
            const existingShifts: GeneratedShift[] = [
                createShift({ date: "2024-01-08" }),
                createShift({ date: "2024-01-09" }),
                createShift({ date: "2024-01-10" }),
                createShift({ date: "2024-01-11" }),
                createShift({ date: "2024-01-12" }),
                // przerwa 13-14
            ];
            const newShift = createShift({ date: "2024-01-15" });

            // Po przerwie można zacząć nowy ciąg
            expect(
                checkHardConstraintsForShift(
                    "emp-1",
                    "2024-01-15",
                    newShift,
                    existingShifts
                )
            ).toBe(true);
        });

        it("wykrywa ciąg łączący się przez nową zmianę", () => {
            const existingShifts: GeneratedShift[] = [
                createShift({ date: "2024-01-11" }),
                createShift({ date: "2024-01-12" }),
                createShift({ date: "2024-01-13" }),
                // przerwa 14
                createShift({ date: "2024-01-15" }),
                createShift({ date: "2024-01-16" }),
                createShift({ date: "2024-01-17" }),
            ];
            const newShift = createShift({ date: "2024-01-14" });

            // 14 łączy ciąg: 11, 12, 13, 14, 15, 16, 17 = 7 dni (> 6)
            expect(
                checkHardConstraintsForShift(
                    "emp-1",
                    "2024-01-14",
                    newShift,
                    existingShifts
                )
            ).toBe(false);
        });
    });
});

// ============================================================================
// checkDailyRest
// ============================================================================

describe("checkDailyRest", () => {
    it("blokuje zmianę z < 11h odpoczynku od poprzedniego dnia", () => {
        const shifts: GeneratedShift[] = [
            createShift({
                date: "2024-01-14",
                start_time: "14:00",
                end_time: "22:00",
            }),
        ];
        const template = createTemplate({
            start_time: "06:00:00",
            end_time: "14:00:00",
        });

        expect(checkDailyRest(shifts, "2024-01-15", template)).toBe(false);
    });

    it("blokuje zmianę z < 11h odpoczynku do następnego dnia", () => {
        const shifts: GeneratedShift[] = [
            createShift({
                date: "2024-01-16",
                start_time: "06:00",
                end_time: "14:00",
            }),
        ];
        const template = createTemplate({
            start_time: "14:00:00",
            end_time: "22:00:00",
        });

        expect(checkDailyRest(shifts, "2024-01-15", template)).toBe(false);
    });

    it("pozwala na zmianę z >= 11h odpoczynku", () => {
        const shifts: GeneratedShift[] = [
            createShift({
                date: "2024-01-14",
                start_time: "08:00",
                end_time: "16:00",
            }),
        ];
        const template = createTemplate({
            start_time: "08:00:00",
            end_time: "16:00:00",
        });

        expect(checkDailyRest(shifts, "2024-01-15", template)).toBe(true);
    });

    it("ignoruje zmiany z dalszych dni", () => {
        const shifts: GeneratedShift[] = [
            createShift({
                date: "2024-01-10",
                start_time: "14:00",
                end_time: "22:00",
            }),
        ];
        const template = createTemplate({
            start_time: "06:00:00",
            end_time: "14:00:00",
        });

        expect(checkDailyRest(shifts, "2024-01-15", template)).toBe(true);
    });
});

// ============================================================================
// checkConsecutiveDays
// ============================================================================

describe("checkConsecutiveDays", () => {
    it("blokuje gdy byłoby 7 dni z rzędu", () => {
        const occupied = new Set([
            "2024-01-10",
            "2024-01-11",
            "2024-01-12",
            "2024-01-13",
            "2024-01-14",
            "2024-01-15",
        ]);

        expect(checkConsecutiveDays(occupied, "2024-01-16")).toBe(false);
    });

    it("pozwala na 6 dni z rzędu", () => {
        const occupied = new Set([
            "2024-01-11",
            "2024-01-12",
            "2024-01-13",
            "2024-01-14",
            "2024-01-15",
        ]);

        expect(checkConsecutiveDays(occupied, "2024-01-16")).toBe(true);
    });

    it("pozwala gdy jest przerwa", () => {
        const occupied = new Set([
            "2024-01-08",
            "2024-01-09",
            "2024-01-10",
            "2024-01-11",
            "2024-01-12",
        ]);
        // przerwa 13-14
        expect(checkConsecutiveDays(occupied, "2024-01-15")).toBe(true);
    });

    it("sprawdza dni przed i po", () => {
        const occupied = new Set([
            "2024-01-12",
            "2024-01-13",
            "2024-01-15",
            "2024-01-16",
            "2024-01-17",
            "2024-01-18",
        ]);
        // 14 łączy 12-13 z 15-16-17-18 = 7 dni
        expect(checkConsecutiveDays(occupied, "2024-01-14")).toBe(false);
    });

    it("pusta lista pozwala na każdy dzień", () => {
        const occupied = new Set<string>();

        expect(checkConsecutiveDays(occupied, "2024-01-15")).toBe(true);
    });
});

// ============================================================================
// canAddShift (pełna walidacja)
// ============================================================================

describe("canAddShift", () => {
    const createState = (
        overrides: Partial<EmployeeScheduleState> = {}
    ): EmployeeScheduleState => ({
        emp: createEmployee(),
        requiredHours: 160,
        currentHours: 0,
        shifts: [],
        occupiedDates: new Set(),
        availableTemplates: [createTemplate()],
        saturdayShiftCount: 0,
        sundayShiftCount: 0,
        morningShiftCount: 0,
        afternoonShiftCount: 0,
        eveningShiftCount: 0,
        consecutiveShiftDays: 0,
        lastShiftType: null,
        lastShiftTemplate: null,
        ...overrides,
        weekendShiftCount: overrides.weekendShiftCount ?? 0,
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

    it("blokuje gdy już ma zmianę w ten dzień", () => {
        const state = createState({
            occupiedDates: new Set(["2024-01-15"]),
        });
        const template = createTemplate();

        expect(canAddShift(state, "2024-01-15", template, false, [])).toBe(
            false
        );
    });

    it("blokuje gdy nie może używać szablonu", () => {
        const state = createState({
            availableTemplates: [], // brak dostępnych szablonów
        });
        const template = createTemplate();

        expect(canAddShift(state, "2024-01-15", template, false, [])).toBe(
            false
        );
    });

    it("blokuje gdy ma absencję", () => {
        const state = createState({
            emp: createEmployee({
                absences: [
                    {
                        id: "abs-1",
                        employee_id: "emp-1",
                        start_date: "2024-01-15",
                        end_date: "2024-01-15",
                        absence_type: "vacation",
                        notes: null,
                        created_at: "2024-01-01",
                        updated_at: "2024-01-01",
                        organization_id: "org-1",
                        created_by: null,
                        is_paid: true,
                    },
                ],
            }),
        });
        const template = createTemplate();

        expect(canAddShift(state, "2024-01-15", template, false, [])).toBe(
            false
        );
    });

    it("blokuje weekend gdy nie może pracować w weekendy", () => {
        const state = createState({
            emp: createEmployee({
                preferences: {
                    ...DEFAULT_PREFERENCES,
                    unavailable_days: [],
                    can_work_weekends: false,
                    can_work_holidays: true,
                },
            }),
        });
        const template = createTemplate();

        expect(canAddShift(state, "2024-01-13", template, true, [])).toBe(
            false
        ); // sobota
    });

    it("blokuje gdy przekroczony limit godzin", () => {
        const state = createState({
            currentHours: 160,
            requiredHours: 160,
        });
        const template = createTemplate(); // 7.5h netto

        expect(
            canAddShift(state, "2024-01-15", template, false, [], true)
        ).toBe(false);
    });

    it("pozwala na małe przekroczenie limitu (tolerancja 0.5h)", () => {
        const state = createState({
            currentHours: 159.9,
            requiredHours: 160,
        });
        const template = createTemplate({
            start_time: "08:00:00",
            end_time: "08:30:00",
            break_minutes: 0,
        }); // 0.5h

        expect(
            canAddShift(state, "2024-01-15", template, false, [], true)
        ).toBe(true);
    });

    it("blokuje gdy < 11h odpoczynku", () => {
        const state = createState({
            shifts: [
                createShift({
                    date: "2024-01-14",
                    start_time: "14:00",
                    end_time: "22:00",
                }),
            ],
        });
        const template = createTemplate({
            start_time: "06:00:00",
            end_time: "14:00:00",
        });

        expect(canAddShift(state, "2024-01-15", template, false, [])).toBe(
            false
        );
    });

    it("blokuje gdy > 6 dni z rzędu", () => {
        const state = createState({
            occupiedDates: new Set([
                "2024-01-10",
                "2024-01-11",
                "2024-01-12",
                "2024-01-13",
                "2024-01-14",
                "2024-01-15",
            ]),
        });
        const template = createTemplate();

        expect(canAddShift(state, "2024-01-16", template, false, [])).toBe(
            false
        );
    });

    it("pozwala na poprawną zmianę", () => {
        const state = createState();
        const template = createTemplate();

        expect(canAddShift(state, "2024-01-15", template, false, [])).toBe(
            true
        );
    });
});

// ============================================================================
// checkDailyRestSimple
// ============================================================================

describe("checkDailyRestSimple", () => {
    const template1 = createTemplate({
        start_time: "08:00:00",
        end_time: "16:00:00",
    });
    const template2 = createTemplate({
        start_time: "14:00:00",
        end_time: "22:00:00",
    });
    const template3 = createTemplate({
        start_time: "06:00:00",
        end_time: "14:00:00",
    });

    it("blokuje gdy < 11h odpoczynku (zmiana wieczorna -> poranna)", () => {
        const shifts = [{ date: "2024-01-14", template: template2 }]; // 14:00-22:00

        expect(checkDailyRestSimple(shifts, "2024-01-15", template3)).toBe(
            false
        ); // 06:00-14:00
    });

    it("pozwala gdy >= 11h odpoczynku", () => {
        const shifts = [{ date: "2024-01-14", template: template1 }]; // 08:00-16:00

        expect(checkDailyRestSimple(shifts, "2024-01-15", template1)).toBe(
            true
        ); // 08:00-16:00
    });
});

// ============================================================================
// canAddShiftSimple
// ============================================================================

describe("canAddShiftSimple", () => {
    const createSimpleState = (
        overrides: Partial<EmployeeState> = {}
    ): EmployeeState => ({
        requiredHours: 160,
        assignedHours: 0,
        assignedShifts: [],
        occupiedDates: new Set(),
        ...overrides,
    });

    it("blokuje gdy już ma zmianę w ten dzień", () => {
        const state = createSimpleState({
            occupiedDates: new Set(["2024-01-15"]),
        });

        expect(
            canAddShiftSimple(state, "2024-01-15", createTemplate(), false, [])
        ).toBe(false);
    });

    it("blokuje gdy przekroczony limit godzin", () => {
        const state = createSimpleState({
            assignedHours: 160,
            requiredHours: 160,
        });

        expect(
            canAddShiftSimple(
                state,
                "2024-01-15",
                createTemplate(),
                false,
                [],
                true
            )
        ).toBe(false);
    });

    it("blokuje gdy < 11h odpoczynku", () => {
        const state = createSimpleState({
            assignedShifts: [
                {
                    date: "2024-01-14",
                    template: createTemplate({
                        start_time: "14:00:00",
                        end_time: "22:00:00",
                    }),
                },
            ],
        });
        const template = createTemplate({
            start_time: "06:00:00",
            end_time: "14:00:00",
        });

        expect(
            canAddShiftSimple(state, "2024-01-15", template, false, [])
        ).toBe(false);
    });

    it("blokuje gdy > 6 dni z rzędu", () => {
        const state = createSimpleState({
            occupiedDates: new Set([
                "2024-01-10",
                "2024-01-11",
                "2024-01-12",
                "2024-01-13",
                "2024-01-14",
                "2024-01-15",
            ]),
        });

        expect(
            canAddShiftSimple(state, "2024-01-16", createTemplate(), false, [])
        ).toBe(false);
    });

    it("pozwala na poprawną zmianę", () => {
        const state = createSimpleState();

        expect(
            canAddShiftSimple(state, "2024-01-15", createTemplate(), false, [])
        ).toBe(true);
    });
});
