"use client";

import Link from "next/link";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Check, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
} from "@/components/ui/carousel";

interface ScheduleInfo {
    id: string;
    year: number;
    month: number;
    status: string;
    shiftsCount: number;
}

interface ScheduleSliderProps {
    schedules: ScheduleInfo[];
    currentYear: number;
    currentMonth: number;
    orgSlug?: string;
}

export function ScheduleSlider({
    schedules,
    currentYear,
    currentMonth,
    orgSlug,
}: ScheduleSliderProps) {
    // Sort schedules as before
    const sortedSchedules = [...schedules].sort((a, b) => {
        const aDate = a.year * 100 + a.month;
        const bDate = b.year * 100 + b.month;
        const currentDate = currentYear * 100 + currentMonth;

        const isAFutureOrCurrent = aDate >= currentDate;
        const isBFutureOrCurrent = bDate >= currentDate;

        if (isAFutureOrCurrent && isBFutureOrCurrent) {
            return aDate - bDate;
        }
        if (!isAFutureOrCurrent && !isBFutureOrCurrent) {
            return bDate - aDate;
        }
        if (isAFutureOrCurrent && !isBFutureOrCurrent) {
            return -1;
        }
        return 1;
    });

    if (!schedules || schedules.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center text-slate-400 py-8 text-sm">
                <Calendar className="h-8 w-8 mb-2 text-slate-300" />
                <span>Brak historycznych grafików</span>
            </div>
        );
    }

    return (
        <Carousel opts={{ align: "start" }} className="w-full">
            <CarouselContent className="ml-1">
                {sortedSchedules.map((schedule) => {
                    const isCurrent =
                        schedule.year === currentYear &&
                        schedule.month === currentMonth;
                    const monthDate = new Date(
                        schedule.year,
                        schedule.month - 1,
                    );
                    const monthName = format(monthDate, "LLLL", { locale: pl });
                    const isPublished = schedule.status === "published";
                    return (
                        <CarouselItem
                            key={schedule.id}
                            className="pl-3 basis-3/7 sm:basis-2/7"
                        >
                            <Link
                                href={`/grafik?year=${schedule.year}&month=${schedule.month}${orgSlug ? `&org=${orgSlug}` : ""}`}
                                className={cn(
                                    "block h-full p-4 rounded-xl transition-all border",
                                    isCurrent
                                        ? "bg-linear-to-br from-blue-50 to-blue-100 border-blue-200 shadow-sm"
                                        : "bg-slate-50 hover:bg-slate-100 border-slate-200",
                                )}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span
                                        className={cn(
                                            "text-xs font-medium px-2 py-0.5 rounded-full",
                                            isCurrent
                                                ? "bg-blue-500 text-white"
                                                : "bg-slate-200 text-slate-600",
                                        )}
                                    >
                                        {schedule.year}
                                    </span>
                                    {isPublished && (
                                        <div
                                            className={cn(
                                                "w-5 h-5 rounded-full flex items-center justify-center",
                                                isCurrent
                                                    ? "bg-emerald-500"
                                                    : "bg-emerald-100",
                                            )}
                                        >
                                            <Check
                                                className={cn(
                                                    "h-3 w-3",
                                                    isCurrent
                                                        ? "text-white"
                                                        : "text-emerald-600",
                                                )}
                                            />
                                        </div>
                                    )}
                                </div>
                                <div
                                    className={cn(
                                        "text-base font-semibold capitalize mb-1",
                                        isCurrent
                                            ? "text-blue-700"
                                            : "text-slate-700",
                                    )}
                                >
                                    {monthName}
                                </div>
                            </Link>
                        </CarouselItem>
                    );
                })}
            </CarouselContent>
        </Carousel>
    );
}
