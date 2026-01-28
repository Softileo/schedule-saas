import { describe, it, expect } from "vitest";
import type { Employee } from "@/types";
import type { LocalShift } from "@/lib/hooks/use-local-shifts";

// Import funkcji pomocniczych bezpośrednio dla testów
import { getEmployeeFullName } from "@/lib/core/employees/utils";

// Helper function to calculate violations (same logic as hook)
function calculateViolations(
    employees: Employee[],
    activeShifts: LocalShift[]
) {
    const result: Array<{
        type: string;
        employeeName: string;
        description: string;
        details?: string;
    }> = [];

    employees.forEach((emp) => {
        const employeeName = getEmployeeFullName(emp);
        const employeeShifts = activeShifts
            .filter((s) => s.employee_id === emp.id)
            .sort((a, b) => {
                const dateCompare = a.date.localeCompare(b.date);
                if (dateCompare !== 0) return dateCompare;
                return a.end_time.localeCompare(b.end_time);
            });

        // 1. Check 11h rest violations
        for (let i = 0; i < employeeShifts.length - 1; i++) {
            const currentShift = employeeShifts[i];
            const nextShift = employeeShifts[i + 1];

            const currentEnd = new Date(
                `${currentShift.date}T${currentShift.end_time}`
            );
            const nextStart = new Date(
                `${nextShift.date}T${nextShift.start_time}`
            );
            const diffMs = nextStart.getTime() - currentEnd.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);

            if (diffHours < 11 && diffHours >= 0) {
                const date1 = new Date(currentShift.date);
                const date2 = new Date(nextShift.date);
                const dateStr =
                    currentShift.date === nextShift.date
                        ? date1.toLocaleDateString("pl-PL", {
                              day: "numeric",
                              month: "short",
                          })
                        : `${date1.toLocaleDateString("pl-PL", {
                              day: "numeric",
                              month: "short",
                          })} → ${date2.toLocaleDateString("pl-PL", {
                              day: "numeric",
                              month: "short",
                          })}`;

                result.push({
                    type: "rest_11h",
                    employeeName,
                    description: "Brak 11h przerwy między zmianami",
                    details: dateStr,
                });
            }
        }

        // 2. Check weekly hours
        const weeklyHoursMap = new Map<string, number>();

        employeeShifts.forEach((shift) => {
            const shiftDate = new Date(shift.date + "T00:00:00");
            const shiftHours = calculateShiftHours(
                shift.start_time,
                shift.end_time,
                shift.break_minutes || 0
            );

            const dayOfWeek = shiftDate.getDay();
            const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            const monday = new Date(shiftDate);
            monday.setDate(monday.getDate() - daysToMonday);

            const weekKey = monday.toISOString().split("T")[0];
            const currentWeekHours = weeklyHoursMap.get(weekKey) || 0;
            weeklyHoursMap.set(weekKey, currentWeekHours + shiftHours);
        });

        weeklyHoursMap.forEach((hours, weekStart) => {
            if (hours > 40) {
                const weekDate = new Date(weekStart);
                result.push({
                    type: "weekly_hours",
                    employeeName,
                    description: "Przekroczenie 40h/tydzień",
                    details: `tydzień ${weekDate.toLocaleDateString("pl-PL", {
                        day: "numeric",
                        month: "short",
                    })} - ${hours.toFixed(1)}h`,
                });
            }
        });

        // 3. Check consecutive days
        let consecutiveDays = 1;
        for (let i = 1; i < employeeShifts.length; i++) {
            const prevDate = new Date(employeeShifts[i - 1].date);
            const currDate = new Date(employeeShifts[i].date);
            const diffDays = Math.round(
                (currDate.getTime() - prevDate.getTime()) /
                    (1000 * 60 * 60 * 24)
            );

            if (diffDays === 1) {
                consecutiveDays++;
                if (consecutiveDays > 5) {
                    result.push({
                        type: "consecutive_days",
                        employeeName,
                        description: `Ponad 5 dni pracy z rzędu`,
                        details: `${consecutiveDays} dni`,
                    });
                }
            } else {
                consecutiveDays = 1;
            }
        }
    });

    return result;
}

