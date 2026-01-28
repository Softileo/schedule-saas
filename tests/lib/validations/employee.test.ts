/**
 * =============================================================================
 * TESTY JEDNOSTKOWE - EMPLOYEE VALIDATIONS
 * =============================================================================
 */

import { describe, it, expect } from "vitest";
import {
    employeeSchema,
    employeeUpdateSchema,
} from "@/lib/validations/employee";

// =============================================================================
// TESTY: employeeSchema
// =============================================================================

describe("employeeSchema", () => {
    it("akceptuje pełne poprawne dane dla pełnego etatu", () => {
        const data = {
            firstName: "Jan",
            lastName: "Kowalski",
            email: "jan@example.com",
            phone: "+48123456789",
            employmentType: "full" as const,
            customHours: null,
        };

        const result = employeeSchema.safeParse(data);
        expect(result.success).toBe(true);
    });

    it("akceptuje dane z połową etatu", () => {
        const data = {
            firstName: "Anna",
            lastName: "Nowak",
            email: "anna@example.com",
            phone: "",
            employmentType: "half" as const,
            customHours: null,
        };

        const result = employeeSchema.safeParse(data);
        expect(result.success).toBe(true);
    });

    it("akceptuje dane z custom godzinami", () => {
        const data = {
            firstName: "Piotr",
            lastName: "Wiśniewski",
            email: "",
            phone: "",
            employmentType: "custom" as const,
            customHours: 6,
        };

        const result = employeeSchema.safeParse(data);
        expect(result.success).toBe(true);
    });

    it("akceptuje minimalne wymagane dane", () => {
        const data = {
            firstName: "Jan",
            lastName: "Kowalski",
            employmentType: "full" as const,
        };

        const result = employeeSchema.safeParse(data);
        expect(result.success).toBe(true);
    });

    it("odrzuca puste imię", () => {
        const data = {
            firstName: "",
            lastName: "Kowalski",
            employmentType: "full" as const,
        };

        const result = employeeSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it("odrzuca puste nazwisko", () => {
        const data = {
            firstName: "Jan",
            lastName: "",
            employmentType: "full" as const,
        };

        const result = employeeSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it("odrzuca nieprawidłowy typ etatu", () => {
        const data = {
            firstName: "Jan",
            lastName: "Kowalski",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            employmentType: "invalid" as any,
        };

        const result = employeeSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it("odrzuca nieprawidłowy email", () => {
        const data = {
            firstName: "Jan",
            lastName: "Kowalski",
            email: "not-an-email",
            employmentType: "full" as const,
        };

        const result = employeeSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it("odrzuca customHours < 1", () => {
        const data = {
            firstName: "Jan",
            lastName: "Kowalski",
            employmentType: "custom" as const,
            customHours: 0,
        };

        const result = employeeSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it("odrzuca customHours > 12", () => {
        const data = {
            firstName: "Jan",
            lastName: "Kowalski",
            employmentType: "custom" as const,
            customHours: 15,
        };

        const result = employeeSchema.safeParse(data);
        expect(result.success).toBe(false);
    });
});

// =============================================================================
// TESTY: employeeUpdateSchema
// =============================================================================

describe("employeeUpdateSchema", () => {
    it("akceptuje częściową aktualizację - tylko imię", () => {
        const data = {
            firstName: "Janusz",
        };

        const result = employeeUpdateSchema.safeParse(data);
        expect(result.success).toBe(true);
    });

    it("akceptuje częściową aktualizację - tylko nazwisko", () => {
        const data = {
            lastName: "Nowak",
        };

        const result = employeeUpdateSchema.safeParse(data);
        expect(result.success).toBe(true);
    });

    it("akceptuje częściową aktualizację - tylko email", () => {
        const data = {
            email: "new@example.com",
        };

        const result = employeeUpdateSchema.safeParse(data);
        expect(result.success).toBe(true);
    });

    it("akceptuje częściową aktualizację - tylko typ etatu", () => {
        const data = {
            employmentType: "half" as const,
        };

        const result = employeeUpdateSchema.safeParse(data);
        expect(result.success).toBe(true);
    });

    it("akceptuje pusty obiekt (brak zmian)", () => {
        const data = {};

        const result = employeeUpdateSchema.safeParse(data);
        expect(result.success).toBe(true);
    });

    it("odrzuca nieprawidłowy email przy częściowej aktualizacji", () => {
        const data = {
            email: "invalid-email",
        };

        const result = employeeUpdateSchema.safeParse(data);
        expect(result.success).toBe(false);
    });
});
