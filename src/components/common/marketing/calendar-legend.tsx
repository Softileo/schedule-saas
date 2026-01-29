/**
 * =============================================================================
 * CALENDAR LEGEND - Shared legend component for calendar tools
 * =============================================================================
 */

interface CalendarLegendProps {
    showHoverHint?: boolean;
}

export function CalendarLegend({ showHoverHint = false }: CalendarLegendProps) {
    return (
        <p className="text-gray-600 text-center mb-8 flex items-center justify-center gap-4 flex-wrap">
            <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-red-100 border border-red-200"></span>
                <span className="text-sm">
                    Święto{showHoverHint ? " (najedź kursorem)" : ""}
                </span>
            </span>
            <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 rounded text-red-400 text-xs flex items-center justify-center font-medium">
                    N
                </span>
                <span className="text-sm">Niedziela</span>
            </span>
        </p>
    );
}
