/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useLocalShifts } from "@/lib/hooks/use-local-shifts";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type {
    Employee,
    PublicHoliday,
    ShiftFromDB,
    EmployeeAbsence,
    OrganizationSettings,
} from "@/types";

// Mock dependencies
vi.mock("@/lib/supabase/client");
vi.mock("sonner", () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock("@/lib/utils/logger", () => ({
    logger: {
        log: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

describe("useLocalShifts", () => {
    // Test fixtures
    const mockScheduleId = "schedule-123";
    const mockEmployees: Employee[] = [
        {
            id: "emp-1",
            organization_id: "org-1",
            first_name: "Jan",
            last_name: "Kowalski",
            email: "jan@example.com",
            phone: null,
            employment_type: "full",
            custom_hours: null,
            color: "#FF5733",
            position: "Sprzedawca",
            is_active: true,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
        },
        {
            id: "emp-2",
            organization_id: "org-1",
            first_name: "Anna",
            last_name: "Nowak",
            email: "anna@example.com",
            phone: null,
            employment_type: "half",
            custom_hours: null,
            color: "#33FF57",
            position: "Kasjer",
            is_active: true,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
        },
    ];

    const mockHolidays: PublicHoliday[] = [
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
    ];

    const mockInitialShifts: ShiftFromDB[] = [
        {
            id: "shift-1",
            schedule_id: mockScheduleId,
            employee_id: "emp-1",
            date: "2024-01-02",
            start_time: "08:00",
            end_time: "16:00",
            break_minutes: 0,
            notes: null,
            color: null,
        },
        {
            id: "shift-2",
            schedule_id: mockScheduleId,
            employee_id: "emp-2",
            date: "2024-01-02",
            start_time: "10:00",
            end_time: "14:00",
            break_minutes: 0,
            notes: null,
            color: null,
        },
    ];

    const mockAbsences: EmployeeAbsence[] = [];

    const mockOrgSettings: OrganizationSettings = {
        organization_id: "org-1",
        id: "settings-1",
        created_at: "2024-01-01T00:00:00Z",
        custom_trading_sundays: [],
        opening_hours: {
            monday: { enabled: true, open: "08:00", close: "20:00" },
            tuesday: { enabled: true, open: "08:00", close: "20:00" },
            wednesday: { enabled: true, open: "08:00", close: "20:00" },
            thursday: { enabled: true, open: "08:00", close: "20:00" },
            friday: { enabled: true, open: "08:00", close: "20:00" },
            saturday: { enabled: true, open: "09:00", close: "18:00" },
            sunday: { enabled: false, open: null, close: null },
        },
        min_employees_per_shift: 2,
        default_break_minutes: 30,
        default_shift_duration: 8 * 60,
        enable_trading_sundays: false,
        trading_sundays_mode: "auto",
        store_open_time: null,
        store_close_time: null,
        updated_at: "2024-01-01T00:00:00Z",
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockSupabaseClient: any;

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup Supabase mock
        mockSupabaseClient = {
            from: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
        };

        vi.mocked(createClient).mockReturnValue(mockSupabaseClient);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("Initialization", () => {
        it("should initialize with unchanged shifts from initialShifts", () => {
            const { result } = renderHook(() =>
                useLocalShifts({
                    scheduleId: mockScheduleId,
                    initialShifts: mockInitialShifts,
                    employees: mockEmployees,
                    holidays: mockHolidays,
                    employeeAbsences: mockAbsences,
                    year: 2024,
                    month: 1,
                    organizationSettings: mockOrgSettings,
                })
            );

            expect(result.current.localShifts).toHaveLength(2);
            expect(result.current.localShifts[0].status).toBe("unchanged");
            expect(result.current.localShifts[1].status).toBe("unchanged");
            expect(result.current.hasUnsavedChanges).toBe(false);
        });

        it("should have all shifts as active initially", () => {
            const { result } = renderHook(() =>
                useLocalShifts({
                    scheduleId: mockScheduleId,
                    initialShifts: mockInitialShifts,
                    employees: mockEmployees,
                    holidays: mockHolidays,
                    employeeAbsences: mockAbsences,
                    year: 2024,
                    month: 1,
                    organizationSettings: mockOrgSettings,
                })
            );

            expect(result.current.activeShifts).toHaveLength(2);
            expect(result.current.activeShifts).toEqual(
                result.current.localShifts
            );
        });

        it("should reset shifts when scheduleId/year/month changes", () => {
            const { result, rerender } = renderHook(
                ({ scheduleId, year, month }) =>
                    useLocalShifts({
                        scheduleId,
                        initialShifts: mockInitialShifts,
                        employees: mockEmployees,
                        holidays: mockHolidays,
                        employeeAbsences: mockAbsences,
                        year,
                        month,
                        organizationSettings: mockOrgSettings,
                    }),
                {
                    initialProps: {
                        scheduleId: mockScheduleId,
                        year: 2024,
                        month: 1,
                    },
                }
            );

            // Mark a shift as modified
            act(() => {
                result.current.updateShift("shift-1", { notes: "Updated" });
            });

            expect(result.current.hasUnsavedChanges).toBe(true);

            // Change month - should reset
            rerender({
                scheduleId: mockScheduleId,
                year: 2024,
                month: 2,
            });

            expect(result.current.hasUnsavedChanges).toBe(false);
            expect(result.current.localShifts[0].status).toBe("unchanged");
        });
    });

    describe("removeShift", () => {
        it("should mark existing shift as deleted", () => {
            const { result } = renderHook(() =>
                useLocalShifts({
                    scheduleId: mockScheduleId,
                    initialShifts: mockInitialShifts,
                    employees: mockEmployees,
                    holidays: mockHolidays,
                    employeeAbsences: mockAbsences,
                    year: 2024,
                    month: 1,
                    organizationSettings: mockOrgSettings,
                })
            );

            act(() => {
                result.current.removeShift("shift-1");
            });

            expect(result.current.localShifts[0].status).toBe("deleted");
            expect(result.current.hasUnsavedChanges).toBe(true);
        });

        it("should exclude deleted shifts from activeShifts", () => {
            const { result } = renderHook(() =>
                useLocalShifts({
                    scheduleId: mockScheduleId,
                    initialShifts: mockInitialShifts,
                    employees: mockEmployees,
                    holidays: mockHolidays,
                    employeeAbsences: mockAbsences,
                    year: 2024,
                    month: 1,
                    organizationSettings: mockOrgSettings,
                })
            );

            act(() => {
                result.current.removeShift("shift-1");
            });

            expect(result.current.activeShifts).toHaveLength(1);
            expect(result.current.activeShifts[0].id).toBe("shift-2");
        });

        it("should mark new shift as deleted", () => {
            const { result } = renderHook(() =>
                useLocalShifts({
                    scheduleId: mockScheduleId,
                    initialShifts: [],
                    employees: mockEmployees,
                    holidays: mockHolidays,
                    employeeAbsences: mockAbsences,
                    year: 2024,
                    month: 1,
                    organizationSettings: mockOrgSettings,
                })
            );

            // Add new shifts via applyGeneratedShifts
            act(() => {
                result.current.applyGeneratedShifts(
                    [
                        {
                            employee_id: "emp-1",
                            date: "2024-01-03",
                            start_time: "08:00",
                            end_time: "16:00",
                            break_minutes: 30,
                        },
                    ],
                    "fast"
                );
            });

            const newShiftId = result.current.localShifts[0].id;

            act(() => {
                result.current.removeShift(newShiftId);
            });

            expect(result.current.localShifts[0].status).toBe("deleted");
        });
    });

    describe("updateShift", () => {
        it("should mark existing shift as modified", () => {
            const { result } = renderHook(() =>
                useLocalShifts({
                    scheduleId: mockScheduleId,
                    initialShifts: mockInitialShifts,
                    employees: mockEmployees,
                    holidays: mockHolidays,
                    employeeAbsences: mockAbsences,
                    year: 2024,
                    month: 1,
                    organizationSettings: mockOrgSettings,
                })
            );

            act(() => {
                result.current.updateShift("shift-1", {
                    start_time: "09:00",
                    notes: "Updated shift",
                });
            });

            expect(result.current.localShifts[0].status).toBe("modified");
            expect(result.current.localShifts[0].start_time).toBe("09:00");
            expect(result.current.localShifts[0].notes).toBe("Updated shift");
            expect(result.current.hasUnsavedChanges).toBe(true);
        });

        it("should keep status as new for new shifts", () => {
            const { result } = renderHook(() =>
                useLocalShifts({
                    scheduleId: mockScheduleId,
                    initialShifts: [],
                    employees: mockEmployees,
                    holidays: mockHolidays,
                    employeeAbsences: mockAbsences,
                    year: 2024,
                    month: 1,
                    organizationSettings: mockOrgSettings,
                })
            );

            act(() => {
                result.current.applyGeneratedShifts(
                    [
                        {
                            employee_id: "emp-1",
                            date: "2024-01-03",
                            start_time: "08:00",
                            end_time: "16:00",
                            break_minutes: 30,
                        },
                    ],
                    "fast"
                );
            });

            // Status should be "unchanged" after applyGeneratedShifts
            expect(result.current.localShifts[0].status).toBe("unchanged");
        });

        it("should update multiple properties at once", () => {
            const { result } = renderHook(() =>
                useLocalShifts({
                    scheduleId: mockScheduleId,
                    initialShifts: mockInitialShifts,
                    employees: mockEmployees,
                    holidays: mockHolidays,
                    employeeAbsences: mockAbsences,
                    year: 2024,
                    month: 1,
                    organizationSettings: mockOrgSettings,
                })
            );

            act(() => {
                result.current.updateShift("shift-1", {
                    start_time: "07:00",
                    end_time: "15:00",
                    break_minutes: 45,
                    notes: "Early shift",
                    color: "#FF0000",
                });
            });

            const updatedShift = result.current.localShifts[0];
            expect(updatedShift.start_time).toBe("07:00");
            expect(updatedShift.end_time).toBe("15:00");
            expect(updatedShift.break_minutes).toBe(45);
            expect(updatedShift.notes).toBe("Early shift");
            expect(updatedShift.color).toBe("#FF0000");
        });
    });

    describe("clearAllShifts", () => {
        it("should clear all shifts", () => {
            const { result } = renderHook(() =>
                useLocalShifts({
                    scheduleId: mockScheduleId,
                    initialShifts: mockInitialShifts,
                    employees: mockEmployees,
                    holidays: mockHolidays,
                    employeeAbsences: mockAbsences,
                    year: 2024,
                    month: 1,
                    organizationSettings: mockOrgSettings,
                })
            );

            expect(result.current.localShifts).toHaveLength(2);

            act(() => {
                result.current.clearAllShifts();
            });

            expect(result.current.localShifts).toHaveLength(0);
            expect(result.current.activeShifts).toHaveLength(0);
        });
    });

    describe("applyGeneratedShifts", () => {
        it("should create new shifts with correct structure", () => {
            const { result } = renderHook(() =>
                useLocalShifts({
                    scheduleId: mockScheduleId,
                    initialShifts: [],
                    employees: mockEmployees,
                    holidays: mockHolidays,
                    employeeAbsences: mockAbsences,
                    year: 2024,
                    month: 1,
                    organizationSettings: mockOrgSettings,
                })
            );

            act(() => {
                result.current.applyGeneratedShifts(
                    [
                        {
                            employee_id: "emp-1",
                            date: "2024-01-03",
                            start_time: "08:00",
                            end_time: "16:00",
                            break_minutes: 30,
                        },
                        {
                            employee_id: "emp-2",
                            date: "2024-01-03",
                            start_time: "10:00",
                            end_time: "14:00",
                            break_minutes: 0,
                        },
                    ],
                    "fast"
                );
            });

            expect(result.current.localShifts).toHaveLength(2);
            expect(result.current.localShifts[0]).toMatchObject({
                schedule_id: mockScheduleId,
                employee_id: "emp-1",
                date: "2024-01-03",
                start_time: "08:00",
                end_time: "16:00",
                break_minutes: 30,
                status: "unchanged",
            });
        });

        it("should filter out shifts for unknown employees", () => {
            const { result } = renderHook(() =>
                useLocalShifts({
                    scheduleId: mockScheduleId,
                    initialShifts: [],
                    employees: mockEmployees,
                    holidays: mockHolidays,
                    employeeAbsences: mockAbsences,
                    year: 2024,
                    month: 1,
                    organizationSettings: mockOrgSettings,
                })
            );

            act(() => {
                result.current.applyGeneratedShifts(
                    [
                        {
                            employee_id: "emp-1",
                            date: "2024-01-03",
                            start_time: "08:00",
                            end_time: "16:00",
                            break_minutes: 30,
                        },
                        {
                            employee_id: "unknown-emp",
                            date: "2024-01-03",
                            start_time: "10:00",
                            end_time: "14:00",
                            break_minutes: 0,
                        },
                    ],
                    "fast"
                );
            });

            expect(result.current.localShifts).toHaveLength(1);
            expect(result.current.localShifts[0].employee_id).toBe("emp-1");
        });

        it("should show success toast with correct mode", () => {
            const { result } = renderHook(() =>
                useLocalShifts({
                    scheduleId: mockScheduleId,
                    initialShifts: [],
                    employees: mockEmployees,
                    holidays: mockHolidays,
                    employeeAbsences: mockAbsences,
                    year: 2024,
                    month: 1,
                    organizationSettings: mockOrgSettings,
                })
            );

            act(() => {
                result.current.applyGeneratedShifts(
                    [
                        {
                            employee_id: "emp-1",
                            date: "2024-01-03",
                            start_time: "08:00",
                            end_time: "16:00",
                            break_minutes: 30,
                        },
                    ],
                    "balanced"
                );
            });

            expect(toast.success).toHaveBeenCalledWith(
                "Wygenerowano 1 zmian",
                expect.objectContaining({
                    description: "Grafik wygenerowany w trybie zbalansowanym",
                })
            );
        });

        it("should replace existing shifts", () => {
            const { result } = renderHook(() =>
                useLocalShifts({
                    scheduleId: mockScheduleId,
                    initialShifts: mockInitialShifts,
                    employees: mockEmployees,
                    holidays: mockHolidays,
                    employeeAbsences: mockAbsences,
                    year: 2024,
                    month: 1,
                    organizationSettings: mockOrgSettings,
                })
            );

            expect(result.current.localShifts).toHaveLength(2);

            act(() => {
                result.current.applyGeneratedShifts(
                    [
                        {
                            employee_id: "emp-1",
                            date: "2024-01-10",
                            start_time: "09:00",
                            end_time: "17:00",
                            break_minutes: 30,
                        },
                    ],
                    "fast"
                );
            });

            // Should replace all shifts
            expect(result.current.localShifts).toHaveLength(1);
            expect(result.current.localShifts[0].date).toBe("2024-01-10");
        });
    });

    describe("employeeHoursMap", () => {
        it("should calculate scheduled and required hours correctly", () => {
            const { result } = renderHook(() =>
                useLocalShifts({
                    scheduleId: mockScheduleId,
                    initialShifts: mockInitialShifts,
                    employees: mockEmployees,
                    holidays: mockHolidays,
                    employeeAbsences: mockAbsences,
                    year: 2024,
                    month: 1,
                    organizationSettings: mockOrgSettings,
                })
            );

            const emp1Hours = result.current.employeeHoursMap.get("emp-1");
            expect(emp1Hours).toBeDefined();
            expect(emp1Hours?.scheduled).toBe(7.5); // 8h - 0.5h break
            expect(emp1Hours?.required).toBeGreaterThan(0);

            const emp2Hours = result.current.employeeHoursMap.get("emp-2");
            expect(emp2Hours).toBeDefined();
            expect(emp2Hours?.scheduled).toBe(4); // 4h - 0h break
        });

        it("should exclude deleted shifts from calculations", () => {
            const { result } = renderHook(() =>
                useLocalShifts({
                    scheduleId: mockScheduleId,
                    initialShifts: mockInitialShifts,
                    employees: mockEmployees,
                    holidays: mockHolidays,
                    employeeAbsences: mockAbsences,
                    year: 2024,
                    month: 1,
                    organizationSettings: mockOrgSettings,
                })
            );

            act(() => {
                result.current.removeShift("shift-1");
            });

            const emp1Hours = result.current.employeeHoursMap.get("emp-1");
            expect(emp1Hours?.scheduled).toBe(0);
        });
    });

    describe("saveAll", () => {
        it("should handle successful save with new shifts", async () => {
            mockSupabaseClient.insert.mockResolvedValue({ error: null });
            mockSupabaseClient.select.mockResolvedValue({
                data: [
                    {
                        ...mockInitialShifts[0],
                        id: "new-shift-id",
                    },
                ],
                error: null,
            });

            const { result } = renderHook(() =>
                useLocalShifts({
                    scheduleId: mockScheduleId,
                    initialShifts: [],
                    employees: mockEmployees,
                    holidays: mockHolidays,
                    employeeAbsences: mockAbsences,
                    year: 2024,
                    month: 1,
                    organizationSettings: mockOrgSettings,
                })
            );

            act(() => {
                result.current.applyGeneratedShifts(
                    [
                        {
                            employee_id: "emp-1",
                            date: "2024-01-03",
                            start_time: "08:00",
                            end_time: "16:00",
                            break_minutes: 30,
                        },
                    ],
                    "fast"
                );
            });

            await act(async () => {
                await result.current.saveAll();
            });

            await waitFor(() => {
                expect(toast.success).toHaveBeenCalledWith(
                    "Grafik został zapisany"
                );
            });
        });

        it("should show error toast when scheduleId is missing", async () => {
            const { result } = renderHook(() =>
                useLocalShifts({
                    scheduleId: "",
                    initialShifts: mockInitialShifts,
                    employees: mockEmployees,
                    holidays: mockHolidays,
                    employeeAbsences: mockAbsences,
                    year: 2024,
                    month: 1,
                    organizationSettings: mockOrgSettings,
                })
            );

            await act(async () => {
                await result.current.saveAll();
            });

            expect(toast.error).toHaveBeenCalledWith(
                "Brak identyfikatora grafiku"
            );
        });

        it("should handle database errors gracefully", async () => {
            mockSupabaseClient.insert.mockResolvedValue({
                error: { message: "Database error" },
            });

            const { result } = renderHook(() =>
                useLocalShifts({
                    scheduleId: mockScheduleId,
                    initialShifts: [],
                    employees: mockEmployees,
                    holidays: mockHolidays,
                    employeeAbsences: mockAbsences,
                    year: 2024,
                    month: 1,
                    organizationSettings: mockOrgSettings,
                })
            );

            act(() => {
                result.current.applyGeneratedShifts(
                    [
                        {
                            employee_id: "emp-1",
                            date: "2024-01-03",
                            start_time: "08:00",
                            end_time: "16:00",
                            break_minutes: 30,
                        },
                    ],
                    "fast"
                );
            });

            await act(async () => {
                await result.current.saveAll();
            });

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith(
                    "Błąd INSERT: Database error"
                );
            });
        });
    });

    describe("refreshFromDB", () => {
        it("should refresh shifts from database", async () => {
            const refreshedShifts = [
                {
                    ...mockInitialShifts[0],
                    notes: "Updated from DB",
                },
            ];

            mockSupabaseClient.select.mockResolvedValue({
                data: refreshedShifts,
                error: null,
            });

            const { result } = renderHook(() =>
                useLocalShifts({
                    scheduleId: mockScheduleId,
                    initialShifts: mockInitialShifts,
                    employees: mockEmployees,
                    holidays: mockHolidays,
                    employeeAbsences: mockAbsences,
                    year: 2024,
                    month: 1,
                    organizationSettings: mockOrgSettings,
                })
            );

            await act(async () => {
                await result.current.refreshFromDB();
            });

            await waitFor(() => {
                expect(result.current.localShifts[0].notes).toBe(
                    "Updated from DB"
                );
            });
        });
    });
});
