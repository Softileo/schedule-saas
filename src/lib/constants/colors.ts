/**
 * Centralizacja kolorów używanych w aplikacji.
 * Importuj te stałe zamiast definiować kolory lokalnie.
 */

// =============================================================================
// UJEDNOLICONA PALETA KOLORÓW (16 kolorów maksymalnie różniących się)
// =============================================================================
// Kolejność jest tak dobrana, żeby kolejne kolory były MAKSYMALNIE różne
// (przeciwległe na kole barw lub bardzo kontrastowe)
export const APP_COLORS = [
    { name: "Czerwony", value: "#ef4444", key: "red" },
    { name: "Niebieski", value: "#3b82f6", key: "blue" },
    { name: "Zielony", value: "#22c55e", key: "green" },
    { name: "Żółty", value: "#eab308", key: "yellow" },
    { name: "Fioletowy", value: "#a855f7", key: "purple" },
    { name: "Morski", value: "#14b8a6", key: "teal" },
    { name: "Brązowy", value: "#a16207", key: "brown" },
    { name: "Pomarańczowy", value: "#f97316", key: "orange" },
    { name: "Limonkowy", value: "#84cc16", key: "lime" },
    { name: "Różowy", value: "#ec4899", key: "pink" },
    { name: "Indygo", value: "#6366f1", key: "indigo" },
    { name: "Fuksja", value: "#d946ef", key: "fuchsia" },
    { name: "Błękitny", value: "#0ea5e9", key: "sky" },
    { name: "Cyjan", value: "#06b6d4", key: "cyan" },
    { name: "Karminowy", value: "#dc2626", key: "crimson" },
    { name: "Szmaragdowy", value: "#059669", key: "emerald" },
] as const;

// Proste tablice dla kompatybilności wstecznej
export const PRESET_COLORS = APP_COLORS.map((c) => c.value);
export const TEMPLATE_COLORS = APP_COLORS.map((c) => c.value);
export const SHIFT_COLORS = APP_COLORS.map((c) => ({
    name: c.name,
    value: c.value,
}));

// =============================================================================
// KOLORY PRACOWNIKÓW
// =============================================================================

/**
 * Domyślny kolor dla pracownika
 */
export const DEFAULT_EMPLOYEE_COLOR = "#3b82f6";

/**
 * Zwraca unikalny kolor dla nowego pracownika.
 * Kolory są wybierane SEKWENCYJNIE z palety APP_COLORS,
 * która jest uporządkowana tak, że kolejne kolory są MAKSYMALNIE różne.
 * Jeśli wszystkie kolory są zajęte, wraca na początek palety.
 *
 * @param usedColors - tablica kolorów już używanych przez pracowników
 * @returns unikalny kolor hex
 */
export function getUniqueEmployeeColor(usedColors: string[] = []): string {
    const allColors = APP_COLORS.map((c) => c.value);

    // Znajdź pierwszy wolny kolor w kolejności palety
    for (const color of allColors) {
        if (!usedColors.includes(color)) {
            return color;
        }
    }

    // Jeśli wszystkie są zajęte, znajdź najmniej używany (ale w kolejności palety)
    const colorCounts = new Map<string, number>();
    allColors.forEach((color) => colorCounts.set(color, 0));
    usedColors.forEach((color) => {
        if (colorCounts.has(color)) {
            colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
        }
    });

    // Zwróć pierwszy kolor z najmniejszą liczbą użyć (w kolejności palety)
    let minCount = Infinity;
    for (const color of allColors) {
        const count = colorCounts.get(color) || 0;
        if (count < minCount) {
            minCount = count;
        }
    }

    // Zwróć pierwszy kolor z tą minimalną liczbą użyć
    for (const color of allColors) {
        if ((colorCounts.get(color) || 0) === minCount) {
            return color;
        }
    }

    return allColors[0];
}

/**
 * Alias dla getUniqueEmployeeColor (dla kompatybilności wstecznej).
 * @deprecated Użyj getUniqueEmployeeColor zamiast tego
 */
export const getRandomColor = getUniqueEmployeeColor;

// =============================================================================
// MAPOWANIE NAZW (dla kompatybilności)
// =============================================================================

/**
 * Mapowanie nazwy koloru na wartość hex
 */
export const COLOR_NAME_MAP: Record<string, string> = Object.fromEntries(
    APP_COLORS.map((c) => [c.key, c.value])
);
