/**
 * Testy dla utils/schedule-validation.ts
 * Walidacja drop pracownika/zmiany na komórkę grafiku
 */

import { describe, it, expect } from "vitest";
import {
    validateShiftDrop,
    isSameCell,
    type ValidationContext,
} from "@/lib/core/schedule/validation";
import type {
    Employee,
    ShiftTemplate,
    EmployeeAbsence,
    ShiftTemplateAssignment,
    LocalShift,
} from "@/types";

// ============================================================================
// FIXTURES
// ============================================================================

const createEmployee = (id: string = "emp-1"): Employee => ({
    id,
    organization_id: "org-1",
    first_name: "Jan",
    last_name: "Kowalski",
    email: "jan@example.com",
    phone: null,
    employment_type: "full",
    custom_hours: null,
    position: null,
    color: null,
    is_active: true,
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
});

const createTemplate = (
    id: string = "tpl-1",
    overrides: Partial<ShiftTemplate> = {}
): ShiftTemplate => ({
    id,
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
    ...overrides,
    updated_at: overrides.updated_at ?? "2024-01-01",
});

const createAbsence = (
    employeeId: string,
    startDate: string,
    endDate: string
): EmployeeAbsence => ({
    id: `abs-${Date.now()}`,
    employee_id: employeeId,
    start_date: startDate,
    end_date: endDate,
    absence_type: "vacation",
    notes: null,
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
    organization_id: "org-1",
    created_by: null,
    is_paid: true,
});

const createAssignment = (
    templateId: string,
    employeeId: string
): ShiftTemplateAssignment => ({
    id: `assign-${Date.now()}`,
    template_id: templateId,
    employee_id: employeeId,
    created_at: "2024-01-01",
});

const createShift = (overrides: Partial<LocalShift> = {}): LocalShift => ({
    id: "shift-1",
    schedule_id: "sched-1",
    employee_id: "emp-1",
    date: "2024-01-15",
    start_time: "08:00:00",
    end_time: "16:00:00",
    break_minutes: 30,
    notes: null,
    color: "#3b82f6",
    status: "unchanged",
    ...overrides,
});

const createContext = (
    overrides: Partial<ValidationContext> = {}
): ValidationContext => ({
    employeeAbsences: [],
    templateAssignments: [],
    activeShifts: [],
    ...overrides,
});

// ============================================================================
// validateShiftDrop
// ============================================================================

