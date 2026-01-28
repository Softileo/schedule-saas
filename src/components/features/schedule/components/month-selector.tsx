"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MONTH_NAMES } from "@/lib/utils/date-helpers";

interface MonthSelectorProps {
    year: number;
    month: number;
}

export function MonthSelector({ year, month }: MonthSelectorProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    function navigate(newYear: number, newMonth: number) {
        const params = new URLSearchParams(searchParams);
        params.set("year", newYear.toString());
        params.set("month", newMonth.toString());
        router.push(`/grafik?${params.toString()}`);
    }

    function handlePrevMonth() {
        if (month === 1) {
            navigate(year - 1, 12);
        } else {
            navigate(year, month - 1);
        }
    }

    function handleNextMonth() {
        if (month === 12) {
            navigate(year + 1, 1);
        } else {
            navigate(year, month + 1);
        }
    }

    function handleToday() {
        const today = new Date();
        navigate(today.getFullYear(), today.getMonth() + 1);
    }

    return (
        <div className="flex items-center gap-2 bg-white/95 border border-slate-200 rounded-xl p-1.5">
            <Button
                variant="ghost"
                size="sm"
                onClick={handleToday}
                className="text-xs h-8 px-2.5"
            >
                Dziś
            </Button>
            <div className="flex items-center">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePrevMonth}
                    className="h-8 w-8"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="w-32 text-center text-sm font-medium text-slate-700">
                    {MONTH_NAMES[month - 1]} {year}
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleNextMonth}
                    className="h-8 w-8"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
