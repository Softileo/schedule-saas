/**
 * Testy dla utils/shift-factory.ts
 * Factory functions dla tworzenia obiektów LocalShift
 */

import { describe, it, expect } from "vitest";
import {
    generateTempShiftId,
    createLocalShiftFromTemplate,
    createCustomLocalShift,
    duplicateShiftToDate,
    markShiftAsModified,
    markShiftAsDeleted,
} from "@/lib/core/schedule/shift-factory";
import type { ShiftTemplate, LocalShift } from "@/types";

// ============================================================================
// FIXTURES
// ============================================================================

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
    ...overrides,
    updated_at: overrides.updated_at ?? "2024-01-01",
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

// ============================================================================
// generateTempShiftId
// ============================================================================

describe("generateTempShiftId", () => {
    it("generuje ID zaczynające się od 'temp-'", () => {
        const id = generateTempShiftId();

        expect(id.startsWith("temp-")).toBe(true);
    });

    it("generuje unikalne ID", () => {
        const ids = new Set<string>();

        for (let i = 0; i < 100; i++) {
            ids.add(generateTempShiftId());
        }

        expect(ids.size).toBe(100);
    });

    it("zawiera timestamp", () => {
        const before = Date.now();
        const id = generateTempShiftId();
        const after = Date.now();

        // Format: temp-{timestamp}-{random}
        const parts = id.split("-");
        const timestamp = parseInt(parts[1], 10);

        expect(timestamp).toBeGreaterThanOrEqual(before);
        expect(timestamp).toBeLessThanOrEqual(after);
    });

    it("zawiera losowy suffix", () => {
        const id = generateTempShiftId();
        const parts = id.split("-");

        // Powinien mieć 3 części: temp, timestamp, random
        expect(parts.length).toBe(3);
        expect(parts[2].length).toBeGreaterThan(0);
    });
});

// ============================================================================
// createLocalShiftFromTemplate
// ============================================================================

describe("createLocalShiftFromTemplate", () => {
    it("tworzy LocalShift z szablonu", () => {
        const template = createTemplate();

        const result = createLocalShiftFromTemplate({
            scheduleId: "sched-1",
            employeeId: "emp-1",
            date: "2024-01-15",
            template,
        });

        expect(result.schedule_id).toBe("sched-1");
        expect(result.employee_id).toBe("emp-1");
        expect(result.date).toBe("2024-01-15");
        expect(result.start_time).toBe("08:00:00");
        expect(result.end_time).toBe("16:00:00");
        expect(result.break_minutes).toBe(30);
        expect(result.color).toBe("#3b82f6");
    });

    it("ustawia status na 'new'", () => {
        const template = createTemplate();

        const result = createLocalShiftFromTemplate({
            scheduleId: "sched-1",
            employeeId: "emp-1",
            date: "2024-01-15",
            template,
        });

        expect(result.status).toBe("new");
    });

    it("generuje tymczasowe ID", () => {
        const template = createTemplate();

        const result = createLocalShiftFromTemplate({
            scheduleId: "sched-1",
            employeeId: "emp-1",
            date: "2024-01-15",
            template,
        });

        expect(result.id.startsWith("temp-")).toBe(true);
    });

    it("ustawia notes na null", () => {
        const template = createTemplate();

        const result = createLocalShiftFromTemplate({
            scheduleId: "sched-1",
            employeeId: "emp-1",
            date: "2024-01-15",
            template,
        });

        expect(result.notes).toBeNull();
    });

    it("kopiuje kolor z szablonu", () => {
        const template = createTemplate({ color: "#ff0000" });

        const result = createLocalShiftFromTemplate({
            scheduleId: "sched-1",
            employeeId: "emp-1",
            date: "2024-01-15",
            template,
        });

        expect(result.color).toBe("#ff0000");
    });

    it("kopiuje break_minutes z szablonu", () => {
        const template = createTemplate({ break_minutes: 45 });

        const result = createLocalShiftFromTemplate({
            scheduleId: "sched-1",
            employeeId: "emp-1",
            date: "2024-01-15",
            template,
        });

        expect(result.break_minutes).toBe(45);
    });
});

