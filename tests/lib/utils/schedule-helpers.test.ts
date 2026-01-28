/**
 * =============================================================================
 * TESTY JEDNOSTKOWE - SCHEDULE HELPERS
 * =============================================================================
 */

import { describe, it, expect } from "vitest";
import {
    isTradingSunday,
    checkEmployeeAbsence,
    canEmployeeUseTemplate,
    isTemplateAvailableOnDay,
    isNonWorkingDay,
    hasCoverageGap,
    getCoverageGapDetails,
} from "@/lib/core/schedule/utils";
import type {
    OrganizationSettings,
    EmployeeAbsence,
    ShiftTemplateAssignment,
    AbsenceType,
} from "@/types";

// =============================================================================
// HELPERS
// =============================================================================

function createSettings(
    overrides: Partial<OrganizationSettings> = {}
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

function createAbsence(
    employeeId: string,
    startDate: string,
    endDate: string,
    type: AbsenceType = "vacation"
): EmployeeAbsence {
    return {
        id: `absence-${Date.now()}`,
        employee_id: employeeId,
        start_date: startDate,
        end_date: endDate,
        absence_type: type,
        notes: null,
        created_at: "",
        updated_at: "",
        organization_id: "org-1",
        created_by: null,
        is_paid: true,
    };
}

function createAssignment(
    employeeId: string,
    templateId: string
): ShiftTemplateAssignment {
    return {
        id: `assignment-${Date.now()}`,
        employee_id: employeeId,
        template_id: templateId,
        created_at: "",
    };
}

// =============================================================================
// TESTY: isTradingSunday
// =============================================================================

describe("isTradingSunday", () => {
    it("zwraca false dla dni innych niż niedziela", () => {
        const monday = new Date(2026, 0, 5); // poniedziałek
        const settings = createSettings({ trading_sundays_mode: "all" });

        expect(isTradingSunday(monday, settings)).toBe(false);
    });

    it("zwraca false gdy settings jest null", () => {
        const sunday = new Date(2026, 0, 4); // niedziela

        expect(isTradingSunday(sunday, null)).toBe(false);
    });

    it("zwraca true dla wszystkich niedziel gdy mode = all", () => {
        const sunday = new Date(2026, 0, 4); // niedziela
        const settings = createSettings({ trading_sundays_mode: "all" });

        expect(isTradingSunday(sunday, settings)).toBe(true);
    });

    it("zwraca false dla niedziel gdy mode = none", () => {
        const sunday = new Date(2026, 0, 4); // niedziela
        const settings = createSettings({ trading_sundays_mode: "none" });

        expect(isTradingSunday(sunday, settings)).toBe(false);
    });

    it("sprawdza custom list gdy mode = custom", () => {
        const sunday1 = new Date(2026, 0, 4); // niedziela 4 stycznia
        const sunday2 = new Date(2026, 0, 11); // niedziela 11 stycznia
        const settings = createSettings({
            trading_sundays_mode: "custom",
            custom_trading_sundays: ["2026-01-04"], // tylko pierwsza niedziela
        });

        expect(isTradingSunday(sunday1, settings)).toBe(true);
        expect(isTradingSunday(sunday2, settings)).toBe(false);
    });

    it("respektuje opening_hours.sunday.enabled", () => {
        const sunday = new Date(2026, 0, 4);
        const settings = createSettings({
            trading_sundays_mode: "none",
            opening_hours: {
                monday: { enabled: true, open: "08:00", close: "20:00" },
                tuesday: { enabled: true, open: "08:00", close: "20:00" },
                wednesday: { enabled: true, open: "08:00", close: "20:00" },
                thursday: { enabled: true, open: "08:00", close: "20:00" },
                friday: { enabled: true, open: "08:00", close: "20:00" },
                saturday: { enabled: false, open: null, close: null },
                sunday: { enabled: true, open: "10:00", close: "18:00" }, // niedziela włączona
            },
        });

        // Niedziela włączona w opening_hours = handlowa
        expect(isTradingSunday(sunday, settings)).toBe(true);
    });
});

// =============================================================================
// TESTY: checkEmployeeAbsence
// =============================================================================

describe("checkEmployeeAbsence", () => {
    it("zwraca null gdy brak nieobecności", () => {
        const result = checkEmployeeAbsence("emp1", "2026-01-15", []);
        expect(result).toBeNull();
    });

    it("zwraca null gdy data poza zakresem nieobecności", () => {
        const absences = [createAbsence("emp1", "2026-01-10", "2026-01-12")];
        const result = checkEmployeeAbsence("emp1", "2026-01-15", absences);

        expect(result).toBeNull();
    });

    it("zwraca nieobecność gdy data w zakresie", () => {
        const absences = [createAbsence("emp1", "2026-01-10", "2026-01-20")];
        const result = checkEmployeeAbsence("emp1", "2026-01-15", absences);

        expect(result).not.toBeNull();
        expect(result?.employee_id).toBe("emp1");
    });

    it("zwraca nieobecność dla pierwszego dnia zakresu", () => {
        const absences = [createAbsence("emp1", "2026-01-10", "2026-01-20")];
        const result = checkEmployeeAbsence("emp1", "2026-01-10", absences);

        expect(result).not.toBeNull();
    });

    it("zwraca nieobecność dla ostatniego dnia zakresu", () => {
        const absences = [createAbsence("emp1", "2026-01-10", "2026-01-20")];
        const result = checkEmployeeAbsence("emp1", "2026-01-20", absences);

        expect(result).not.toBeNull();
    });

    it("nie zwraca nieobecności innego pracownika", () => {
        const absences = [createAbsence("emp1", "2026-01-10", "2026-01-20")];
        const result = checkEmployeeAbsence("emp2", "2026-01-15", absences);

        expect(result).toBeNull();
    });
});

// =============================================================================
// TESTY: canEmployeeUseTemplate
// =============================================================================

describe("canEmployeeUseTemplate", () => {
    it("zwraca true gdy brak przypisań (każdy może)", () => {
        const result = canEmployeeUseTemplate("emp1", "template1", []);
        expect(result).toBe(true);
    });

    it("zwraca true gdy pracownik jest przypisany do szablonu", () => {
        const assignments = [createAssignment("emp1", "template1")];
        const result = canEmployeeUseTemplate("emp1", "template1", assignments);

        expect(result).toBe(true);
    });

    it("zwraca false gdy pracownik NIE jest przypisany (ale inni są)", () => {
        const assignments = [createAssignment("emp2", "template1")];
        const result = canEmployeeUseTemplate("emp1", "template1", assignments);

        expect(result).toBe(false);
    });

    it("zwraca false gdy pracownik ma przypisania ale nie do tego szablonu", () => {
        const assignments = [createAssignment("emp1", "template2")];
        const result = canEmployeeUseTemplate("emp1", "template1", assignments);

        expect(result).toBe(false);
    });

    it("zwraca true dla szablonu bez przypisań gdy pracownik też nie ma", () => {
        const assignments = [createAssignment("emp2", "template2")];
        // emp1 nie ma przypisań, template1 nie ma przypisań
        const result = canEmployeeUseTemplate("emp1", "template1", assignments);

        expect(result).toBe(true);
    });
});

// =============================================================================
// TESTY: isTemplateAvailableOnDay
// =============================================================================

describe("isTemplateAvailableOnDay", () => {
    it("zwraca true gdy applicable_days jest null", () => {
        const template = { applicable_days: null };
        const result = isTemplateAvailableOnDay(template, new Date(2026, 0, 5)); // poniedziałek

        expect(result).toBe(true);
    });

    it("zwraca true gdy applicable_days jest puste", () => {
        const template = { applicable_days: [] };
        const result = isTemplateAvailableOnDay(template, new Date(2026, 0, 5));

        expect(result).toBe(true);
    });

    it("zwraca true gdy dzień jest w applicable_days (string)", () => {
        const template = {
            applicable_days: ["monday", "tuesday", "wednesday"],
        };
        const monday = new Date(2026, 0, 5); // poniedziałek

        expect(isTemplateAvailableOnDay(template, monday)).toBe(true);
    });

    it("zwraca false gdy dzień NIE jest w applicable_days", () => {
        const template = { applicable_days: ["monday", "tuesday"] };
        const friday = new Date(2026, 0, 9); // piątek

        expect(isTemplateAvailableOnDay(template, friday)).toBe(false);
    });

    it("akceptuje numer dnia tygodnia jako argument", () => {
        const template = { applicable_days: ["monday"] };

        expect(isTemplateAvailableOnDay(template, 1)).toBe(true); // poniedziałek
        expect(isTemplateAvailableOnDay(template, 5)).toBe(false); // piątek
    });

    it("akceptuje string daty jako argument", () => {
        const template = { applicable_days: ["monday"] };

        expect(isTemplateAvailableOnDay(template, "2026-01-05")).toBe(true); // poniedziałek
        expect(isTemplateAvailableOnDay(template, "2026-01-09")).toBe(false); // piątek
    });
});

// =============================================================================
// TESTY: isNonWorkingDay
// =============================================================================

describe("isNonWorkingDay", () => {
    it("zwraca true dla święta", () => {
        const monday = new Date(2026, 0, 5);
        const result = isNonWorkingDay(monday, true, null);

        expect(result).toBe(true);
    });

    it("zwraca true dla soboty", () => {
        const saturday = new Date(2026, 0, 3);
        const result = isNonWorkingDay(saturday, false, null);

        expect(result).toBe(true);
    });

    it("zwraca true dla niedzieli niehandlowej", () => {
        const sunday = new Date(2026, 0, 4);
        const settings = createSettings({ trading_sundays_mode: "none" });
        const result = isNonWorkingDay(sunday, false, settings);

        expect(result).toBe(true);
    });

    it("zwraca false dla niedzieli handlowej", () => {
        const sunday = new Date(2026, 0, 4);
        const settings = createSettings({ trading_sundays_mode: "all" });
        const result = isNonWorkingDay(sunday, false, settings);

        expect(result).toBe(false);
    });

    it("zwraca false dla zwykłego dnia roboczego", () => {
        const monday = new Date(2026, 0, 5);
        const result = isNonWorkingDay(monday, false, null);

        expect(result).toBe(false);
    });
});

// =============================================================================
// TESTY: hasCoverageGap
// =============================================================================

describe("hasCoverageGap", () => {
    it("zwraca true gdy brak zmian", () => {
        const result = hasCoverageGap([], "08:00", "20:00");
        expect(result).toBe(true);
    });

    it("zwraca false gdy jedna zmiana pokrywa cały dzień", () => {
        const shifts = [{ start_time: "08:00", end_time: "20:00" }];
        const result = hasCoverageGap(shifts, "08:00", "20:00");

        expect(result).toBe(false);
    });

    it("zwraca false gdy zmiany pokrywają się (brak luki)", () => {
        const shifts = [
            { start_time: "08:00", end_time: "14:00" },
            { start_time: "14:00", end_time: "20:00" },
        ];
        const result = hasCoverageGap(shifts, "08:00", "20:00");

        expect(result).toBe(false);
    });

    it("zwraca true gdy jest luka między zmianami", () => {
        const shifts = [
            { start_time: "08:00", end_time: "12:00" },
            { start_time: "14:00", end_time: "20:00" },
        ];
        const result = hasCoverageGap(shifts, "08:00", "20:00");

        expect(result).toBe(true);
    });

    it("zwraca true gdy zmiana zaczyna się po otwarciu", () => {
        const shifts = [{ start_time: "10:00", end_time: "20:00" }];
        const result = hasCoverageGap(shifts, "08:00", "20:00");

        expect(result).toBe(true);
    });

    it("zwraca true gdy zmiana kończy się przed zamknięciem", () => {
        const shifts = [{ start_time: "08:00", end_time: "18:00" }];
        const result = hasCoverageGap(shifts, "08:00", "20:00");

        expect(result).toBe(true);
    });

    it("zwraca false gdy zmiany nachodzą na siebie", () => {
        const shifts = [
            { start_time: "08:00", end_time: "15:00" },
            { start_time: "12:00", end_time: "20:00" },
        ];
        const result = hasCoverageGap(shifts, "08:00", "20:00");

        expect(result).toBe(false);
    });
});

// =============================================================================
// TESTY: getCoverageGapDetails
// =============================================================================

describe("getCoverageGapDetails", () => {
    it("zwraca pełną lukę gdy brak zmian", () => {
        const result = getCoverageGapDetails([], "08:00", "20:00");

        expect(result.hasGap).toBe(true);
        expect(result.gaps).toHaveLength(1);
        expect(result.gaps[0]).toEqual({ from: "08:00", to: "20:00" });
    });

    it("zwraca hasGap=false gdy pełne pokrycie", () => {
        const shifts = [{ start_time: "08:00", end_time: "20:00" }];
        const result = getCoverageGapDetails(shifts, "08:00", "20:00");

        expect(result.hasGap).toBe(false);
        expect(result.gaps).toHaveLength(0);
    });

    it("identyfikuje konkretne luki", () => {
        const shifts = [
            { start_time: "08:00", end_time: "12:00" },
            { start_time: "14:00", end_time: "20:00" },
        ];
        const result = getCoverageGapDetails(shifts, "08:00", "20:00");

        expect(result.hasGap).toBe(true);
        expect(result.gaps).toHaveLength(1);
        expect(result.gaps[0]).toEqual({ from: "12:00", to: "14:00" });
    });
});
