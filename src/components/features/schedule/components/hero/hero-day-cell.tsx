"use client";

import { memo } from "react";
import { isSunday, isSaturday } from "date-fns";
import { Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
    LocalShift,
    PublicHoliday,
    AbsenceType,
    EmployeeAbsence,
    ScheduleViolation,
} from "@/types";

// Krótkie etykiety nieobecności do wyświetlenia w komórce
const ABSENCE_SHORT_LABELS: Record<AbsenceType, string> = {
    vacation: "URL",
    sick_leave: "L4",
    uz: "UZ",
    maternity: "MAC",
    paternity: "OJC",
    unpaid: "UB",
    childcare: "OP",
    bereavement: "OKOL",
    training: "SZK",
    remote: "ZD",
    blood_donation: "KREW",
    court_summons: "SĄD",
    other: "NB",
};

interface HeroDayCellProps {
    day: Date;
    width: number;
    shift: LocalShift | null;
    shiftColor: string | null;
    isDayClosed: boolean;
    holiday: PublicHoliday | undefined;
    isSelected: boolean;
    hasViolation: boolean;
    dayViolations?: ScheduleViolation[]; // Naruszenia dla tego dnia
    absence: EmployeeAbsence | null;
    onCellClick: (event: React.MouseEvent) => void;
    onAbsenceClick?: () => void; // Callback gdy kliknięto na komórkę z nieobecnością (ma zmianę do obsadzenia)
}