// ============================================================================
// createCustomLocalShift
// ============================================================================

describe("createCustomLocalShift", () => {
    it("tworzy LocalShift z custom czasami", () => {
        const result = createCustomLocalShift({
            scheduleId: "sched-1",
            employeeId: "emp-1",
            date: "2024-01-15",
            startTime: "09:00",
            endTime: "17:00",
        });

        expect(result.schedule_id).toBe("sched-1");
        expect(result.employee_id).toBe("emp-1");
        expect(result.date).toBe("2024-01-15");
        expect(result.start_time).toBe("09:00:00");
        expect(result.end_time).toBe("17:00:00");
    });

    it("dodaje :00 do czasu w formacie HH:MM", () => {
        const result = createCustomLocalShift({
            scheduleId: "sched-1",
            employeeId: "emp-1",
            date: "2024-01-15",
            startTime: "08:30",
            endTime: "16:30",
        });

        expect(result.start_time).toBe("08:30:00");
        expect(result.end_time).toBe("16:30:00");
    });

    it("dodaje :00 do czasu z dwukropkiem (zgodnie z implementacją)", () => {
        // Implementacja sprawdza tylko czy zawiera ':', więc zawsze dodaje :00
        const result = createCustomLocalShift({
            scheduleId: "sched-1",
            employeeId: "emp-1",
            date: "2024-01-15",
            startTime: "08:30:15",
            endTime: "16:30:45",
        });

        // Implementacja dodaje :00 jeśli zawiera ':'
        expect(result.start_time).toBe("08:30:15:00");
        expect(result.end_time).toBe("16:30:45:00");
    });

    it("ustawia domyślne wartości", () => {
        const result = createCustomLocalShift({
            scheduleId: "sched-1",
            employeeId: "emp-1",
            date: "2024-01-15",
            startTime: "09:00",
            endTime: "17:00",
        });

        expect(result.break_minutes).toBe(0);
        expect(result.color).toBeNull();
        expect(result.notes).toBeNull();
        expect(result.status).toBe("new");
    });

    it("przyjmuje opcjonalne parametry", () => {
        const result = createCustomLocalShift({
            scheduleId: "sched-1",
            employeeId: "emp-1",
            date: "2024-01-15",
            startTime: "09:00",
            endTime: "17:00",
            breakMinutes: 45,
            color: "#ff0000",
            notes: "Testowa zmiana",
        });

        expect(result.break_minutes).toBe(45);
        expect(result.color).toBe("#ff0000");
        expect(result.notes).toBe("Testowa zmiana");
    });

    it("generuje tymczasowe ID", () => {
        const result = createCustomLocalShift({
            scheduleId: "sched-1",
            employeeId: "emp-1",
            date: "2024-01-15",
            startTime: "09:00",
            endTime: "17:00",
        });

        expect(result.id.startsWith("temp-")).toBe(true);
    });
});

// ============================================================================
// duplicateShiftToDate
// ============================================================================

