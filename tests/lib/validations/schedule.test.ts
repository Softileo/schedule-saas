/**
 * =============================================================================
 * TESTY JEDNOSTKOWE - SCHEDULE VALIDATIONS
 * =============================================================================
 */

import { describe, it, expect } from "vitest";
import {
    organizationFormSchema,
    shiftSchema,
    validateShiftTimes,
} from "@/lib/validations/schedule";

// =============================================================================
// TESTY: organizationFormSchema
// =============================================================================

describe("organizationFormSchema", () => {
    it("akceptuje poprawną nazwę organizacji", () => {
        const data = {
            name: "Moja Firma",
            description: "Opis firmy",
        };

        const result = organizationFormSchema.safeParse(data);
        expect(result.success).toBe(true);
    });

    it("akceptuje nazwę bez opisu", () => {
        const data = {
            name: "Moja Firma",
        };

        const result = organizationFormSchema.safeParse(data);
        expect(result.success).toBe(true);
    });

    it("akceptuje pusty opis", () => {
        const data = {
            name: "Moja Firma",
            description: "",
        };

        const result = organizationFormSchema.safeParse(data);
        expect(result.success).toBe(true);
    });

    it("odrzuca pustą nazwę", () => {
        const data = {
            name: "",
        };

        const result = organizationFormSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it("odrzuca za krótką nazwę (1 znak)", () => {
        const data = {
            name: "A",
        };

        const result = organizationFormSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it("odrzuca za długą nazwę (>100 znaków)", () => {
        const data = {
            name: "A".repeat(101),
        };

        const result = organizationFormSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it("odrzuca za długi opis (>500 znaków)", () => {
        const data = {
            name: "Moja Firma",
            description: "A".repeat(501),
        };

        const result = organizationFormSchema.safeParse(data);
        expect(result.success).toBe(false);
    });
});

// =============================================================================
// TESTY: shiftSchema
// =============================================================================

describe("shiftSchema", () => {
    it("akceptuje poprawną zmianę", () => {
        const data = {
            employeeId: "emp-123",
            date: "2026-01-15",
            startTime: "08:00",
            endTime: "16:00",
            breakMinutes: 30,
            notes: "",
        };

        const result = shiftSchema.safeParse(data);
        expect(result.success).toBe(true);
    });

    it("akceptuje zmianę bez notatki", () => {
        const data = {
            employeeId: "emp-123",
            date: "2026-01-15",
            startTime: "08:00",
            endTime: "16:00",
            breakMinutes: 0,
        };

        const result = shiftSchema.safeParse(data);
        expect(result.success).toBe(true);
    });

    it("akceptuje zmianę z notatką", () => {
        const data = {
            employeeId: "emp-123",
            date: "2026-01-15",
            startTime: "08:00",
            endTime: "16:00",
            breakMinutes: 30,
            notes: "Uwagi do zmiany",
        };

        const result = shiftSchema.safeParse(data);
        expect(result.success).toBe(true);
    });

    it("odrzuca pusty employeeId", () => {
        const data = {
            employeeId: "",
            date: "2026-01-15",
            startTime: "08:00",
            endTime: "16:00",
            breakMinutes: 30,
        };

        const result = shiftSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it("odrzuca pustą datę", () => {
        const data = {
            employeeId: "emp-123",
            date: "",
            startTime: "08:00",
            endTime: "16:00",
            breakMinutes: 30,
        };

        const result = shiftSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it("odrzuca nieprawidłowy format godziny rozpoczęcia", () => {
        const data = {
            employeeId: "emp-123",
            date: "2026-01-15",
            startTime: "8:00", // bez wiodącego zera
            endTime: "16:00",
            breakMinutes: 30,
        };

        const result = shiftSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it("odrzuca nieprawidłowy format godziny zakończenia", () => {
        const data = {
            employeeId: "emp-123",
            date: "2026-01-15",
            startTime: "08:00",
            endTime: "16:0", // niepełny
            breakMinutes: 30,
        };

        const result = shiftSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it("odrzuca gdy godzina zakończenia <= godzina rozpoczęcia", () => {
        const data = {
            employeeId: "emp-123",
            date: "2026-01-15",
            startTime: "16:00",
            endTime: "08:00", // wcześniej niż start
            breakMinutes: 30,
        };

        const result = shiftSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].message).toContain("późniejsza");
        }
    });

    it("odrzuca ujemną przerwę", () => {
        const data = {
            employeeId: "emp-123",
            date: "2026-01-15",
            startTime: "08:00",
            endTime: "16:00",
            breakMinutes: -15,
        };

        const result = shiftSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it("odrzuca przerwę dłuższą niż 2 godziny", () => {
        const data = {
            employeeId: "emp-123",
            date: "2026-01-15",
            startTime: "08:00",
            endTime: "16:00",
            breakMinutes: 150, // 2.5h
        };

        const result = shiftSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it("odrzuca za długą notatkę (>500 znaków)", () => {
        const data = {
            employeeId: "emp-123",
            date: "2026-01-15",
            startTime: "08:00",
            endTime: "16:00",
            breakMinutes: 30,
            notes: "A".repeat(501),
        };

        const result = shiftSchema.safeParse(data);
        expect(result.success).toBe(false);
    });
});

// =============================================================================
// TESTY: validateShiftTimes
// =============================================================================

describe("validateShiftTimes", () => {
    it("zwraca true gdy end > start", () => {
        expect(validateShiftTimes("08:00", "16:00")).toBe(true);
    });

    it("zwraca false gdy end < start", () => {
        expect(validateShiftTimes("16:00", "08:00")).toBe(false);
    });

    it("zwraca false gdy end = start", () => {
        expect(validateShiftTimes("08:00", "08:00")).toBe(false);
    });

    it("obsługuje różne formaty czasów", () => {
        expect(validateShiftTimes("08:30", "16:45")).toBe(true);
        expect(validateShiftTimes("00:00", "23:59")).toBe(true);
    });
});
