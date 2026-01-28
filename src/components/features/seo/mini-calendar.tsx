"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { MONTH_NAMES, DAY_NAMES } from "@/lib/utils/date-helpers";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface MiniCalendarProps {
    year: number;
    month: number; // 1-12
    markedDates?: {
        date: string; // YYYY-MM-DD
        type: "holiday" | "trading-sunday" | "sunday";
        name?: string; // Nazwa święta
    }[];
    showHours?: number;
    showWorkingDays?: number;
    showFreeDays?: number; // Nowe: dni wolne
    className?: string;
}

export function MiniCalendar({
    year,
    month,
    markedDates = [],
    showHours,
    showWorkingDays,
    showFreeDays,
    className,
}: MiniCalendarProps) {
    const calendarDays = useMemo(() => {
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0);
        const daysInMonth = lastDay.getDate();

        // Dzień tygodnia pierwszego dnia (0 = niedziela, konwertujemy na poniedziałek = 0)
        let startDayOfWeek = firstDay.getDay() - 1;
        if (startDayOfWeek < 0) startDayOfWeek = 6; // niedziela

        const days: (number | null)[] = [];

        // Puste dni na początku
        for (let i = 0; i < startDayOfWeek; i++) {
            days.push(null);
        }

        // Dni miesiąca
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(day);
        }

        return days;
    }, [year, month]);

    const getDateType = (day: number): string | null => {
        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(
            day,
        ).padStart(2, "0")}`;
        const marked = markedDates.find((m) => m.date === dateStr);
        if (marked) return marked.type;

        // Sprawdź czy to niedziela
        const date = new Date(year, month - 1, day);
        if (date.getDay() === 0) return "sunday";

        // Sprawdź czy to sobota
        if (date.getDay() === 6) return "saturday";

        return null;
    };

    // Pobierz nazwę święta dla danego dnia
    const getHolidayName = (day: number): string | undefined => {
        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(
            day,
        ).padStart(2, "0")}`;
        const marked = markedDates.find((m) => m.date === dateStr);
        return marked?.name;
    };

    return (
        <div className={cn("bg-white rounded-xl border p-3", className)}>
            {/* Nagłówek miesiąca */}
            <div className="text-center font-semibold text-gray-900 mb-2 text-sm">
                {MONTH_NAMES[month - 1]} {year}
            </div>

            {/* Dni tygodnia */}
            <div className="grid grid-cols-7 gap-0.5 mb-1">
                {DAY_NAMES.map((day, i) => (
                    <div
                        key={day}
                        className={cn(
                            "text-center text-[10px] font-medium py-0.5",
                            i === 6 ? "text-red-400" : "text-gray-400",
                        )}
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Dni kalendarza */}
            <TooltipProvider>
                <div className="grid grid-cols-7 gap-0.5">
                    {calendarDays.map((day, index) => {
                        if (day === null) {
                            return (
                                <div key={`empty-${index}`} className="h-6" />
                            );
                        }

                        const dateType = getDateType(day);
                        const holidayName = getHolidayName(day);

                        const dayCell = (
                            <div
                                className={cn(
                                    "h-6 flex items-center justify-center text-xs rounded",
                                    dateType === "trading-sunday" &&
                                        "bg-red-500 text-white font-bold",
                                    dateType === "holiday" &&
                                        "bg-red-100 text-red-700 font-semibold",
                                    dateType === "sunday" &&
                                        "text-red-400 font-medium",
                                    dateType === "saturday" && "text-gray-400",
                                    !dateType && "text-gray-700",
                                    holidayName && "cursor-help",
                                )}
                            >
                                {day}
                            </div>
                        );

                        // Jeśli jest święto, owinąć w tooltip
                        if (holidayName) {
                            return (
                                <Tooltip key={day} delayDuration={200}>
                                    <TooltipTrigger asChild>
                                        {dayCell}
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="text-xs font-medium">
                                            {holidayName}
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            );
                        }

                        return <div key={day}>{dayCell}</div>;
                    })}
                </div>
            </TooltipProvider>

            {/* Informacje pod kalendarzem */}
            {(showHours !== undefined ||
                showWorkingDays !== undefined ||
                showFreeDays !== undefined) && (
                <div className="mt-2 pt-2 border-t border-gray-100 grid grid-cols-3 gap-1 text-center">
                    {showWorkingDays !== undefined && (
                        <div>
                            <div className="text-[10px] text-gray-500">
                                Dni rob.
                            </div>
                            <div className="text-sm font-semibold text-emerald-600">
                                {showWorkingDays}
                            </div>
                        </div>
                    )}
                    {showFreeDays !== undefined && (
                        <div>
                            <div className="text-[10px] text-gray-500">
                                Dni wolne
                            </div>
                            <div className="text-sm font-semibold text-gray-600">
                                {showFreeDays}
                            </div>
                        </div>
                    )}
                    {showHours !== undefined && (
                        <div>
                            <div className="text-[10px] text-gray-500">
                                Godziny
                            </div>
                            <div className="text-sm font-bold text-blue-600">
                                {showHours}h
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/**
 * Grid 12 mini kalendarzy dla całego roku
 */
interface YearCalendarGridProps {
    year: number;
    getMarkedDates: (month: number) => MiniCalendarProps["markedDates"];
    getMonthStats?: (
        month: number,
    ) =>
        | { hours?: number; workingDays?: number; freeDays?: number }
        | undefined;
    className?: string;
}

export function YearCalendarGrid({
    year,
    getMarkedDates,
    getMonthStats,
    className,
}: YearCalendarGridProps) {
    return (
        <div
            className={cn(
                "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4",
                className,
            )}
        >
            {Array.from({ length: 12 }, (_, i) => {
                const month = i + 1;
                const stats = getMonthStats?.(month);
                return (
                    <MiniCalendar
                        key={month}
                        year={year}
                        month={month}
                        markedDates={getMarkedDates(month)}
                        showHours={stats?.hours}
                        showWorkingDays={stats?.workingDays}
                        showFreeDays={stats?.freeDays}
                    />
                );
            })}
        </div>
    );
}