describe("validateShiftDrop", () => {
    describe("sprawdzanie absencji", () => {
        it("zwraca błąd gdy pracownik ma urlop w danym dniu", () => {
            const employee = createEmployee("emp-1");
            const template = createTemplate("tpl-1");
            const context = createContext({
                employeeAbsences: [
                    createAbsence("emp-1", "2024-01-10", "2024-01-20"),
                ],
            });

            const result = validateShiftDrop(
                employee,
                "2024-01-15",
                template,
                context
            );

            expect(result).toEqual({ type: "absence" });
        });

        it("pozwala gdy pracownik nie ma absencji", () => {
            const employee = createEmployee("emp-1");
            const template = createTemplate("tpl-1");
            const context = createContext({
                employeeAbsences: [],
            });

            const result = validateShiftDrop(
                employee,
                "2024-01-15",
                template,
                context
            );

            expect(result).toBeNull();
        });

        it("pozwala gdy absencja dotyczy innego pracownika", () => {
            const employee = createEmployee("emp-1");
            const template = createTemplate("tpl-1");
            const context = createContext({
                employeeAbsences: [
                    createAbsence("emp-2", "2024-01-10", "2024-01-20"),
                ],
            });

            const result = validateShiftDrop(
                employee,
                "2024-01-15",
                template,
                context
            );

            expect(result).toBeNull();
        });

        it("pozwala gdy data jest poza okresem absencji", () => {
            const employee = createEmployee("emp-1");
            const template = createTemplate("tpl-1");
            const context = createContext({
                employeeAbsences: [
                    createAbsence("emp-1", "2024-01-10", "2024-01-14"),
                ],
            });

            const result = validateShiftDrop(
                employee,
                "2024-01-15",
                template,
                context
            );

            expect(result).toBeNull();
        });
    });

    describe("sprawdzanie przypisań szablonów", () => {
        it("zwraca błąd gdy pracownik nie może używać szablonu", () => {
            const employee = createEmployee("emp-1");
            const template = createTemplate("tpl-1");
            const context = createContext({
                templateAssignments: [createAssignment("tpl-1", "emp-2")], // przypisane do innego
            });

            const result = validateShiftDrop(
                employee,
                "2024-01-15",
                template,
                context
            );

            expect(result?.type).toBe("not_assigned");
            if (result?.type === "not_assigned") {
                expect(result.startTime).toBe("08:00:00");
                expect(result.endTime).toBe("16:00:00");
            }
        });

        it("pozwala gdy pracownik ma przypisany szablon", () => {
            const employee = createEmployee("emp-1");
            const template = createTemplate("tpl-1");
            const context = createContext({
                templateAssignments: [createAssignment("tpl-1", "emp-1")],
            });

            const result = validateShiftDrop(
                employee,
                "2024-01-15",
                template,
                context
            );

            expect(result).toBeNull();
        });

        it("pozwala gdy szablon nie ma żadnych przypisań", () => {
            const employee = createEmployee("emp-1");
            const template = createTemplate("tpl-1");
            const context = createContext({
                templateAssignments: [],
            });

            const result = validateShiftDrop(
                employee,
                "2024-01-15",
                template,
                context
            );

            expect(result).toBeNull();
        });
    });

    describe("sprawdzanie istniejących zmian", () => {
        it("zwraca błąd gdy pracownik już pracuje w ten dzień", () => {
            const employee = createEmployee("emp-1");
            const template = createTemplate("tpl-1");
            const context = createContext({
                activeShifts: [
                    createShift({ employee_id: "emp-1", date: "2024-01-15" }),
                ],
            });

            const result = validateShiftDrop(
                employee,
                "2024-01-15",
                template,
                context
            );

            expect(result).toEqual({ type: "already_working" });
        });

        it("pozwala gdy pracownik nie pracuje w ten dzień", () => {
            const employee = createEmployee("emp-1");
            const template = createTemplate("tpl-1");
            const context = createContext({
                activeShifts: [
                    createShift({ employee_id: "emp-1", date: "2024-01-14" }),
                ],
            });

            const result = validateShiftDrop(
                employee,
                "2024-01-15",
                template,
                context
            );

            expect(result).toBeNull();
        });

        it("ignoruje zmianę z excludeShiftId (przenoszenie)", () => {
            const employee = createEmployee("emp-1");
            const template = createTemplate("tpl-1");
            const context = createContext({
                activeShifts: [
                    createShift({
                        id: "shift-to-move",
                        employee_id: "emp-1",
                        date: "2024-01-15",
                    }),
                ],
                excludeShiftId: "shift-to-move",
            });

            const result = validateShiftDrop(
                employee,
                "2024-01-15",
                template,
                context
            );

            expect(result).toBeNull();
        });

        it("blokuje gdy inna zmiana istnieje mimo excludeShiftId", () => {
            const employee = createEmployee("emp-1");
            const template = createTemplate("tpl-1");
            const context = createContext({
                activeShifts: [
                    createShift({
                        id: "shift-to-move",
                        employee_id: "emp-1",
                        date: "2024-01-14",
                    }),
                    createShift({
                        id: "other-shift",
                        employee_id: "emp-1",
                        date: "2024-01-15",
                    }),
                ],
                excludeShiftId: "shift-to-move",
            });

            const result = validateShiftDrop(
                employee,
                "2024-01-15",
                template,
                context
            );

            expect(result).toEqual({ type: "already_working" });
        });
    });

    describe("sprawdzanie 11h odpoczynku", () => {
        it("zwraca błąd gdy checkRestViolation zwraca true", () => {
            const employee = createEmployee("emp-1");
            const template = createTemplate("tpl-1");
            const context = createContext();
            const checkRestViolation = () => true;

            const result = validateShiftDrop(
                employee,
                "2024-01-15",
                template,
                context,
                checkRestViolation
            );

            expect(result).toEqual({ type: "rest_violation" });
        });

        it("pozwala gdy checkRestViolation zwraca false", () => {
            const employee = createEmployee("emp-1");
            const template = createTemplate("tpl-1");
            const context = createContext();
            const checkRestViolation = () => false;

            const result = validateShiftDrop(
                employee,
                "2024-01-15",
                template,
                context,
                checkRestViolation
            );

            expect(result).toBeNull();
        });

        it("pomija sprawdzanie gdy brak checkRestViolation", () => {
            const employee = createEmployee("emp-1");
            const template = createTemplate("tpl-1");
            const context = createContext();

            const result = validateShiftDrop(
                employee,
                "2024-01-15",
                template,
                context
            );

            expect(result).toBeNull();
        });

        it("przekazuje poprawne parametry do checkRestViolation", () => {
            const employee = createEmployee("emp-1");
            const template = createTemplate("tpl-1", {
                start_time: "09:00:00",
                end_time: "17:00:00",
            });
            const context = createContext();

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let capturedParams: any[] | null = null;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const checkRestViolation = (...args: any[]) => {
                capturedParams = args;
                return false;
            };

            validateShiftDrop(
                employee,
                "2024-01-15",
                template,
                context,
                checkRestViolation
            );

            expect(capturedParams).toEqual([
                "emp-1",
                "2024-01-15",
                "09:00:00",
                "17:00:00",
            ]);
        });
    });

    describe("priorytet walidacji", () => {
        it("sprawdza absencję przed przypisaniem szablonu", () => {
            const employee = createEmployee("emp-1");
            const template = createTemplate("tpl-1");
            const context = createContext({
                employeeAbsences: [
                    createAbsence("emp-1", "2024-01-15", "2024-01-15"),
                ],
                templateAssignments: [createAssignment("tpl-1", "emp-2")],
            });

            const result = validateShiftDrop(
                employee,
                "2024-01-15",
                template,
                context
            );

            expect(result?.type).toBe("absence");
        });

        it("sprawdza przypisanie przed istniejącą zmianą", () => {
            const employee = createEmployee("emp-1");
            const template = createTemplate("tpl-1");
            const context = createContext({
                templateAssignments: [createAssignment("tpl-1", "emp-2")],
                activeShifts: [
                    createShift({ employee_id: "emp-1", date: "2024-01-15" }),
                ],
            });

            const result = validateShiftDrop(
                employee,
                "2024-01-15",
                template,
                context
            );

            expect(result?.type).toBe("not_assigned");
        });

        it("sprawdza istniejącą zmianę przed naruszeniem odpoczynku", () => {
            const employee = createEmployee("emp-1");
            const template = createTemplate("tpl-1");
            const context = createContext({
                activeShifts: [
                    createShift({ employee_id: "emp-1", date: "2024-01-15" }),
                ],
            });
            const checkRestViolation = () => true;

            const result = validateShiftDrop(
                employee,
                "2024-01-15",
                template,
                context,
                checkRestViolation
            );

            expect(result?.type).toBe("already_working");
        });
    });
});

