"use client";

/**
 * =============================================================================
 * EMPLOYEE STATS GRID - Siatka ze statystykami pracowników
 * =============================================================================
 */

import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types";
import {
    getEmployeeColor,
    getEmployeeInitials,
} from "@/lib/core/employees/utils";
import { SIGNIFICANT_HOURS_SURPLUS } from "@/lib/constants/labor-code";
import type { EmployeeStats } from "./types";

interface EmployeeStatsGridProps {
    stats: EmployeeStats[];
    employees: Employee[];
    totalShifts: number;
}

/**
 * Siatka ze statystykami zmian dla każdego pracownika
 */
export function EmployeeStatsGrid({
    stats,
    employees,
    totalShifts,
}: EmployeeStatsGridProps) {
    return (
        <div className="space-y-2">
            <h4 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Przydzielone zmiany ({totalShifts} łącznie)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {stats.map((stat) => {
                    const emp = employees.find((e) => e.id === stat.employeeId);
                    const hasViolations =
                        stat.violations && stat.violations.length > 0;
                    const hoursDiffOk =
                        Math.abs(stat.hoursDiff) <= SIGNIFICANT_HOURS_SURPLUS;
                    // Jeśli ma nieobecności i godziny się zgadzają - pokazuj na zielono
                    const hasAbsenceAndOk =
                        (stat.absenceHours ?? 0) > 0 && hoursDiffOk;

                    return (
                        <EmployeeStatCard
                            key={stat.employeeId}
                            stat={stat}
                            employee={emp}
                            hasViolations={hasViolations}
                            hoursDiffOk={hoursDiffOk}
                            hasAbsenceAndOk={hasAbsenceAndOk}
                        />
                    );
                })}
            </div>
        </div>
    );
}

// =============================================================================
// SUBCOMPONENTS
// =============================================================================

interface EmployeeStatCardProps {
    stat: EmployeeStats;
    employee: Employee | undefined;
    hasViolations: boolean;
    hoursDiffOk: boolean;
    hasAbsenceAndOk: boolean;
}

function EmployeeStatCard({
    stat,
    employee,
    hasViolations,
    hoursDiffOk,
    hasAbsenceAndOk,
}: EmployeeStatCardProps) {
    return (
        <div
            className={cn(
                "flex items-center gap-2 p-2 rounded-lg border",
                hasViolations
                    ? "bg-red-50 border-red-200"
                    : !hoursDiffOk
                    ? "bg-amber-50 border-amber-200"
                    : hasAbsenceAndOk
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-slate-50 border-slate-200"
            )}
        >
            {employee && (
                <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                    style={{ backgroundColor: getEmployeeColor(employee) }}
                >
                    {getEmployeeInitials(employee)}
                </div>
            )}
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 truncate">
                    {stat.employeeName.split(" ")[0]}
                </p>
                <p className="text-xs flex items-center gap-1 flex-wrap">
                    <ShiftsByTemplateDisplay
                        shiftsByTemplate={stat.shiftsByTemplate}
                        totalShifts={stat.totalShifts}
                    />
                    <span
                        className={cn(
                            hasAbsenceAndOk
                                ? "text-emerald-600 font-medium"
                                : "text-slate-600"
                        )}
                    >
                        {stat.totalHours}h
                        {hasAbsenceAndOk && ` (${stat.absenceHours}h nieoб.)`}
                    </span>
                </p>
            </div>
        </div>
    );
}

interface ShiftsByTemplateDisplayProps {
    shiftsByTemplate: EmployeeStats["shiftsByTemplate"];
    totalShifts: number;
}

function ShiftsByTemplateDisplay({
    shiftsByTemplate,
    totalShifts,
}: ShiftsByTemplateDisplayProps) {
    if (shiftsByTemplate && shiftsByTemplate.length > 0) {
        return (
            <>
                {shiftsByTemplate.map((tpl, idx) => (
                    <span
                        key={tpl.templateId}
                        className="flex items-center gap-0.5"
                    >
                        {idx > 0 && <span className="text-slate-400">/</span>}
                        <span
                            className="font-medium"
                            style={{ color: tpl.templateColor }}
                        >
                            {tpl.count}
                        </span>
                    </span>
                ))}
            </>
        );
    }

    return <span className="text-slate-500">{totalShifts} zmian</span>;
}
