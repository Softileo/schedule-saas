/**
 * =============================================================================
 * EMPLOYMENT TYPES - Typy etatów
 * =============================================================================
 *
 * Centralna definicja typów etatów używanych w całej aplikacji.
 * Zmiana tutaj automatycznie aktualizuje wszystkie miejsca.
 */

/**
 * Typ etatu pracownika
 */
export type EmploymentType =
    | "full"
    | "three_quarter"
    | "half"
    | "one_third"
    | "custom";

/**
 * Konfiguracja pojedynczego typu etatu
 */
export interface EmploymentTypeConfig {
    value: EmploymentType;
    label: string; // Pełna etykieta np. "Pełny etat"
    shortLabel: string; // Skrócona np. "1/1"
    hoursPerDay: number; // Godziny dziennie
    fraction?: string; // Ułamek np. "¾"
}

/**
 * Definicje wszystkich typów etatów
 * Kolejność = kolejność wyświetlania w selectach
 */
export const EMPLOYMENT_TYPES: EmploymentTypeConfig[] = [
    {
        value: "full",
        label: "Pełny etat",
        shortLabel: "1/1",
        hoursPerDay: 8,
        fraction: "1",
    },
    {
        value: "three_quarter",
        label: "¾ etatu",
        shortLabel: "3/4",
        hoursPerDay: 6,
        fraction: "¾",
    },
    {
        value: "half",
        label: "½ etatu",
        shortLabel: "1/2",
        hoursPerDay: 4,
        fraction: "½",
    },
    {
        value: "one_third",
        label: "⅓ etatu",
        shortLabel: "1/3",
        hoursPerDay: 2.67,
        fraction: "⅓",
    },
    {
        value: "custom",
        label: "Niestandardowy",
        shortLabel: "Inne",
        hoursPerDay: 0, // Definiowane przez customHours
    },
];

/**
 * Mapa dla szybkiego dostępu po kluczu
 */
export const EMPLOYMENT_TYPE_MAP: Record<EmploymentType, EmploymentTypeConfig> =
    EMPLOYMENT_TYPES.reduce((acc, config) => {
        acc[config.value] = config;
        return acc;
    }, {} as Record<EmploymentType, EmploymentTypeConfig>);

/**
 * Lista wartości (do walidacji, enumów itp.)
 * Jako tuple dla kompatybilności z Zod
 */
export const EMPLOYMENT_TYPE_VALUES = [
    "full",
    "three_quarter",
    "half",
    "one_third",
    "custom",
] as const;

/**
 * Zwraca pełną etykietę typu etatu
 */
export function getEmploymentTypeLabel(type: EmploymentType): string {
    return EMPLOYMENT_TYPE_MAP[type]?.label ?? type;
}

/**
 * Zwraca krótką etykietę typu etatu
 */
export function getEmploymentTypeShortLabel(type: EmploymentType): string {
    return EMPLOYMENT_TYPE_MAP[type]?.shortLabel ?? type;
}

/**
 * Zwraca godziny dziennie dla typu etatu
 */
export function getEmploymentTypeHoursPerDay(
    type: EmploymentType,
    customHours?: number
): number {
    if (type === "custom") {
        return customHours ?? 8;
    }
    return EMPLOYMENT_TYPE_MAP[type]?.hoursPerDay ?? 8;
}

/**
 * Opcje do selecta - bez "custom" jeśli nie chcemy
 */
export function getEmploymentTypeOptions(
    includeCustom = true
): EmploymentTypeConfig[] {
    return includeCustom
        ? EMPLOYMENT_TYPES
        : EMPLOYMENT_TYPES.filter((t) => t.value !== "custom");
}
