/**
 * =============================================================================
 * TESTY JEDNOSTKOWE - EMPLOYEE HELPERS
 * =============================================================================
 */

import { describe, it, expect } from "vitest";
import {
    capitalize,
    getEmployeeFullName,
    getEmployeeColor,
    getInitials,
    getEmployeeInitials,
    getInitialsFromName,
    DEFAULT_EMPLOYEE_COLOR,
} from "@/lib/core/employees/utils";
import type { Employee } from "@/types";

// =============================================================================
// HELPERS
// =============================================================================

function createEmployee(
    firstName: string,
    lastName: string,
    color?: string
): Employee {
    return {
        id: "emp-1",
        organization_id: "org-1",
        first_name: firstName,
        last_name: lastName,
        email: `${firstName.toLowerCase()}@example.com`,
        phone: null,
        position: null,
        employment_type: "full",
        custom_hours: null,
        is_active: true,
        color: color ?? null,
        created_at: "",
        updated_at: "",
    };
}

// =============================================================================
// TESTY: capitalize
// =============================================================================

describe("capitalize", () => {
    it("kapitalizuje pierwszą literę", () => {
        expect(capitalize("jan")).toBe("Jan");
        expect(capitalize("kowalski")).toBe("Kowalski");
    });

    it("zmienia resztę na małe litery", () => {
        expect(capitalize("JAN")).toBe("Jan");
        expect(capitalize("KOWALSKI")).toBe("Kowalski");
    });

    it("obsługuje mieszane wielkości liter", () => {
        expect(capitalize("jAn")).toBe("Jan");
        expect(capitalize("koWALski")).toBe("Kowalski");
    });

    it("zwraca pusty string dla pustego inputu", () => {
        expect(capitalize("")).toBe("");
    });

    it("obsługuje pojedynczą literę", () => {
        expect(capitalize("a")).toBe("A");
        expect(capitalize("A")).toBe("A");
    });
});

// =============================================================================
// TESTY: getEmployeeFullName
// =============================================================================

describe("getEmployeeFullName", () => {
    it("zwraca pełne imię i nazwisko", () => {
        const emp = { first_name: "jan", last_name: "kowalski" };
        expect(getEmployeeFullName(emp)).toBe("Jan Kowalski");
    });

    it("kapitalizuje obie części", () => {
        const emp = { first_name: "ANNA", last_name: "NOWAK" };
        expect(getEmployeeFullName(emp)).toBe("Anna Nowak");
    });

    it("obsługuje imiona z polskimi znakami", () => {
        const emp = { first_name: "żaneta", last_name: "świątek" };
        // capitalize zmieni tylko pierwszą literę
        expect(getEmployeeFullName(emp)).toBe("Żaneta Świątek");
    });
});

// =============================================================================
// TESTY: getEmployeeColor
// =============================================================================

describe("getEmployeeColor", () => {
    it("zwraca kolor pracownika gdy ustawiony", () => {
        const emp = createEmployee("Jan", "Kowalski", "#ff0000");
        expect(getEmployeeColor(emp)).toBe("#ff0000");
    });

    it("zwraca domyślny kolor gdy pracownik nie ma koloru", () => {
        const emp = createEmployee("Jan", "Kowalski");
        expect(getEmployeeColor(emp)).toBe(DEFAULT_EMPLOYEE_COLOR);
    });

    it("zwraca domyślny kolor dla null", () => {
        expect(getEmployeeColor(null)).toBe(DEFAULT_EMPLOYEE_COLOR);
    });

    it("zwraca domyślny kolor dla undefined", () => {
        expect(getEmployeeColor(undefined)).toBe(DEFAULT_EMPLOYEE_COLOR);
    });
});

// =============================================================================
// TESTY: getInitials
// =============================================================================

describe("getInitials", () => {
    it("zwraca inicjały z imienia i nazwiska", () => {
        expect(getInitials("Jan", "Kowalski")).toBe("JK");
        expect(getInitials("Anna", "Nowak")).toBe("AN");
    });

    it("zwraca wielkie litery", () => {
        expect(getInitials("jan", "kowalski")).toBe("JK");
    });

    it("obsługuje puste stringi", () => {
        expect(getInitials("", "")).toBe("");
        expect(getInitials("Jan", "")).toBe("J");
        expect(getInitials("", "Kowalski")).toBe("K");
    });
});

// =============================================================================
// TESTY: getEmployeeInitials
// =============================================================================

describe("getEmployeeInitials", () => {
    it("zwraca inicjały z obiektu pracownika", () => {
        const emp = { first_name: "Jan", last_name: "Kowalski" };
        expect(getEmployeeInitials(emp)).toBe("JK");
    });

    it("obsługuje małe litery", () => {
        const emp = { first_name: "anna", last_name: "nowak" };
        expect(getEmployeeInitials(emp)).toBe("AN");
    });
});

// =============================================================================
// TESTY: getInitialsFromName
// =============================================================================

describe("getInitialsFromName", () => {
    it("zwraca inicjały z pełnej nazwy", () => {
        expect(getInitialsFromName("Jan Kowalski")).toBe("JK");
        expect(getInitialsFromName("Anna Maria Nowak")).toBe("AN"); // pierwsza i ostatnia
    });

    it("obsługuje pojedyncze słowo", () => {
        expect(getInitialsFromName("Jan")).toBe("JA"); // pierwsze 2 znaki
    });

    it("obsługuje wiele słów (bierze pierwsze i ostatnie)", () => {
        expect(getInitialsFromName("Jan Adam Kowalski")).toBe("JK");
    });

    it("zwraca wielkie litery", () => {
        expect(getInitialsFromName("jan kowalski")).toBe("JK");
    });
});