export const HeroDayCell = memo(function HeroDayCell({
    day,
    width,
    shift,
    shiftColor,
    isDayClosed,
    holiday,
    isSelected,
    hasViolation,
    dayViolations = [],
    absence,
    onCellClick,
    onAbsenceClick,
}: HeroDayCellProps) {
    const isWeekend = isSaturday(day) || isSunday(day);
    const isNonTradingSunday = isDayClosed && isSunday(day) && !holiday;

    // Czy ma zmianę do obsadzenia (nieobecność + zmiana przypisana)
    // Removed strict requirement for shift presence to allow managing pure absences
    const needsReplacement = !!absence && !!shift;

    // Jeśli shift nie ma koloru (custom shift), użyj szarego
    const finalShiftColor = shift ? (shiftColor ?? "#94a3b8") : null;

    const handleClick = (e: React.MouseEvent) => {
        if (absence && onAbsenceClick) {
            e.stopPropagation();
            onAbsenceClick();
        } else if (!isDayClosed && !absence) {
            onCellClick(e);
        }
    };

    return (
        <div
            className="relative border-r border-slate-200/80 overflow-visible h-full"
            style={{ width, minWidth: width }}
        >
            <button
                onClick={handleClick}
                disabled={isDayClosed || isNonTradingSunday} // Opened up ability to click on absence
                className={cn(
                    "w-full h-full p-1 overflow-visible group flex",
                    isWeekend && !isDayClosed && !absence && "bg-slate-50/30",
                    hasViolation && !isDayClosed && !absence && "bg-red-50/60",
                    isNonTradingSunday && "bg-slate-100/80 cursor-not-allowed",
                    holiday && "bg-red-50/20 cursor-not-allowed",
                    // Absence styles
                    absence &&
                        "bg-amber-50/80 hover:bg-amber-100 cursor-pointer",
                    !isDayClosed && !absence && "cursor-pointer",
                    isSelected &&
                        "ring-2 ring-blue-400 rounded-lg ring-inset bg-blue-50",
                )}
            >
                {absence ? (
                    needsReplacement ? (
                        // Nieobecność ze zmianą do obsadzenia - klikalny
                        <div className="w-full h-full rounded-lg flex flex-col items-center justify-center bg-amber-100 border border-amber-400/50 ">
                            <div className="flex items-center gap-0.5 text-amber-700">
                                <Flag className="w-2.5 h-2.5" />
                                <span className="text-[9px] font-bold">
                                    {ABSENCE_SHORT_LABELS[
                                        absence.absence_type as AbsenceType
                                    ] || "NB"}
                                </span>
                            </div>
                            <span className="text-[9px] font-medium text-amber-600 mt-0.5">
                                {shift!.start_time.slice(0, 5)}-
                                {shift!.end_time.slice(0, 5)}
                            </span>
                            <span className="text-[8px] text-amber-500 group-hover:text-amber-700">
                                Kliknij → zamień
                            </span>
                        </div>
                    ) : (
                        // Zwykła nieobecność (bez zmiany)
                        <div className="w-full h-full rounded-lg flex items-center justify-center gap-0.5 bg-amber-100/80 border border-amber-300/50">
                            <Flag className="w-2.5 h-2.5 text-amber-600" />
                            <span className="text-[10px] font-bold text-amber-600">
                                {ABSENCE_SHORT_LABELS[
                                    absence.absence_type as AbsenceType
                                ] || "NB"}
                            </span>
                        </div>
                    )
                ) : shift ? (
                    <div className="w-full h-full">
                        {hasViolation && dayViolations.length > 0 ? (
                            <TooltipProvider delayDuration={0}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div
                                            className={cn(
                                                "w-full h-full rounded-lg p-1 text-[10px] font-medium flex flex-col items-center justify-center border shadow-sm relative overflow-visible transition-transform duration-200 group-hover:scale-[1.02] cursor-pointer",
                                                hasViolation &&
                                                    "ring-2 ring-red-400 ring-offset-1",
                                            )}
                                            style={{
                                                backgroundColor: `${finalShiftColor!}15`,
                                                borderColor: `${finalShiftColor!}35`,
                                                color: finalShiftColor!,
                                            }}
                                        >
                                            {hasViolation && (
                                                <div className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] font-bold w-4 h-4 flex items-center justify-center rounded-full shadow-lg z-30 animate-pulse">
                                                    !
                                                </div>
                                            )}
                                            <span className="font-bold leading-none">
                                                {shift.start_time.slice(0, 5)}
                                            </span>
                                            <span className="opacity-60 leading-none mt-0.5 text-[9px]">
                                                {shift.end_time.slice(0, 5)}
                                            </span>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent
                                        side="top"
                                        className="bg-red-50 border-red-200 p-2 max-w-60"
                                        style={{
                                            ["--tooltip-arrow-bg" as string]:
                                                "#fef2f2",
                                        }}
                                    >
                                        <div className="space-y-1">
                                            {dayViolations.map((v, vIdx) => (
                                                <div
                                                    key={vIdx}
                                                    className="text-xs"
                                                >
                                                    <div className="font-semibold text-red-700">
                                                        {v.description}
                                                    </div>
                                                    {v.details && (
                                                        <div className="text-red-600">
                                                            {v.details}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        ) : (
                            <div
                                className={cn(
                                    "w-full h-full rounded-lg p-1 text-[10px] font-medium flex flex-col items-center justify-center border shadow-sm relative overflow-visible transition-transform duration-200 group-hover:scale-[1.02]",
                                    hasViolation &&
                                        "ring-2 ring-red-400 ring-offset-1",
                                )}
                                style={{
                                    backgroundColor: `${finalShiftColor!}15`,
                                    borderColor: `${finalShiftColor!}35`,
                                    color: finalShiftColor!,
                                }}
                            >
                                {hasViolation && (
                                    <div className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] font-bold w-4 h-4 flex items-center justify-center rounded-full shadow-lg z-30 animate-pulse">
                                        !
                                    </div>
                                )}
                                <span className="font-bold leading-none">
                                    {shift.start_time.slice(0, 5)}
                                </span>
                                <span className="opacity-60 leading-none mt-0.5 text-[9px]">
                                    {shift.end_time.slice(0, 5)}
                                </span>
                            </div>
                        )}
                    </div>
                ) : !isDayClosed ? (
                    <div className="w-full h-full flex items-center justify-center rounded-lg border-2 border-dashed border-slate-200/60 transition-colors group-hover:border-blue-300 hover:bg-blue-50/60">
                        <span className="text-lg leading-none text-slate-300 group-hover:text-blue-400 transition-colors">
                            +
                        </span>
                    </div>
                ) : null}
            </button>
        </div>
    );
});

HeroDayCell.displayName = "HeroDayCell";