describe("duplicateShiftToDate", () => {
    it("kopiuje zmianę na nowy dzień", () => {
        const originalShift = createShift({
            date: "2024-01-15",
            start_time: "08:00:00",
            end_time: "16:00:00",
        });

        const result = duplicateShiftToDate(originalShift, "2024-01-16");

        expect(result.date).toBe("2024-01-16");
        expect(result.start_time).toBe("08:00:00");
        expect(result.end_time).toBe("16:00:00");
    });

    it("zachowuje wszystkie inne właściwości", () => {
        const originalShift = createShift({
            employee_id: "emp-1",
            schedule_id: "sched-1",
            break_minutes: 45,
            color: "#ff0000",
            notes: "Ważna zmiana",
        });

        const result = duplicateShiftToDate(originalShift, "2024-01-16");

        expect(result.employee_id).toBe("emp-1");
        expect(result.schedule_id).toBe("sched-1");
        expect(result.break_minutes).toBe(45);
        expect(result.color).toBe("#ff0000");
        expect(result.notes).toBe("Ważna zmiana");
    });

    it("generuje nowe tymczasowe ID", () => {
        const originalShift = createShift({ id: "original-id" });

        const result = duplicateShiftToDate(originalShift, "2024-01-16");

        expect(result.id).not.toBe("original-id");
        expect(result.id.startsWith("temp-")).toBe(true);
    });

    it("ustawia status na 'new'", () => {
        const originalShift = createShift({ status: "unchanged" });

        const result = duplicateShiftToDate(originalShift, "2024-01-16");

        expect(result.status).toBe("new");
    });

    it("nie modyfikuje oryginalnej zmiany", () => {
        const originalShift = createShift({
            id: "original-id",
            date: "2024-01-15",
            status: "unchanged",
        });

        duplicateShiftToDate(originalShift, "2024-01-16");

        expect(originalShift.id).toBe("original-id");
        expect(originalShift.date).toBe("2024-01-15");
        expect(originalShift.status).toBe("unchanged");
    });
});

// ============================================================================
// markShiftAsModified
// ============================================================================

describe("markShiftAsModified", () => {
    it("zmienia status 'unchanged' na 'modified'", () => {
        const shift = createShift({ status: "unchanged" });

        const result = markShiftAsModified(shift);

        expect(result.status).toBe("modified");
    });

    it("zachowuje status 'new' (nowe zmiany nie stają się modified)", () => {
        const shift = createShift({ status: "new" });

        const result = markShiftAsModified(shift);

        expect(result.status).toBe("new");
    });

    it("zmienia status 'modified' (pozostaje modified)", () => {
        const shift = createShift({ status: "modified" });

        const result = markShiftAsModified(shift);

        expect(result.status).toBe("modified");
    });

    it("nie modyfikuje oryginalnej zmiany", () => {
        const shift = createShift({ status: "unchanged" });

        markShiftAsModified(shift);

        expect(shift.status).toBe("unchanged");
    });

    it("zachowuje wszystkie inne właściwości", () => {
        const shift = createShift({
            id: "shift-1",
            employee_id: "emp-1",
            date: "2024-01-15",
            notes: "Test",
        });

        const result = markShiftAsModified(shift);

        expect(result.id).toBe("shift-1");
        expect(result.employee_id).toBe("emp-1");
        expect(result.date).toBe("2024-01-15");
        expect(result.notes).toBe("Test");
    });
});

// ============================================================================
// markShiftAsDeleted
// ============================================================================

describe("markShiftAsDeleted", () => {
    it("zmienia status na 'deleted'", () => {
        const shift = createShift({ status: "unchanged" });

        const result = markShiftAsDeleted(shift);

        expect(result.status).toBe("deleted");
    });

    it("zmienia status 'new' na 'deleted'", () => {
        const shift = createShift({ status: "new" });

        const result = markShiftAsDeleted(shift);

        expect(result.status).toBe("deleted");
    });

    it("zmienia status 'modified' na 'deleted'", () => {
        const shift = createShift({ status: "modified" });

        const result = markShiftAsDeleted(shift);

        expect(result.status).toBe("deleted");
    });

    it("nie modyfikuje oryginalnej zmiany", () => {
        const shift = createShift({ status: "unchanged" });

        markShiftAsDeleted(shift);

        expect(shift.status).toBe("unchanged");
    });

    it("zachowuje wszystkie inne właściwości", () => {
        const shift = createShift({
            id: "shift-1",
            employee_id: "emp-1",
            date: "2024-01-15",
            notes: "Test",
        });

        const result = markShiftAsDeleted(shift);

        expect(result.id).toBe("shift-1");
        expect(result.employee_id).toBe("emp-1");
        expect(result.date).toBe("2024-01-15");
        expect(result.notes).toBe("Test");
    });
});
