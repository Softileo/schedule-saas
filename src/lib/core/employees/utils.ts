import type { Employee } from "@/types";
import { DEFAULT_EMPLOYEE_COLOR } from "@/lib/constants/colors";

// Re-eksportuj dla kompatybilności wstecznej
export { DEFAULT_EMPLOYEE_COLOR } from "@/lib/constants/colors";

/**
 * Capitalize - pierwsza litera wielka, reszta mała
 */
export function capitalize(str: string): string {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Pobiera pełne imię i nazwisko pracownika (sformatowane)
 */
export function getEmployeeFullName(employee: {
    first_name: string;
    last_name: string;
}): string {
    return `${capitalize(employee.first_name)} ${capitalize(
        employee.last_name
    )}`;
}

/**
 * Pobiera kolor pracownika lub zwraca domyślny
 */
export function getEmployeeColor(
    employee: Employee | (Employee & { color?: string }) | undefined | null
): string {
    if (!employee) return DEFAULT_EMPLOYEE_COLOR;
    return (
        (employee as Employee & { color?: string }).color ||
        DEFAULT_EMPLOYEE_COLOR
    );
}

/**
 * Generuje inicjały z imienia i nazwiska
 */
export function getInitials(firstName: string, lastName: string): string {
    return `${(firstName[0] || "").toUpperCase()}${(
        lastName[0] || ""
    ).toUpperCase()}`;
}

/**
 * Generuje inicjały z obiektu pracownika
 */
export function getEmployeeInitials(employee: {
    first_name: string;
    last_name: string;
}): string {
    return getInitials(employee.first_name, employee.last_name);
}

/**
 * Generuje inicjały z pełnej nazwy (string)
 * @param name - Pełna nazwa (np. "Jan Kowalski")
 * @returns Inicjały (np. "JK")
 */
export function getInitialsFromName(name: string): string {
    const parts = name.split(" ").filter(Boolean);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}
