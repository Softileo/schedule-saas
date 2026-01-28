"use client";

import { memo } from "react";
import { AlertTriangle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

// Krótkie etykiety nieobecności
const ABSENCE_SHORT_LABELS: Record<string, string> = {
    vacation: "URL",
    sick_leave: "L4",
    on_demand: "UZ",
    unpaid_leave: "UB",
    training_paid: "SZK",
    training_unpaid: "SZK",
    day_off: "DW",
    child_care: "OP",
    maternity: "MAC",
    paternity: "OJC",
    other: "NB",
};

export interface ShiftStat {
    timeLabel: string; // "06:00-14:00"
    count: number;
    color: string;
}

/**
 * Memoized employee row component to prevent unnecessary re-renders
 */
interface EmployeeRowProps {
    employee: {
        id: string;
        first_name: string;
        last_name?: string | null;
        color: string | null;
    };
    scheduled: number;
    required: number;
    shiftStats?: ShiftStat[];
    absenceInfo?: { type: string; days: number; paidHours: number } | null;
    violations?: { type: string; description: string; details?: string }[];
}

const DEFAULT_COLOR = "#6366f1";

export const EmployeeRowMemo = memo(function EmployeeRow({
    employee,
    scheduled,
    required,
    shiftStats = [],
    absenceInfo,
    violations = [],
}: EmployeeRowProps) {
    // Godziny z płatnych nieobecności
    const paidAbsenceHours = absenceInfo?.paidHours || 0;
    // Suma: przepracowane + płatne nieobecności
    const effectiveHours = scheduled + paidAbsenceHours;

    // Dokładnie wymagane godziny (z tolerancją do 2h) = zielony
    const isExact = required > 0 && Math.abs(effectiveHours - required) <= 2;
    // Znaczące nadgodziny (>2h ponad normę) = pomarańczowy
    const hasSignificantOvertime = effectiveHours > required + 2;
    // Czy są naruszenia
    const hasViolations = violations.length > 0;

    // Klasy dla całego wiersza pracownika - tło i obramowanie po lewej
    const rowClasses = cn(
        "h-16 px-2.5 flex items-center gap-2.5 bg-white",
        "border-b border-l-4 transition-colors",
        hasViolations
            ? "bg-red-50/80 border-l-red-500 border-b-red-200/50"
            : hasSignificantOvertime
            ? "bg-amber-50/50 border-l-amber-400 border-b-slate-200"
            : isExact
            ? "bg-emerald-50/50 border-l-emerald-400 border-b-slate-200"
            : "border-l-transparent border-b-slate-200 hover:bg-slate-50/50"
    );

    // Kolor tekstu godzin
    const hoursColor = hasViolations
        ? "text-red-600 font-medium"
        : hasSignificantOvertime
        ? "text-amber-600 font-medium"
        : isExact
        ? "text-emerald-600 font-medium"
        : "text-slate-400";

    const bgColor = employee.color || DEFAULT_COLOR;
    const initials = `${(employee.first_name[0] || "").toUpperCase()}${(
        employee.last_name?.[0] || ""
    ).toUpperCase()}`;

    return (
        <div className={rowClasses}>
            {/* Avatar */}
            <div
                className="w-8 h-8 rounded-lg hidden sm:flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm"
                style={{ backgroundColor: bgColor }}
            >
                {initials}
            </div>

            {/* Dane pracownika */}
            <div className="min-w-0 flex-1 flex flex-col justify-start items-start gap-0.5">
                {/* Linia 1: Imię + Ikony ostrzeżeń */}
                <div className="flex items-center  w-full">
                    <span className="text-xs font-semibold text-slate-700 truncate leading-tight">
                        {employee.first_name} {employee.last_name}
                    </span>
                    {hasViolations && (
                        <TooltipProvider delayDuration={0}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="cursor-help shrink-0">
                                        <AlertTriangle className="h-3 w-3 text-red-500" />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent
                                    side="right"
                                    align="start"
                                    className="bg-white border-red-200 max-w-70 p-0 overflow-hidden shadow-xl z-50"
                                >
                                    <div className="bg-red-50/80 px-3 py-2 border-b border-red-100 flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                                        <span className="text-xs font-bold text-red-900">
                                            Wykryto naruszenia (
                                            {violations.length})
                                        </span>
                                    </div>
                                    <div className="p-2.5 space-y-2.5 bg-white">
                                        {violations.map((v, i) => (
                                            <div
                                                key={i}
                                                className="flex gap-2 items-start"
                                            >
                                                <div className="w-1 h-1 rounded-full bg-red-400 mt-1.5 shrink-0" />
                                                <div className="text-xs space-y-0.5">
                                                    <div className="font-semibold text-slate-800 leading-tight">
                                                        {v.description}
                                                    </div>
                                                    {v.details && (
                                                        <div className="text-slate-500 leading-tight">
                                                            {v.details}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>

                {/* Linia 2: Godziny */}
                <div className="w-full -mt-2">
                    <span
                        className={cn(
                            "text-[10px] font-medium tabular-nums shrink-0",
                            hoursColor
                        )}
                    >
                        {scheduled}/{required}h
                        {absenceInfo && absenceInfo.days > 0 && (
                            <span className="text-amber-600 ml-0.5">
                                +{absenceInfo.days}d
                            </span>
                        )}
                    </span>
                </div>

                {/* Linia 3: Statystyki zmian (pigułki) - scrollowalne */}
                {shiftStats && shiftStats.length > 0 && (
                    <div
                        className="flex items-center gap-1 overflow-x-auto no-scrollbar w-full"
                        style={{
                            scrollbarWidth: "none",
                            msOverflowStyle: "none",
                        }}
                    >
                        {shiftStats.map((stat, idx) => (
                            <TooltipProvider key={idx} delayDuration={0}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span
                                            className="text-[9px] font-bold px-1 rounded-[3px] cursor-help transition-opacity hover:opacity-80 leading-none py-0.5 whitespace-nowrap shrink-0"
                                            style={{
                                                backgroundColor: `${stat.color}15`,
                                                color: stat.color,
                                                border: `1px solid ${stat.color}40`,
                                            }}
                                        >
                                            {stat.count}
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent
                                        side="bottom"
                                        className="text-xs flex items-center justify-center"
                                    >
                                        <div className="font-semibold mr-1.5">
                                            {stat.timeLabel}
                                        </div>
                                        <div style={{ color: stat.color }}>
                                            {stat.count} raz(y)
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
});

EmployeeRowMemo.displayName = "EmployeeRow";
