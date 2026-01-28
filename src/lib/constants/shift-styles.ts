/**
 * =============================================================================
 * STAŁE STYLÓW ZMIAN
 * =============================================================================
 *
 * Centralne definicje stylów dla różnych typów zmian.
 * Używane w całej aplikacji dla spójnego wyglądu.
 */

/**
 * Style kolorów dla typów zmian (poranna, popołudniowa, nocna)
 */
export const SHIFT_TYPE_STYLES = {
    morning: {
        bg: "bg-blue-500/15",
        text: "text-blue-700",
        border: "border-blue-200/50",
        darkBg: "dark:bg-blue-500/20",
        darkText: "dark:text-blue-400",
        darkBorder: "dark:border-blue-700/50",
    },
    afternoon: {
        bg: "bg-violet-500/15",
        text: "text-violet-700",
        border: "border-violet-200/50",
        darkBg: "dark:bg-violet-500/20",
        darkText: "dark:text-violet-400",
        darkBorder: "dark:border-violet-700/50",
    },
    night: {
        bg: "bg-slate-500/15",
        text: "text-slate-700",
        border: "border-slate-200/50",
        darkBg: "dark:bg-slate-500/20",
        darkText: "dark:text-slate-400",
        darkBorder: "dark:border-slate-600/50",
    },
} as const;

export type ShiftType = keyof typeof SHIFT_TYPE_STYLES;

/**
 * Określa typ zmiany na podstawie godziny rozpoczęcia
 * @param startTime - Czas rozpoczęcia w formacie HH:MM
 * @returns Typ zmiany: morning (przed 12), afternoon (12-20), night (po 20)
 */
export function getShiftTypeFromTime(startTime: string): ShiftType {
    const hour = parseInt(startTime.split(":")[0], 10);
    if (hour < 12) return "morning";
    if (hour < 20) return "afternoon";
    return "night";
}