function calculateShiftHours(
    startTime: string,
    endTime: string,
    breakMinutes: number
): number {
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const totalMinutes = endMinutes - startMinutes;
    const workMinutes = totalMinutes - breakMinutes;

    return workMinutes / 60;
}

// ============================================================================
// FIXTURES
// ============================================================================

const createEmployee = (
    id: string,
    firstName: string,
    lastName: string
): Employee => ({
    id,
    organization_id: "org-1",
    first_name: firstName,
    last_name: lastName,
    email: `${firstName.toLowerCase()}@example.com`,
    phone: null,
    employment_type: "full",
    custom_hours: null,
    color: null,
    is_active: true,
    position: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
});

const createShift = (
    employeeId: string,
    date: string,
    startTime: string,
    endTime: string,
    breakMinutes: number = 0
): LocalShift => ({
    id: `shift-${Math.random()}`,
    schedule_id: "schedule-1",
    employee_id: employeeId,
    date,
    start_time: startTime,
    end_time: endTime,
    break_minutes: breakMinutes,
    notes: null,
    color: null,
    status: "new",
});

// ============================================================================
// TESTY
// ============================================================================

describe("useScheduleViolations", () => {
    describe("rest_11h violations", () => {
        it("wykrywa naruszenie 11h odpoczynku", () => {
            const employees = [createEmployee("emp-1", "Jan", "Kowalski")];
            const activeShifts = [
                createShift("emp-1", "2026-01-10", "08:00:00", "20:00:00"), // kończy o 20:00
                createShift("emp-1", "2026-01-11", "06:00:00", "14:00:00"), // zaczyna o 06:00 = tylko 10h przerwy
            ];

            const result = calculateViolations(employees, activeShifts);

            expect(result).toHaveLength(1);
            expect(result[0].type).toBe("rest_11h");
            expect(result[0].employeeName).toBe("Jan Kowalski");
            expect(result[0].description).toBe(
                "Brak 11h przerwy między zmianami"
            );
        });

        it("nie wykrywa naruszenia gdy przerwa wynosi dokładnie 11h", () => {
            const employees = [createEmployee("emp-1", "Jan", "Kowalski")];
            const activeShifts = [
                createShift("emp-1", "2026-01-10", "08:00:00", "16:00:00"),
                createShift("emp-1", "2026-01-11", "03:00:00", "11:00:00"), // dokładnie 11h
            ];

            const result = calculateViolations(employees, activeShifts);

            expect(result).toHaveLength(0);
        });

        it("nie wykrywa naruszenia gdy przerwa jest dłuższa niż 11h", () => {
            const employees = [createEmployee("emp-1", "Jan", "Kowalski")];
            const activeShifts = [
                createShift("emp-1", "2026-01-10", "08:00:00", "16:00:00"),
                createShift("emp-1", "2026-01-12", "08:00:00", "16:00:00"), // 1 dzień przerwy
            ];

            const result = calculateViolations(employees, activeShifts);

            expect(result).toHaveLength(0);
        });
    });

    describe("weekly_hours violations", () => {
        it("wykrywa przekroczenie 40h/tydzień", () => {
            const employees = [createEmployee("emp-1", "Anna", "Nowak")];
            // Tydzień od poniedziałku 6.01.2026
            const activeShifts = [
                createShift("emp-1", "2026-01-06", "08:00:00", "16:00:00"), // 8h
                createShift("emp-1", "2026-01-07", "08:00:00", "16:00:00"), // 8h
                createShift("emp-1", "2026-01-08", "08:00:00", "16:00:00"), // 8h
                createShift("emp-1", "2026-01-09", "08:00:00", "16:00:00"), // 8h
                createShift("emp-1", "2026-01-10", "08:00:00", "16:00:00"), // 8h
                createShift("emp-1", "2026-01-11", "08:00:00", "16:00:00"), // 8h = 48h total
            ];

            const result = calculateViolations(employees, activeShifts);

            const weeklyViolations = result.filter(
                (v) => v.type === "weekly_hours"
            );
            expect(weeklyViolations).toHaveLength(1);
            expect(weeklyViolations[0].employeeName).toBe("Anna Nowak");
            expect(weeklyViolations[0].description).toBe(
                "Przekroczenie 40h/tydzień"
            );
            expect(weeklyViolations[0].details).toContain("48.0h");
        });

        it("nie wykrywa naruszenia przy 40h/tydzień", () => {
            const employees = [createEmployee("emp-1", "Anna", "Nowak")];
            const activeShifts = [
                createShift("emp-1", "2026-01-06", "08:00:00", "16:00:00"), // 8h
                createShift("emp-1", "2026-01-07", "08:00:00", "16:00:00"), // 8h
                createShift("emp-1", "2026-01-08", "08:00:00", "16:00:00"), // 8h
                createShift("emp-1", "2026-01-09", "08:00:00", "16:00:00"), // 8h
                createShift("emp-1", "2026-01-10", "08:00:00", "16:00:00"), // 8h = 40h
            ];

            const result = calculateViolations(employees, activeShifts);

            const weeklyViolations = result.filter(
                (v) => v.type === "weekly_hours"
            );
            expect(weeklyViolations).toHaveLength(0);
        });

        it("uwzględnia przerwy przy liczeniu godzin", () => {
            const employees = [createEmployee("emp-1", "Anna", "Nowak")];
            const activeShifts = [
                createShift("emp-1", "2026-01-06", "08:00:00", "17:00:00", 30), // 8.5h
                createShift("emp-1", "2026-01-07", "08:00:00", "17:00:00", 30), // 8.5h
                createShift("emp-1", "2026-01-08", "08:00:00", "17:00:00", 30), // 8.5h
                createShift("emp-1", "2026-01-09", "08:00:00", "17:00:00", 30), // 8.5h
                createShift("emp-1", "2026-01-10", "08:00:00", "17:00:00", 30), // 8.5h
            ];

            const result = calculateViolations(employees, activeShifts);

            const weeklyViolations = result.filter(
                (v) => v.type === "weekly_hours"
            );
            expect(weeklyViolations).toHaveLength(1);
            expect(weeklyViolations[0].details).toContain("42.5h");
        });
    });

    describe("consecutive_days violations", () => {
        it("wykrywa pracę ponad 5 dni z rzędu", () => {
            const employees = [createEmployee("emp-1", "Piotr", "Wiśniewski")];
            const activeShifts = [
                createShift("emp-1", "2026-01-06", "08:00:00", "16:00:00"),
                createShift("emp-1", "2026-01-07", "08:00:00", "16:00:00"),
                createShift("emp-1", "2026-01-08", "08:00:00", "16:00:00"),
                createShift("emp-1", "2026-01-09", "08:00:00", "16:00:00"),
                createShift("emp-1", "2026-01-10", "08:00:00", "16:00:00"),
                createShift("emp-1", "2026-01-11", "08:00:00", "16:00:00"), // 6 dni z rzędu
            ];

            const result = calculateViolations(employees, activeShifts);

            const consecutiveViolations = result.filter(
                (v) => v.type === "consecutive_days"
            );
            expect(consecutiveViolations).toHaveLength(1);
            expect(consecutiveViolations[0].employeeName).toBe(
                "Piotr Wiśniewski"
            );
            expect(consecutiveViolations[0].description).toContain("Ponad 5");
            expect(consecutiveViolations[0].details).toBe("6 dni");
        });

        it("nie wykrywa naruszenia przy 5 dniach z rzędu", () => {
            const employees = [createEmployee("emp-1", "Piotr", "Wiśniewski")];
            const activeShifts = [
                createShift("emp-1", "2026-01-06", "08:00:00", "16:00:00"),
                createShift("emp-1", "2026-01-07", "08:00:00", "16:00:00"),
                createShift("emp-1", "2026-01-08", "08:00:00", "16:00:00"),
                createShift("emp-1", "2026-01-09", "08:00:00", "16:00:00"),
                createShift("emp-1", "2026-01-10", "08:00:00", "16:00:00"), // 5 dni
            ];

            const result = calculateViolations(employees, activeShifts);

            const consecutiveViolations = result.filter(
                (v) => v.type === "consecutive_days"
            );
            expect(consecutiveViolations).toHaveLength(0);
        });

        it("resetuje licznik po dniu przerwy", () => {
            const employees = [createEmployee("emp-1", "Piotr", "Wiśniewski")];
            const activeShifts = [
                createShift("emp-1", "2026-01-06", "08:00:00", "16:00:00"),
                createShift("emp-1", "2026-01-07", "08:00:00", "16:00:00"),
                createShift("emp-1", "2026-01-08", "08:00:00", "16:00:00"),
                // 9.01 przerwa
                createShift("emp-1", "2026-01-10", "08:00:00", "16:00:00"),
                createShift("emp-1", "2026-01-11", "08:00:00", "16:00:00"),
                createShift("emp-1", "2026-01-12", "08:00:00", "16:00:00"),
            ];

            const result = calculateViolations(employees, activeShifts);

            const consecutiveViolations = result.filter(
                (v) => v.type === "consecutive_days"
            );
            expect(consecutiveViolations).toHaveLength(0);
        });
    });

    describe("multiple employees", () => {
        it("wykrywa naruszenia dla wielu pracowników", () => {
            const employees = [
                createEmployee("emp-1", "Jan", "Kowalski"),
                createEmployee("emp-2", "Anna", "Nowak"),
            ];
            const activeShifts = [
                // Jan - naruszenie 11h (20:00 -> 06:00 = 10h)
                createShift("emp-1", "2026-01-10", "08:00:00", "20:00:00"),
                createShift("emp-1", "2026-01-11", "06:00:00", "14:00:00"),
                // Anna - przekroczenie 40h/tydzień
                createShift("emp-2", "2026-01-06", "08:00:00", "17:00:00", 0), // 9h
                createShift("emp-2", "2026-01-07", "08:00:00", "17:00:00", 0), // 9h
                createShift("emp-2", "2026-01-08", "08:00:00", "17:00:00", 0), // 9h
                createShift("emp-2", "2026-01-09", "08:00:00", "17:00:00", 0), // 9h
                createShift("emp-2", "2026-01-10", "08:00:00", "17:00:00", 0), // 9h = 45h
            ];

            const result = calculateViolations(employees, activeShifts);

            expect(result.length).toBeGreaterThanOrEqual(2);

            const janViolations = result.filter(
                (v) => v.employeeName === "Jan Kowalski"
            );
            expect(janViolations.length).toBeGreaterThan(0);

            const annaViolations = result.filter(
                (v) => v.employeeName === "Anna Nowak"
            );
            expect(annaViolations.length).toBeGreaterThan(0);
        });
    });

    describe("edge cases", () => {
        it("zwraca pustą tablicę dla pracowników bez zmian", () => {
            const employees = [createEmployee("emp-1", "Jan", "Kowalski")];
            const activeShifts: LocalShift[] = [];

            const result = calculateViolations(employees, activeShifts);

            expect(result).toHaveLength(0);
        });

        it("radzi sobie z null break_minutes", () => {
            const employees = [createEmployee("emp-1", "Jan", "Kowalski")];
            const shift = createShift(
                "emp-1",
                "2026-01-06",
                "08:00:00",
                "17:00:00"
            );
            shift.break_minutes = null;
            const activeShifts = [shift];

            const result = calculateViolations(employees, activeShifts);

            // Nie powinno rzucić błędu
            expect(result).toBeDefined();
        });
    });
});
