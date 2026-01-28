/**
 * Testy dla utils/schedule-toasts.ts
 *
 * Testuje:
 * - toastEmployeeAbsence() - toast nieobecności
 * - toastNotAssignedToTemplate() - toast braku przypisania
 * - toastAlreadyWorking() - toast już pracuje
 * - toastRestViolation() - toast naruszenia odpoczynku
 * - toastHoursComplete() - toast komplet godzin
 * - toastShiftMoved() - toast przeniesienia zmiany
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { toast } from "sonner";
import {
    toastEmployeeAbsence,
    toastNotAssignedToTemplate,
    toastAlreadyWorking,
    toastRestViolation,
    toastHoursComplete,
    toastShiftMoved,
} from "@/lib/core/schedule/toasts";
import type { Employee } from "@/types";

// Mock sonner toast
vi.mock("sonner", () => ({
    toast: {
        warning: vi.fn(),
        success: vi.fn(),
    },
}));

// Test employee fixtures
const createEmployee = (overrides: Partial<Employee> = {}): Employee => ({
    id: "emp-1",
    organization_id: "org-1",
    first_name: "Jan",
    last_name: "Kowalski",
    email: "jan@example.com",
    phone: null,
    employment_type: "full",
    color: "#3B82F6",
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    position: null,
    ...overrides,
    custom_hours: overrides.custom_hours ?? null,
});

describe("schedule toasts", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // =========================================================================
    // toastEmployeeAbsence
    // =========================================================================
    describe("toastEmployeeAbsence", () => {
        it("should show warning toast with employee full name", () => {
            const employee = createEmployee({
                first_name: "Anna",
                last_name: "Nowak",
            });

            toastEmployeeAbsence(employee);

            expect(toast.warning).toHaveBeenCalledWith(
                "Anna Nowak ma nieobecność!"
            );
        });

        it("should call toast.warning", () => {
            const employee = createEmployee();

            toastEmployeeAbsence(employee);

            expect(toast.warning).toHaveBeenCalledTimes(1);
        });

        it("should handle different employee names", () => {
            const employee = createEmployee({
                first_name: "Maria",
                last_name: "Wiśniewska",
            });

            toastEmployeeAbsence(employee);

            expect(toast.warning).toHaveBeenCalledWith(
                "Maria Wiśniewska ma nieobecność!"
            );
        });
    });

    // =========================================================================
    // toastNotAssignedToTemplate
    // =========================================================================
    describe("toastNotAssignedToTemplate", () => {
        it("should show warning with employee name and time range", () => {
            const employee = createEmployee({ first_name: "Piotr" });

            toastNotAssignedToTemplate(employee, "08:00", "16:00");

            expect(toast.warning).toHaveBeenCalledWith(
                "Piotr nie jest przypisany do zmiany 08:00-16:00"
            );
        });

        it("should truncate time to 5 characters (HH:MM)", () => {
            const employee = createEmployee({ first_name: "Jan" });

            toastNotAssignedToTemplate(employee, "14:00:00", "22:00:00");

            expect(toast.warning).toHaveBeenCalledWith(
                "Jan nie jest przypisany do zmiany 14:00-22:00"
            );
        });

        it("should handle different time formats", () => {
            const employee = createEmployee({ first_name: "Anna" });

            toastNotAssignedToTemplate(employee, "06:30", "14:30");

            expect(toast.warning).toHaveBeenCalledWith(
                "Anna nie jest przypisany do zmiany 06:30-14:30"
            );
        });

        it("should only use first_name, not full name", () => {
            const employee = createEmployee({
                first_name: "Adam",
                last_name: "Mickiewicz",
            });

            toastNotAssignedToTemplate(employee, "08:00", "16:00");

            expect(toast.warning).toHaveBeenCalledWith(
                expect.stringContaining("Adam")
            );
            expect(toast.warning).not.toHaveBeenCalledWith(
                expect.stringContaining("Mickiewicz")
            );
        });
    });

    // =========================================================================
    // toastAlreadyWorking
    // =========================================================================
    describe("toastAlreadyWorking", () => {
        it("should show warning with full employee name", () => {
            const employee = createEmployee({
                first_name: "Katarzyna",
                last_name: "Lewandowska",
            });

            toastAlreadyWorking(employee);

            expect(toast.warning).toHaveBeenCalledWith(
                "Katarzyna Lewandowska już pracuje tego dnia!"
            );
        });

        it("should call toast.warning", () => {
            const employee = createEmployee();

            toastAlreadyWorking(employee);

            expect(toast.warning).toHaveBeenCalledTimes(1);
        });
    });

    // =========================================================================
    // toastRestViolation
    // =========================================================================
    describe("toastRestViolation", () => {
        it("should show warning about 11h rest violation", () => {
            const employee = createEmployee({
                first_name: "Tomasz",
                last_name: "Zieliński",
            });

            toastRestViolation(employee);

            expect(toast.warning).toHaveBeenCalledWith(
                "Dodanie zmiany narusza 11h odpoczynku dla Tomasz Zieliński!"
            );
        });

        it("should mention 11h rest requirement", () => {
            const employee = createEmployee();

            toastRestViolation(employee);

            expect(toast.warning).toHaveBeenCalledWith(
                expect.stringContaining("11h odpoczynku")
            );
        });
    });

    // =========================================================================
    // toastHoursComplete
    // =========================================================================
    describe("toastHoursComplete", () => {
        it("should show success toast with hours info", () => {
            const employee = createEmployee({
                first_name: "Ewa",
                last_name: "Kwiatkowska",
            });

            toastHoursComplete(employee, 168, 168);

            expect(toast.success).toHaveBeenCalledWith(
                "Ewa Kwiatkowska ma komplet godzin (168/168h)"
            );
        });

        it("should round scheduled hours", () => {
            const employee = createEmployee();

            toastHoursComplete(employee, 167.8, 168);

            expect(toast.success).toHaveBeenCalledWith(
                expect.stringContaining("(168/168h)")
            );
        });

        it("should handle half-time hours", () => {
            const employee = createEmployee();

            toastHoursComplete(employee, 84, 84);

            expect(toast.success).toHaveBeenCalledWith(
                expect.stringContaining("(84/84h)")
            );
        });

        it("should call toast.success (not warning)", () => {
            const employee = createEmployee();

            toastHoursComplete(employee, 160, 160);

            expect(toast.success).toHaveBeenCalledTimes(1);
            expect(toast.warning).not.toHaveBeenCalled();
        });

        it("should handle decimal scheduled hours by rounding", () => {
            const employee = createEmployee({ first_name: "Test" });

            toastHoursComplete(employee, 159.5, 160);

            expect(toast.success).toHaveBeenCalledWith(
                "Test Kowalski ma komplet godzin (160/160h)"
            );
        });
    });

    // =========================================================================
    // toastShiftMoved
    // =========================================================================
    describe("toastShiftMoved", () => {
        it("should show success toast with employee name", () => {
            const employee = createEmployee({
                first_name: "Robert",
                last_name: "Kaczmarek",
            });

            toastShiftMoved(employee);

            expect(toast.success).toHaveBeenCalledWith(
                "Przeniesiono zmianę Robert Kaczmarek"
            );
        });

        it("should call toast.success", () => {
            const employee = createEmployee();

            toastShiftMoved(employee);

            expect(toast.success).toHaveBeenCalledTimes(1);
        });
    });

    // =========================================================================
    // Integration tests
    // =========================================================================
    describe("toast type consistency", () => {
        it("should use warning for negative feedback", () => {
            const employee = createEmployee();

            toastEmployeeAbsence(employee);
            toastNotAssignedToTemplate(employee, "08:00", "16:00");
            toastAlreadyWorking(employee);
            toastRestViolation(employee);

            expect(toast.warning).toHaveBeenCalledTimes(4);
        });

        it("should use success for positive feedback", () => {
            const employee = createEmployee();

            toastHoursComplete(employee, 160, 160);
            toastShiftMoved(employee);

            expect(toast.success).toHaveBeenCalledTimes(2);
        });
    });

    describe("Polish language", () => {
        it("should use Polish messages for all toasts", () => {
            const employee = createEmployee();

            toastEmployeeAbsence(employee);
            expect(toast.warning).toHaveBeenCalledWith(
                expect.stringContaining("nieobecność")
            );

            vi.clearAllMocks();

            toastAlreadyWorking(employee);
            expect(toast.warning).toHaveBeenCalledWith(
                expect.stringContaining("pracuje")
            );

            vi.clearAllMocks();

            toastRestViolation(employee);
            expect(toast.warning).toHaveBeenCalledWith(
                expect.stringContaining("odpoczynku")
            );

            vi.clearAllMocks();

            toastHoursComplete(employee, 160, 160);
            expect(toast.success).toHaveBeenCalledWith(
                expect.stringContaining("komplet godzin")
            );

            vi.clearAllMocks();

            toastShiftMoved(employee);
            expect(toast.success).toHaveBeenCalledWith(
                expect.stringContaining("Przeniesiono")
            );
        });
    });
});
