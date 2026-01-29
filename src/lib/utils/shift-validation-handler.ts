/**
 * =============================================================================
 * SHIFT VALIDATION HANDLER - Handles validation errors for shift operations
 * =============================================================================
 */


import { Employee } from "@/components/features/setup/wizard/types";
import type { ValidationError } from "@/lib/core/schedule/validation";

interface ValidationHandlerCallbacks {
    toastEmployeeAbsence: (employee: Employee) => void;
    toastNotAssignedToTemplate: (
        employee: Employee,
        startTime: string,
        endTime: string,
    ) => void;
    toastAlreadyWorking: (employee: Employee) => void;
    toastRestViolation?: (employee: Employee) => void;
}

/**
 * Handles validation errors and displays appropriate toast messages.
 * Returns true if there was an error (operation should be cancelled).
 *
 * @param validationError - The validation error to handle
 * @param employee - The employee involved in the operation
 * @param callbacks - Toast callback functions
 * @returns true if validation failed, false if validation passed
 */
export function handleShiftValidationError(
    validationError: ValidationError | null,
    employee: Employee,
    callbacks: ValidationHandlerCallbacks,
): boolean {
    if (!validationError) {
        return false;
    }

    switch (validationError.type) {
        case "absence":
            callbacks.toastEmployeeAbsence(employee);
            return true;
        case "not_assigned":
            if (validationError.startTime && validationError.endTime) {
                callbacks.toastNotAssignedToTemplate(
                    employee,
                    validationError.startTime,
                    validationError.endTime,
                );
            }
            return true;
        case "already_working":
            callbacks.toastAlreadyWorking(employee);
            return true;
        case "rest_violation":
            if (callbacks.toastRestViolation) {
                callbacks.toastRestViolation(employee);
            }
            return true;
    }

    return false;
}
