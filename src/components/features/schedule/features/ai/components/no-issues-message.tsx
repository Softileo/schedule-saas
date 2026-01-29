import { CheckCircle2 } from "lucide-react";

interface NoIssuesMessageProps {
    message?: string;
}

/**
 * Success message component displayed when no violations or issues are found
 * Used in AI generation dialogs and warnings panels
 */
export function NoIssuesMessage({
    message = "Brak naruszeń i problemów z grafikiem",
}: NoIssuesMessageProps) {
    return (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{message}</span>
        </div>
    );
}
