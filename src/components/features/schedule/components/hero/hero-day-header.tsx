"use client";

import { memo } from "react";
import { isSunday, isSaturday } from "date-fns";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { DAY_NAMES_SHORT } from "@/lib/constants/days";
import type { PublicHoliday } from "@/types";

export interface DayHeaderInfo {
    hasGap: boolean;
    message: string;
}

interface HeroDayHeaderProps {
    day: Date;
    width: number;
    holiday: PublicHoliday | undefined;
    isDayClosed: boolean;
    coverageInfo: DayHeaderInfo;
}

export const HeroDayHeader = memo(function HeroDayHeader({
    day,
    width,
    holiday,
    isDayClosed,
    coverageInfo,
}: HeroDayHeaderProps) {
    const isWeekend = isSaturday(day) || isSunday(day);
    const isNonTradingSunday = isDayClosed && isSunday(day) && !holiday;

    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center text-center border-r border-slate-200/80 relative",
                isWeekend &&
                    !isDayClosed &&
                    "bg-linear-to-b from-slate-50 to-slate-100/50",
                isNonTradingSunday &&
                    "bg-linear-to-b from-slate-100 to-slate-200/50",
                holiday && "bg-linear-to-b from-red-50/80 to-red-100/30"
            )}
            style={{ width, minWidth: width }}
        >
            <div
                className={cn(
                    "text-[10px] font-semibold uppercase tracking-wider",
                    isNonTradingSunday
                        ? "text-slate-400"
                        : holiday
                        ? "text-red-400"
                        : "text-slate-400"
                )}
            >
                {DAY_NAMES_SHORT[day.getDay()]}
            </div>
            <div className="flex items-center gap-1">
                <span
                    className={cn(
                        "text-sm font-bold",
                        isNonTradingSunday
                            ? "text-slate-400"
                            : holiday
                            ? "text-red-500"
                            : "text-slate-800"
                    )}
                >
                    {day.getDate()}
                </span>
                {/* Czerwona kropka gdy brak pokrycia */}
                {coverageInfo.hasGap && (
                    <TooltipProvider delayDuration={200}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                                </span>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                                {coverageInfo.message}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>
        </div>
    );
});

HeroDayHeader.displayName = "HeroDayHeader";
