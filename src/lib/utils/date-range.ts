/**
 * =============================================================================
 * DATE RANGE UTILITIES - Functions for working with date ranges
 * =============================================================================
 */

/**
 * Generates an array of ISO date strings within a date range.
 * Useful for absence periods, holiday ranges, etc.
 *
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @param monthStart - Optional month start boundary in YYYY-MM-DD format
 * @param monthEnd - Optional month end boundary in YYYY-MM-DD format
 * @returns Set of ISO date strings (YYYY-MM-DD)
 *
 * @example
 * const dates = getDateRangeSet("2026-01-01", "2026-01-05");
 * // Returns: Set { "2026-01-01", "2026-01-02", ..., "2026-01-05" }
 *
 * @example
 * // With month boundaries
 * const dates = getDateRangeSet("2025-12-28", "2026-01-05", "2026-01-01", "2026-01-31");
 * // Returns only dates in January: Set { "2026-01-01", ..., "2026-01-05" }
 */
export function getDateRangeSet(
    startDate: string,
    endDate: string,
    monthStart?: string,
    monthEnd?: string,
): Set<string> {
    const dateSet = new Set<string>();

    // Check if range overlaps with month (if boundaries provided)
    if (monthStart && monthEnd) {
        if (startDate > monthEnd || endDate < monthStart) {
            return dateSet; // No overlap
        }
    }

    // Limit range to month boundaries if provided
    const effectiveStart =
        monthStart && startDate < monthStart ? monthStart : startDate;
    const effectiveEnd = monthEnd && endDate > monthEnd ? monthEnd : endDate;

    const start = new Date(effectiveStart);
    const end = new Date(effectiveEnd);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
            2,
            "0",
        )}-${String(d.getDate()).padStart(2, "0")}`;
        dateSet.add(dateStr);
    }

    return dateSet;
}
