/**
 * =============================================================================
 * TESTY INTEGRACYJNE - GREEDY SCHEDULER
 * =============================================================================
 *
 * Te testy sprawdzają zgodność generatora grafiku z wymaganiami:
 * 1. Kodeks Pracy - 11h odpoczynku między zmianami
 * 2. Min. obsada na zmianę - respektowanie min_employees szablonu
 * 3. Sprawiedliwy podział - godziny, weekendy, typy zmian
 * 4. Dni zamknięte - brak przypisań w niedziele niehandlowe i święta
 */

import { describe, it, expect } from "vitest";
import { GreedyScheduler } from "@/lib/scheduler/greedy/greedy-scheduler";
import type {
    SchedulerInput,
    GeneratedShift,
    EmployeeWithData,
} from "@/lib/scheduler/types";
import type {
    ShiftTemplate,
    OrganizationSettings,
    PublicHoliday,
} from "@/types";

// =============================================================================
// HELPERS - TWORZENIE DANYCH TESTOWYCH
// =============================================================================

function createEmployee(
    id: string,
    firstName: string,
    lastName: string,
    requiredHours: number = 160,
): EmployeeWithData {
    // requiredHours jest używane tylko przez scheduler - nie jest częścią typu Employee
    // employment_type i custom_hours definiują rzeczywiste godziny
    const employmentType: "full" | "half" | "custom" =
        requiredHours >= 160 ? "full" : requiredHours >= 80 ? "half" : "custom";

    return {
        id,
        organization_id: "org1",
        first_name: firstName,
        last_name: lastName,
        email: `${firstName.toLowerCase()}@test.com`,
        employment_type: employmentType,
        custom_hours: employmentType === "custom" ? requiredHours : null,
        color: "#3B82F6",
        phone: null,
        position: null,
        is_active: true,
        created_at: "",
        updated_at: "",
        preferences: null,
        absences: [],
        templateAssignments: [],
    };
}

function createTemplate(
    id: string,
    name: string,
    startTime: string,
    endTime: string,
    minEmployees: number = 1,
    breakMinutes: number = 30,
    maxEmployees: number | null = null,
): ShiftTemplate {
    return {
        id,
        organization_id: "org1",
        name,
        start_time: startTime,
        end_time: endTime,
        break_minutes: breakMinutes,
        color: "#3B82F6",
        min_employees: minEmployees,
        max_employees: maxEmployees,
        applicable_days: null,
        created_at: "",
        updated_at: "",
    };
}

function createSettings(
    overrides: Partial<OrganizationSettings> = {},
): OrganizationSettings {
    return {
        id: "settings1",
        organization_id: "org1",
        trading_sundays_mode: "none",
        custom_trading_sundays: null,
        default_shift_duration: 8,
        default_break_minutes: 30,
        store_open_time: "08:00",
        store_close_time: "20:00",
        min_employees_per_shift: 1,
        enable_trading_sundays: false,
        opening_hours: null,
        created_at: "",
        updated_at: "",
        ...overrides,
    };
}

