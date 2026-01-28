"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { getShiftTypeFromTime } from "@/lib/constants/shift-styles";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import type { LocalShift } from "@/types";

interface ShiftGroup {
    color: string | null;
    count: number;
    startTime: string;
    endTime: string;
    times?: Set<string>; // Dla custom shifts - zbiór wszystkich godzin
}

interface DaySummaryProps {
    width: number;
    dayShifts: LocalShift[];
    isDayClosed: boolean;
    getShiftColor: (shift: LocalShift) => string | null;
}

export const DaySummary = memo(function DaySummary({
    width,
    dayShifts,
    isDayClosed,
    getShiftColor,
}: DaySummaryProps) {
    // Grupuj zmiany według szablonu (start_time + end_time) lub razem jako "inne" dla custom shifts
    const shiftGroups = new Map<string, ShiftGroup & { times?: Set<string> }>();

    dayShifts.forEach((shift) => {
        const shiftColor = getShiftColor(shift);

        let key: string;
        if (shiftColor) {
            // Zmiana z szablonu - grupuj po godzinach
            key = `${shift.start_time}-${shift.end_time}`;
        } else {
            // Custom shift - grupuj wszystkie razem
            key = "custom_shifts";
        }

        const existing = shiftGroups.get(key);
        const timeStr = `${shift.start_time.slice(0, 5)}-${shift.end_time.slice(
            0,
            5,
        )}`;

        if (existing) {
            existing.count++;
            if (key === "custom_shifts") {
                existing.times?.add(timeStr);
            }
        } else {
            shiftGroups.set(key, {
                color: shiftColor || "#94a3b8", // Szary kolor dla custom shifts
                count: 1,
                startTime: shift.start_time,
                endTime: shift.end_time,
                times: key === "custom_shifts" ? new Set([timeStr]) : undefined,
            });
        }
    });

    // Sortuj grupy według godziny rozpoczęcia
    const sortedGroups = Array.from(shiftGroups.entries()).sort((a, b) =>
        a[1].startTime.localeCompare(b[1].startTime),
    );

    // Format time helper
    const formatTime = (time: string) => time.substring(0, 5);

    return (
        <div
            className={cn(
                "flex flex-wrap px-1 items-center justify-center gap-1 py-1.5 border-r border-slate-200/80",
                isDayClosed && "bg-slate-100/30",
            )}
            style={{ width, minWidth: width }}
        >
            {sortedGroups.length > 0 ? (
                sortedGroups.map(([key, group]) => {
                    const type = getShiftTypeFromTime(group.startTime);
                    const defaultColor =
                        type === "morning"
                            ? "#3b82f6"
                            : type === "afternoon"
                              ? "#8b5cf6"
                              : "#64748b";
                    const bgColor = group.color || defaultColor;

                    return (
                        <TooltipProvider key={key} delayDuration={200}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div
                                        className="w-5 h-5 rounded-md border shadow-sm flex items-center justify-center text-[9px] font-bold cursor-default"
                                        style={{
                                            backgroundColor: `${bgColor}15`,
                                            borderColor: `${bgColor}35`,
                                            color: bgColor,
                                        }}
                                    >
                                        {group.count}
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                    <span className="font-medium">
                                        {key === "custom_shifts"
                                            ? `Inne: ${Array.from(
                                                  group.times || [],
                                              ).join(", ")}`
                                            : `${formatTime(
                                                  group.startTime,
                                              )} - ${formatTime(
                                                  group.endTime,
                                              )}`}
                                    </span>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    );
                })
            ) : !isDayClosed ? (
                <span className="text-[10px] text-slate-300">-</span>
            ) : null}
        </div>
    );
});

DaySummary.displayName = "DaySummary";
