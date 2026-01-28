/**
 * =============================================================================
 * SHIFT TEMPLATE VALIDATION
 * =============================================================================
 *
 * Walidacja szablonów zmian względem godzin otwarcia firmy.
 */

import { DAY_KEY_MAP, DAY_NAMES_SHORT } from "@/lib/constants/days";
import type { OpeningHours } from "@/types";

export interface ShiftTemplateForValidation {
    applicableDays: number[];
}

/**
 * Sprawdza czy szablon zmiany jest poprawny względem godzin otwarcia.
 * Zwraca komunikat błędu lub null jeśli walidacja przeszła.
 *
 * @param template - Szablon zmiany do walidacji
 * @param openingHours - Godziny otwarcia firmy
 * @returns Komunikat błędu lub null
 *
 * @example
 * const error = getShiftValidationError(template, openingHours);
 * if (error) {
 *   showError(error);
 * }
 */
export function getShiftValidationError(
    template: ShiftTemplateForValidation,
    openingHours: OpeningHours
): string | null {
    if (template.applicableDays.length === 0) {
        return "Wybierz przynajmniej jeden dzień";
    }

    const closedDays: string[] = [];

    for (const dayIndex of template.applicableDays) {
        const dayKey = DAY_KEY_MAP[dayIndex];
        const dayHours = openingHours[dayKey];

        if (!dayHours.enabled) {
            closedDays.push(DAY_NAMES_SHORT[dayIndex]);
        }
    }

    // Wszystkie wybrane dni są zamknięte
    if (
        closedDays.length > 0 &&
        closedDays.length === template.applicableDays.length
    ) {
        return `Firma jest zamknięta w wybrane dni (${closedDays.join(", ")})`;
    }

    // Niektóre wybrane dni są zamknięte (ostrzeżenie)
    if (closedDays.length > 0) {
        return `Firma jest zamknięta: ${closedDays.join(", ")}`;
    }

    return null;
}