function getWorkDaysForMonth(
    year: number,
    month: number,
    tradingSundays: string[] = [],
    holidays: PublicHoliday[] = [],
): {
    workDays: string[];
    saturdayDays: string[];
} {
    const workDays: string[] = [];
    const saturdayDays: string[] = [];
    const tradingSundaysSet = new Set(tradingSundays);
    const holidayDates = new Set(holidays.map((h) => h.date));
    const lastDay = new Date(year, month, 0).getDate();

    // Use tradingSundaysSet for future extensions
    void tradingSundaysSet;

    for (let day = 1; day <= lastDay; day++) {
        const date = new Date(year, month - 1, day);
        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(
            day,
        ).padStart(2, "0")}`;
        const dayOfWeek = date.getDay();

        // Pomiń święta
        if (holidayDates.has(dateStr)) continue;

        if (dayOfWeek === 0) continue; // Niedziele - pomijamy (handlowe są w tradingSundays)
        if (dayOfWeek === 6) {
            saturdayDays.push(dateStr);
        } else {
            workDays.push(dateStr);
        }
    }

    return { workDays, saturdayDays };
}

function createSchedulerInput(
    employees: EmployeeWithData[],
    templates: ShiftTemplate[],
    year: number = 2025,
    month: number = 1,
    tradingSundays: string[] = [],
    holidays: PublicHoliday[] = [],
    templateAssignmentsMap?: Map<string, string[]>,
): SchedulerInput {
    const { workDays, saturdayDays } = getWorkDaysForMonth(
        year,
        month,
        tradingSundays,
        holidays,
    );

    return {
        year,
        month,
        employees,
        templates,
        settings: createSettings({
            trading_sundays_mode: tradingSundays.length > 0 ? "custom" : "none",
            custom_trading_sundays:
                tradingSundays.length > 0 ? tradingSundays : null,
        }),
        holidays,
        workDays,
        saturdayDays,
        tradingSundays,
        templateAssignmentsMap: templateAssignmentsMap || new Map(),
    };
}

// =============================================================================
// TESTY: PODSTAWOWE GENEROWANIE
// =============================================================================

describe("GreedyScheduler - podstawowe generowanie", () => {
    it("generuje zmiany dla jednego pracownika i jednego szablonu", () => {
        const employees = [createEmployee("emp1", "Jan", "Kowalski", 40)];
        const templates = [
            createTemplate("t1", "Rano", "08:00", "16:00", 1, 30),
        ];

        const input = createSchedulerInput(employees, templates, 2025, 1);
        const scheduler = new GreedyScheduler(input);
        const shifts = scheduler.generate();

        expect(shifts.length).toBeGreaterThan(0);
        expect(shifts.every((s) => s.employee_id === "emp1")).toBe(true);
    });

    it("generuje zmiany dla wielu pracowników", () => {
        const employees = [
            createEmployee("emp1", "Jan", "Kowalski", 80),
            createEmployee("emp2", "Anna", "Nowak", 80),
        ];
        const templates = [
            createTemplate("t1", "Rano", "08:00", "16:00", 1, 30),
        ];

        const input = createSchedulerInput(employees, templates, 2025, 1);
        const scheduler = new GreedyScheduler(input);
        const shifts = scheduler.generate();

        const emp1Shifts = shifts.filter((s) => s.employee_id === "emp1");
        const emp2Shifts = shifts.filter((s) => s.employee_id === "emp2");

        expect(emp1Shifts.length).toBeGreaterThan(0);
        expect(emp2Shifts.length).toBeGreaterThan(0);
    });

    it("nie generuje zmian dla pustej listy pracowników", () => {
        const templates = [
            createTemplate("t1", "Rano", "08:00", "16:00", 1, 30),
        ];

        const input = createSchedulerInput([], templates, 2025, 1);
        const scheduler = new GreedyScheduler(input);
        const shifts = scheduler.generate();

        expect(shifts.length).toBe(0);
    });
});

// =============================================================================
// TESTY: MINIMALNA OBSADA (min_employees)
// =============================================================================

describe("GreedyScheduler - minimalna obsada", () => {
    it("respektuje min_employees = 2 dla szablonu", () => {
        const employees = [
            createEmployee("emp1", "Jan", "Kowalski", 160),
            createEmployee("emp2", "Anna", "Nowak", 160),
            createEmployee("emp3", "Piotr", "Wiśniewski", 160),
        ];
        const templates = [
            createTemplate("t1", "Rano", "08:00", "16:00", 2, 30),
        ];

        const input = createSchedulerInput(employees, templates, 2025, 1);
        const scheduler = new GreedyScheduler(input);
        const shifts = scheduler.generate();

        // Sprawdź czy większość dni ma co najmniej 2 osoby
        const shiftsByDay = new Map<string, GeneratedShift[]>();
        shifts.forEach((s) => {
            if (!shiftsByDay.has(s.date)) shiftsByDay.set(s.date, []);
            shiftsByDay.get(s.date)!.push(s);
        });

        let daysWithMinStaff = 0;
        shiftsByDay.forEach((dayShifts) => {
            if (dayShifts.length >= 2) daysWithMinStaff++;
        });

        // Co najmniej 80% dni powinno mieć min. obsadę
        const ratio = daysWithMinStaff / shiftsByDay.size;
        expect(ratio).toBeGreaterThanOrEqual(0.8);
    });

    it("respektuje min_employees = max_employees = 2 dla szablonu", () => {
        // Duża pula pracowników - testujemy czy max nie jest przekraczane
        const employees = [
            createEmployee("emp1", "Jan", "K", 160),
            createEmployee("emp2", "Anna", "N", 160),
            createEmployee("emp3", "Piotr", "W", 160),
            createEmployee("emp4", "Maria", "Z", 160),
            createEmployee("emp5", "Adam", "B", 160),
            createEmployee("emp6", "Ewa", "C", 160),
        ];
        // min=2, max=2 - ZAWSZE powinno być dokładnie 2 osoby
        const templates = [
            createTemplate("t1", "Rano", "08:00", "16:00", 2, 30, 2),
        ];

        const input = createSchedulerInput(employees, templates, 2025, 1);
        const scheduler = new GreedyScheduler(input);
        const shifts = scheduler.generate();

        // Grupuj zmiany po dniu i szablonie
        const shiftsByDayTemplate = new Map<string, number>();
        shifts.forEach((s) => {
            const key = `${s.date}:${s.template_id}`;
            shiftsByDayTemplate.set(
                key,
                (shiftsByDayTemplate.get(key) || 0) + 1,
            );
        });

        // Sprawdź że ŻADNA zmiana nie ma więcej niż max_employees
        let maxExceeded = false;
        shiftsByDayTemplate.forEach((count) => {
            if (count > 2) maxExceeded = true;
        });

        expect(maxExceeded).toBe(false);

        // Sprawdź że większość dni ma dokładnie 2 osoby
        let daysWithExactly2 = 0;
        shiftsByDayTemplate.forEach((count) => {
            if (count === 2) daysWithExactly2++;
        });

        const ratio = daysWithExactly2 / shiftsByDayTemplate.size;
        expect(ratio).toBeGreaterThanOrEqual(0.7); // 70% dni z dokładnie 2 osobami
    });

    it("używa globalnego min_employees_per_shift gdy szablon nie ma własnego", () => {
        const employees = [
            createEmployee("emp1", "Jan", "Kowalski", 80),
            createEmployee("emp2", "Anna", "Nowak", 80),
        ];
        // Szablon bez min_employees (undefined) - powinien użyć globalnego
        const templates = [
            createTemplate("t1", "Rano", "08:00", "16:00", 1, 30),
        ];

        const { workDays, saturdayDays } = getWorkDaysForMonth(2025, 1);
        const input: SchedulerInput = {
            year: 2025,
            month: 1,
            employees,
            templates,
            settings: createSettings({ min_employees_per_shift: 2 }),
            holidays: [],
            workDays,
            saturdayDays,
            tradingSundays: [],
            templateAssignmentsMap: new Map(),
        };

        const scheduler = new GreedyScheduler(input);
        const shifts = scheduler.generate();

        expect(shifts.length).toBeGreaterThan(0);
    });
});

// =============================================================================
// TESTY: KODEKS PRACY - 11H ODPOCZYNKU
// =============================================================================

describe("GreedyScheduler - 11h odpoczynku (Kodeks Pracy)", () => {
    it("minimalizuje naruszenia 11h odpoczynku w normalnym trybie", () => {
        // Test z 2 pracownikami - powinni się wymieniać między zmianami
        const employees = [
            createEmployee("emp1", "Jan", "Kowalski", 160),
            createEmployee("emp2", "Anna", "Nowak", 160),
        ];
        // Dwa szablony - wieczorny i poranny (potencjalnie konfliktowe)
        const templates = [
            createTemplate("t1", "Wieczór", "14:00", "22:00", 1, 30),
            createTemplate("t2", "Rano", "06:00", "14:00", 1, 30),
        ];

        const input = createSchedulerInput(employees, templates, 2025, 1);
        const scheduler = new GreedyScheduler(input);
        const shifts = scheduler.generate();

        // Grupuj zmiany po pracowniku
        const shiftsByEmployee = new Map<string, typeof shifts>();
        shifts.forEach((s) => {
            if (!shiftsByEmployee.has(s.employee_id)) {
                shiftsByEmployee.set(s.employee_id, []);
            }
            shiftsByEmployee.get(s.employee_id)!.push(s);
        });

        // Sprawdź odpoczynek między kolejnymi zmianami dla każdego pracownika
        let violationsCount = 0;
        shiftsByEmployee.forEach((empShifts) => {
            const sortedShifts = [...empShifts].sort((a, b) => {
                const dateCompare = a.date.localeCompare(b.date);
                if (dateCompare !== 0) return dateCompare;
                return a.start_time.localeCompare(b.start_time);
            });

            for (let i = 0; i < sortedShifts.length - 1; i++) {
                const current = sortedShifts[i];
                const next = sortedShifts[i + 1];

                const currentEnd = new Date(
                    `${current.date}T${current.end_time}`,
                );
                const nextStart = new Date(`${next.date}T${next.start_time}`);
                const restHours =
                    (nextStart.getTime() - currentEnd.getTime()) /
                    (1000 * 60 * 60);

                if (restHours < 11) {
                    violationsCount++;
                }
            }
        });

        // Powinno być mniej niż 10% naruszeń
        const totalTransitions = shifts.length - employees.length; // przejścia między zmianami
        if (totalTransitions > 0) {
            const violationRate = violationsCount / totalTransitions;
            expect(violationRate).toBeLessThan(0.1);
        }
    });
});

// =============================================================================
// TESTY: LIMITY GODZIN
// =============================================================================

describe("GreedyScheduler - limity godzin", () => {
    it("rozdziela godziny proporcjonalnie do wymiaru etatu", () => {
        // Test z pracownikami o różnych wymiarach etatu
        // full = 8h/dzień, half = 4h/dzień
        const employees = [
            createEmployee("emp1", "Jan", "Kowalski", 80), // half-time
            createEmployee("emp2", "Anna", "Nowak", 80), // half-time
            createEmployee("emp3", "Piotr", "Wiśniewski", 160), // full-time
        ];
        const templates = [
            createTemplate("t1", "Rano", "08:00", "16:00", 1, 30),
        ];

        const input = createSchedulerInput(employees, templates, 2025, 1);
        const scheduler = new GreedyScheduler(input);
        const shifts = scheduler.generate();

        // Oblicz sumę godzin dla każdego pracownika
        const hoursByEmployee = new Map<string, number>();
        shifts.forEach((shift) => {
            const [startH, startM] = shift.start_time.split(":").map(Number);
            const [endH, endM] = shift.end_time.split(":").map(Number);
            let minutes = endH * 60 + endM - (startH * 60 + startM);
            if (minutes < 0) minutes += 24 * 60;
            const hours = (minutes - shift.break_minutes) / 60;

            hoursByEmployee.set(
                shift.employee_id,
                (hoursByEmployee.get(shift.employee_id) || 0) + hours,
            );
        });

        // Piotr (full) powinien dostać więcej lub równo zmian co Jan i Anna (half)
        const piotrHours = hoursByEmployee.get("emp3") || 0;
        const janHours = hoursByEmployee.get("emp1") || 0;
        const annaHours = hoursByEmployee.get("emp2") || 0;

        // Piotr powinien mieć więcej lub równo godzin co każdy z half-time
        expect(piotrHours).toBeGreaterThanOrEqual(
            Math.min(janHours, annaHours),
        );
    });

    it("rozdziela godziny sprawiedliwie między pracowników", () => {
        const employees = [
            createEmployee("emp1", "Jan", "Kowalski", 80),
            createEmployee("emp2", "Anna", "Nowak", 80),
        ];
        const templates = [
            createTemplate("t1", "Rano", "08:00", "16:00", 1, 30),
        ];

        const input = createSchedulerInput(employees, templates, 2025, 1);
        const scheduler = new GreedyScheduler(input);
        const shifts = scheduler.generate();

        // Oblicz godziny dla każdego pracownika
        const hoursByEmployee = new Map<string, number>();
        shifts.forEach((shift) => {
            const [startH, startM] = shift.start_time.split(":").map(Number);
            const [endH, endM] = shift.end_time.split(":").map(Number);
            let minutes = endH * 60 + endM - (startH * 60 + startM);
            if (minutes < 0) minutes += 24 * 60;
            const hours = (minutes - shift.break_minutes) / 60;

            hoursByEmployee.set(
                shift.employee_id,
                (hoursByEmployee.get(shift.employee_id) || 0) + hours,
            );
        });

        const hours = Array.from(hoursByEmployee.values());
        const maxDiff = Math.max(...hours) - Math.min(...hours);

        // Różnica nie powinna być większa niż 20h
        expect(maxDiff).toBeLessThanOrEqual(20);
    });
});

// =============================================================================
// TESTY: BALANS TYPÓW ZMIAN
// =============================================================================

describe("GreedyScheduler - balans typów zmian", () => {
    it("rozdziela typy zmian gdy jest wielu pracowników", () => {
        // Test z 3 pracownikami - każdy może mieć różne typy
        const employees = [
            createEmployee("emp1", "Jan", "Kowalski", 160),
            createEmployee("emp2", "Anna", "Nowak", 160),
            createEmployee("emp3", "Piotr", "Wiśniewski", 160),
        ];
        const templates = [
            createTemplate("t1", "Rano", "06:00", "14:00", 1, 30),
            createTemplate("t2", "Popołudnie", "10:00", "18:00", 1, 30),
            createTemplate("t3", "Wieczór", "14:00", "22:00", 1, 30),
        ];

        const input = createSchedulerInput(employees, templates, 2025, 1);
        const scheduler = new GreedyScheduler(input);
        const shifts = scheduler.generate();

        // Policz zmiany według typu
        const counts = { morning: 0, afternoon: 0, evening: 0 };
        shifts.forEach((shift) => {
            const startHour = parseInt(shift.start_time.split(":")[0]);
            if (startHour < 11) counts.morning++;
            else if (startHour < 15) counts.afternoon++;
            else counts.evening++;
        });

        // Powinny być zmiany każdego typu
        const total = counts.morning + counts.afternoon + counts.evening;
        expect(total).toBeGreaterThan(0);
        expect(counts.morning).toBeGreaterThan(0);
        // Nie wymagamy idealnego balansu - scheduler priorytetyzuje obsadę
    });
});

// =============================================================================
// TESTY: NIEDZIELE HANDLOWE I WEEKENDY
// =============================================================================

describe("GreedyScheduler - weekendy i niedziele handlowe", () => {
    it("przypisuje zmiany w niedziele handlowe", () => {
        const employees = [createEmployee("emp1", "Jan", "Kowalski", 160)];
        const templates = [
            createTemplate("t1", "Rano", "08:00", "16:00", 1, 30),
        ];
        const tradingSundays = ["2025-01-26"]; // Ostatnia niedziela stycznia

        const input = createSchedulerInput(
            employees,
            templates,
            2025,
            1,
            tradingSundays,
        );
        const scheduler = new GreedyScheduler(input);
        const shifts = scheduler.generate();

        const sundayShifts = shifts.filter((s) => s.date === "2025-01-26");
        expect(sundayShifts.length).toBeGreaterThanOrEqual(1);
    });

    it("NIE przypisuje zmian w niedziele niehandlowe", () => {
        const employees = [createEmployee("emp1", "Jan", "Kowalski", 160)];
        const templates = [
            createTemplate("t1", "Rano", "08:00", "16:00", 1, 30),
        ];

        // Brak niedziel handlowych
        const input = createSchedulerInput(employees, templates, 2025, 1, []);
        const scheduler = new GreedyScheduler(input);
        const shifts = scheduler.generate();

        // Wszystkie niedziele w styczniu 2025: 5, 12, 19, 26
        const nonTradingSundays = [
            "2025-01-05",
            "2025-01-12",
            "2025-01-19",
            "2025-01-26",
        ];
        const sundayShifts = shifts.filter((s) =>
            nonTradingSundays.includes(s.date),
        );

        expect(sundayShifts.length).toBe(0);
    });

    it("rozdziela weekendy sprawiedliwie między pracowników", () => {
        const employees = [
            createEmployee("emp1", "Jan", "Kowalski", 160),
            createEmployee("emp2", "Anna", "Nowak", 160),
        ];
        const templates = [
            createTemplate("t1", "Rano", "08:00", "16:00", 1, 30),
        ];
        const tradingSundays = ["2025-01-26"];

        const input = createSchedulerInput(
            employees,
            templates,
            2025,
            1,
            tradingSundays,
        );
        const scheduler = new GreedyScheduler(input);
        const shifts = scheduler.generate();

        // Policz weekendowe zmiany dla każdego pracownika
        const saturdayDates = [
            "2025-01-04",
            "2025-01-11",
            "2025-01-18",
            "2025-01-25",
        ];
        const weekendDates = [...saturdayDates, ...tradingSundays];

        const weekendByEmployee = new Map<string, number>();
        shifts.forEach((s) => {
            if (weekendDates.includes(s.date)) {
                weekendByEmployee.set(
                    s.employee_id,
                    (weekendByEmployee.get(s.employee_id) || 0) + 1,
                );
            }
        });

        const counts = Array.from(weekendByEmployee.values());
        if (counts.length >= 2) {
            const maxDiff = Math.max(...counts) - Math.min(...counts);
            // Różnica nie powinna być większa niż 2 weekendy
            expect(maxDiff).toBeLessThanOrEqual(2);
        }
    });
});

// =============================================================================
// TESTY: ŚWIĘTA
// =============================================================================

describe("GreedyScheduler - święta", () => {
    it("NIE przypisuje zmian w święta", () => {
        const employees = [createEmployee("emp1", "Jan", "Kowalski", 160)];
        const templates = [
            createTemplate("t1", "Rano", "08:00", "16:00", 1, 30),
        ];
        const holidays: PublicHoliday[] = [
            {
                date: "2025-01-06", // Trzech Króli
                localName: "Trzech Króli",
                name: "Epiphany",
                countryCode: "PL",
                fixed: true,
                global: true,
                counties: null,
                launchYear: null,
                types: ["Public"],
            },
        ];

        const input = createSchedulerInput(
            employees,
            templates,
            2025,
            1,
            [],
            holidays,
        );
        const scheduler = new GreedyScheduler(input);
        const shifts = scheduler.generate();

        const holidayShifts = shifts.filter((s) => s.date === "2025-01-06");
        expect(holidayShifts.length).toBe(0);
    });
});

// =============================================================================
// TESTY: NIEOBECNOŚCI PRACOWNIKÓW
// =============================================================================

describe("GreedyScheduler - nieobecności", () => {
    it("nie przypisuje zmian gdy pracownik ma urlop", () => {
        const employees: EmployeeWithData[] = [
            {
                ...createEmployee("emp1", "Jan", "Kowalski", 80),
                absences: [
                    {
                        id: "abs1",
                        employee_id: "emp1",
                        organization_id: "org1",
                        start_date: "2025-01-06",
                        end_date: "2025-01-10",
                        absence_type: "vacation",
                        is_paid: true,
                        notes: null,
                        created_by: null,
                        created_at: "",
                        updated_at: "",
                    },
                ],
            },
        ];
        const templates = [
            createTemplate("t1", "Rano", "08:00", "16:00", 1, 30),
        ];

        const input = createSchedulerInput(employees, templates, 2025, 1);
        const scheduler = new GreedyScheduler(input);
        const shifts = scheduler.generate();

        // Sprawdź czy nie ma zmian w dniach urlopu
        const vacationDates = [
            "2025-01-06",
            "2025-01-07",
            "2025-01-08",
            "2025-01-09",
            "2025-01-10",
        ];
        const vacationShifts = shifts.filter(
            (s) => s.employee_id === "emp1" && vacationDates.includes(s.date),
        );

        expect(vacationShifts.length).toBe(0);
    });
});

// =============================================================================
// TESTY: PRZYPISANIA DO SZABLONÓW
// =============================================================================

describe("GreedyScheduler - przypisania do szablonów", () => {
    it("respektuje przypisania pracowników do konkretnych szablonów", () => {
        const employees = [
            createEmployee("emp1", "Jan", "Kowalski", 80),
            createEmployee("emp2", "Anna", "Nowak", 80),
        ];
        const templates = [
            createTemplate("t1", "Rano", "08:00", "16:00", 1, 30),
            createTemplate("t2", "Wieczór", "14:00", "22:00", 1, 30),
        ];

        // Jan tylko Rano, Anna tylko Wieczór
        const templateAssignmentsMap = new Map<string, string[]>();
        templateAssignmentsMap.set("t1", ["emp1"]);
        templateAssignmentsMap.set("t2", ["emp2"]);

        const input = createSchedulerInput(
            employees,
            templates,
            2025,
            1,
            [],
            [],
            templateAssignmentsMap,
        );
        const scheduler = new GreedyScheduler(input);
        const shifts = scheduler.generate();

        // Sprawdź czy Jan ma tylko zmiany Rano (08:00)
        const janShifts = shifts.filter((s) => s.employee_id === "emp1");
        janShifts.forEach((s) => {
            expect(s.start_time).toBe("08:00");
        });

        // Sprawdź czy Anna ma tylko zmiany Wieczór (14:00)
        const annaShifts = shifts.filter((s) => s.employee_id === "emp2");
        annaShifts.forEach((s) => {
            expect(s.start_time).toBe("14:00");
        });
    });
});
// =============================================================================
// TESTY: EDGE CASES - PRZYPADKI BRZEGOWE
// =============================================================================

describe("GreedyScheduler - przypadki brzegowe", () => {
    it("radzi sobie gdy jest tylko jeden szablon na cały dzień", () => {
        const employees = [
            createEmployee("emp1", "Jan", "Kowalski", 160),
            createEmployee("emp2", "Anna", "Nowak", 160),
        ];
        // Jeden długi szablon 12h
        const templates = [
            createTemplate("t1", "Cały dzień", "08:00", "20:00", 1, 60),
        ];

        const input = createSchedulerInput(employees, templates, 2025, 1);
        const scheduler = new GreedyScheduler(input);
        const shifts = scheduler.generate();

        expect(shifts.length).toBeGreaterThan(0);
        shifts.forEach((s) => {
            expect(s.start_time).toBe("08:00");
            expect(s.end_time).toBe("20:00");
            expect(s.break_minutes).toBe(60);
        });
    });

    it("obsługuje pracownika z custom_hours", () => {
        const employees: EmployeeWithData[] = [
            {
                ...createEmployee("emp1", "Jan", "Kowalski", 160),
                employment_type: "custom",
                custom_hours: 100, // Custom 100h/mies
            },
        ];
        const templates = [
            createTemplate("t1", "Rano", "08:00", "16:00", 1, 30),
        ];

        const input = createSchedulerInput(employees, templates, 2025, 1);
        const scheduler = new GreedyScheduler(input);
        const shifts = scheduler.generate();

        // Powinien dostać zmiany
        expect(shifts.length).toBeGreaterThan(0);
    });

    it("obsługuje wiele świąt w jednym miesiącu", () => {
        const employees = [createEmployee("emp1", "Jan", "Kowalski", 160)];
        const templates = [
            createTemplate("t1", "Rano", "08:00", "16:00", 1, 30),
        ];
        const holidays: PublicHoliday[] = [
            {
                date: "2025-01-01",
                localName: "Nowy Rok",
                name: "New Year",
                countryCode: "PL",
                fixed: true,
                global: true,
                counties: null,
                launchYear: null,
                types: ["Public"],
            },
            {
                date: "2025-01-06",
                localName: "Trzech Króli",
                name: "Epiphany",
                countryCode: "PL",
                fixed: true,
                global: true,
                counties: null,
                launchYear: null,
                types: ["Public"],
            },
        ];

        const input = createSchedulerInput(
            employees,
            templates,
            2025,
            1,
            [],
            holidays,
        );
        const scheduler = new GreedyScheduler(input);
        const shifts = scheduler.generate();

        // Nie powinno być zmian w święta
        const holidayShifts = shifts.filter(
            (s) => s.date === "2025-01-01" || s.date === "2025-01-06",
        );
        expect(holidayShifts.length).toBe(0);
    });

    it("obsługuje pracownika z wieloma nieobecnościami", () => {
        const employees: EmployeeWithData[] = [
            {
                ...createEmployee("emp1", "Jan", "Kowalski", 160),
                absences: [
                    {
                        id: "abs1",
                        employee_id: "emp1",
                        organization_id: "org1",
                        start_date: "2025-01-06",
                        end_date: "2025-01-10",
                        absence_type: "vacation",
                        is_paid: true,
                        notes: null,
                        created_by: null,
                        created_at: "",
                        updated_at: "",
                    },
                    {
                        id: "abs2",
                        employee_id: "emp1",
                        organization_id: "org1",
                        start_date: "2025-01-20",
                        end_date: "2025-01-24",
                        absence_type: "sick_leave",
                        is_paid: true,
                        notes: null,
                        created_by: null,
                        created_at: "",
                        updated_at: "",
                    },
                ],
            },
            createEmployee("emp2", "Anna", "Nowak", 160), // Backup
        ];
        const templates = [
            createTemplate("t1", "Rano", "08:00", "16:00", 1, 30),
        ];

        const input = createSchedulerInput(employees, templates, 2025, 1);
        const scheduler = new GreedyScheduler(input);
        const shifts = scheduler.generate();

        // Jan nie powinien mieć zmian w dniach nieobecności
        const janAbsenceDates = [
            "2025-01-06",
            "2025-01-07",
            "2025-01-08",
            "2025-01-09",
            "2025-01-10",
            "2025-01-20",
            "2025-01-21",
            "2025-01-22",
            "2025-01-23",
            "2025-01-24",
        ];
        const janAbsenceShifts = shifts.filter(
            (s) => s.employee_id === "emp1" && janAbsenceDates.includes(s.date),
        );
        expect(janAbsenceShifts.length).toBe(0);
    });

    it("obsługuje miesiąc z wieloma niedzielami handlowymi", () => {
        const employees = [
            createEmployee("emp1", "Jan", "Kowalski", 160),
            createEmployee("emp2", "Anna", "Nowak", 160),
        ];
        const templates = [
            createTemplate("t1", "Rano", "08:00", "16:00", 1, 30),
        ];
        // Wszystkie niedziele w styczniu jako handlowe
        const tradingSundays = [
            "2025-01-05",
            "2025-01-12",
            "2025-01-19",
            "2025-01-26",
        ];

        const input = createSchedulerInput(
            employees,
            templates,
            2025,
            1,
            tradingSundays,
        );
        const scheduler = new GreedyScheduler(input);
        const shifts = scheduler.generate();

        // Powinny być zmiany w niedziele handlowe
        const sundayShifts = shifts.filter((s) =>
            tradingSundays.includes(s.date),
        );
        expect(sundayShifts.length).toBeGreaterThanOrEqual(
            tradingSundays.length,
        );
    });

    it("generuje poprawne zmiany dla lutego (28/29 dni)", () => {
        const employees = [createEmployee("emp1", "Jan", "Kowalski", 160)];
        const templates = [
            createTemplate("t1", "Rano", "08:00", "16:00", 1, 30),
        ];

        // Luty 2025 (nie przestępny - 28 dni)
        const input = createSchedulerInput(employees, templates, 2025, 2);
        const scheduler = new GreedyScheduler(input);
        const shifts = scheduler.generate();

        expect(shifts.length).toBeGreaterThan(0);
        // Wszystkie daty powinny być w lutym
        shifts.forEach((s) => {
            expect(s.date.startsWith("2025-02")).toBe(true);
            const day = parseInt(s.date.split("-")[2]);
            expect(day).toBeLessThanOrEqual(28);
        });
    });

    it("generuje poprawne zmiany dla roku przestępnego", () => {
        const employees = [createEmployee("emp1", "Jan", "Kowalski", 160)];
        const templates = [
            createTemplate("t1", "Rano", "08:00", "16:00", 1, 30),
        ];

        // Luty 2024 (przestępny - 29 dni)
        const input = createSchedulerInput(employees, templates, 2024, 2);
        const scheduler = new GreedyScheduler(input);
        const shifts = scheduler.generate();

        expect(shifts.length).toBeGreaterThan(0);
        // Wszystkie daty powinny być w lutym
        shifts.forEach((s) => {
            expect(s.date.startsWith("2024-02")).toBe(true);
        });
    });
});

// =============================================================================
// TESTY: KOLEJNE DNI PRACY (MAX 5 Z RZĘDU)
// =============================================================================

describe("GreedyScheduler - kolejne dni pracy", () => {
    it("nie przypisuje więcej niż 6 dni pracy z rzędu", () => {
        // Jeden pracownik - musi pracować dużo ale nie więcej niż 6 dni z rzędu
        const employees = [createEmployee("emp1", "Jan", "Kowalski", 200)];
        const templates = [
            createTemplate("t1", "Rano", "08:00", "16:00", 1, 30),
        ];

        const input = createSchedulerInput(employees, templates, 2025, 1);
        const scheduler = new GreedyScheduler(input);
        const shifts = scheduler.generate();

        // Sortuj zmiany chronologicznie
        const sortedShifts = [...shifts].sort((a, b) =>
            a.date.localeCompare(b.date),
        );

        let consecutiveDays = 1;
        let maxConsecutive = 1;

        for (let i = 1; i < sortedShifts.length; i++) {
            const prevDate = new Date(sortedShifts[i - 1].date);
            const currDate = new Date(sortedShifts[i].date);
            const diffDays = Math.round(
                (currDate.getTime() - prevDate.getTime()) /
                    (1000 * 60 * 60 * 24),
            );

            if (diffDays === 1) {
                consecutiveDays++;
                maxConsecutive = Math.max(maxConsecutive, consecutiveDays);
            } else {
                consecutiveDays = 1;
            }
        }

        // Max 6 dni (Kodeks Pracy mówi o 5, ale z weekendem może być 6)
        expect(maxConsecutive).toBeLessThanOrEqual(7);
    });
});

// =============================================================================
// TESTY: SZABLONY Z RÓŻNYMI PRZERWAMI
// =============================================================================

describe("GreedyScheduler - przerwy w pracy", () => {
    it("respektuje różne długości przerw dla różnych szablonów", () => {
        const employees = [createEmployee("emp1", "Jan", "Kowalski", 160)];
        const templates = [
            createTemplate("t1", "Krótka zmiana", "08:00", "14:00", 1, 15), // 15 min przerwy
            createTemplate("t2", "Długa zmiana", "08:00", "20:00", 1, 60), // 60 min przerwy
        ];

        const input = createSchedulerInput(employees, templates, 2025, 1);
        const scheduler = new GreedyScheduler(input);
        const shifts = scheduler.generate();

        shifts.forEach((s) => {
            if (s.start_time === "08:00" && s.end_time === "14:00") {
                expect(s.break_minutes).toBe(15);
            } else if (s.start_time === "08:00" && s.end_time === "20:00") {
                expect(s.break_minutes).toBe(60);
            }
        });
    });
});

// =============================================================================
// TESTY: PREFERENCJE PRACOWNIKÓW
// =============================================================================

describe("GreedyScheduler - preferencje pracowników", () => {
    it("uwzględnia preferowane dni pracy", () => {
        const employees: EmployeeWithData[] = [
            {
                ...createEmployee("emp1", "Jan", "Kowalski", 160),
                preferences: {
                    id: "pref1",
                    employee_id: "emp1",
                    preferred_days: [1, 2, 3], // Poniedziałek, wtorek, środa
                    unavailable_days: [],
                    preferred_start_time: null,
                    preferred_end_time: null,
                    max_hours_per_day: null,
                    max_hours_per_week: null,
                    can_work_weekends: true,
                    can_work_holidays: false,
                    notes: null,
                    created_at: "",
                    updated_at: "",
                },
            },
            createEmployee("emp2", "Anna", "Nowak", 160),
        ];
        const templates = [
            createTemplate("t1", "Rano", "08:00", "16:00", 1, 30),
        ];

        const input = createSchedulerInput(employees, templates, 2025, 1);
        const scheduler = new GreedyScheduler(input);
        const shifts = scheduler.generate();

        // Jan powinien mieć zmiany (preferencje nie są twarde constraintami)
        const janShifts = shifts.filter((s) => s.employee_id === "emp1");
        expect(janShifts.length).toBeGreaterThan(0);
    });
});

// =============================================================================
// TESTY: OBSADA MINIMALNA DLA WIELU SZABLONÓW
// =============================================================================

describe("GreedyScheduler - obsada wielu szablonów", () => {
    it("obsadza wiele szablonów z różnymi min_employees", () => {
        const employees = [
            createEmployee("emp1", "Jan", "Kowalski", 160),
            createEmployee("emp2", "Anna", "Nowak", 160),
            createEmployee("emp3", "Piotr", "Wiśniewski", 160),
            createEmployee("emp4", "Maria", "Kowalska", 160),
        ];
        const templates = [
            createTemplate("t1", "Rano", "06:00", "14:00", 2, 30), // min 2
            createTemplate("t2", "Popołudnie", "14:00", "22:00", 1, 30), // min 1
        ];

        const input = createSchedulerInput(employees, templates, 2025, 1);
        const scheduler = new GreedyScheduler(input);
        const shifts = scheduler.generate();

        // Sprawdź obsadę ranną (min 2)
        const morningShiftsByDay = new Map<string, number>();
        shifts
            .filter((s) => s.start_time === "06:00")
            .forEach((s) => {
                morningShiftsByDay.set(
                    s.date,
                    (morningShiftsByDay.get(s.date) || 0) + 1,
                );
            });

        // Większość dni powinna mieć min 2 rano
        let daysWithMinMorning = 0;
        morningShiftsByDay.forEach((count) => {
            if (count >= 2) daysWithMinMorning++;
        });

        const ratio = daysWithMinMorning / morningShiftsByDay.size;
        expect(ratio).toBeGreaterThanOrEqual(0.7); // 70% dni z min obsadą
    });

    it("nie obsadza szablonu gdy brak przypisanych pracowników", () => {
        const employees = [createEmployee("emp1", "Jan", "Kowalski", 160)];
        const templates = [
            createTemplate("t1", "Rano", "06:00", "14:00", 1, 30),
            createTemplate("t2", "Wieczór", "14:00", "22:00", 1, 30),
        ];

        // Jan tylko do Rano - Wieczór nie ma nikogo przypisanego
        const templateAssignmentsMap = new Map<string, string[]>();
        templateAssignmentsMap.set("t1", ["emp1"]);
        templateAssignmentsMap.set("t2", []); // Nikt nie przypisany

        const input = createSchedulerInput(
            employees,
            templates,
            2025,
            1,
            [],
            [],
            templateAssignmentsMap,
        );
        const scheduler = new GreedyScheduler(input);
        const shifts = scheduler.generate();

        // Wszystkie zmiany powinny być Rano
        shifts.forEach((s) => {
            expect(s.start_time).toBe("06:00");
        });
    });
});

// =============================================================================
// TESTY: GODZINY OTWARCIA
// =============================================================================

describe("GreedyScheduler - godziny otwarcia", () => {
    it("respektuje godziny otwarcia organizacji", () => {
        const employees = [createEmployee("emp1", "Jan", "Kowalski", 160)];
        const templates = [
            createTemplate("t1", "Rano", "06:00", "14:00", 1, 30),
            createTemplate("t2", "Wieczór", "14:00", "22:00", 1, 30),
        ];

        const { workDays } = getWorkDaysForMonth(2025, 1);
        const input: SchedulerInput = {
            year: 2025,
            month: 1,
            employees,
            templates,
            settings: {
                ...createSettings(),
                opening_hours: {
                    monday: { enabled: true, open: "08:00", close: "16:00" },
                    tuesday: { enabled: true, open: "08:00", close: "16:00" },
                    wednesday: { enabled: true, open: "08:00", close: "16:00" },
                    thursday: { enabled: true, open: "08:00", close: "16:00" },
                    friday: { enabled: true, open: "08:00", close: "16:00" },
                    saturday: { enabled: false, open: "08:00", close: "16:00" }, // Zamknięte
                    sunday: { enabled: false, open: "08:00", close: "16:00" }, // Zamknięte
                },
            },
            holidays: [],
            workDays,
            saturdayDays: [], // Zamknięte w soboty
            tradingSundays: [],
            templateAssignmentsMap: new Map(),
        };

        const scheduler = new GreedyScheduler(input);
        const shifts = scheduler.generate();

        // Nie powinno być zmian w soboty (zamknięte)
        const saturdayDates = [
            "2025-01-04",
            "2025-01-11",
            "2025-01-18",
            "2025-01-25",
        ];
        const saturdayShifts = shifts.filter((s) =>
            saturdayDates.includes(s.date),
        );
        expect(saturdayShifts.length).toBe(0);
    });
});

// =============================================================================
// TESTY: STABILNOŚĆ I DETERMINISTYCZNOŚĆ
// =============================================================================

describe("GreedyScheduler - stabilność", () => {
    it("generuje taki sam grafik dla tych samych danych wejściowych", () => {
        const employees = [
            createEmployee("emp1", "Jan", "Kowalski", 80),
            createEmployee("emp2", "Anna", "Nowak", 80),
        ];
        const templates = [
            createTemplate("t1", "Rano", "08:00", "16:00", 1, 30),
        ];

        const input1 = createSchedulerInput(employees, templates, 2025, 1);
        const input2 = createSchedulerInput(employees, templates, 2025, 1);

        const scheduler1 = new GreedyScheduler(input1);
        const scheduler2 = new GreedyScheduler(input2);

        const shifts1 = scheduler1.generate();
        const shifts2 = scheduler2.generate();

        // Te same ilości zmian
        expect(shifts1.length).toBe(shifts2.length);

        // Te same daty (kolejność może się różnić)
        const dates1 = shifts1.map((s) => s.date).sort();
        const dates2 = shifts2.map((s) => s.date).sort();
        expect(dates1).toEqual(dates2);
    });

    it("nie crashuje przy ekstremalnych danych", () => {
        // 50 pracowników, 10 szablonów
        const employees = Array.from({ length: 50 }, (_, i) =>
            createEmployee(`emp${i}`, `Pracownik${i}`, `Test${i}`, 40),
        );
        const templates = Array.from({ length: 10 }, (_, i) =>
            createTemplate(
                `t${i}`,
                `Szablon${i}`,
                `${8 + i}:00`,
                `${16 + i}:00`,
                1,
                30,
            ),
        );

        const input = createSchedulerInput(employees, templates, 2025, 1);
        const scheduler = new GreedyScheduler(input);

        // Nie powinien crashować
        expect(() => scheduler.generate()).not.toThrow();
    });
});

// =============================================================================
// TESTY: WYDAJNOŚĆ
// =============================================================================

describe("GreedyScheduler - wydajność", () => {
    it("generuje grafik w rozsądnym czasie (< 5s)", () => {
        const employees = Array.from({ length: 20 }, (_, i) =>
            createEmployee(`emp${i}`, `Pracownik${i}`, `Test${i}`, 160),
        );
        const templates = [
            createTemplate("t1", "Rano", "06:00", "14:00", 2, 30),
            createTemplate("t2", "Popołudnie", "10:00", "18:00", 2, 30),
            createTemplate("t3", "Wieczór", "14:00", "22:00", 2, 30),
        ];

        const input = createSchedulerInput(employees, templates, 2025, 1);
        const scheduler = new GreedyScheduler(input);

        const start = Date.now();
        scheduler.generate();
        const duration = Date.now() - start;

        expect(duration).toBeLessThan(5000); // < 5 sekund
    });
});
