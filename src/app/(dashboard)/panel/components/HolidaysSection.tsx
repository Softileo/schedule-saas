"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { pl } from "date-fns/locale";

interface Holiday {
    date: string;
    name: string;
}

interface HolidaysSectionProps {
    upcomingHolidays: Holiday[];
    today: Date;
}

export default function HolidaysSection({
    upcomingHolidays,
    today,
}: HolidaysSectionProps) {
    return (
        <Card className="relative overflow-hidden border-red-200 bg-linear-to-br from-rose-100 via-red-50 to-pink-100 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-red-900">
                    <Calendar className="h-4 w-4 text-red-500" />
                    Nadchodzące święta
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
                {upcomingHolidays.length > 0 ? (
                    upcomingHolidays.map((holiday) => {
                        const holidayDate = parseISO(holiday.date);
                        const daysUntil = differenceInDays(holidayDate, today);

                        const daysLabel =
                            daysUntil === 0
                                ? "Dzisiaj"
                                : daysUntil === 1
                                  ? "Jutro"
                                  : daysUntil === 2
                                    ? "Pojutrze"
                                    : `Za ${daysUntil} dni`;

                        return (
                            <div
                                key={holiday.date}
                                className="group flex items-start gap-4 rounded-xl border border-red-100 bg-white/70 px-4 py-3 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
                            >
                                {/* Date badge */}
                                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-red-500 text-white shadow-sm">
                                    <span className="text-sm font-bold leading-none">
                                        {format(holidayDate, "d")}
                                    </span>
                                    <span className="text-[10px] font-semibold uppercase tracking-wide opacity-90">
                                        {format(holidayDate, "MMM", {
                                            locale: pl,
                                        })}
                                    </span>
                                </div>

                                {/* Content */}
                                <div className="flex min-w-0 flex-1 flex-col">
                                    <span className="truncate text-sm font-semibold text-slate-800 group-hover:text-red-800 transition-colors">
                                        {holiday.name}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        {format(holidayDate, "EEEE", {
                                            locale: pl,
                                        })}
                                    </span>
                                </div>

                                {/* Days counter */}
                                <div className="text-right">
                                    <span className="block text-xs font-semibold text-red-800">
                                        {daysLabel}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="rounded-xl border border-dashed border-red-200 bg-white/60 py-6 text-center text-sm text-red-900">
                        Brak nadchodzących świąt
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
