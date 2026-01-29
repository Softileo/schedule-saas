"use client";

/**
 * =============================================================================
 * WARNINGS PANEL - Ostrzeżenia i naruszenia
 * =============================================================================
 */

import { AlertCircle, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { EmployeeStats, ScheduleQuality } from "./types";
import { NoIssuesMessage } from "./no-issues-message";

// =============================================================================
// STAŁE
// =============================================================================

const MAX_VIOLATIONS_TO_SHOW = 5;
const MAX_WARNINGS_TO_SHOW = 8;
const HOURS_DIFF_THRESHOLD = 4;

interface WarningsPanelProps {
    stats: EmployeeStats[];
    scheduleQuality: ScheduleQuality | null;
}

/**
 * Panel z ostrzeżeniami, naruszeniami i problemami z grafikiem
 */
export function WarningsPanel({ stats, scheduleQuality }: WarningsPanelProps) {
    const employeesWithViolations = stats.filter(
        (s) => s.violations && s.violations.length > 0,
    );
    const employeesWithHoursDiff = stats.filter(
        (s) => Math.abs(s.hoursDiff) > HOURS_DIFF_THRESHOLD,
    );

    // Luki w obsadzie z warnings
    const staffingWarnings = scheduleQuality?.warnings || [];
    const hasStaffingIssues =
        scheduleQuality &&
        (scheduleQuality.understaffedShifts > 0 ||
            scheduleQuality.emptyDays > 0 ||
            staffingWarnings.length > 0);

    // Jeśli wszystko OK
    if (
        employeesWithViolations.length === 0 &&
        employeesWithHoursDiff.length === 0 &&
        !hasStaffingIssues
    ) {
        return <NoIssuesMessage />;
    }

    return (
        <div className="space-y-2">
            {employeesWithViolations.length > 0 && (
                <ViolationsSection employees={employeesWithViolations} />
            )}

            {employeesWithHoursDiff.length > 0 && (
                <HoursDifferenceSection employees={employeesWithHoursDiff} />
            )}

            {hasStaffingIssues && (
                <StaffingIssuesSection
                    scheduleQuality={scheduleQuality!}
                    warnings={staffingWarnings}
                />
            )}
        </div>
    );
}

// =============================================================================
// SUBCOMPONENTS
// =============================================================================

interface ViolationsSectionProps {
    employees: EmployeeStats[];
}

function ViolationsSection({ employees }: ViolationsSectionProps) {
    return (
        <div className="p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-2 text-red-700 font-medium text-sm mb-2">
                <AlertCircle className="h-4 w-4" />
                Naruszenia ({employees.length})
            </div>
            <div className="space-y-1">
                {employees.slice(0, MAX_VIOLATIONS_TO_SHOW).map((stat) => (
                    <p key={stat.employeeId} className="text-xs text-red-600">
                        <span className="font-medium">
                            {stat.employeeName}:
                        </span>{" "}
                        {stat.violations.slice(0, 2).join(", ")}
                        {stat.violations.length > 2 &&
                            ` (+${stat.violations.length - 2})`}
                    </p>
                ))}
                {employees.length > MAX_VIOLATIONS_TO_SHOW && (
                    <p className="text-xs text-red-500 italic">
                        ...i {employees.length - MAX_VIOLATIONS_TO_SHOW} więcej
                    </p>
                )}
            </div>
        </div>
    );
}

interface HoursDifferenceSectionProps {
    employees: EmployeeStats[];
}

function HoursDifferenceSection({ employees }: HoursDifferenceSectionProps) {
    return (
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-center gap-2 text-amber-700 font-medium text-sm mb-2">
                <AlertTriangle className="h-4 w-4" />
                Duże różnice godzin
            </div>
            <div className="flex flex-wrap gap-2">
                {employees.map((stat) => (
                    <Badge
                        key={stat.employeeId}
                        variant="outline"
                        className="text-xs bg-amber-100 border-amber-300 text-amber-800"
                    >
                        {stat.employeeName.split(" ")[0]}:{" "}
                        {stat.hoursDiff > 0 ? "+" : ""}
                        {stat.hoursDiff}h
                    </Badge>
                ))}
            </div>
        </div>
    );
}

interface StaffingIssuesSectionProps {
    scheduleQuality: ScheduleQuality;
    warnings: string[];
}

function StaffingIssuesSection({
    scheduleQuality,
    warnings,
}: StaffingIssuesSectionProps) {
    return (
        <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-center gap-2 text-orange-700 font-medium text-sm mb-2">
                <AlertTriangle className="h-4 w-4" />
                Luki w obsadzie
                {(scheduleQuality.understaffedShifts > 0 ||
                    scheduleQuality.emptyDays > 0) && (
                    <span className="font-normal text-orange-600">
                        ({scheduleQuality.understaffedShifts} zmian z niedoborem
                        {scheduleQuality.emptyDays > 0 &&
                            `, ${scheduleQuality.emptyDays} dni bez obsady`}
                        )
                    </span>
                )}
            </div>
            {warnings.length > 0 && (
                <div className="space-y-1 mb-2">
                    {warnings
                        .slice(0, MAX_WARNINGS_TO_SHOW)
                        .map((warning, idx) => (
                            <p key={idx} className="text-xs text-orange-600">
                                {warning}
                            </p>
                        ))}
                    {warnings.length > MAX_WARNINGS_TO_SHOW && (
                        <p className="text-xs text-orange-500 italic">
                            ...i {warnings.length - MAX_WARNINGS_TO_SHOW} więcej
                        </p>
                    )}
                </div>
            )}
            <p className="text-xs text-orange-600 mt-2 border-t border-orange-200 pt-2">
                💡 <strong>Wskazówka:</strong> Dodaj więcej pracowników lub
                utwórz dodatkowe szablony zmian dopasowane do godzin otwarcia
                (np. osobne dla niedzieli).
            </p>
        </div>
    );
}
