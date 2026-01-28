"use client";

import { memo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { DAYS_OF_WEEK } from "@/lib/constants/days";
import type { OpeningHours, DayOpeningHours } from "@/types";

interface OpeningHoursStepProps {
    openingHours: OpeningHours;
    sundayMode: "all" | "custom";
    customSundaysCount: number;
    onUpdateOpeningHours: (
        day: keyof OpeningHours,
        field: keyof DayOpeningHours,
        value: string | boolean
    ) => void;
    onSundayModeChange: (mode: "all" | "custom") => void;
}

export const OpeningHoursStep = memo(function OpeningHoursStep({
    openingHours,
    sundayMode,
    customSundaysCount,
    onUpdateOpeningHours,
    onSundayModeChange,
}: OpeningHoursStepProps) {
    return (
        <div className="w-full max-w-md mx-auto space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center">
                <h2 className="text-xl font-semibold text-slate-900">
                    Godziny otwarcia
                </h2>
                <p className="text-slate-500 mt-1 text-sm">
                    Zaznacz dni i godziny, w których pracujecie
                </p>
            </div>

            <div className="space-y-2">
                {DAYS_OF_WEEK.map((day) => {
                    const hours = openingHours[day.key as keyof OpeningHours];
                    const isSunday = day.key === "sunday";

                    return (
                        <div key={day.key} className="space-y-0">
                            <div
                                className={cn(
                                    "flex items-center h-14 gap-3 p-3 rounded-lg border transition-colors",
                                    hours.enabled
                                        ? "bg-white border-slate-200"
                                        : "bg-slate-100 border-slate-200",
                                    isSunday &&
                                        hours.enabled &&
                                        "rounded-b-none border-b-0"
                                )}
                            >
                                <Checkbox
                                    id={day.key}
                                    checked={hours.enabled}
                                    onCheckedChange={(checked) =>
                                        onUpdateOpeningHours(
                                            day.key as keyof OpeningHours,
                                            "enabled",
                                            checked as boolean
                                        )
                                    }
                                    className="h-5 w-5"
                                />
                                <Label
                                    htmlFor={day.key}
                                    className={cn(
                                        "w-20 sm:w-28 font-medium cursor-pointer text-sm",
                                        hours.enabled
                                            ? "text-slate-900"
                                            : "text-slate-400"
                                    )}
                                >
                                    {day.label}
                                </Label>
                                {hours.enabled && (
                                    <div className="flex items-center gap-2 flex-1">
                                        <Input
                                            type="time"
                                            value={hours.open}
                                            onChange={(e) =>
                                                onUpdateOpeningHours(
                                                    day.key as keyof OpeningHours,
                                                    "open",
                                                    e.target.value
                                                )
                                            }
                                            className="w-24 sm:w-28 h-9 text-sm"
                                        />
                                        <span className="text-slate-400">
                                            -
                                        </span>
                                        <Input
                                            type="time"
                                            value={hours.close}
                                            onChange={(e) =>
                                                onUpdateOpeningHours(
                                                    day.key as keyof OpeningHours,
                                                    "close",
                                                    e.target.value
                                                )
                                            }
                                            className="w-24 sm:w-28 h-9 text-sm"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Sunday options */}
                            {isSunday && hours.enabled && (
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-b-lg space-y-2">
                                    <Label className="text-xs text-slate-500">
                                        Które niedziele?
                                    </Label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onSundayModeChange("all")
                                            }
                                            className={cn(
                                                "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                                                sundayMode === "all"
                                                    ? "bg-primary text-white"
                                                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                                            )}
                                        >
                                            Wszystkie
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onSundayModeChange("custom")
                                            }
                                            className={cn(
                                                "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                                                sundayMode === "custom"
                                                    ? "bg-primary text-white"
                                                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                                            )}
                                        >
                                            Tylko handlowe
                                        </button>
                                    </div>
                                    {sundayMode === "custom" && (
                                        <p className="text-xs text-slate-500">
                                            W {new Date().getFullYear()} roku
                                            jest {customSundaysCount} niedziel
                                            handlowych. Możesz je dostosować
                                            później w ustawieniach.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
});