// ============================================================================
// isSameCell
// ============================================================================

describe("isSameCell", () => {
    it("zwraca true dla tej samej daty i godziny rozpoczęcia", () => {
        const shift = createShift({
            date: "2024-01-15",
            start_time: "08:00:00",
        });
        const template = createTemplate("tpl-1", { start_time: "08:00:00" });

        expect(isSameCell(shift, "2024-01-15", template)).toBe(true);
    });

    it("zwraca false dla innej daty", () => {
        const shift = createShift({
            date: "2024-01-15",
            start_time: "08:00:00",
        });
        const template = createTemplate("tpl-1", { start_time: "08:00:00" });

        expect(isSameCell(shift, "2024-01-16", template)).toBe(false);
    });

    it("zwraca false dla innej godziny rozpoczęcia", () => {
        const shift = createShift({
            date: "2024-01-15",
            start_time: "08:00:00",
        });
        const template = createTemplate("tpl-1", { start_time: "09:00:00" });

        expect(isSameCell(shift, "2024-01-15", template)).toBe(false);
    });

    it("zwraca false gdy obie różne", () => {
        const shift = createShift({
            date: "2024-01-15",
            start_time: "08:00:00",
        });
        const template = createTemplate("tpl-1", { start_time: "14:00:00" });

        expect(isSameCell(shift, "2024-01-16", template)).toBe(false);
    });

    it("porównuje tylko datę i start_time", () => {
        const shift = createShift({
            date: "2024-01-15",
            start_time: "08:00:00",
            end_time: "16:00:00",
            employee_id: "emp-1",
        });
        const template = createTemplate("tpl-1", {
            start_time: "08:00:00",
            end_time: "12:00:00", // różny end_time
        });

        // Powinno zwrócić true bo data i start_time się zgadzają
        expect(isSameCell(shift, "2024-01-15", template)).toBe(true);
    });
});
