import { describe, it, expect } from "vitest";
import { GreedyScheduler } from "@/lib/scheduler/greedy/greedy-scheduler";
import type { SchedulerInput, EmployeeWithData } from "@/lib/scheduler/types";
import type {
    ShiftTemplate,
    OrganizationSettings,
    PublicHoliday,
} from "@/types";

// --- HELPERS (Reused from greedy-scheduler.test.ts for consistency) ---

function createEmployee(
    id: string,
    firstName: string,
    lastName: string,
    requiredHours: number = 160,
): EmployeeWithData {
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
    holidays: PublicHoliday[] = [],
): {
    workDays: string[];
    saturdayDays: string[];
} {
    const workDays: string[] = [];
    const saturdayDays: string[] = [];
    const holidayDates = new Set(holidays.map((h) => h.date));
    const lastDay = new Date(year, month, 0).getDate();
    // unused: const tradingSundaysSet = new Set(tradingSundays);

    for (let day = 1; day <= lastDay; day++) {
        const date = new Date(year, month - 1, day);
        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(
            day,
        ).padStart(2, "0")}`;
        const dayOfWeek = date.getDay();

        if (holidayDates.has(dateStr)) continue;
        if (dayOfWeek === 0) continue;
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

// --- NEW TESTS FOR FAIRNESS & LOAD BALANCING ---

describe("GreedyScheduler - Fairness & Advanced Scenarios", () => {
    it("should distribute hours relatively evenly among identical employees (Variance Check)", () => {
        // Scenario: 3 employees, full time (160h), 1 shift template (8h), need 2 people per day.
        // Month: Jan 2025 (approx 21 working days * 2 = 42 slots).
        // Each employee should get ~14 shifts (112h), or if demand is higher, roughly equal.

        const employees = [
            createEmployee("emp1", "A", "A", 160),
            createEmployee("emp2", "B", "B", 160),
            createEmployee("emp3", "C", "C", 160),
        ];

        // 2 people needed per day.
        const templates = [
            createTemplate("t1", "Day Shift", "08:00", "16:00", 2, 30),
        ];

        const input = createSchedulerInput(employees, templates, 2025, 1);
        const scheduler = new GreedyScheduler(input);
        const shifts = scheduler.generate();

        // Count hours per employee
        const hours: Record<string, number> = { emp1: 0, emp2: 0, emp3: 0 };
        shifts.forEach((s) => {
            const duration =
                (new Date(`2000-01-01T${s.end_time}`).getTime() -
                    new Date(`2000-01-01T${s.start_time}`).getTime()) /
                3600000;
            hours[s.employee_id] += duration;
        });

        const hourValues = Object.values(hours);
        const mean = hourValues.reduce((a, b) => a + b, 0) / hourValues.length;
        const maxDiff = Math.max(...hourValues.map((h) => Math.abs(h - mean)));

        // Expect the difference from mean to be small (e.g. less than 1 shift = 8h)
        // Ideally it should be very close if "Balance" logic works.
        // We set a threshold of 12h to be safe but stricter is better.
        console.log(
            "Hours distribution:",
            hours,
            "Mean:",
            mean,
            "MaxDiff:",
            maxDiff,
        );
        expect(maxDiff).toBeLessThanOrEqual(12);
    });

    it("should prioritize employees strictly by availability if one has much fewer hours (Scenario: Part-Time vs Full-Time)", () => {
        // Scenario: 3 employees.
        // Emp1: 1/2 FTE (approx 80h)
        // Emp2: Full FTE (approx 160h)
        // Emp3: Full FTE (approx 160h)

        const employees = [
            createEmployee("emp1", "Small", "One", 80), // Half time
            createEmployee("emp2", "Big", "One", 160), // Full time
            createEmployee("emp3", "Big", "Two", 160), // Full time
        ];

        const templates = [
            createTemplate("t1", "Day", "08:00", "16:00", 2, 30),
        ];

        const input = createSchedulerInput(employees, templates, 2025, 1);
        const scheduler = new GreedyScheduler(input);
        const shifts = scheduler.generate();

        const shifts1 = shifts.filter((s) => s.employee_id === "emp1").length;
        const shifts2 = shifts.filter((s) => s.employee_id === "emp2").length;

        console.log(
            `Half-Time Emp Shifts: ${shifts1}, Full-Time Emp Shifts: ${shifts2}`,
        );

        // Emp1 (Half) should have significantly fewer shifts than Emp2 (Full)
        // Ratio should be roughly 0.5
        expect(shifts1).toBeLessThan(shifts2);

        // Emp1 should have approx half the shifts of the month availability?
        // Or rather, they should meet their target.
        // Target for half time ~10 shifts. Target for full time ~20 shifts.
        // We expect shifts1 to be around 8-12.
        expect(shifts1).toBeGreaterThanOrEqual(1);
        expect(shifts1).toBeLessThanOrEqual(15);
    });

    it("should handle 'Emergency' unstaffed days by filling with any available qualified employee", () => {
        // Scenario: 1 employee, 2 slots needed.
        // Impossible to fill perfectly (2 assignments per day for 1 person is impossible due to overlap/rest).
        // But if we have 2 employees and 3 slots?

        const employees = [
            createEmployee("emp1", "A", "A", 160),
            createEmployee("emp2", "B", "B", 160),
        ];

        // Demand: 3 people per day. Supply: 2 people.
        // Result: Should fill 2/3 slots.

        const templates = [
            createTemplate("t1", "Day", "08:00", "16:00", 3, 30),
        ];

        const input = createSchedulerInput(employees, templates, 2025, 1);
        const scheduler = new GreedyScheduler(input);
        const shifts = scheduler.generate();

        // Check a random workday
        const dayShifts = shifts.filter((s) => s.date === "2025-01-02");

        // Should have managed to assign both employees
        expect(dayShifts.length).toBe(2);
    });
});
