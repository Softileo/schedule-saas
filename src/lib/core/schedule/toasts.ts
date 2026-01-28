import { toast } from "sonner";
import { getEmployeeFullName } from "@/lib/core/employees/utils";
import type { Employee } from "@/types";

/**
 * Toast messages dla walidacji drag & drop w grafiku
 */

// Nieobecność
export function toastEmployeeAbsence(employee: Employee): void {
    toast.warning(`${getEmployeeFullName(employee)} ma nieobecność!`);
}

// Nie przypisany do zmiany
export function toastNotAssignedToTemplate(
    employee: Employee,
    startTime: string,
    endTime: string
): void {
    toast.warning(
        `${employee.first_name} nie jest przypisany do zmiany ${startTime.slice(
            0,
            5
        )}-${endTime.slice(0, 5)}`
    );
}

// Już pracuje tego dnia
export function toastAlreadyWorking(employee: Employee): void {
    toast.warning(`${getEmployeeFullName(employee)} już pracuje tego dnia!`);
}

// Naruszenie 11h odpoczynku
export function toastRestViolation(employee: Employee): void {
    toast.warning(
        `Dodanie zmiany narusza 11h odpoczynku dla ${getEmployeeFullName(
            employee
        )}!`
    );
}

// Komplet godzin osiągnięty
export function toastHoursComplete(
    employee: Employee,
    scheduled: number,
    required: number
): void {
    toast.success(
        `${getEmployeeFullName(employee)} ma komplet godzin (${Math.round(
            scheduled
        )}/${required}h)`
    );
}

// Zmiana przeniesiona
export function toastShiftMoved(employee: Employee): void {
    toast.success(`Przeniesiono zmianę ${getEmployeeFullName(employee)}`);
}
